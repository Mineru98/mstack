// upstream: https://github.com/cursor/plugins/blob/main/pstack/skills/statechart/scripts/kill.ts
import { spawn } from "node:child_process";

export const killGroup = (pid: number) =>
  new Promise<void>((resolve) => {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" })
        .on("error", () => resolve())
        .on("exit", () => resolve());
      return;
    }
    try {
      process.kill(-pid, "SIGKILL");
    } catch {}
    resolve();
  });
