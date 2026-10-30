// upstream: https://github.com/cursor/plugins/blob/main/pstack/skills/statechart/scripts/test/corpus/MediaPlayerFixed/view.mjs
export const state = (v) => ({ Playback: v.playback, Volume: v.volume });
export const step = (action) =>
  action.replace(/(?<=[a-z])(?=[A-Z0-9])|(?<=[A-Z])(?=[A-Z][a-z])/g, " ").toLowerCase();
