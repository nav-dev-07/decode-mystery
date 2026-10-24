// A saved seed and type selection recreate the exact same investigation on reload.
export const PUZZLE_GROUPS = [
  ["caesar", "atbash", "reverse", "morse"],
  ["arithmetic", "geometric", "fibonacci", "squares"],
  ["a1z26", "binary", "hex", "phonetic"],
];

const SIGNALS = [
  "THE DOOR IS OPEN", "FOLLOW THE SIGNAL", "TRUST THE PATTERN", "LOOK PAST THE NOISE",
  "THE ARCHIVE REMEMBERS", "FIND THE HIDDEN KEY", "READ BETWEEN THE LINES",
  "THE TRUTH IS CLOSE", "KEEP THE CHANNEL OPEN", "SOMEONE IS LISTENING",
  "FOLLOW THE QUIET TRACE", "THE ANSWER IS WITHIN", "LOOK BENEATH THE SURFACE",
  "THE SIGNAL IS REAL", "EVERY CLUE MATTERS", "THE NEXT DOOR AWAITS",
];
const MESSAGES = ["STAY", "LISTEN", "EXPLORE", "PERSIST", "OBSERVE", "QUESTION", "DISCOVER", "CONTINUE"];
const MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
};
const PHONETIC = [
  "ALFA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL", "INDIA",
  "JULIETT", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA", "QUEBEC", "ROMEO",
  "SIERRA", "TANGO", "UNIFORM", "VICTOR", "WHISKEY", "X-RAY", "YANKEE", "ZULU",
];

const pick = (values, random) => values[Math.floor(random() * values.length)];
const integer = (min, max, random) => min + Math.floor(random() * (max - min + 1));
const letters = (text, convert) => text.replace(/[A-Z]/g, char => convert(char.charCodeAt(0) - 65));
const shifted = (text, shift) => letters(text, value => String.fromCharCode(65 + (value + shift) % 26));
const asciiCodes = (text, base, width) => Array.from(text, char => char.charCodeAt(0).toString(base).toUpperCase().padStart(width, "0"));

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const generators = {
  caesar(random) {
    const answer = pick(SIGNALS, random);
    const shift = integer(1, 25, random);
    const cipher = shifted(answer, shift);
    return {
      label: "Caesar cipher", cipher, answer,
      clue: `Each letter was shifted ${shift} ${shift === 1 ? "place" : "places"} forward. Shift backward by ${shift} to decode it.`,
      hint: `The first word, ${cipher.split(" ")[0]}, decodes to ${answer.split(" ")[0]}. Move every remaining letter backward by ${shift}.`,
      note: `A Caesar cipher uses a fixed alphabet offset. For this packet the offset is ${shift}. Wrap around from A to Z when moving backward. Preserve the spaces.`,
    };
  },
  atbash(random) {
    const answer = pick(SIGNALS, random);
    const cipher = letters(answer, value => String.fromCharCode(90 - value));
    return {
      label: "Atbash cipher", cipher, answer,
      clue: "The alphabet is mirrored: A ↔ Z, B ↔ Y, C ↔ X. Replace every letter with its opposite.",
      hint: `${cipher.split(" ")[0]} becomes ${answer.split(" ")[0]}. Use ABCDEFGHIJKLMNOPQRSTUVWXYZ above ZYXWVUTSRQPONMLKJIHGFEDCBA.`,
      note: "Atbash reverses the alphabet, not the message order. A becomes Z, B becomes Y, and so on. Spaces stay in the same positions.",
    };
  },
  reverse(random) {
    const answer = pick(SIGNALS, random);
    return {
      label: "Reversed transmission", cipher: Array.from(answer).reverse().join(""), answer,
      clue: "The entire transmission was recorded backward. Read every character from right to left.",
      hint: `Start at the far right. The first decoded word is ${answer.split(" ")[0]}. Reverse both the word order and the letters.`,
      note: "Reverse the complete character string. Reversing only the order of the words will not recover the message. No alphabet substitution is involved.",
    };
  },
  morse(random) {
    const answer = pick(SIGNALS, random);
    const cipher = answer.split(" ").map(word => Array.from(word, char => MORSE[char]).join(" ")).join(" / ");
    const alphabet = Object.entries(MORSE).map(([letter, code]) => `${letter} ${code}`);
    return {
      label: "Morse code", cipher, answer,
      clue: "Dots and dashes encode letters. Spaces separate letters; / separates words. Decode the Morse transmission.",
      hint: `The first word is ${answer.split(" ")[0]}. Decode the remaining letter groups using the Morse alphabet in Field Notes.`,
      note: `Morse alphabet:\n${alphabet.slice(0, 9).join("     ")}\n${alphabet.slice(9, 18).join("     ")}\n${alphabet.slice(18).join("     ")}\nA slash marks a word boundary.`,
    };
  },
  arithmetic(random) {
    const start = integer(2, 25, random);
    const step = integer(3, 12, random);
    const values = Array.from({ length: 5 }, (_, i) => start + i * step);
    return {
      label: "Arithmetic sequence", cipher: `${values.join(" · ")} · ?`, answer: String(start + 5 * step),
      clue: "The same amount is added at every step. Find the missing next number.",
      hint: `${values[1]} − ${values[0]} = ${step}. Add ${step} to the last visible number, ${values[4]}.`,
      note: "An arithmetic sequence has a constant difference between adjacent terms. Subtract one term from the next to find the step, then apply it once more. Enter only the next number.",
    };
  },
  geometric(random) {
    const start = integer(2, 6, random);
    const ratio = integer(2, 4, random);
    const values = Array.from({ length: 4 }, (_, i) => start * ratio ** i);
    return {
      label: "Geometric sequence", cipher: `${values.join(" · ")} · ?`, answer: String(start * ratio ** 4),
      clue: "Each term is multiplied by the same factor. Find the missing next number.",
      hint: `${values[1]} ÷ ${values[0]} = ${ratio}. Multiply ${values[3]} by ${ratio} once more.`,
      note: "A geometric sequence uses a constant multiplier rather than a constant addition. Divide adjacent terms to find the ratio. Enter only the next number, not the sum.",
    };
  },
  fibonacci(random) {
    const values = [integer(1, 8, random), integer(9, 16, random)];
    while (values.length < 5) values.push(values.at(-1) + values.at(-2));
    return {
      label: "Sum of previous two", cipher: `${values.join(" · ")} · ?`, answer: String(values[3] + values[4]),
      clue: "Starting with the third term, each number is the sum of the two immediately before it.",
      hint: `${values[0]} + ${values[1]} = ${values[2]}. For the missing value, add ${values[3]} and ${values[4]}.`,
      note: "This follows the Fibonacci recurrence with different starting numbers. Add the previous two values, not all earlier values. The starting pair need not be 1 and 1.",
    };
  },
  squares(random) {
    const start = integer(2, 9, random);
    const roots = Array.from({ length: 4 }, (_, i) => start + i);
    return {
      label: "Consecutive squares", cipher: `${roots.map(value => value ** 2).join(" · ")} · ?`, answer: String((start + 4) ** 2),
      clue: "These numbers are squares of consecutive whole numbers. What square comes next?",
      hint: `The visible terms are ${roots.map(value => `${value}²`).join(", ")}. Square ${start + 4} for the missing term.`,
      note: "A square is a number multiplied by itself. Find the square roots of the visible terms, continue that consecutive sequence, then square the next root.",
    };
  },
  a1z26(random) {
    const answer = pick(MESSAGES, random);
    const codes = Array.from(answer, char => char.charCodeAt(0) - 64);
    return {
      label: "Alphabet positions", cipher: codes.join(" - "), answer,
      clue: "A = 1, B = 2, …, Z = 26. Convert each number to its letter.",
      hint: `${codes[0]} = ${answer[0]} and ${codes[1]} = ${answer[1]}. Decode the remaining numbers from left to right.`,
      note: "A1Z26 maps each letter to its position in the alphabet. Treat every separated number as one letter. No additional shift is required.",
    };
  },
  binary(random) {
    const answer = pick(MESSAGES, random);
    const codes = asciiCodes(answer, 2, 8);
    return {
      label: "Binary ASCII", cipher: codes.join(" "), answer,
      clue: "Each 8-bit binary group is an uppercase ASCII letter. Convert each group to a letter.",
      hint: `${codes[0]} is decimal ${answer.charCodeAt(0)}, or ${answer[0]}. Bit weights from left to right are 128, 64, 32, 16, 8, 4, 2, 1.`,
      note: "Add the bit weights wherever a group contains 1. Uppercase ASCII letters run from A = 65 to Z = 90. Convert each byte separately and keep the original order.",
    };
  },
  hex(random) {
    const answer = pick(MESSAGES, random);
    const codes = asciiCodes(answer, 16, 2);
    return {
      label: "Hexadecimal ASCII", cipher: codes.join(" "), answer,
      clue: "Each pair is a hexadecimal ASCII code for one uppercase letter. Decode the pairs in order.",
      hint: `${codes[0]} in base 16 is decimal ${answer.charCodeAt(0)}, or ${answer[0]}. For each pair, multiply its first digit by 16 and add the second.`,
      note: "Hexadecimal uses 0–9 and A–F, where A = 10 through F = 15. ASCII uppercase letters run from 41 (A) to 5A (Z) in hex. Each separated pair encodes one letter.",
    };
  },
  phonetic(random) {
    const answer = pick(MESSAGES, random);
    const words = Array.from(answer, char => PHONETIC[char.charCodeAt(0) - 65]);
    return {
      label: "Phonetic alphabet", cipher: words.join(" · "), answer,
      clue: "These are NATO phonetic alphabet words. Take the letter represented by each word.",
      hint: `${words[0]} represents ${answer[0]}; ${words[1]} represents ${answer[1]}. The first letter of every word gives the message.`,
      note: "The phonetic alphabet makes letters clear over radio: Alfa = A, Bravo = B, Charlie = C, and so on. Take one initial per code word and join them in order.",
    };
  },
};

function buildInvestigation(seed, types) {
  const random = seededRandom(seed);
  const titles = ["The signal.", "The pattern.", "The message."];
  const descriptions = [
    "A fresh signal has reached the archive. Recover the hidden phrase from this transmission.",
    "A numeric pattern is buried in the packet. Find the next value to unlock the second layer.",
    "The final fragment contains a hidden word. Decode it to restore the transmission.",
  ];
  const puzzles = types.map((type, stage) => {
    const generated = generators[type](random);
    const packet = integer(0, 65535, random).toString(16).toUpperCase().padStart(4, "0");
    return {
      ...generated, type, title: titles[stage], description: descriptions[stage],
      id: `${packet.slice(0, 2)}–${packet.slice(2)}`,
      time: `03:${17 + stage}:${String(integer(0, 59, random)).padStart(2, "0")} UTC`,
    };
  });
  return { seed, types: [...types], puzzles };
}

export function createInvestigation(previous = null, random = Math.random) {
  // Exclusion, rather than retrying random draws, guarantees different types even
  // when the random source repeats. Every layer changes its actual puzzle type.
  const types = PUZZLE_GROUPS.map(group => pick(group.filter(type => !previous?.types?.includes(type)), random));
  const seed = integer(1, 0xFFFFFFFF, random);
  return buildInvestigation(seed, types);
}

export function restoreInvestigation(saved) {
  if (!saved || !Number.isInteger(saved.seed) || saved.seed < 1 || saved.seed > 0xFFFFFFFF
    || !Array.isArray(saved.types) || saved.types.length !== PUZZLE_GROUPS.length
    || !saved.types.every((type, stage) => PUZZLE_GROUPS[stage].includes(type))) return null;
  return buildInvestigation(saved.seed, saved.types);
}

export const normaliseAnswer = value => String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
export const matchesAnswer = (puzzle, value) => normaliseAnswer(value) === normaliseAnswer(puzzle.answer);
