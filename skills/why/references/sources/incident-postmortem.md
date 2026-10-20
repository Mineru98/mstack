<!-- upstream: https://github.com/cursor/plugins/blob/main/pstack/skills/why/references/sources/incident-postmortem.md -->
# Incident & Postmortem Context

- **Linear**: look for tickets labeled `incident`, `sev-*`, `postmortem-action-item`, `reliability`
- **Slack**: search `#sev-*` and `#incident-*` channels around the dates the target code was added
- **Git**: commits with messages like "fix for incident", "add defensive check", "revert" followed by "re-apply with..." are strong signals
