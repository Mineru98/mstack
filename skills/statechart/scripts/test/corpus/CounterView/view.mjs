// upstream: https://github.com/cursor/plugins/blob/main/pstack/skills/statechart/scripts/test/corpus/CounterView/view.mjs
export const state = ({ x }) => (x % 2 === 1 ? "odd" : String(x));
