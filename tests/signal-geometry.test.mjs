import test from "node:test";
import assert from "node:assert/strict";
import { projectSignal, sampleSignal, SIGNAL_FORMS, SIGNAL_NODE_COUNT } from "../app/signal-geometry.ts";

test("every morph keeps all signal nodes finite, bounded, and safely projectable", () => {
  const modes = new Set();
  for (let step = 0; step <= 900; step++) {
    const seconds = step / 10;
    const sample = sampleSignal(seconds);
    modes.add(sample.mode);
    assert.equal(sample.points.length, SIGNAL_NODE_COUNT);
    for (const point of sample.points) {
      assert.ok(Math.hypot(point.x, point.y, point.z) < 1.6);
      const projected = projectSignal(point, seconds * 0.16 + 0.45, 0.5, 100);
      for (const value of Object.values(projected)) assert.ok(Number.isFinite(value));
      assert.ok(projected.perspective > 0 && projected.perspective < 2);
      assert.ok(Math.abs(projected.x) < 200 && Math.abs(projected.y) < 200);
    }
  }
  assert.equal(modes.size, SIGNAL_FORMS.length);
});

test("shape changes are continuous, including the final form returning to the first", () => {
  for (const boundary of [5, 7.5, 12.5, 15, 20, 22.5, 27.5, 30, 37.5]) {
    const before = sampleSignal(boundary - 0.0001);
    const after = sampleSignal(boundary + 0.0001);
    before.points.forEach((point, index) => {
      const next = after.points[index];
      assert.ok(Math.hypot(point.x - next.x, point.y - next.y, point.z - next.z) < 0.001);
    });
  }
});

test("each form is distinct and sampling does not mutate the underlying geometry", () => {
  const forms = SIGNAL_FORMS.map((_, index) => sampleSignal(index * 7.5).points);
  for (let i = 0; i < forms.length; i++) {
    for (let j = i + 1; j < forms.length; j++) {
      const difference = forms[i].reduce((sum, point, index) => {
        const next = forms[j][index];
        return sum + Math.hypot(point.x - next.x, point.y - next.y, point.z - next.z);
      }, 0) / SIGNAL_NODE_COUNT;
      assert.ok(difference > 0.25);
    }
  }
  const expected = sampleSignal(4);
  const copy = sampleSignal(4);
  copy.points[0].x = 999;
  assert.deepEqual(sampleSignal(4), expected);
});
