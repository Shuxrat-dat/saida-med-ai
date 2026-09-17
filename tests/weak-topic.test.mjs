import test from "node:test";
import assert from "node:assert/strict";

function evaluateTopicPerformance(attempts, correct) {
  if (attempts === 0) return { accuracyRate: 0, isWeakTopic: false };
  const accuracyRate = correct / attempts;
  // Flagged as weak if accuracy < 65% after at least 3 attempts
  const isWeakTopic = attempts >= 3 && accuracyRate < 0.65;
  return { accuracyRate, isWeakTopic };
}

test("Weak topic evaluator marks topic as weak when accuracy is below 65%", () => {
  const result = evaluateTopicPerformance(10, 5); // 50%
  assert.equal(result.accuracyRate, 0.5);
  assert.equal(result.isWeakTopic, true);
});

test("Weak topic evaluator does not flag low sample size as weak topic", () => {
  const result = evaluateTopicPerformance(1, 0); // 0% but only 1 attempt
  assert.equal(result.isWeakTopic, false);
});

test("Weak topic evaluator marks strong topics as not weak", () => {
  const result = evaluateTopicPerformance(20, 17); // 85%
  assert.equal(result.accuracyRate, 0.85);
  assert.equal(result.isWeakTopic, false);
});
