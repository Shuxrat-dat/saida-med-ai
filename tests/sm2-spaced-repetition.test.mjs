import test from "node:test";
import assert from "node:assert/strict";

function updateSM2(card, rating) {
  let { interval, repetitions, easeFactor } = card;

  if (rating === "AGAIN") {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;

    if (rating === "HARD") easeFactor = Math.max(1.3, easeFactor - 0.15);
    else if (rating === "EASY") easeFactor += 0.15;
  }

  return { interval, repetitions, easeFactor };
}

test("SM-2 algorithm: AGAIN resets interval and repetitions", () => {
  const initial = { interval: 6, repetitions: 3, easeFactor: 2.5 };
  const updated = updateSM2(initial, "AGAIN");

  assert.equal(updated.interval, 1);
  assert.equal(updated.repetitions, 0);
  assert.equal(updated.easeFactor, 2.5);
});

test("SM-2 algorithm: GOOD advances interval across repetitions", () => {
  let card = { interval: 1, repetitions: 0, easeFactor: 2.5 };
  card = updateSM2(card, "GOOD");
  assert.equal(card.interval, 1);
  assert.equal(card.repetitions, 1);

  card = updateSM2(card, "GOOD");
  assert.equal(card.interval, 3);
  assert.equal(card.repetitions, 2);

  card = updateSM2(card, "GOOD");
  assert.equal(card.interval, Math.round(3 * 2.5)); // 8
  assert.equal(card.repetitions, 3);
});

test("SM-2 algorithm: HARD lowers ease factor without dropping below 1.3", () => {
  let card = { interval: 3, repetitions: 2, easeFactor: 1.35 };
  card = updateSM2(card, "HARD");
  assert.equal(card.easeFactor, 1.3); // Floor at 1.3
});
