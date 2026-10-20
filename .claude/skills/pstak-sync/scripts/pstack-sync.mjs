#!/usr/bin/env node
// Port upstream cursor/plugins `pstack` changes into mstack.
// Mechanical part only: fetch, rename, 3-way merge, lint. Semantic adaptation is the agent's job (see SKILL.md).
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, "sync.config.json"), "utf8"));
const STATE_FILE = path.join(SKILL_DIR, "state.json");
const SYNCED_DIRS = ["skills", "agents", "docs", "automations", "README.md"];
const HEADER_RE = /upstream: https:\/\/github\.com\/cursor\/plugins\/blob\/main\/pstack\/(\S+?)(?:\s*-->)?\s*$/;
const VALUE_OPTS = ["root", "to", "base", "upstream", "cache"];
const FLAG_OPTS = ["json", "changed", "divergence", "allow-dirty", "force"];

const { positional, opts } = parseArgs(process.argv.slice(2));
const cmd = positional[0] ?? "help";

const compile = (rules) => rules.map((r) => ({ re: new RegExp(r.pattern, r.flags ?? "g"), to: r.to, ...r }));
const PATH_RULES = compile(CONFIG.pathRules.map((r) => ({ ...r, flags: "g" })));
const TEXT_RULES = compile(CONFIG.textRules.map((r) => ({ ...r, flags: "g" })));
const LINT_RULES = CONFIG.lint.map((r) => ({ ...r, re: new RegExp(r.pattern, r.flags ?? "") }));

function parseArgs(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const key = a.slice(2);
    if (VALUE_OPTS.includes(key)) {
      const next = argv[++i];
      if (next === undefined || next.startsWith("--")) fail(`--${key}에는 값이 필요하다.`);
      opts[key] = next;
    } else if (FLAG_OPTS.includes(key)) opts[key] = true;
    else fail(`알 수 없는 옵션이다: ${a}. 잘못 입력한 옵션이 무시되면 실제 저장소가 대상이 될 수 있어서 중단한다.`);
  }
  return { positional, opts };
}

function fail(message) {
  console.error(`오류: ${message}`);
  process.exit(1);
}

const root = path.resolve(opts.root ?? process.env.PSTACK_SYNC_ROOT ?? path.join(SKILL_DIR, "..", "..", ".."));

function run(cwd, argv, { allowFail = false } = {}) {
  const r = spawnSync("git", ["-C", cwd, ...argv], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0 && !allowFail) throw new Error(`git ${argv.join(" ")}\n${r.stderr}`);
  return r;
}
const text = (r) => r.stdout.toString("utf8");

// ---------- upstream access ----------

function ensureUpstream() {
  const url = opts.upstream ?? process.env.PSTACK_SYNC_UPSTREAM ?? CONFIG.upstream.url;
  const key = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  const cache = path.resolve(opts.cache ?? process.env.PSTACK_SYNC_CACHE ?? path.join(os.homedir(), ".cache", "mstack", "pstack-sync", key));
  const branch = CONFIG.upstream.branch;
  if (!fs.existsSync(path.join(cache, ".git"))) {
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    const r = spawnSync("git", ["clone", "--filter=blob:none", "--no-checkout", "--single-branch", "--branch", branch, url, cache], { stdio: ["ignore", "ignore", "inherit"] });
    if (r.status !== 0) throw new Error(`clone failed: ${url}`);
  } else {
    run(cache, ["fetch", "--quiet", "origin", branch]);
  }
  return cache;
}

function resolve(cache, ref) {
  const r = run(cache, ["rev-parse", "--verify", `${ref}^{commit}`], { allowFail: true });
  if (r.status !== 0) throw new Error(`upstream에서 ${ref} 커밋을 찾지 못했다.`);
  return text(r).trim();
}

function readUp(cache, sha, upPath) {
  const r = run(cache, ["show", `${sha}:${CONFIG.upstream.path}/${upPath}`], { allowFail: true });
  return r.status === 0 ? r.stdout : null;
}

function modeUp(cache, sha, upPath) {
  const r = run(cache, ["ls-tree", sha, `${CONFIG.upstream.path}/${upPath}`], { allowFail: true });
  return text(r).split(/\s/)[0] || "100644";
}

function upstreamVersion(cache, sha) {
  const buf = readUp(cache, sha, "plugin.json");
  try {
    return JSON.parse(buf.toString("utf8")).version ?? null;
  } catch {
    return null;
  }
}

function listChanges(cache, base, head) {
  const r = run(cache, ["diff", "--name-status", "-M", "-z", base, head, "--", `${CONFIG.upstream.path}/`]);
  const tok = text(r).split("\0").filter(Boolean);
  const prefix = `${CONFIG.upstream.path}/`;
  const strip = (p) => (p.startsWith(prefix) ? p.slice(prefix.length) : p);
  const out = [];
  for (let i = 0; i < tok.length; ) {
    const st = tok[i++];
    if (st[0] === "R" || st[0] === "C") {
      out.push({ type: st[0] === "R" ? "R" : "A", oldPath: strip(tok[i]), path: strip(tok[i + 1]) });
      i += 2;
    } else out.push({ type: st[0], path: strip(tok[i++]) });
  }
  return out;
}

function commitsFor(cache, base, head, paths) {
  const specs = paths.filter(Boolean).map((p) => `${CONFIG.upstream.path}/${p}`);
  const r = run(cache, ["log", "--format=%h %s", `${base}..${head}`, "--", ...specs]);
  return text(r).trim().split("\n").filter(Boolean);
}

// ---------- mapping and text transforms ----------

const applyRules = (rules, s) => rules.reduce((acc, r) => acc.replace(r.re, r.to), s);
const toLocal = (upPath) => applyRules(PATH_RULES, upPath);
const mech = (s) => applyRules(TEXT_RULES, s);
const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".otf", ".zip", ".gz", ".mp4", ".mov", ".lockb"]);
const isBinary = (buf, p = "") => buf.includes(0) || BINARY_EXT.has(path.extname(p).toLowerCase());
const matchRule = (list, p) => list.find((s) => (s.path.endsWith("/") ? p.startsWith(s.path) : p === s.path));

function splitHeader(src) {
  const lines = src.split("\n");
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const m = HEADER_RE.exec(lines[i]);
    if (m) {
      const [line] = lines.splice(i, 1);
      return { body: lines.join("\n"), header: { index: i, line, upPath: m[1] } };
    }
  }
  return { body: src, header: null };
}

function joinHeader(body, header) {
  if (!header) return body;
  const lines = body.split("\n");
  lines.splice(header.index, 0, header.line);
  return lines.join("\n");
}

function makeHeader(upPath, body) {
  const base = path.basename(upPath);
  if (CONFIG.noHeader.includes(base)) return null;
  const url = CONFIG.headerUrl + upPath;
  const ext = path.extname(upPath);
  const lines = body.split("\n");
  const afterShebang = lines[0]?.startsWith("#!") ? 1 : 0;
  if (ext === ".md") return lines[0] === "---" ? { index: 1, line: `# upstream: ${url}` } : { index: 0, line: `<!-- upstream: ${url} -->` };
  if ([".mjs", ".js", ".ts", ".tsx", ".json", ".jsonc"].includes(ext)) return { index: afterShebang, line: `// upstream: ${url}` };
  if ([".yaml", ".yml", ".sh", ".toml", ".py"].includes(ext)) return { index: afterShebang, line: `# upstream: ${url}` };
  return null;
}

// ---------- evaluating one upstream change ----------

function evaluate(ch, ctx) {
  const { cache, base, head } = ctx;
  const upPath = ch.path;
  const entry = { type: ch.type, upstream: upPath, oldUpstream: ch.oldPath ?? null, local: toLocal(upPath), oldLocal: ch.oldPath ? toLocal(ch.oldPath) : null };
  entry.commits = commitsFor(cache, base, head, [upPath, ch.oldPath]);

  const skip = matchRule(CONFIG.skip, upPath) ?? (ch.oldPath && matchRule(CONFIG.skip, ch.oldPath));
  if (skip) return { ...entry, status: "skipped", detail: skip.reason };

  const headBuf = ch.type === "D" ? null : readUp(cache, head, upPath);
  const baseBuf = ch.type === "A" ? null : readUp(cache, base, ch.oldPath ?? upPath);
  const baseT = baseBuf && !isBinary(baseBuf, upPath) ? mech(baseBuf.toString("utf8")) : null;
  const theirs = headBuf && !isBinary(headBuf, upPath) ? mech(headBuf.toString("utf8")) : null;
  entry.baseText = baseT;
  entry.theirsText = theirs;

  const manual = matchRule(CONFIG.manual, upPath);
  if (manual) return { ...entry, status: "manual", detail: manual.reason };
  if ((headBuf && theirs === null) || (baseBuf && baseT === null)) return { ...entry, status: "review", detail: "바이너리 파일이 바뀌었다. mstack이 쓰는 파일이면 직접 복사한다." };

  const oursPath = path.join(root, entry.oldLocal ?? entry.local);
  const oursRaw = fs.existsSync(oursPath) ? fs.readFileSync(oursPath, "utf8") : null;
  const ours = oursRaw === null ? null : splitHeader(oursRaw);
  const mode = ch.type === "D" ? null : modeUp(cache, head, upPath);
  entry.mode = mode;

  if (ch.type === "D") {
    if (ours === null) return { ...entry, status: "uptodate", detail: "로컬에 이미 없다." };
    if (ours.body === baseT) return { ...entry, status: "deleted", detail: "upstream에서 삭제됐고 로컬은 수정 없이 같다.", deleteLocal: entry.local };
    return { ...entry, status: "review", detail: "upstream에서 삭제됐지만 로컬 파일이 원본과 다르다. 삭제 여부를 판단한다." };
  }

  const newHeader = makeHeader(upPath, theirs);
  if (ch.type === "A") {
    if (ours === null) return { ...entry, status: "added", detail: "새 파일이다.", content: joinHeader(theirs, newHeader) };
    if (ours.body === theirs) return { ...entry, status: "uptodate", detail: "로컬에 같은 내용이 이미 있다." };
    return { ...entry, status: "review", detail: "새 파일 경로에 다른 내용의 로컬 파일이 이미 있다." };
  }

  if (ours === null) return { ...entry, status: "review", detail: "로컬에 없는 파일이 upstream에서 수정됐다. mstack이 제거했거나 가져오지 않은 파일인지 확인한다." };
  if (ours.body === theirs && !ch.oldPath) return { ...entry, status: "uptodate", detail: "이미 반영돼 있다." };

  const header = ours.header ? { ...ours.header, line: newHeader ? newHeader.line : ours.header.line } : newHeader;
  if (baseT === theirs) {
    return { ...entry, status: ch.oldPath ? "renamed" : "uptodate", detail: ch.oldPath ? "경로만 바뀌었다." : "개명 규칙 적용 후 변화가 없다.", content: joinHeader(ours.body, header), deleteLocal: ch.oldPath ? entry.oldLocal : null };
  }

  const merged = merge3(ours.body, baseT, theirs, entry.local);
  if (merged.conflicts === 0) {
    return { ...entry, status: ch.oldPath ? "renamed" : "clean", detail: "자동 병합했다.", content: joinHeader(merged.text, header), deleteLocal: ch.oldPath ? entry.oldLocal : null };
  }
  return { ...entry, status: "conflict", detail: `충돌 ${merged.conflicts}곳. 로컬이 중립 표현으로 다시 쓴 부분과 upstream 변경이 겹쳤다.`, mergeText: merged.text, conflicts: merged.conflicts };
}

function merge3(oursBody, baseT, theirs, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-sync-"));
  try {
    const f = (n, s) => {
      const p = path.join(dir, n);
      fs.writeFileSync(p, s);
      return p;
    };
    const r = spawnSync("git", ["merge-file", "-p", "-L", `local:${label}`, "-L", "upstream@base", "-L", "upstream@head", f("ours", oursBody), f("base", baseT), f("theirs", theirs)], { maxBuffer: 256 * 1024 * 1024 });
    if (r.status === null || r.status > 127) throw new Error(`git merge-file 실패: ${label}\n${r.stderr}`);
    return { text: r.stdout.toString("utf8"), conflicts: r.status };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function unifiedDiff(a, b, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-sync-"));
  try {
    fs.writeFileSync(path.join(dir, "a"), a ?? "");
    fs.writeFileSync(path.join(dir, "b"), b ?? "");
    const r = spawnSync("git", ["diff", "--no-index", "--no-color", "-U3", path.join(dir, "a"), path.join(dir, "b")], { maxBuffer: 256 * 1024 * 1024 });
    return r.stdout.toString("utf8").split("\n").map((l) => (l.startsWith("--- ") ? `--- upstream@base ${label}` : l.startsWith("+++ ") ? `+++ upstream@head ${label}` : l.startsWith("diff --git") ? `diff ${label}` : l)).join("\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------- plan / apply ----------

function loadState() {
  if (!fs.existsSync(STATE_FILE)) throw new Error("state.json이 없다. `mark --to <sha>`로 기준선을 먼저 기록한다.");
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function context() {
  const cache = ensureUpstream();
  const state = opts.base ? null : loadState();
  const base = resolve(cache, opts.base ?? state.baseSha);
  const head = resolve(cache, opts.to ?? `origin/${CONFIG.upstream.branch}`);
  if (base !== head && run(cache, ["merge-base", "--is-ancestor", base, head], { allowFail: true }).status !== 0) {
    throw new Error(`기준선 ${base.slice(0, 7)}이 대상 ${head.slice(0, 7)}의 조상이 아니다. upstream 히스토리가 바뀌었는지 확인한다.`);
  }
  return { cache, base, head, state };
}

function buildPlan(ctx) {
  if (ctx.base === ctx.head) return [];
  return listChanges(ctx.cache, ctx.base, ctx.head).map((ch) => evaluate(ch, ctx));
}

const ORDER = ["conflict", "review", "manual", "clean", "renamed", "added", "deleted", "uptodate", "skipped"];

function printPlan(ctx, plan) {
  const v0 = upstreamVersion(ctx.cache, ctx.base);
  const v1 = upstreamVersion(ctx.cache, ctx.head);
  const n = ctx.base === ctx.head ? 0 : text(run(ctx.cache, ["rev-list", "--count", `${ctx.base}..${ctx.head}`, "--", CONFIG.upstream.path])).trim();
  console.log(`upstream ${ctx.base.slice(0, 7)} -> ${ctx.head.slice(0, 7)}  (pstack 관련 커밋 ${n}개, 버전 ${v0 ?? "?"} -> ${v1 ?? "?"})`);
  if (!plan.length) return console.log("변경이 없다. mstack은 최신 상태다.");
  const counts = {};
  for (const e of plan) counts[e.status] = (counts[e.status] ?? 0) + 1;
  console.log(ORDER.filter((s) => counts[s]).map((s) => `${s} ${counts[s]}`).join("  |  "));
  for (const s of ORDER) {
    const group = plan.filter((e) => e.status === s);
    if (!group.length) continue;
    console.log(`\n[${s}]`);
    for (const e of group) {
      console.log(`  ${e.type} ${e.local}${e.oldLocal ? `  (from ${e.oldLocal})` : ""}`);
      if (!["clean", "added", "uptodate"].includes(s)) console.log(`      ${e.detail}`);
      for (const c of e.commits.slice(0, 3)) console.log(`      upstream: ${c}`);
    }
  }
}

function dirtyTargets() {
  const r = run(root, ["status", "--porcelain", "--", ...SYNCED_DIRS]);
  return text(r).trim().split("\n").filter(Boolean);
}

function writeFile(rel, content, mode) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  if (mode === "100755") fs.chmodSync(p, 0o755);
}

function stage(workDir, e, ctx) {
  const put = (suffix, body) => {
    const p = path.join(workDir, e.local + suffix);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
    return p;
  };
  const files = [];
  if (e.mergeText) files.push(put(".merge", e.mergeText));
  if (e.baseText !== undefined && (e.baseText !== null || e.theirsText !== null) && e.theirsText !== e.baseText) files.push(put(".upstream.diff", unifiedDiff(e.baseText, e.theirsText, e.local)));
  if (e.theirsText && ["review", "manual"].includes(e.status)) files.push(put(".upstream", e.theirsText));
  return files;
}

function apply(ctx, plan) {
  const dirty = dirtyTargets();
  if (dirty.length && !opts["allow-dirty"]) {
    console.error(`작업 트리에 커밋되지 않은 변경이 있어 중단한다. 커밋하거나 stash한 뒤 다시 실행한다. (무시하려면 --allow-dirty)\n${dirty.slice(0, 10).join("\n")}`);
    process.exit(2);
  }
  const workDir = path.join(ctx.cache, "work", ctx.head.slice(0, 12));
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  const touched = [];
  for (const e of plan) {
    if (["clean", "added", "renamed"].includes(e.status)) {
      writeFile(e.local, e.content, e.mode);
      touched.push(e.local);
    }
    if (e.deleteLocal) fs.rmSync(path.join(root, e.deleteLocal), { force: true });
    if (["conflict", "review", "manual"].includes(e.status)) e.staged = stage(workDir, e, ctx);
  }
  const slim = plan.map(({ baseText, theirsText, content, mergeText, ...rest }) => rest);
  fs.writeFileSync(path.join(workDir, "report.json"), JSON.stringify({ base: ctx.base, head: ctx.head, entries: slim }, null, 2));
  return { workDir, touched };
}

// ---------- lint ----------

function walk(dir, out = []) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.name === "node_modules" || d.name === ".git") continue;
    const p = path.join(dir, d.name);
    d.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

function lintTargets() {
  if (opts.changed) {
    const r = run(root, ["status", "--porcelain", "-uall", "--", ...SYNCED_DIRS]);
    return text(r).split("\n").filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, "")).filter((p) => fs.existsSync(path.join(root, p)));
  }
  return SYNCED_DIRS.flatMap((d) => {
    const p = path.join(root, d);
    if (!fs.existsSync(p)) return [];
    return fs.statSync(p).isDirectory() ? walk(p).map((f) => path.relative(root, f)) : [d];
  });
}

function lint(files) {
  const hits = [];
  for (const rel of files) {
    if (CONFIG.lintIgnorePaths.some((i) => rel.includes(i))) continue;
    const buf = fs.readFileSync(path.join(root, rel));
    if (isBinary(buf, rel)) continue;
    buf.toString("utf8").split("\n").forEach((line, i) => {
      if (HEADER_RE.test(line)) return;
      for (const r of LINT_RULES) if (r.re.test(line) && !CONFIG.lintAllow.some((a) => a.path === rel && a.rule === r.id)) hits.push({ file: rel, line: i + 1, rule: r.id, message: r.message, text: line.trim().slice(0, 140) });
    });
  }
  return hits;
}

function printLint(hits) {
  if (!hits.length) return console.log("lint: 통과 (Cursor 전용 표현과 개명 누락이 없다)");
  console.log(`lint: ${hits.length}건`);
  for (const h of hits) console.log(`  ${h.file}:${h.line} [${h.rule}] ${h.text}`);
  console.log(`  규칙 설명: ${[...new Set(hits.map((h) => h.rule))].map((id) => `${id}=${LINT_RULES.find((r) => r.id === id).message}`).join(" / ")}`);
}

// ---------- audit ----------

function audit(ctx) {
  const { cache, head } = ctx;
  const ls = text(run(cache, ["ls-tree", "-r", "--name-only", head, `${CONFIG.upstream.path}/`])).split("\n").filter(Boolean).map((p) => p.slice(CONFIG.upstream.path.length + 1));
  const upSet = new Set(ls);
  const problems = { missingLocal: [], staleHeader: [], pathMismatch: [] };
  for (const up of ls) {
    if (matchRule(CONFIG.skip, up) || matchRule(CONFIG.manual, up)) continue;
    if (!fs.existsSync(path.join(root, toLocal(up)))) problems.missingLocal.push(up);
  }
  const stats = { same: 0, differs: [] };
  for (const rel of lintTargetsAll()) {
    const buf = fs.readFileSync(path.join(root, rel));
    if (isBinary(buf, rel)) continue;
    const { body, header } = splitHeader(buf.toString("utf8"));
    if (!header) continue;
    if (toLocal(header.upPath) !== rel) problems.pathMismatch.push(`${rel} (header: ${header.upPath})`);
    if (!upSet.has(header.upPath)) {
      problems.staleHeader.push(`${rel} (header: ${header.upPath})`);
      continue;
    }
    if (opts.divergence) {
      const up = readUp(cache, head, header.upPath);
      if (up && mech(up.toString("utf8")) === body) stats.same++;
      else if (up) stats.differs.push(rel);
    }
  }
  console.log(`audit @ ${head.slice(0, 7)}`);
  console.log(`- upstream에는 있고 로컬에는 없는 파일: ${problems.missingLocal.length}`);
  problems.missingLocal.forEach((p) => console.log(`    ${p}  ->  ${toLocal(p)}`));
  console.log(`- 헤더가 가리키는 upstream 파일이 사라진 로컬 파일: ${problems.staleHeader.length}`);
  problems.staleHeader.forEach((p) => console.log(`    ${p}`));
  console.log(`- 헤더 경로와 실제 경로가 어긋난 파일: ${problems.pathMismatch.length}`);
  problems.pathMismatch.forEach((p) => console.log(`    ${p}`));
  if (opts.divergence) {
    console.log(`- 개명만 적용한 upstream과 동일한 파일: ${stats.same}, 다른 파일: ${stats.differs.length}`);
    stats.differs.forEach((p) => console.log(`    ${p}`));
  }
}
const lintTargetsAll = () => SYNCED_DIRS.flatMap((d) => (fs.existsSync(path.join(root, d)) ? (fs.statSync(path.join(root, d)).isDirectory() ? walk(path.join(root, d)).map((f) => path.relative(root, f)) : [d]) : []));

// ---------- commands ----------

function main() {
  switch (cmd) {
    case "status":
    case "plan": {
      const ctx = context();
      const plan = buildPlan(ctx);
      if (opts.json) return console.log(JSON.stringify(plan.map(({ baseText, theirsText, content, mergeText, ...r }) => r), null, 2));
      printPlan(ctx, plan);
      if (plan.length) console.log("\n`apply`를 실행하면 clean/added/renamed/deleted를 반영하고, 나머지는 작업 폴더에 준비한다.");
      return;
    }
    case "apply": {
      const ctx = context();
      const plan = buildPlan(ctx);
      printPlan(ctx, plan);
      if (!plan.length) return;
      const { workDir, touched } = apply(ctx, plan);
      console.log(`\n반영한 파일 ${touched.length}개. 충돌/검토/수동 항목 자료: ${workDir}`);
      for (const e of plan.filter((x) => x.staged?.length)) for (const f of e.staged) console.log(`  ${e.status} ${e.local}\n      ${f}`);
      console.log("");
      printLint(lint(lintTargets().length ? lintTargets() : touched));
      console.log("\n다음: 충돌/검토/수동 항목을 처리하고, lint가 통과하면 `mark --to " + ctx.head.slice(0, 12) + "`로 기준선을 올린다.");
      return;
    }
    case "lint": {
      const files = positional.length > 1 ? positional.slice(1) : lintTargets();
      const hits = lint(files);
      printLint(hits);
      process.exit(hits.length ? 1 : 0);
    }
    case "audit":
      return audit(context());
    case "mark": {
      const cache = ensureUpstream();
      const sha = resolve(cache, opts.to ?? `origin/${CONFIG.upstream.branch}`);
      const prev = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : null;
      if (prev && !opts.force && prev.baseSha !== sha && run(cache, ["merge-base", "--is-ancestor", prev.baseSha, sha], { allowFail: true }).status !== 0) {
        throw new Error("새 기준선이 기존 기준선의 후손이 아니다. 의도한 것이면 --force를 쓴다.");
      }
      const state = {
        upstream: "cursor/plugins",
        path: CONFIG.upstream.path,
        baseSha: sha,
        baseDate: text(run(cache, ["log", "-1", "--format=%cI", sha])).trim(),
        baseVersion: upstreamVersion(cache, sha),
        syncedAt: new Date().toISOString(),
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
      return console.log(`기준선을 ${sha.slice(0, 7)} (pstack ${state.baseVersion})로 기록했다.`);
    }
    default:
      console.log(`사용법: node pstack-sync.mjs <status|plan|apply|lint|audit|mark> [옵션]
  status|plan   변경 분류만 출력한다 (파일을 쓰지 않는다)
  apply         깨끗이 병합되는 변경을 반영하고 나머지는 작업 폴더에 준비한다
  lint          Cursor 전용 표현과 개명 누락을 찾는다 (--changed: 변경 파일만)
  audit         트리 전체 점검 (--divergence: 개명만 적용한 upstream과의 차이까지)
  mark          기준선을 기록한다 (--to <sha|ref>)
옵션: --to <ref>  --base <ref>  --root <dir>  --upstream <url|path>  --cache <dir>  --json  --allow-dirty`);
  }
}

try {
  main();
} catch (e) {
  console.error(`오류: ${e.message}`);
  process.exit(1);
}
