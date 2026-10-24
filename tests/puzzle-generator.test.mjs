import test from "node:test";
import assert from "node:assert/strict";
import {
  createInvestigation, restoreInvestigation, matchesAnswer, PUZZLE_GROUPS,
} from "../app/puzzle-generator.mjs";

// Decode the visible question independently of the generator's saved answer.
const morseLetters = Object.fromEntries(
  ".- -... -.-. -.. . ..-. --. .... .. .--- -.- .-.. -- -. --- .--. --.- .-. ... - ..- ...- .-- -..- -.-- --.."
    .split(" ").map((code, index) => [code, String.fromCharCode(65 + index)]),
);

function decode(puzzle) {
  const { type, cipher } = puzzle;
  if (type === "caesar") {
    const shift = Number(puzzle.clue.match(/shifted (\d+)/)[1]);
    return cipher.replace(/[A-Z]/g, char => String.fromCharCode(65 + (char.charCodeAt(0) - 65 - shift + 26) % 26));
  }
  if (type === "atbash") return cipher.replace(/[A-Z]/g, char => String.fromCharCode(155 - char.charCodeAt(0)));
  if (type === "reverse") return [...cipher].reverse().join("");
  if (type === "morse") return cipher.split(" / ").map(word => word.split(" ").map(code => morseLetters[code]).join("")).join(" ");
  if (type === "a1z26") return cipher.split(" - ").map(code => String.fromCharCode(64 + Number(code))).join("");
  if (type === "binary" || type === "hex") return cipher.split(" ").map(code => String.fromCharCode(parseInt(code, type === "binary" ? 2 : 16))).join("");
  if (type === "phonetic") return cipher.split(" · ").map(word => word[0]).join("");
  const values = cipher.split(" · ").slice(0, -1).map(Number);
  if (type === "arithmetic") return String(values.at(-1) + values[1] - values[0]);
  if (type === "geometric") return String(values.at(-1) * values[1] / values[0]);
  if (type === "fibonacci") return String(values.at(-1) + values.at(-2));
  if (type === "squares") return String((Math.sqrt(values.at(-1)) + 1) ** 2);
  throw new Error(`No independent decoder for ${type}`);
}

test("500 investigations change every type and contain solvable, restorable questions", () => {
  const seen = new Set();
  let previous = null;
  for (let round = 0; round < 500; round++) {
    const investigation = createInvestigation(previous);
    assert.equal(investigation.puzzles.length, 3);
    assert.equal(new Set(investigation.types).size, 3);
    if (previous) {
      assert.ok(investigation.types.every(type => !previous.types.includes(type)));
      investigation.puzzles.forEach((puzzle, stage) => assert.notEqual(puzzle.cipher, previous.puzzles[stage].cipher));
    }
    for (const [stage, puzzle] of investigation.puzzles.entries()) {
      seen.add(puzzle.type);
      assert.ok(PUZZLE_GROUPS[stage].includes(puzzle.type));
      assert.equal(decode(puzzle), puzzle.answer);
      assert.ok(matchesAnswer(puzzle, `  ${puzzle.answer.toLowerCase().replaceAll(" ", "   ")}  `));
      assert.equal(matchesAnswer(puzzle, "definitely wrong"), false);
      for (const field of ["title", "label", "description", "clue", "hint", "note", "id", "time"]) {
        assert.ok(typeof puzzle[field] === "string" && puzzle[field].length > 0, `${puzzle.type}: missing ${field}`);
      }
    }
    const snapshot = JSON.parse(JSON.stringify({ seed: investigation.seed, types: investigation.types }));
    assert.deepEqual(restoreInvestigation(snapshot), investigation);
    previous = investigation;
  }
  assert.equal(seen.size, 12);
});

test("reset excludes previous types even if the random source repeats", () => {
  let previous = null;
  for (let round = 0; round < 20; round++) {
    const next = createInvestigation(previous, () => 0);
    if (previous) assert.ok(next.types.every(type => !previous.types.includes(type)));
    previous = next;
  }
});

test("saved investigations reject invalid seeds and type combinations", () => {
  const valid = createInvestigation();
  for (const invalid of [null, {}, { ...valid, seed: 0 }, { ...valid, seed: -1 },
    { ...valid, seed: 0x100000000 }, { ...valid, seed: 0.5 }, { ...valid, seed: "5" },
    { ...valid, types: [] }, { ...valid, types: ["caesar", "caesar", "binary"] },
    { ...valid, types: ["unknown", "squares", "hex"] }, { ...valid, types: "caesar" }]) {
    assert.equal(restoreInvestigation(invalid), null);
  }
});
