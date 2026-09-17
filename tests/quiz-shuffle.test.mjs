import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

// 1. Reusable Fisher-Yates shuffle implementation
function shuffleOptions(options) {
  if (!Array.isArray(options)) return [];
  const copy = [...options];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

// 2. Options validation logic
function validateQuestionOptions(options, correctAnswer, expectedCount = 4) {
  const errors = [];

  if (!options || options.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} options, got ${options?.length || 0}`);
  }

  const texts = options.map((opt) =>
    typeof opt === "string" ? opt.trim().toLowerCase() : opt.text.trim().toLowerCase()
  );
  const uniqueTexts = new Set(texts);
  if (uniqueTexts.size !== texts.length) {
    errors.push("Duplicate options detected");
  }

  const cleanCorrect = correctAnswer.trim().toLowerCase();
  const matched = options.some((opt) => {
    if (typeof opt === "string") {
      return opt.trim().toLowerCase() === cleanCorrect;
    }
    return (
      opt.id === correctAnswer ||
      opt.text.trim().toLowerCase() === cleanCorrect
    );
  });

  if (!matched) {
    errors.push(`Correct answer "${correctAnswer}" not found among options`);
  }

  return { isValid: errors.length === 0, errors };
}

// 3. Question options preparation and shuffling
const LETTERS = ["A", "B", "C", "D"];

function prepareQuestionOptions(rawOptions, correctAnswer, questionId, expectedCount = 4) {
  const normalized = rawOptions.map((opt, idx) => {
    if (typeof opt === "string") {
      return {
        id: `${questionId}-opt-${idx}`,
        text: opt.trim(),
      };
    }
    return {
      id: opt.id || `${questionId}-opt-${idx}`,
      text: (opt.text || opt.label || "").trim(),
    };
  });

  const cleanCorrect = correctAnswer.trim().toLowerCase();
  const foundIndex = normalized.findIndex(
    (opt) => opt.id === correctAnswer || opt.text.toLowerCase() === cleanCorrect
  );

  if (foundIndex === -1) {
    throw new Error(`Correct answer "${correctAnswer}" not found among options.`);
  }

  const correctOption = normalized[foundIndex];
  const correctOptionId = correctOption.id;
  const correctAnswerText = correctOption.text;

  // Fisher-Yates shuffle
  const shuffled = shuffleOptions(normalized);

  const newIndex = shuffled.findIndex((opt) => opt.id === correctOptionId);
  const letter = LETTERS[newIndex] || "A";

  const validation = validateQuestionOptions(shuffled, correctOptionId, expectedCount);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  return {
    options: shuffled,
    correctOptionId,
    correctAnswerText,
    correctOptionIndex: newIndex,
    letter,
  };
}

// 4. Crypto verification token simulation
const SECRET = "test-secret-key-2026-saida-med";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(SECRET).digest();

function createVerificationToken(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function verifyAnswerToken(token) {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

// ================= TESTS =================

test("shuffleOptions() does not mutate original array and creates a new copy", () => {
  const original = ["Option 1", "Option 2", "Option 3", "Option 4"];
  const frozenOriginal = Object.freeze([...original]);

  const shuffled = shuffleOptions(frozenOriginal);

  assert.notEqual(shuffled, frozenOriginal, "Should return a distinct array instance");
  assert.equal(shuffled.length, original.length, "Should contain same number of items");
  assert.deepEqual(
    [...shuffled].sort(),
    [...original].sort(),
    "Shuffled array should contain all original elements"
  );
});

test("shuffleOptions() permutes array elements across runs", () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  let differentOrderFound = false;

  for (let i = 0; i < 20; i++) {
    const shuffled = shuffleOptions(original);
    if (shuffled.some((val, idx) => val !== original[idx])) {
      differentOrderFound = true;
      break;
    }
  }

  assert.equal(differentOrderFound, true, "Array order should change across shuffle attempts");
});

test("prepareQuestionOptions() accurately maps correctOptionId and preserves correct answer text", () => {
  const rawOptions = [
    "Правый блуждающий нерв",
    "Левый возвратный гортанный нерв",
    "Правый диафрагмальный нерв",
    "Симпатические ганглии T1–T4",
  ];
  const correctAnswer = "Правый блуждающий нерв";

  const result = prepareQuestionOptions(rawOptions, correctAnswer, "q-cvs-01");

  assert.equal(result.options.length, 4);
  assert.equal(result.correctAnswerText, correctAnswer);
  assert.ok(result.correctOptionId.startsWith("q-cvs-01-opt-"));

  // Check that correctOptionId points to the option with correct text
  const matchedOpt = result.options.find((o) => o.id === result.correctOptionId);
  assert.ok(matchedOpt, "Correct option should exist in shuffled list");
  assert.equal(matchedOpt.text, correctAnswer);

  // Check that the letter matches the position
  assert.equal(LETTERS[result.correctOptionIndex], result.letter);
  assert.equal(result.options[result.correctOptionIndex].id, result.correctOptionId);
});

test("1000 Shuffled Questions Distribution Test: unbiased distribution across A, B, C, D", () => {
  const rawOptions = [
    "Правый блуждающий нерв", // Initially at position A (index 0)
    "Левый возвратный гортанный нерв",
    "Правый диафрагмальный нерв",
    "Симпатические ганглии T1–T4",
  ];
  const correctAnswer = "Правый блуждающий нерв";

  const letterCounts = { A: 0, B: 0, C: 0, D: 0 };
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    const res = prepareQuestionOptions(rawOptions, correctAnswer, `q-dist-${i}`);

    // Verify constraints on EVERY iteration
    assert.equal(res.options.length, 4, "Must have exactly 4 options");
    const uniqueIds = new Set(res.options.map((o) => o.id));
    assert.equal(uniqueIds.size, 4, "Must have 4 unique option IDs");

    const correctInShuffled = res.options.find((o) => o.id === res.correctOptionId);
    assert.equal(correctInShuffled.text, correctAnswer, "Correct option must have correct text");

    letterCounts[res.letter]++;
  }

  // Distribution verification:
  // In 1000 trials with p = 0.25, mean = 250, std dev ≈ 13.7
  // Expecting each letter to be chosen between 170 and 330 times with near 100% confidence.
  console.log("1000-trial position distribution:", letterCounts);

  assert.ok(letterCounts.A > 170, `Option A appeared ${letterCounts.A} times (expected > 170)`);
  assert.ok(letterCounts.B > 170, `Option B appeared ${letterCounts.B} times (expected > 170)`);
  assert.ok(letterCounts.C > 170, `Option C appeared ${letterCounts.C} times (expected > 170)`);
  assert.ok(letterCounts.D > 170, `Option D appeared ${letterCounts.D} times (expected > 170)`);

  // Crucially: Option A must NOT dominate
  assert.ok(letterCounts.A < 340, `Option A appeared ${letterCounts.A} times (should not dominate)`);
  assert.ok(letterCounts.B < 340, `Option B appeared ${letterCounts.B} times (should not dominate)`);
  assert.ok(letterCounts.C < 340, `Option C appeared ${letterCounts.C} times (should not dominate)`);
  assert.ok(letterCounts.D < 340, `Option D appeared ${letterCounts.D} times (should not dominate)`);
});

test("Validation: rejects duplicate options and missing correct answer", () => {
  const duplicates = ["Option A", "Option A", "Option B", "Option C"];
  const resDup = validateQuestionOptions(duplicates, "Option A");
  assert.equal(resDup.isValid, false);
  assert.match(resDup.errors[0], /Duplicate options/);

  const missingCorrect = ["Option A", "Option B", "Option C", "Option D"];
  const resMissing = validateQuestionOptions(missingCorrect, "Option NonExistent");
  assert.equal(resMissing.isValid, false);
  assert.match(resMissing.errors[0], /Correct answer "Option NonExistent" not found/);
});

test("Security: verification tokens hide plaintext answers and verify accurately", () => {
  const payload = {
    questionId: "q-sec-01",
    correctOptionId: "q-sec-01-opt-2",
    correctAnswer: "Правый диафрагмальный нерв",
    explanation: "Диафрагмальный нерв иннервирует купол диафрагмы.",
  };

  const token = createVerificationToken(payload);

  // Assert plaintext does not leak in token string
  assert.equal(token.includes("диафрагмальный"), false, "Token must not expose plaintext answer");
  assert.equal(token.includes("q-sec-01-opt-2"), false, "Token must not expose option ID");

  // Verify token decoding
  const decoded = verifyAnswerToken(token);
  assert.ok(decoded);
  assert.equal(decoded.questionId, payload.questionId);
  assert.equal(decoded.correctOptionId, payload.correctOptionId);
  assert.equal(decoded.correctAnswer, payload.correctAnswer);

  // Tampered token check
  const tamperedToken = token.slice(0, -4) + "abcd";
  const tamperedResult = verifyAnswerToken(tamperedToken);
  assert.equal(tamperedResult, null, "Tampered token must be rejected");
});

test("Quiz answer verification logic correctly differentiates correct vs incorrect option IDs", () => {
  const rawOptions = ["Answer A", "Answer B", "Answer C", "Answer D"];
  const correctAnswer = "Answer C";
  const shuffled = prepareQuestionOptions(rawOptions, correctAnswer, "q-verify-test");

  const correctOption = shuffled.options.find((o) => o.text === "Answer C");
  const wrongOption = shuffled.options.find((o) => o.text !== "Answer C");

  // Correct selection
  assert.equal(correctOption.id === shuffled.correctOptionId, true);

  // Incorrect selection
  assert.equal(wrongOption.id === shuffled.correctOptionId, false);
});
