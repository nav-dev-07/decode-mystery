import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { startInvestigation } from "../app/decode-engine.js";
import { restoreInvestigation } from "../app/puzzle-generator.mjs";

const STORAGE_KEY = "decode-archive-progress-v1";

function setup(t, saved, blockedStorage = false) {
  const ids = [
    "feedback", "mission-title", "mission-description", "cipher-text", "cipher-window", "clue-text",
    "layer-label", "data-time", "progress-text", "progress-caption", "progress-track",
    "system-status", "storage-status", "investigation-status", "remaining-layers", "hint-cost",
    "hint-panel", "hint-text", "note-panel", "note-text", "note-chevron", "log-content", "log-count",
    "sound-label", "motion-label", "final-message",
  ];
  const buttons = [
    "decode-button", "hint-button", "note-button", "sound-toggle", "motion-toggle", "view-transmission",
    "reset-button", "play-again-button", "close-completion", "return-button", "about-button",
    "close-about", "close-about-bottom",
  ];
  const { document, window } = parseHTML(`<!doctype html><html><body>
    <canvas id="rain"></canvas><audio id="background-music"></audio><form id="answer-form"><input id="answer-input"></form>
    ${ids.map(id => `<div id="${id}"></div>`).join("")}
    ${buttons.map(id => `<button id="${id}"></button>`).join("")}
    <dialog id="completion-dialog"></dialog><dialog id="about-dialog"></dialog>
    ${[0, 1, 2].map(stage => `<div class="mission-item" data-stage="${stage}"><span class="mission-name"><small></small></span><span class="mission-state"></span></div>`).join("")}
  </body></html>`);
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  globalThis.window = window;
  globalThis.document = document;
  const storage = new Map(saved === undefined ? [] : [[STORAGE_KEY, typeof saved === "string" ? saved : JSON.stringify(saved)]]);
  const oldStorage = window.localStorage;
  const oldMatchMedia = window.matchMedia;
  window.localStorage = {
    getItem: key => { if (blockedStorage) throw new Error("Storage blocked"); return storage.get(key) ?? null; },
    setItem: (key, value) => { if (blockedStorage) throw new Error("Storage blocked"); storage.set(key, value); },
  };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  document.querySelector("canvas").getContext = () => null;
  document.querySelector("input").select = () => {};
  const music = document.querySelector("audio");
  music.playCalls = 0;
  music.pauseCalls = 0;
  music.play = () => { music.playCalls += 1; return Promise.resolve(); };
  music.pause = () => { music.pauseCalls += 1; };
  for (const dialog of document.querySelectorAll("dialog")) {
    Object.defineProperty(dialog, "open", { get: () => dialog.hasAttribute("open") });
    dialog.showModal = () => dialog.setAttribute("open", "");
    dialog.close = () => {
      dialog.removeAttribute("open");
      dialog.dispatchEvent(new window.Event("close"));
    };
  }
  let dispose = startInvestigation();
  t.after(() => {
    dispose();
    window.localStorage = oldStorage;
    window.matchMedia = oldMatchMedia;
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  });
  const $ = selector => document.querySelector(selector);
  const progress = () => JSON.parse(storage.get(STORAGE_KEY));
  const current = () => restoreInvestigation(progress().investigation);
  const click = id => $(`#${id}`).dispatchEvent(new window.Event("click"));
  const submit = answer => {
    $("#answer-input").value = answer;
    $("#answer-form").dispatchEvent(new window.Event("submit", { cancelable: true }));
  };
  const reload = () => { dispose(); dispose = startInvestigation(); };
  return { $, progress, current, click, submit, reload, music };
}

test("music starts on load and the Sound button pauses and resumes it", async t => {
  const app = setup(t);
  await Promise.resolve();
  assert.equal(app.music.playCalls, 1);
  assert.equal(app.music.loop, true);
  assert.equal(app.$("#sound-label").textContent, "SOUND ON");
  assert.equal(app.$("#sound-toggle").getAttribute("aria-pressed"), "true");
  app.click("sound-toggle");
  assert.equal(app.music.pauseCalls, 1);
  assert.equal(app.$("#sound-label").textContent, "SOUND OFF");
  app.click("sound-toggle");
  await Promise.resolve();
  assert.equal(app.music.playCalls, 2);
  assert.equal(app.$("#sound-label").textContent, "SOUND ON");
  app.click("reset-button");
  assert.equal(app.music.playCalls, 2, "Reset should not restart the track");
  assert.equal(app.$("#sound-label").textContent, "SOUND ON");
  app.click("sound-toggle");
  app.click("reset-button");
  assert.equal(app.$("#sound-label").textContent, "SOUND OFF", "Reset must respect an explicit mute");
  assert.equal(app.music.playCalls, 2);
  assert.equal(app.music.muted, true);
});

test("reset refreshes questions, hints, notes, labels, and saved state on every click", t => {
  const app = setup(t);
  let previous = app.current();
  for (let round = 0; round < 40; round++) {
    app.click("hint-button");
    app.click("note-button");
    assert.equal(app.$("#hint-text").textContent, previous.puzzles[0].hint);
    assert.equal(app.$("#note-text").textContent, previous.puzzles[0].note);
    app.click("reset-button");
    const current = app.current();
    assert.ok(current.types.every(type => !previous.types.includes(type)));
    assert.equal(app.$("#cipher-text").textContent, current.puzzles[0].cipher);
    assert.equal(app.$("#clue-text").textContent, current.puzzles[0].clue);
    assert.equal(app.$("#hint-text").textContent, current.puzzles[0].hint);
    assert.equal(app.$("#note-text").textContent, current.puzzles[0].note);
    for (let stage = 0; stage < 3; stage++) {
      assert.equal(app.$(`[data-stage="${stage}"] small`).textContent, current.puzzles[stage].label);
    }
    assert.deepEqual(app.progress().solved, [false, false, false]);
    assert.deepEqual(app.progress().hintsUsed, [false, false, false]);
    assert.equal(app.$("#hint-panel").hidden, true);
    assert.equal(app.$("#note-panel").hidden, true);
    assert.equal(app.$("#answer-input").value, "");
    assert.equal(app.$("#progress-text").textContent, "0 / 3");
    previous = current;
  }
});

test("answers, locks, hints, reload, completion, and Begin Again work with generated puzzles", t => {
  const app = setup(t);
  const investigation = app.current();
  app.submit("");
  assert.equal(app.$("#answer-input").getAttribute("aria-invalid"), "true");
  app.submit("wrong answer");
  assert.deepEqual(app.progress().solved, [false, false, false]);
  // Markup cannot unlock a stage.
  app.$('[data-stage="2"]').setAttribute("aria-current", "step");
  app.submit(investigation.puzzles[0].answer.toLowerCase());
  assert.deepEqual(app.progress().solved, [true, false, false]);
  assert.equal(app.$("#cipher-text").textContent, investigation.puzzles[1].cipher);
  app.click("hint-button");
  app.reload();
  assert.deepEqual(app.current(), investigation);
  assert.deepEqual(app.progress().solved, [true, false, false]);
  assert.equal(app.$("#hint-panel").hidden, false);
  assert.equal(app.$("#hint-text").textContent, investigation.puzzles[1].hint);
  assert.equal(app.$("#cipher-text").textContent, investigation.puzzles[1].cipher);
  app.submit(investigation.puzzles[1].answer);
  app.submit(investigation.puzzles[2].answer);
  assert.deepEqual(app.progress().solved, [true, true, true]);
  assert.equal(app.$("#completion-dialog").open, true);
  assert.equal(app.$("#answer-input").disabled, true);
  assert.equal(app.$("#progress-text").textContent, "3 / 3");
  assert.ok(app.$("#final-message").textContent.includes(investigation.puzzles[2].answer));
  app.click("play-again-button");
  assert.equal(app.$("#completion-dialog").open, false);
  assert.equal(app.$("#answer-input").disabled, false);
  assert.deepEqual(app.progress().solved, [false, false, false]);
  assert.ok(app.current().types.every(type => !investigation.types.includes(type)));
  const fresh = app.current();
  app.reload();
  assert.deepEqual(app.current(), fresh);
});

test("legacy progress is preserved until the user resets", t => {
  const app = setup(t, { version: 1, solved: [true, false, false], hintsUsed: [true, false, false] });
  assert.equal(app.progress().version, 2);
  assert.equal(app.progress().investigation, "starter");
  assert.deepEqual(app.progress().solved, [true, false, false]);
  assert.equal(app.$("#cipher-text").textContent, "2 · 4 · 8 · 16 · ?");
  app.reload();
  assert.equal(app.$("#cipher-text").textContent, "2 · 4 · 8 · 16 · ?");
  app.click("reset-button");
  assert.ok(app.current().types.every(type => !["caesar", "geometric", "a1z26"].includes(type)));
});

test("corrupt saved data is replaced with a fresh playable investigation", t => {
  const app = setup(t, "{broken json");
  assert.equal(app.current().puzzles.length, 3);
  app.submit(app.current().puzzles[0].answer);
  assert.deepEqual(app.progress().solved, [true, false, false]);
});

test("a saved later layer cannot bypass an unsolved earlier layer", t => {
  const app = setup(t, { version: 1, solved: [false, true, true], hintsUsed: [false, false, false] });
  assert.deepEqual(app.progress().solved, [false, false, false]);
  assert.equal(app.$("#cipher-text").textContent, "WKH GRRU LV RSHQ");
});

test("blocked storage still allows random resets and hints", t => {
  const app = setup(t, undefined, true);
  assert.match(app.$("#storage-status").textContent, /STORAGE UNAVAILABLE/);
  const before = app.$("#cipher-text").textContent;
  app.click("reset-button");
  assert.notEqual(app.$("#cipher-text").textContent, before);
  app.click("hint-button");
  assert.equal(app.$("#hint-panel").hidden, false);
  assert.ok(app.$("#hint-text").textContent.length > 0);
});
