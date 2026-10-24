import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { SPLASH_DURATION, startSplash } from "../app/splash-controller.mjs";

function fixture() {
  const { document } = parseHTML('<html><body class="existing-class"><div id="root" data-phase="loading"><div id="page"></div></div></body></html>');
  const root = document.querySelector("#root");
  const page = document.querySelector("#page");
  const scrollRoot = document.documentElement;
  page.inert = false;
  scrollRoot.style.overflow = "auto";
  scrollRoot.style.scrollbarGutter = "auto";
  scrollRoot.style.scrollBehavior = "smooth";
  scrollRoot.style.overflowAnchor = "auto";
  const frames = new Map();
  let frameId = 0;
  const scrollCalls = [];
  const view = {
    history: { scrollRestoration: "auto" },
    scrollY: 0,
    scrollTo(options) { scrollCalls.push(options); this.scrollY = options.top; },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  let completed = 0;
  return {
    root, page, scrollRoot, body: document.body, view, scrollCalls,
    flushFrames() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(0));
    },
    onComplete: () => { completed += 1; },
    completed: () => completed,
  };
}

test("the splash reveals the page after exactly 3.5 seconds and restores interaction", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const app = fixture();
  const dispose = startSplash(app);
  t.after(dispose);
  assert.equal(SPLASH_DURATION, 3500);
  assert.equal(app.root.dataset.phase, "playing");
  assert.equal(app.page.inert, true);
  assert.equal(app.scrollRoot.style.overflow, "hidden");
  assert.equal(app.body.classList.contains("splash-active"), true);
  t.mock.timers.tick(3499);
  assert.equal(app.completed(), 0);
  assert.equal(app.page.inert, true);
  t.mock.timers.tick(1);
  assert.equal(app.root.dataset.phase, "ready");
  assert.equal(app.completed(), 1);
  assert.equal(app.page.inert, false);
  assert.equal(app.scrollRoot.style.overflow, "auto");
  assert.equal(app.scrollRoot.style.scrollbarGutter, "auto");
  assert.equal(app.body.classList.contains("splash-active"), false);
  assert.equal(app.body.classList.contains("existing-class"), true);
  t.mock.timers.tick(4000);
  assert.equal(app.completed(), 1);
});

test("unmounting early cancels the reveal and releases the scroll and focus locks", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const app = fixture();
  const dispose = startSplash(app);
  t.mock.timers.tick(750);
  dispose();
  t.mock.timers.tick(5000);
  assert.equal(app.completed(), 0);
  assert.equal(app.root.dataset.phase, "loading");
  assert.equal(app.page.inert, false);
  assert.equal(app.scrollRoot.style.overflow, "auto");
  assert.equal(app.body.classList.contains("splash-active"), false);
});

test("Strict Mode setup, cleanup, and setup cannot leave the page locked", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const app = fixture();
  const first = startSplash(app);
  first();
  const second = startSplash(app);
  t.after(second);
  t.mock.timers.tick(SPLASH_DURATION);
  assert.equal(app.completed(), 1);
  assert.equal(app.page.inert, false);
  assert.equal(app.scrollRoot.style.overflow, "auto");
  assert.equal(app.body.classList.contains("splash-active"), false);
});

test("cleanup after completion preserves later changes to page scroll state", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const app = fixture();
  const dispose = startSplash(app);
  t.mock.timers.tick(SPLASH_DURATION);
  app.scrollRoot.style.overflow = "clip";
  dispose();
  assert.equal(app.scrollRoot.style.overflow, "clip");
});

test("a restored scroll position is reset at entry, reveal, and after the final layout", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const app = fixture();
  app.scrollRoot.scrollTop = 800;
  app.body.scrollTop = 800;
  app.view.scrollY = 800;
  const dispose = startSplash(app);
  t.after(dispose);
  assert.equal(app.scrollRoot.scrollTop, 0);
  assert.equal(app.body.scrollTop, 0);
  assert.equal(app.view.scrollY, 0);
  assert.equal(app.view.history.scrollRestoration, "manual");
  // A browser/hash restoration during the splash must not survive the reveal.
  app.scrollRoot.scrollTop = 240;
  app.view.scrollY = 240;
  t.mock.timers.tick(SPLASH_DURATION);
  assert.equal(app.scrollRoot.scrollTop, 0);
  assert.equal(app.view.scrollY, 0);
  // Also correct scroll anchoring after React removes the overlay/transform.
  app.scrollRoot.scrollTop = 100;
  app.view.scrollY = 100;
  app.flushFrames();
  assert.equal(app.scrollRoot.scrollTop, 0);
  assert.equal(app.view.scrollY, 0);
  assert.equal(app.view.history.scrollRestoration, "auto");
  assert.equal(app.scrollRoot.style.scrollBehavior, "smooth");
  assert.equal(app.scrollRoot.style.overflowAnchor, "auto");
  assert.equal(app.scrollCalls.length, 3);
  assert.ok(app.scrollCalls.every(call => call.top === 0 && call.left === 0 && call.behavior === "instant"));
});

test("unmount cancels a pending scroll correction and restores history behavior", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const app = fixture();
  const dispose = startSplash(app);
  t.mock.timers.tick(SPLASH_DURATION);
  dispose();
  const callsBefore = app.scrollCalls.length;
  app.flushFrames();
  assert.equal(app.scrollCalls.length, callsBefore);
  assert.equal(app.view.history.scrollRestoration, "auto");
  assert.equal(app.scrollRoot.style.scrollBehavior, "smooth");
});
