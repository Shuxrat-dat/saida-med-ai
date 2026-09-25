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

export const MissingSectionSchema = z.object({
  sectionKey: z.string(),
  reason: z.string().describe("Why this section is marked missing/not present in source material"),
});

export const TopicDeepExplainerSchema = z.object({
  topicName: z.string().describe("Name of the topic being explained"),
  whatIsIt: z.string().describe("1. Что это такое — простое и медицински корректное определение темы"),
  whyItOccurs: z.string().describe("2. Почему возникает — этиология, причины, триггеры"),
  pathogenesis: z.string().describe("3. Механизм / патогенез — ключевой патофизиологический каскад"),
  mainSigns: z.string().describe("4. Основные признаки — симптомы, синдромы, объективные данные"),
  classification: z.string().describe("5. Классификация — виды, стадии, степени, если есть в источнике"),
  diagnostics: z.string().describe("6. Диагностика — методы обследования, критерии, если есть"),
  treatmentApproaches: z.string().describe("7. Лечение / подходы — терапия согласно материалу, если описана"),
  keyPointsToRemember: z.array(z.string()).describe("8. Что особенно важно запомнить — high-yield список"),
  sourcePageReferences: z.array(z.number()).describe("Page numbers referenced from the uploaded material"),
  missingFromSource: z.array(MissingSectionSchema).describe("Разделы, которых НЕТ в исходном материале (AI их не выдумывал)"),
});

export const WeakSpotAreaSchema = z.object({
  areaName: z.string().describe("Название области/понятия (тема или понятие)"),
  accuracyPct: z.number().describe("Процент правильных ответов в этой области"),
  evidence: z.array(z.string()).describe("Конкретные вопросы/ошибки, подтверждающие оценку"),
});

export const MistakeBreakdownSchema = z.object({
  questionId: z.string().optional(),
  concept: z.string(),
  selectedAnswer: z.string(),
  correctAnswer: z.string(),
  whyWrong: z.string().describe("Короткое понятное объяснение: почему ответ пользователя неверен"),
  sourcePage: z.number().optional(),
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
  strongAreas: z.array(WeakSpotAreaSchema).describe("Области, в которых пользователь хорошо справился"),
  weakAreas: z.array(WeakSpotAreaSchema).describe("Области, которые нужно повторить"),
  mistakeBreakdown: z.array(MistakeBreakdownSchema).describe("Разбор каждой ошибки: почему ошиблась"),
});
