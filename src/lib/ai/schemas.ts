import { z } from "zod";

export const KeyFactSchema = z.object({
  fact: z.string().describe("Direct clinical fact extracted from material"),
  sourcePage: z.number().describe("Page number where this fact appears"),
  isHighYield: z.boolean().describe("Whether this fact is essential for medical exams"),
});

export const ConceptSchema = z.object({
  name: z.string().describe("Name of the anatomical, physiological, or pharmacological concept"),
  definition: z.string().describe("Precise medical definition grounded in the document"),
  clinicalSignificance: z.string().optional().describe("Clinical pathology, disease association, or therapeutic relevance"),
  facts: z.array(KeyFactSchema).describe("List of verifiable key facts"),
});

export const TopicSchema = z.object({
  name: z.string().describe("Main subtopic name"),
  description: z.string().describe("Brief description of this topic within the material"),
  importance: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("Importance within this uploaded lecture"),
  examRelevance: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("Likelihood of testing on medical licensing exams"),
  concepts: z.array(ConceptSchema).describe("Medical concepts belonging to this topic"),
});

export const ConceptRelationshipSchema = z.object({
  sourceConceptName: z.string(),
  targetConceptName: z.string(),
  relationshipType: z.string().describe("e.g., innervates, inhibits, stimulates, causes, metabolized_by"),
  description: z.string().describe("Description of the physiological relationship"),
});

export const DocumentAnalysisSchema = z.object({
  subject: z.string().describe("Medical field/specialty, e.g. Cardiology, Pharmacology, Pulmonology"),
  summary: z.string().describe("High-yield executive summary of the document"),
  topics: z.array(TopicSchema).describe("Structured topics extracted from the document"),
  relationships: z.array(ConceptRelationshipSchema).describe("Inter-concept connections"),
});

export const GeneratedQuestionSchema = z.object({
  prompt: z.string().describe("Clear, unambiguous medical question or clinical vignette"),
  type: z.enum(["MCQ", "TRUE_FALSE", "CASE_BASED"]).default("MCQ"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  options: z.array(z.string()).min(2).max(5).describe("List of answer choices"),
  correctAnswer: z.string().describe("The exact text of the single correct option"),
  explanation: z.string().describe("Educational explanation grounded in the provided source chunks"),
  distractorRationale: z.record(z.string()).describe("Short rationale for each distractor explaining why it is incorrect"),
  sourceExcerpt: z.string().describe("Verbatim quote from the source chunk directly substantiating the correct answer"),
  sourcePage: z.number().describe("Source page number"),
  topicName: z.string().describe("The topic this question belongs to"),
});

export const QuestionBatchSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

export const FlashcardSchema = z.object({
  front: z.string().describe("Concise prompt, question, or term"),
  back: z.string().describe("High-yield answer with key mechanism or clinical pearl"),
  sourceExcerpt: z.string().describe("Verbatim source quote"),
  sourcePage: z.number(),
  topicName: z.string(),
});

export const FlashcardBatchSchema = z.object({
  flashcards: z.array(FlashcardSchema),
});

export const AIExplanationSchema = z.object({
  mode: z.enum(["BEGINNER", "MEDICAL_STUDENT", "EXAM_LEVEL"]),
  summary: z.string().describe("Direct, clear explanation of the concept"),
  keyMechanisms: z.array(z.string()).describe("Bullet points of physiological or pharmacological mechanisms"),
  clinicalPearl: z.string().optional().describe("High-yield memory tip or clinical board pearl"),
  sourceGroundedNote: z.string().describe("How this ties to the student's uploaded material"),
});

export const TopicDeepExplainerSchema = z.object({
  topicName: z.string().describe("Name of the topic being explained"),
  simpleOverview: z.string().describe("Explanation in plain words like an intuitive medical tutor"),
  keyMechanisms: z.array(
    z.object({
      stepNumber: z.number(),
      title: z.string(),
      explanation: z.string(),
    })
  ).describe("Step-by-step physiological or pharmacological mechanisms"),
  clinicalMnemonicsAndPearls: z.array(z.string()).describe("High-yield clinical pearls, memory rules, or mnemonics"),
  examTraps: z.array(
    z.object({
      pitfall: z.string().describe("Common confusion or board exam distractor"),
      clarification: z.string().describe("The exact truth according to medical evidence"),
    })
  ).describe("Common board exam traps and misunderstandings"),
  sourcePageReferences: z.array(z.number()).describe("Page numbers referenced from the uploaded material"),
});

export const WeakSpotItemSchema = z.object({
  conceptName: z.string().describe("The specific concept where error occurred"),
  misconception: z.string().describe("What the student incorrectly thought or selected"),
  correctPrinciple: z.string().describe("The exact clinical physiological mechanism"),
  clinicalRelevance: z.string().describe("Why this matters clinically in patient care or exams"),
  sourcePage: z.number().optional().describe("Source page to review"),
});

export const WeakSpotDiagnosisSchema = z.object({
  topicName: z.string(),
  totalQuestions: z.number(),
  incorrectCount: z.number(),
  accuracyPct: z.number(),
  overallAssessment: z.string().describe("Encouraging yet rigorous diagnostic evaluation of gaps"),
  identifiedGaps: z.array(WeakSpotItemSchema).describe("Specific conceptual weaknesses identified"),
  recommendedAction: z.string().describe("Concrete next study step to fix these weak spots"),
});
