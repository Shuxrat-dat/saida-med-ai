import test from "node:test";
import assert from "node:assert/strict";

function calculateTopicPerformance(prevAttempts, prevCorrect, newAnswers) {
  let attempts = prevAttempts;
  let correct = prevCorrect;

  for (const isCorrect of newAnswers) {
    attempts += 1;
    if (isCorrect) correct += 1;
  }

  const accuracyRate = attempts > 0 ? Number((correct / attempts).toFixed(2)) : 0;
  const isWeakTopic = attempts >= 3 && accuracyRate < 0.65;

  return { totalAttempts: attempts, correctAttempts: correct, accuracyRate, isWeakTopic };
}

function calculateOverallStats(topics, todayQuestions = 0) {
  let totalAttempts = 0;
  let totalCorrect = 0;

  for (const t of topics) {
    totalAttempts += t.totalAttempts;
    totalCorrect += t.correctAttempts;
  }

  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const weakTopics = topics.filter((t) => t.isWeakTopic || (t.totalAttempts >= 3 && t.accuracyRate < 0.65));
  const strongTopics = topics.filter((t) => t.accuracyRate >= 0.75 && t.totalAttempts > 0);
  const dailyGoal = 50;
  const completedToday = todayQuestions;
  const dailyProgressPct = Math.min(100, Math.round((completedToday / dailyGoal) * 100));

  return {
    overallAccuracy,
    totalQuestionsAnswered: totalAttempts,
    weakTopicsCount: weakTopics.length,
    strongTopicsCount: strongTopics.length,
    completedToday,
    dailyProgressPct,
  };
}

test("1. Quiz session records correct and incorrect answers updating topic accuracy", () => {
  // Topic with 2 prior attempts (1 correct, 50%)
  const updated = calculateTopicPerformance(2, 1, [true, false]);
  assert.equal(updated.totalAttempts, 4);
  assert.equal(updated.correctAttempts, 2);
  assert.equal(updated.accuracyRate, 0.5);
  // Flagged as weak because attempts >= 3 and accuracy (0.50) < 0.65
  assert.equal(updated.isWeakTopic, true);
});

test("2. Topic recovers from weak state when student scores consistently high", () => {
  // Topic with 4 attempts, 2 correct (50%, weak)
  // Student answers 6 questions correctly
  const updated = calculateTopicPerformance(4, 2, [true, true, true, true, true, true]);
  assert.equal(updated.totalAttempts, 10);
  assert.equal(updated.correctAttempts, 8);
  assert.equal(updated.accuracyRate, 0.8);
  // Not weak anymore! (80% >= 65%)
  assert.equal(updated.isWeakTopic, false);
});

test("3. Low sample size does not prematurely flag a topic as weak", () => {
  // 1 incorrect attempt
  const updated = calculateTopicPerformance(0, 0, [false]);
  assert.equal(updated.totalAttempts, 1);
  assert.equal(updated.correctAttempts, 0);
  assert.equal(updated.accuracyRate, 0);
  // Attempts < 3, so not weak yet
  assert.equal(updated.isWeakTopic, false);
});

test("4. Overall study analytics dynamically calculates accuracy and daily goal progress", () => {
  const topics = [
    { name: "Кардиология", totalAttempts: 20, correctAttempts: 16, accuracyRate: 0.8, isWeakTopic: false },
    { name: "Вегетативная НС", totalAttempts: 10, correctAttempts: 5, accuracyRate: 0.5, isWeakTopic: true },
    { name: "Пульмонология", totalAttempts: 15, correctAttempts: 12, accuracyRate: 0.8, isWeakTopic: false },
  ];

  const stats = calculateOverallStats(topics, 45);
  assert.equal(stats.totalQuestionsAnswered, 45);
  assert.equal(stats.overallAccuracy, 73); // 33 / 45 = 73.33%
  assert.equal(stats.weakTopicsCount, 1);
  assert.equal(stats.strongTopicsCount, 2);
  assert.equal(stats.dailyProgressPct, 90); // 45 / 50 = 90%
});
