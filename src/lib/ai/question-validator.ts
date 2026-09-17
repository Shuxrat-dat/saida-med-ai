import { GeneratedQuestionSchema } from "./schemas";
import { z } from "zod";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class QuestionValidator {
  static validate(
    question: z.infer<typeof GeneratedQuestionSchema>,
    sourceTextContext?: string
  ): ValidationResult {
    const errors: string[] = [];

    // 1. Check prompt length and clarity
    if (!question.prompt || question.prompt.trim().length < 15) {
      errors.push("Question prompt is too short or empty.");
    }

    // 2. Check options for standard MCQ
    if (question.type === "MCQ") {
      if (!question.options || question.options.length < 3) {
        errors.push("MCQ must provide at least 3 distinct options.");
      }

      // Check for duplicate options
      const uniqueOptions = new Set(question.options.map((o) => o.trim().toLowerCase()));
      if (uniqueOptions.size !== question.options.length) {
        errors.push("MCQ contains duplicate options.");
      }

      // Check correct answer matches an option exactly
      const matched = question.options.some(
        (opt) => opt.trim() === question.correctAnswer.trim()
      );
      if (!matched) {
        errors.push(
          `Correct answer "${question.correctAnswer}" does not match any of the provided options.`
        );
      }
    }

    // 3. Check explanation existence
    if (!question.explanation || question.explanation.trim().length < 20) {
      errors.push("Question lacks a comprehensive educational explanation.");
    }

    // 4. Source grounding verification
    if (!question.sourceExcerpt || question.sourceExcerpt.trim().length < 15) {
      errors.push("Missing verbatim source excerpt for grounding verification.");
    }

    // If source context is available, verify that the excerpt actually exists or overlaps
    if (sourceTextContext && question.sourceExcerpt) {
      const cleanExcerpt = question.sourceExcerpt
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const cleanContext = sourceTextContext
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      // Check if at least 15 contiguous characters match or keyword overlap is >= 60%
      const excerptWords = question.sourceExcerpt
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const matchedWords = excerptWords.filter((w) =>
        cleanContext.includes(w)
      );

      const overlapRatio =
        excerptWords.length > 0 ? matchedWords.length / excerptWords.length : 1;

      if (overlapRatio < 0.5 && !cleanContext.includes(cleanExcerpt.slice(0, 30))) {
        errors.push(
          "Source excerpt cannot be verified within the provided document chunks (potential hallucination)."
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
