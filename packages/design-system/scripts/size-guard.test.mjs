import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare } from './size-guard.mjs';

const budgets = { button: { code: '', jsGzip: 2000, cssGzip: 1000, mustNotContain: ['Закрыть'] } };

test('within budget passes', () => {
  assert.deepEqual(compare({ button: { jsGzip: 2000, cssGzip: 10, output: 'x' } }, budgets), []);
});

test('overshoot names entry, metric, measured and budget', () => {
  const [msg, ...rest] = compare({ button: { jsGzip: 2100, cssGzip: 10, output: 'x' } }, budgets);
  assert.equal(rest.length, 0);
  for (const s of ['button', 'jsGzip', '2100', '2000']) assert.ok(msg.includes(s), msg);
});

test('forbidden string in output fails', () => {
  const [msg] = compare({ button: { jsGzip: 1, cssGzip: 1, output: 'a Закрыть b' } }, budgets);
  assert.ok(msg.includes('button') && msg.includes('Закрыть'), msg);
});
