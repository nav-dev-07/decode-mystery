import { createInvestigation, restoreInvestigation, normaliseAnswer, matchesAnswer } from "./puzzle-generator.mjs";
import { createMusicController } from "./music-controller.mjs";

export function startInvestigation() {

  // Retain the original packet only to migrate existing saved investigations.
  const starterPuzzles = [
    {
      title: "The signal.",
      description: "Intercepted at 03:17. Someone left a door open. Find out what the transmission says.",
      id: "7F–A2", time: "03:17:09 UTC", cipher: "WKH GRRU LV RSHQ",
      clue: "Every letter has shifted three places forward. Reverse the shift.",
      answer: "THE DOOR IS OPEN",
      hint: "Move each letter three places backward: W → T, K → H, H → E. Keep the spaces and continue through the fragment.",
      note: "The Caesar cipher is a substitution cipher: every letter moves by a fixed offset. Work backward through the alphabet, wrapping A around to Z when needed. The spaces are already in the right places."
    },
    {
      title: "The pattern.",
      description: "A repeating sequence is buried in the packet. The next value is the key to the second layer.",
      id: "9C–31", time: "03:18:42 UTC", cipher: "2 · 4 · 8 · 16 · ?",
      clue: "Each number is produced by multiplying the previous number by two.",
      answer: "32",
      hint: "2 × 2 = 4. 4 × 2 = 8. 8 × 2 = 16. Now multiply the last number by two once more.",
      note: "This is a geometric sequence. Unlike an arithmetic sequence, which adds a fixed amount, this pattern multiplies by a constant ratio. Here the ratio is 2. You only need the next value, not the sum."
    },
    {
      title: "The message.",
      description: "One fragment remains. Four numbers. Four letters. A message from the other side of the archive.",
      id: "FF–00", time: "03:19:03 UTC", cipher: "19 - 20 - 1 - 25",
      clue: "A = 1, B = 2, C = 3, and so on. Turn each number into a letter.",
      answer: "STAY",
      hint: "19 is S. 20 is T. Start at A = 1 for the third number, then count to the 25th letter for the last.",
      note: "A1Z26 maps the 26 letters of the alphabet to their positions. Read each number separately, from left to right. There is no additional shift in this layer. Sometimes the simplest key opens the last door."
    }
  ];
  const starterInvestigation = {
    seed: null, types: ["caesar", "geometric", "a1z26"],
    puzzles: starterPuzzles.map((puzzle, index) => ({
      ...puzzle, type: ["caesar", "geometric", "a1z26"][index],
      label: ["Caesar cipher", "Geometric sequence", "Alphabet positions"][index]
    }))
  };
  let investigation = null;
  let puzzles = starterInvestigation.puzzles;
  const STORAGE_KEY = "decode-archive-progress-v1";
  const MAX_LOG = 12;
  const $ = (selector) => document.querySelector(selector);
  const state = {
    solved: [false, false, false], hintsUsed: [false, false, false],
    stage: 0, soundEnabled: true, storageAvailable: true,
    hintOpen: false, noteOpen: false, logEntries: [], discoveries: new Set()
  };
  let ui;
  let audioContext = null;
  let musicController;
  let confirmationTimer;
  let discoveryTimer;
  let background;
  let disposed = false;
  const listeners = [];
  const dialogOrigins = new Map();

  function on(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    listeners.push(() => target.removeEventListener(event, handler, options));
  }

  const completedCount = () => state.solved.filter(Boolean).length;
  const isComplete = () => state.solved.every(Boolean);

  function storageStatus() {
    ui.storageStatus.textContent = state.storageAvailable
      ? "PROGRESS SAVED ON THIS DEVICE" : "SESSION ONLY · STORAGE UNAVAILABLE";
  }

  function safeLoadProgress() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || ![1, 2].includes(saved.version) || !Array.isArray(saved.solved)
        || saved.solved.length !== puzzles.length || !saved.solved.every((value) => typeof value === "boolean")) return;
      const restored = saved.version === 1 || saved.investigation === "starter"
        ? starterInvestigation : restoreInvestigation(saved.investigation);
      if (!restored) return;
      investigation = restored;
      puzzles = investigation.puzzles;
      // Accept only a contiguous solved prefix. A later layer never skips a locked one.
      let locked = false;
      state.solved = saved.solved.map((value) => {
        if (!value) locked = true;
        return value && !locked;
      });
      state.stage = Math.min(completedCount(), puzzles.length - 1);
      if (Array.isArray(saved.hintsUsed) && saved.hintsUsed.length === puzzles.length) {
        state.hintsUsed = saved.hintsUsed.map((value, index) => value === true && index <= state.stage);
      }
      state.hintOpen = !isComplete() && state.hintsUsed[state.stage];
    } catch (error) {
      // Bad JSON is recoverable; denied storage changes only the persistence indicator.
      if (!(error instanceof SyntaxError)) state.storageAvailable = false;
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 2,
        investigation: investigation.seed === null ? "starter" : {
          seed: investigation.seed, types: investigation.types
        },
        solved: state.solved, hintsUsed: state.hintsUsed
      }));
      state.storageAvailable = true;
    } catch {
      state.storageAvailable = false;
    }
    storageStatus();
  }

  function addLog(message, type = "") {
    const stamp = new Date().toLocaleTimeString("en-GB", {
      hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const entry = document.createElement("p");
    const time = document.createElement("time");
    entry.className = `log-entry${type ? ` ${type}` : ""}`;
    time.dateTime = new Date().toISOString();
    time.textContent = `[${stamp}]`;
    entry.append(time, document.createTextNode(message));
    ui.log.prepend(entry);
    state.logEntries.unshift({ stamp, message });
    if (state.logEntries.length > MAX_LOG) {
      state.logEntries.pop();
      ui.log.lastElementChild.remove();
    }
    ui.log.scrollTop = 0;
    ui.logCount.textContent = `${String(state.logEntries.length).padStart(2, "0")} EVENTS`;
  }

  function setFeedback(message, type = "") {
    ui.feedback.className = `feedback${type ? ` ${type}` : ""}`;
    ui.feedback.textContent = message;
    ui.input.setAttribute("aria-invalid", String(type === "error"));
  }

  function renderReveals() {
    ui.hintPanel.hidden = !state.hintOpen;
    ui.notePanel.hidden = !state.noteOpen;
    ui.hintButton.setAttribute("aria-expanded", String(state.hintOpen));
    ui.noteButton.setAttribute("aria-expanded", String(state.noteOpen));
    ui.hintCost.textContent = state.hintsUsed[state.stage] ? "ACCESSED" : "01 AVAILABLE";
    ui.noteChevron.textContent = state.noteOpen ? "−" : "+";
    ui.hintText.textContent = puzzles[state.stage].hint;
    ui.noteText.textContent = puzzles[state.stage].note;
  }

  function renderPuzzle() {
    const complete = isComplete();
    const puzzle = puzzles[state.stage];
    ui.title.textContent = puzzle.title;
    ui.description.textContent = complete
      ? "The archive is no longer silent. All three fragments are yours. Read the recovered transmission below."
      : puzzle.description;
    ui.layerLabel.textContent = complete ? "ALL LAYERS DECRYPTED" : `ENCRYPTION LAYER 0${state.stage + 1}`;
    ui.dataTime.textContent = puzzle.time;
    ui.cipher.textContent = complete ? "TRANSMISSION RESTORED" : puzzle.cipher;
    ui.clue.textContent = puzzle.clue;
    ui.input.placeholder = /^\d+$/.test(puzzle.answer) ? "Enter the next number…" : "Enter the decoded message…";
    ui.finalMessage.textContent = `“${puzzles[0].answer}. ${puzzles[2].answer}.”`;
    ui.progressText.textContent = `${completedCount()} / ${puzzles.length}`;
    ui.progressTrack.setAttribute("value", String(completedCount()));
    ui.progressTrack.textContent = `${completedCount()} of 3 layers decrypted`;
    ui.progressTrack.setAttribute("aria-valuenow", String(completedCount()));
    ui.progressTrack.setAttribute("aria-valuetext", `${completedCount()} of 3 layers decrypted`);
    ui.progressCaption.textContent = complete ? "The archive is no longer silent." : `${puzzles.length - completedCount()} ${completedCount() === 2 ? "layer remains" : "layers remain"}. Keep listening.`;
    ui.systemStatus.textContent = complete ? "TRANSMISSION RESTORED" : "SYSTEM ONLINE";
    ui.investigationStatus.textContent = complete ? "INVESTIGATION COMPLETE" : "INVESTIGATION OPEN";
    const remaining = puzzles.length - completedCount();
    ui.remainingLayers.textContent = complete ? "ALL LAYERS DECRYPTED" : `${remaining} ${remaining === 1 ? "LAYER" : "LAYERS"} TO DECRYPT`;
    ui.input.value = "";
    ui.input.disabled = complete;
    ui.decodeButton.disabled = complete;
    ui.decodeButton.textContent = complete ? "CLEARED ✓" : "DECODE ↗";
    ui.hintButton.disabled = complete;
    ui.viewTransmission.hidden = !complete;
    document.querySelectorAll(".mission-item").forEach((item, index) => {
      const active = index === state.stage && !complete;
      item.classList.toggle("active", active);
      item.classList.toggle("complete", state.solved[index]);
      if (active) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      item.querySelector(".mission-state").textContent = state.solved[index] ? "CLEARED ✓" : active ? "ACTIVE" : "LOCKED";
      item.querySelector(".mission-name small").textContent = puzzles[index].label;
    });
    renderReveals();
    setFeedback(complete ? "All fragments decoded. The hidden transmission is yours." : "Awaiting your response_", complete ? "success" : "");
  }

  async function playTone(frequency, duration = .09, type = "sine") {
    if (disposed || !state.soundEnabled) return true;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      if (!audioContext || audioContext.state === "closed") audioContext = new Audio();
      if (audioContext.state === "suspended") await audioContext.resume();
      if (disposed || !state.soundEnabled || document.hidden) return true;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.025, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
      return true;
    } catch {
      return false;
    }
  }

  function renderSound() {
    ui.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
    ui.soundButton.setAttribute("aria-label", state.soundEnabled ? "Pause music and interface sound" : "Play music and enable interface sound");
    ui.soundLabel.textContent = state.soundEnabled ? "SOUND ON" : "SOUND OFF";
  }

  function showHint() {
    if (isComplete() || document.querySelector("dialog[open]")) return;
    if (!state.hintsUsed[state.stage]) {
      state.hintsUsed[state.stage] = true;
      state.hintOpen = true;
      saveProgress();
      addLog(`Decryption assist accessed for layer 0${state.stage + 1}.`);
      setFeedback("Hint recovered. Read the decryption assist below.");
      void playTone(580, .1, "triangle");
    } else {
      state.hintOpen = !state.hintOpen;
    }
    renderReveals();
  }

  function toggleNote() {
    state.noteOpen = !state.noteOpen;
    if (state.noteOpen) addLog(`Field note opened for layer 0${state.stage + 1}.`);
    renderReveals();
  }

  function openDialog(dialog) {
    if (dialog.open) return;
    const current = document.querySelector("dialog[open]");
    if (current) current.close();
    const origin = document.activeElement;
    try {
      dialog.showModal();
      dialogOrigins.set(dialog, origin);
      document.body.classList.add("modal-open");
      background?.refresh();
    } catch {
      setFeedback(`Dialog unavailable. The recovered message: ${ui.finalMessage.textContent}`);
    }
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function configureDialog(dialog) {
    on(dialog, "close", () => {
      if (!document.querySelector("dialog[open]")) document.body.classList.remove("modal-open");
      const origin = dialogOrigins.get(dialog);
      dialogOrigins.delete(dialog);
      if (origin?.isConnected && !origin.disabled && !origin.hidden) origin.focus();
      else if (isComplete()) ui.viewTransmission.focus();
      else ui.input.focus();
      background?.refresh();
    });
    // Native dialogs handle Escape, tab trapping, and inert background content.
    on(dialog, "click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
  }

  function confirmVisual() {
    clearTimeout(confirmationTimer);
    document.body.classList.remove("confirmed");
    // Restart the one-shot confirmation, even when two layers are solved quickly.
    void ui.cipherWindow.offsetWidth;
    document.body.classList.add("confirmed");
    confirmationTimer = window.setTimeout(() => document.body.classList.remove("confirmed"), 750);
    background?.wave();
  }

  function solveCurrentPuzzle() {
    const solvedStage = state.stage;
    // State is private to this closure; no stage controls, URL, or DOM attribute can advance it.
    state.solved[solvedStage] = true;
    state.stage = Math.min(completedCount(), puzzles.length - 1);
    state.hintOpen = false;
    state.noteOpen = false;
    saveProgress();
    renderPuzzle();
    addLog(`Layer 0${solvedStage + 1} cleared. ${isComplete() ? "Transmission restored." : `Layer 0${state.stage + 1} unlocked.`}`, "success");
    void playTone(isComplete() ? 980 : 760, .18);
    confirmVisual();
    if (isComplete()) {
      openDialog(ui.completionDialog);
    } else {
      setFeedback(`Correct — layer 0${solvedStage + 1} cleared. The next fragment is ready.`, "success");
      ui.input.focus();
    }
  }

  function discover(key, message) {
    if (state.discoveries.has(key)) {
      setFeedback("This trace is already in your system log. Keep following the signal.");
      return;
    }
    state.discoveries.add(key);
    addLog(message, "discovery");
    setFeedback("Hidden trace discovered. Check the system log.", "success");
    document.body.classList.add("discovery-flash");
    clearTimeout(discoveryTimer);
    discoveryTimer = window.setTimeout(() => document.body.classList.remove("discovery-flash"), 700);
    background?.wave();
    void playTone(1100, .12, "triangle");
  }

  function runCommand(answer) {
    const commands = {
      "/HELP": () => { addLog("Commands: /echo, /origin. The operator is listening.", "discovery"); setFeedback("Terminal commands found. See the system log."); },
      "/ECHO": () => discover("echo", "ECHO RETURNED: You are not the first. You are the first to listen."),
      "/ORIGIN": () => discover("origin", "SOURCE TRACE: Operator 00. Last seen at the edge of the signal.")
    };
    if (Object.hasOwn(commands, answer)) commands[answer]();
    else { addLog("Unknown command. Use /help to inspect the terminal."); setFeedback("Unknown command. Try /help. Puzzle progress is unchanged."); }
    ui.input.value = "";
    return true;
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (isComplete() || document.querySelector("dialog[open]")) return;
    // Derive the active layer from the solved prefix, never from markup or location.
    state.stage = Math.min(completedCount(), puzzles.length - 1);
    const answer = normaliseAnswer(ui.input.value);
    if (!answer) {
      setFeedback("Enter an answer before continuing.", "error");
      ui.input.focus();
      return;
    }
    if (answer.startsWith("/")) { runCommand(answer); return; }
    if (matchesAnswer(puzzles[state.stage], answer)) {
      solveCurrentPuzzle();
    } else {
      setFeedback("Not quite — the fragment is still encrypted. Recheck the lead or request a hint.", "error");
      addLog(`Layer 0${state.stage + 1}: response rejected. Signal remains encrypted.`, "error");
      void playTone(180, .08, "triangle");
      ui.input.focus();
      ui.input.select();
    }
  }

  function resetGame() {
    clearTimeout(confirmationTimer);
    clearTimeout(discoveryTimer);
    document.body.classList.remove("confirmed", "discovery-flash");
    investigation = createInvestigation(investigation);
    puzzles = investigation.puzzles;
    state.solved = [false, false, false];
    state.hintsUsed = [false, false, false];
    state.stage = 0;
    state.hintOpen = false;
    state.noteOpen = false;
    state.discoveries.clear();
    state.logEntries = [];
    ui.log.replaceChildren();
    saveProgress();
    closeDialog(ui.completionDialog);
    closeDialog(ui.aboutDialog);
    renderPuzzle();
    addLog("Investigation reset. Three different puzzle types selected.");
    addLog(`Fresh packet recovered. First layer: ${puzzles[0].label}.`);
    setFeedback("New investigation generated. Follow the fresh signal.");
    ui.input.focus();
  }

  function createBackground() {
    const canvas = $("#rain");
    let ctx;
    try { ctx = canvas.getContext("2d", { alpha: false }); } catch { /* Static CSS background remains available. */ }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // A dependency-free interpretation of the requested GradientASCII horizon:
    // 18px cells, 0.8 density, cyan / white / electric blue, flow and click waves.
    const colors = ["#1e3fd8", "#f6f8ff", "#a5d8ff", "#38bdf8"];
    const characters = " =+xX0S8#@";
    const pointer = { x: -1000, y: -1000 };
    let width = 0;
    let height = 0;
    let cell = 18;
    let columns = 0;
    let rows = 0;
    let cells = [];
    let frameId = null;
    let resizeId = null;
    let lastFrame = -Infinity;
    let elapsed = 0;
    let previousTime = null;
    let manuallyPaused = false;
    let pageAway = false;
    let wave = null;
    let introStarted = false;

    const paused = () => manuallyPaused || motion.matches || document.hidden || pageAway || Boolean(document.querySelector("dialog[open]"));

    function renderMotionControl() {
      const reduced = motion.matches;
      const stopped = manuallyPaused || reduced;
      ui.motionButton.disabled = reduced || !ctx;
      ui.motionButton.setAttribute("aria-pressed", String(stopped));
      ui.motionButton.setAttribute("aria-label", reduced ? "Background motion disabled by your reduced-motion preference" : stopped ? "Resume background animation" : "Pause background animation");
      ui.motionLabel.textContent = !ctx ? "FX UNAVAILABLE" : reduced ? "REDUCED FX" : stopped ? "RESUME FX" : "PAUSE FX";
      document.body.classList.toggle("motion-paused", stopped);
    }

    function draw() {
      if (!ctx) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#030711";
      ctx.fillRect(0, 0, width, height);
      const gradient = ctx.createRadialGradient(width * .77, height * .35, 0, width * .72, height * .3, width * .7);
      gradient.addColorStop(0, "#0c2055");
      gradient.addColorStop(.42, "#07132e");
      gradient.addColorStop(1, "#030711");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${Math.round(cell * .65)}px Consolas, monospace`;
      ctx.textAlign = "center";
      const t = elapsed * .001;
      const intro = motion.matches || manuallyPaused ? 1 : Math.min(1, .2 + elapsed / 1500);
      const scrambleRadius = Math.max(width, height) * .1;
      const interactive = !paused();
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const data = cells[row * columns + col];
          if (data.seed < .2) continue;
          const x = col * cell + cell / 2;
          const y = row * cell + cell;
          const nx = x / width;
          const ny = y / height;
          const horizon = .29 + Math.sin(nx * 3.4 + t * .16) * .075 + (nx - .7) ** 2 * .29;
          const ribbon = Math.exp(-Math.abs(ny - horizon) * 9);
          const stream = .5 + .5 * Math.sin(ny * 7 - t * .5 + data.phase);
          const envelope = Math.max(0, 1 - ny * .9) * (.15 + nx * .85);
          const flicker = .9 + Math.sin(t * 2 + data.seed * 60) * .1;
          let intensity = (.06 + ribbon * .6 + stream * .13) * envelope * flicker;
          let charIndex = (data.character + Math.floor(t * .65 + data.seed * 8)) % characters.length;
          const distance = Math.hypot(x - pointer.x, y - pointer.y);
          if (distance < scrambleRadius && interactive) {
            intensity += (1 - distance / scrambleRadius) * .5;
            charIndex = (charIndex + Math.floor(t * 8)) % characters.length;
          }
          if (wave && interactive) {
            const age = (elapsed - wave.time) / 1000;
            const ring = Math.abs(Math.hypot(x - wave.x, y - wave.y) - age * 330);
            if (ring < 38) intensity += (1 - ring / 38) * Math.max(0, 1 - age / 2) * .65;
          }
          const bright = intensity > .55;
          ctx.fillStyle = bright ? colors[data.seed > .8 ? 1 : 2] : colors[data.seed > .62 ? 3 : 0];
          ctx.globalAlpha = Math.min(.85, intensity) * intro;
          ctx.fillText(characters[charIndex], x, y);
        }
      }
      ctx.globalAlpha = 1;
      if (wave && elapsed - wave.time > 2100) wave = null;
    }

    function frame(time) {
      frameId = null;
      if (disposed || paused()) { previousTime = null; return; }
      if (time - lastFrame >= 1000 / 30) {
        elapsed += previousTime === null ? 33 : Math.min(65, time - previousTime);
        previousTime = time;
        lastFrame = time;
        draw();
      }
      frameId = window.requestAnimationFrame(frame);
    }

    function refresh() {
      if (disposed) return;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = null;
      previousTime = null;
      renderMotionControl();
      if (!ctx) return;
      // Reduced-motion visitors get a fully drawn still image, not a blank canvas.
      if (paused()) draw();
      else frameId = window.requestAnimationFrame(frame);
    }

    function resize() {
      if (!ctx) return;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Bound draw calls on large/4K screens; mobile keeps the requested cell size.
      cell = Math.max(18, Math.ceil(Math.sqrt(width * height / 4200)));
      columns = Math.ceil(width / cell);
      rows = Math.ceil(height / cell);
      const phases = Array.from({ length: columns }, () => Math.random() * Math.PI * 2);
      cells = Array.from({ length: rows * columns }, (_, index) => ({
        seed: Math.random(), character: Math.floor(Math.random() * characters.length), phase: phases[index % columns]
      }));
      if (!introStarted) { elapsed = motion.matches ? 1600 : 0; introStarted = true; }
      draw();
      refresh();
    }

    on(ui.motionButton, "click", () => {
      manuallyPaused = !manuallyPaused;
      refresh();
    });
    on(window, "resize", () => {
      clearTimeout(resizeId);
      resizeId = window.setTimeout(resize, 120);
    }, { passive: true });
    on(window, "pointermove", (event) => {
      if (paused() || event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, { passive: true });
    on(document, "pointerleave", () => { pointer.x = -1000; pointer.y = -1000; }, { passive: true });
    on(window, "pointerdown", (event) => {
      if (!paused() && !event.target.closest("button, input, a, dialog")) wave = { x: event.clientX, y: event.clientY, time: elapsed };
    }, { passive: true });
    on(document, "visibilitychange", () => {
      refresh();
      if (document.hidden && audioContext?.state === "running") void audioContext.suspend().catch(() => {});
    });
    on(window, "pagehide", () => {
      pageAway = true;
      clearTimeout(resizeId);
      refresh();
      if (audioContext?.state === "running") void audioContext.suspend().catch(() => {});
    });
    on(window, "pageshow", () => { pageAway = false; refresh(); });
    on(motion, "change", () => { pointer.x = -1000; pointer.y = -1000; refresh(); });
    resize();
    renderMotionControl();
    return {
      refresh,
      wave: () => { if (!paused()) wave = { x: width * .65, y: height * .35, time: elapsed }; },
      destroy: () => {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        clearTimeout(resizeId);
        frameId = null;
        cells = [];
      }
    };
  }

  function init() {
    ui = {
      input: $("#answer-input"), feedback: $("#feedback"), form: $("#answer-form"),
      title: $("#mission-title"), description: $("#mission-description"), cipher: $("#cipher-text"),
      cipherWindow: $("#cipher-window"), clue: $("#clue-text"), layerLabel: $("#layer-label"),
      dataTime: $("#data-time"), progressText: $("#progress-text"),
      progressCaption: $("#progress-caption"), progressTrack: $("#progress-track"),
      systemStatus: $("#system-status"), storageStatus: $("#storage-status"), decodeButton: $("#decode-button"),
      investigationStatus: $("#investigation-status"), remainingLayers: $("#remaining-layers"),
      hintButton: $("#hint-button"), hintCost: $("#hint-cost"), hintPanel: $("#hint-panel"), hintText: $("#hint-text"),
      noteButton: $("#note-button"), notePanel: $("#note-panel"), noteText: $("#note-text"), noteChevron: $("#note-chevron"),
      log: $("#log-content"), logCount: $("#log-count"), soundButton: $("#sound-toggle"), soundLabel: $("#sound-label"),
      motionButton: $("#motion-toggle"), motionLabel: $("#motion-label"),
      completionDialog: $("#completion-dialog"), aboutDialog: $("#about-dialog"), viewTransmission: $("#view-transmission"),
      finalMessage: $("#final-message")
    };
    safeLoadProgress();
    investigation ??= createInvestigation();
    puzzles = investigation.puzzles;
    saveProgress();
    renderPuzzle();
    storageStatus();
    renderSound();
    configureDialog(ui.completionDialog);
    configureDialog(ui.aboutDialog);
    on(ui.form, "submit", submitAnswer);
    on(ui.hintButton, "click", showHint);
    on(ui.noteButton, "click", toggleNote);
    on($("#reset-button"), "click", resetGame);
    on($("#play-again-button"), "click", resetGame);
    on($("#close-completion"), "click", () => closeDialog(ui.completionDialog));
    on($("#return-button"), "click", () => closeDialog(ui.completionDialog));
    on(ui.viewTransmission, "click", () => openDialog(ui.completionDialog));
    on($("#about-button"), "click", () => openDialog(ui.aboutDialog));
    on($("#close-about"), "click", () => closeDialog(ui.aboutDialog));
    on($("#close-about-bottom"), "click", () => closeDialog(ui.aboutDialog));
    on(ui.soundButton, "click", () => musicController.toggle());
    on(document, "keydown", (event) => {
      const target = event.target;
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey || event.repeat
        || target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")
        || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      showHint();
    });
    addLog("Archive connection established. Local channel secure.");
    addLog(completedCount() ? `${completedCount()} of 3 layers restored from this device.` : "Three encryption layers detected. Origin unknown.");
    addLog(isComplete() ? "Transmission available. Welcome back, investigator." : `Layer 0${state.stage + 1} ready. Awaiting investigator input.`);
    background = createBackground();
    musicController = createMusicController($("#background-music"), {
      eventTarget: document,
      onChange(enabled) {
        state.soundEnabled = enabled;
        renderSound();
        if (!enabled && audioContext?.state === "running") void audioContext.suspend().catch(() => {});
      },
      onError() {
        addLog("Background music unavailable. Use Sound to try again.");
      }
    });
  }

  init();

  return () => {
    disposed = true;
    state.soundEnabled = false;
    musicController?.destroy();
    listeners.forEach((remove) => remove());
    background?.destroy();
    clearTimeout(confirmationTimer);
    clearTimeout(discoveryTimer);
    closeDialog(ui.completionDialog);
    closeDialog(ui.aboutDialog);
    document.body.classList.remove("modal-open", "motion-paused", "confirmed", "discovery-flash");
    ui.log.replaceChildren();
    if (audioContext && audioContext.state !== "closed") void audioContext.close().catch(() => {});
  };
}
