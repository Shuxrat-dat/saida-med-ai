/**
 * Saida Med AI — Quiz Randomization and Option Shuffling Utility
 * 
 * Provides unbiased Fisher-Yates shuffling for quiz question options,
 * maintains stable option IDs, and ensures correct answer mapping
 * regardless of display position (A, B, C, D).
 */

export interface QuizOption {
  id: string;
  text: string;
}

export interface ShuffledOptionsResult {
  options: QuizOption[];
  correctOptionId: string;
  correctAnswerText: string;
  correctOptionIndex: number;
  letter: "A" | "B" | "C" | "D";
}

export interface QuestionValidationResult {
  isValid: boolean;
  errors: string[];
}

const LETTERS: readonly ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"] as const;

/**
 * Unbiased Fisher-Yates shuffle algorithm.
 * Accepts an array, creates a shallow copy, shuffles it, and returns the new array.
 * Does NOT mutate the input array.
 */
export function shuffleOptions<T>(options: readonly T[]): T[] {
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

/**
 * Validates a set of question options according to medical exam requirements.
 */
export function validateQuestionOptions(
  options: readonly (QuizOption | string)[],
  correctAnswer: string,
  expectedCount = 4
): QuestionValidationResult {
  const errors: string[] = [];

  // Check count
  if (!options || options.length !== expectedCount) {
    errors.push(`Вопрос должен содержать ровно ${expectedCount} варианта ответа (получено ${options?.length || 0}).`);
  }

  // Check unique option texts
  const texts = options.map((opt) =>
    typeof opt === "string" ? opt.trim().toLowerCase() : opt.text.trim().toLowerCase()
  );
  const uniqueTexts = new Set(texts);
  if (uniqueTexts.size !== texts.length) {
    errors.push("Варианты ответа содержат дубликаты.");
  }

  // Check that correct answer matches one option
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
    errors.push(
      `Правильный ответ «${correctAnswer}» не найден среди предложенных вариантов ответа.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Prepares and shuffles options for a question:
 * 1. Normalizes options to { id, text }.
 * 2. Identifies correct option by text or ID.
 * 3. Applies unbiased Fisher-Yates shuffle.
 * 4. Determines the new correct position (A, B, C, D) and stable correctOptionId.
 * 5. Validates the result.
 */
export function prepareQuestionOptions(
  rawOptions: readonly (string | QuizOption | { id?: string; text?: string; label?: string })[],
  correctAnswer: string,
  questionId: string,
  expectedCount = 4
): ShuffledOptionsResult {
  if (!rawOptions || rawOptions.length === 0) {
    throw new Error(`Options array for question "${questionId}" is empty.`);
  }

  // Step 1: Normalize each option to { id, text }
  const normalized: QuizOption[] = rawOptions.map((opt, idx) => {
    if (typeof opt === "string") {
      return {
        id: `${questionId}-opt-${idx}`,
        text: opt.trim(),
      };
    }
    const obj = opt as { id?: string; text?: string; label?: string };
    return {
      id: obj.id || `${questionId}-opt-${idx}`,
      text: (obj.text || obj.label || "").trim(),
    };
  });

  // Step 2: Locate the correct option
  const cleanCorrect = correctAnswer.trim().toLowerCase();
  const foundIndex = normalized.findIndex(
    (opt) =>
      opt.id === correctAnswer ||
      opt.text.toLowerCase() === cleanCorrect
  );

  if (foundIndex === -1) {
    throw new Error(
      `Правильный ответ «${correctAnswer}» не найден среди вариантов вопроса ${questionId}.`
    );
  }

  const correctOption = normalized[foundIndex];
  const correctOptionId = correctOption.id;
  const correctAnswerText = correctOption.text;

  // Step 3: Unbiased Fisher-Yates shuffle
  const shuffled = shuffleOptions(normalized);

  // Step 4: Locate new position of correct option
  const newIndex = shuffled.findIndex((opt) => opt.id === correctOptionId);
  const letter = (LETTERS[newIndex] || "A") as "A" | "B" | "C" | "D";

  // Step 5: Validate
  const validation = validateQuestionOptions(shuffled, correctOptionId, expectedCount);
  if (!validation.isValid) {
    throw new Error(`Ошибка валидации перемешанных вариантов: ${validation.errors.join(", ")}`);
  }

  return {
    options: shuffled,
    correctOptionId,
    correctAnswerText,
    correctOptionIndex: newIndex,
    letter,
  };
}
