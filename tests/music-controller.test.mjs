import test from "node:test";
import assert from "node:assert/strict";
import { createMusicController } from "../app/music-controller.mjs";

class FakeAudio extends EventTarget {
  playCalls = 0;
  pauseCalls = 0;
  paused = true;
  results = [];
  play() {
    this.playCalls += 1;
    this.paused = false;
    return this.results.shift()?.() ?? Promise.resolve();
  }
  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }
}

class Gestures extends EventTarget {
  soundButtonTarget = false;
  closest(selector) { return this.soundButtonTarget && selector === "#sound-toggle" ? this : null; }
}

function setup(t, results = []) {
  const audio = new FakeAudio();
  audio.results = results;
  const gestures = new Gestures();
  const changes = [];
  const errors = [];
  const controller = createMusicController(audio, {
    eventTarget: gestures,
    onChange: enabled => changes.push(enabled),
    onError: error => errors.push(error),
  });
  t.after(() => controller.destroy());
  return { audio, gestures, changes, errors, controller };
}

const blocked = () => Promise.reject(new DOMException("User gesture required", "NotAllowedError"));

test("autoplay starts a looping track at comfortable volume", async t => {
  const app = setup(t);
  await Promise.resolve();
  assert.equal(app.audio.playCalls, 1);
  assert.equal(app.audio.paused, false);
  assert.equal(app.audio.loop, true);
  assert.equal(app.audio.volume, 0.35);
  assert.deepEqual(app.changes, [true]);
  assert.deepEqual(app.errors, []);
});

test("blocked autoplay retries on the first interaction without repeated starts", async t => {
  const app = setup(t, [blocked]);
  await Promise.resolve();
  assert.equal(app.changes.at(-1), false);
  assert.deepEqual(app.errors, [], "Autoplay restrictions are not a broken audio file");
  app.gestures.dispatchEvent(new Event("pointerdown"));
  await Promise.resolve();
  assert.equal(app.audio.playCalls, 2);
  assert.equal(app.changes.at(-1), true);
  app.gestures.dispatchEvent(new Event("pointerup"));
  app.gestures.dispatchEvent(new Event("click"));
  app.gestures.dispatchEvent(new Event("keydown"));
  assert.equal(app.audio.playCalls, 2);
});

test("clicking Sound after blocked autoplay does not toggle twice", async t => {
  const app = setup(t, [blocked]);
  await Promise.resolve();
  app.gestures.soundButtonTarget = true;
  app.gestures.dispatchEvent(new Event("pointerdown"));
  app.gestures.dispatchEvent(new Event("pointerup"));
  app.gestures.dispatchEvent(new Event("click"));
  assert.equal(app.audio.playCalls, 1);
  app.controller.toggle();
  await Promise.resolve();
  assert.equal(app.audio.playCalls, 2);
  assert.equal(app.changes.at(-1), true);
});

test("muting cancels pending autoplay and a late resolution cannot restart music", async t => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const app = setup(t, [() => pending]);
  app.controller.toggle();
  assert.equal(app.audio.paused, true);
  app.audio.paused = false; // Simulate a delayed media play completing after mute.
  resolve();
  await Promise.resolve();
  assert.equal(app.audio.paused, true);
  assert.equal(app.changes.at(-1), false);
  app.gestures.dispatchEvent(new Event("click"));
  assert.equal(app.audio.playCalls, 1, "An explicit mute must survive later clicks");
});

test("a stale failed play cannot override a newer successful unmute", async t => {
  let reject;
  const pending = new Promise((_, fail) => { reject = fail; });
  const app = setup(t, [() => pending]);
  app.controller.toggle();
  app.controller.toggle();
  await Promise.resolve();
  reject(new DOMException("Old request interrupted", "AbortError"));
  await Promise.resolve();
  assert.equal(app.audio.playCalls, 2);
  assert.equal(app.audio.paused, false);
  assert.equal(app.changes.at(-1), true);
  assert.deepEqual(app.errors, []);
});

test("file errors turn Sound off, report once, and allow a manual retry", async t => {
  const app = setup(t, [() => Promise.reject(new DOMException("Cannot load file", "NotSupportedError"))]);
  await Promise.resolve();
  assert.equal(app.changes.at(-1), false);
  app.audio.dispatchEvent(new Event("error"));
  assert.equal(app.errors.length, 1);
  app.gestures.dispatchEvent(new Event("click"));
  assert.equal(app.audio.playCalls, 1);
  app.controller.toggle();
  await Promise.resolve();
  assert.equal(app.audio.playCalls, 2);
  assert.equal(app.changes.at(-1), true);
});

test("cleanup pauses music and removes the gesture retry", async t => {
  const app = setup(t, [blocked]);
  await Promise.resolve();
  app.controller.destroy();
  app.gestures.dispatchEvent(new Event("pointerdown"));
  app.gestures.dispatchEvent(new Event("pointerup"));
  app.gestures.dispatchEvent(new Event("click"));
  app.gestures.dispatchEvent(new Event("keydown"));
  app.controller.toggle();
  assert.equal(app.audio.playCalls, 1);
  assert.equal(app.audio.paused, true);
});
