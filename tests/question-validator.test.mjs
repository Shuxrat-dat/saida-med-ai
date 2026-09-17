import test from "node:test";
import assert from "node:assert/strict";

function validateQuestion(question, sourceTextContext) {
  const errors = [];

  if (!question.prompt || question.prompt.trim().length < 15) {
    errors.push("Question prompt is too short or empty.");
  }

  if (question.type === "MCQ") {
    if (!question.options || question.options.length < 3) {
      errors.push("MCQ must provide at least 3 distinct options.");
    }

    const uniqueOptions = new Set(question.options.map((o) => o.trim().toLowerCase()));
    if (uniqueOptions.size !== question.options.length) {
      errors.push("MCQ contains duplicate options.");
    }

    const matched = question.options.some(
      (opt) => opt.trim() === question.correctAnswer?.trim()
    );
    if (!matched) {
      errors.push(
        `Correct answer "${question.correctAnswer}" does not match any of the provided options.`
      );
    }
  }

  if (!question.explanation || question.explanation.trim().length < 20) {
    errors.push("Question lacks a comprehensive educational explanation.");
  }

  if (!question.sourceExcerpt || question.sourceExcerpt.trim().length < 15) {
    errors.push("Missing verbatim source excerpt for grounding verification.");
  }

  if (sourceTextContext && question.sourceExcerpt) {
    const cleanExcerpt = question.sourceExcerpt.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanContext = sourceTextContext.toLowerCase().replace(/[^a-z0-9]/g, "");

    const excerptWords = question.sourceExcerpt
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const matchedWords = excerptWords.filter((w) => cleanContext.includes(w));
    const overlapRatio =
      excerptWords.length > 0 ? matchedWords.length / excerptWords.length : 1;

    if (overlapRatio < 0.5 && !cleanContext.includes(cleanExcerpt.slice(0, 30))) {
      errors.push("Source excerpt cannot be verified within the provided document chunks.");
    }
  }

  return { isValid: errors.length === 0, errors };
}

test("QuestionValidator passes valid grounded MCQ", () => {
  const validQ = {
    prompt: "Which nerve primarily innervates the sinoatrial node to decrease heart rate?",
    type: "MCQ",
    options: ["Right vagus nerve", "Left recurrent laryngeal nerve", "Phrenic nerve", "Sympathetic trunk"],
    correctAnswer: "Right vagus nerve",
    explanation: "The right vagus nerve releases acetylcholine onto M2 muscarinic receptors to slow pacing rate.",
    sourceExcerpt: "The right vagus nerve innervates the sinoatrial node, decreasing intrinsic pacemaker rate.",
    sourcePage: 13,
  };

  const context = "Section 2: The right vagus nerve innervates the sinoatrial node, decreasing intrinsic pacemaker rate via acetylcholine.";
  const res = validateQuestion(validQ, context);
  assert.equal(res.isValid, true);
  assert.equal(res.errors.length, 0);
});

test("QuestionValidator rejects MCQ when correct answer does not match options", () => {
  const invalidQ = {
    prompt: "Which nerve primarily innervates the sinoatrial node to decrease heart rate?",
    type: "MCQ",
    options: ["Right vagus nerve", "Phrenic nerve", "Sympathetic trunk"],
    correctAnswer: "Left vagus nerve", // not in options
    explanation: "The explanation text is sufficiently detailed for educational purposes.",
    sourceExcerpt: "Source text verbatim quote from page.",
    sourcePage: 13,
  };

  const res = validateQuestion(invalidQ);
  assert.equal(res.isValid, false);
  assert.match(res.errors[0], /does not match any of the provided options/);
});

test("QuestionValidator rejects MCQ with duplicate options", () => {
  const invalidQ = {
    prompt: "Which nerve primarily innervates the sinoatrial node to decrease heart rate?",
    type: "MCQ",
    options: ["Vagus nerve", "Vagus nerve", "Phrenic nerve"], // duplicate
    correctAnswer: "Vagus nerve",
    explanation: "The explanation text is sufficiently detailed for educational purposes.",
    sourceExcerpt: "Source text verbatim quote from page.",
    sourcePage: 13,
  };

  const res = validateQuestion(invalidQ);
  assert.equal(res.isValid, false);
  assert.match(res.errors[0], /duplicate options/);
});

test("QuestionValidator detects hallucinated source excerpt not in document context", () => {
  const hallucinatedQ = {
    prompt: "What is the primary action of beta-1 adrenergic stimulation on the heart?",
    type: "MCQ",
    options: ["Increases contractility and chronotropy", "Causes bronchoconstriction", "Inhibits insulin secretion"],
    correctAnswer: "Increases contractility and chronotropy",
    explanation: "Beta-1 stimulation increases heart rate and cardiac contractility via cAMP.",
    sourceExcerpt: "Completely fabricated text about Martian geology and extraterrestrial minerals.",
    sourcePage: 40,
  };

  const medicalContext = "Cardiovascular Pharmacology: Beta-1 receptors stimulate cardiac output by increasing inotropy and chronotropy.";
  const res = validateQuestion(hallucinatedQ, medicalContext);
  assert.equal(res.isValid, false);
  assert.match(res.errors[0], /cannot be verified/);
});
