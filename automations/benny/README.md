# benny

benny gives you two automations for slack issue reports. they run as claude code routines or codex app automations. one triages each report. the other reproduces confirmed bugs and may prepare a small draft fix.

the files in this directory are dormant setup and automation sources. they do not appear as slash skills.

## set it up

1. point claude code or codex at [`FOR_AGENTS.md`](./FOR_AGENTS.md) and name the target repository.
2. let setup merge this whole directory into the target at `.mstack/automations/benny/`. it must preserve destination-only files and review conflicts instead of overwriting local edits.
3. let setup enable mstack in the target repository for shared dependencies. in claude code, merge this into `.claude/settings.json`:

```json
{
	"extraKnownMarketplaces": {
		"ax": { "source": { "source": "github", "repo": "Mineru98/mstack" } }
	},
	"enabledPlugins": {
		"mstack@ax": true
	}
}
```

in codex, add this to `.codex/config.toml`:

```toml
[plugins."mstack@ax"]
enabled = true
```

4. keep user-owned configuration outside the copied pack, for example in `.mstack/benny/`. adapt [`configuration.example.yaml`](./templates/configuration.example.yaml) and [`feature-map.example.md`](./skills/reproduce-and-fix-issues/references/feature-map.example.md).
5. commit `.claude/settings.json` or `.codex/config.toml`, `.mstack/automations/benny/`, and any secret-free configuration before enabling either automation.
6. review each new automation draft or update existing automations in the claude code routine or codex automation settings. then send a harmless test report and verify every source-channel post stays in the original thread.
