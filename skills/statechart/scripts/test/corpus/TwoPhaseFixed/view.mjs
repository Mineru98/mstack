// upstream: https://github.com/cursor/plugins/blob/main/pstack/skills/statechart/scripts/test/corpus/TwoPhaseFixed/view.mjs
export const state = (v) => ({ Manager: v.tmState, r1: v.rmState.r1, r2: v.rmState.r2 });
