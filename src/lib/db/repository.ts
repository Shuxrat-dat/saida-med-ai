import { prisma } from "./prisma";
import {
  MockMaterial,
  MockTopic,
  MockQuestion,
  MockFlashcard,
  MockStudySession,
  StudyStats,
} from "./mock-data";

export async function getDefaultUser() {
  const email = process.env.DEFAULT_STUDENT_EMAIL || "saida@med.ai";
  const name = process.env.DEFAULT_STUDENT_NAME || "Saida";
  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name },
      });
    }
    return user;
  } catch (error: any) {
    console.error("[Database Error] getDefaultUser failed:", error?.code || error?.message || error);
    throw error;
  }
}

export class MedicalRepository {
  /**
   * Deterministic mastery level 0-5 based on accuracy, attempts, and correct streak.
   * 0 = не изучено, 1 = начато, 2 = изучается, 3 = базовое, 4 = хорошее, 5 = уверенное
   */
  static calculateMastery(accuracy: number, totalAttempts: number, streakCorrect = 0): number {
    if (totalAttempts <= 0) return 0;
    if (totalAttempts === 1) return accuracy >= 0.5 ? 1 : 1;
    const rawScore = accuracy * 0.7 + Math.min(1, totalAttempts / 10) * 0.2 + Math.min(1, streakCorrect / 3) * 0.1;
    let level = 1;
    if (rawScore >= 0.35) level = 2;
    if (rawScore >= 0.55) level = 3;
    if (rawScore >= 0.75) level = 4;
    if (rawScore >= 0.9 && totalAttempts >= 5 && streakCorrect >= 2) level = 5;
    if (totalAttempts < 3 && level > 2) level = 2;
    if (totalAttempts < 2 && level > 1) level = 1;
    return level;
  }

  /**
   * SM-2-inspired review interval adjustment for TopicPerformance.nextReviewAt.
   * Returns new nextReviewAt Date and updated reviewCount/streakCorrect.
   */
  static adjustReviewInterval(params: {
    currentReviewCount: number;
    currentStreak: number;
    accuracy: number;
    totalAttempts: number;
  }): { nextReviewAt: Date; newReviewCount: number; newStreak: number } {
    const { currentReviewCount = 0, currentStreak = 0, accuracy, totalAttempts } = params;
    let newStreak = currentStreak;
    let intervalDays = 1;
    if (accuracy >= 0.7) {
      newStreak = currentStreak + 1;
      const step = Math.min(newStreak, 6);
      intervalDays = [1, 2, 4, 7, 14, 21, 30][step] ?? 30;
      if (accuracy >= 0.9 && totalAttempts >= 5) intervalDays = Math.round(intervalDays * 1.2);
    } else if (accuracy >= 0.4) {
      newStreak = Math.max(0, currentStreak - 1);
      intervalDays = 1;
    } else {
      newStreak = 0;
      intervalDays = 0;
    }
    const next = new Date();
    next.setHours(9, 0, 0, 0);
    next.setDate(next.getDate() + Math.max(0, intervalDays));
    return { nextReviewAt: next, newReviewCount: currentReviewCount + 1, newStreak };
  }

  /**
   * READ: Returns topic performances due for review at or before the given date (default: today 23:59).
   * Includes topic name, material info via joined TopicPerformance.topic relation.
   */
  static async getTopicsDueForReview(referenceDate?: Date): Promise<MockTopic[]> {
    try {
      const user = await getDefaultUser();
      const refDate = referenceDate ?? new Date();
      refDate.setHours(23, 59, 59, 999);
      const duePerfs = await prisma.topicPerformance.findMany({
        where: {
          userId: user.id,
          nextReviewAt: { lte: refDate },
        },
        include: {
          topic: {
            include: {
              concepts: {
                include: { facts: true },
              },
            },
          },
        },
        orderBy: { nextReviewAt: "asc" },
      });
      return duePerfs.map((p) => ({
        id: p.topic.id,
        materialId: p.topic.materialId,
        name: p.topic.name,
        description: p.topic.description || "",
        importance: p.topic.importance as any,
        examRelevance: p.topic.examRelevance as any,
        accuracyRate: p.accuracyRate,
        totalAttempts: p.totalAttempts,
        correctAttempts: p.correctAttempts,
        isWeakTopic: p.isWeakTopic,
        masteryLevel: p.masteryLevel,
        lastStudiedAt: p.lastStudiedAt.toISOString(),
        nextReviewAt: p.nextReviewAt.toISOString(),
        reviewCount: p.reviewCount,
        streakCorrect: p.streakCorrect,
        concepts: p.topic.concepts.map((c) => ({
          id: c.id,
          name: c.name,
          definition: c.definition,
          clinicalSignificance: c.clinicalSignificance || undefined,
          facts: c.facts.map((f) => ({
            fact: f.fact,
            sourcePage: f.sourcePage || 1,
            isHighYield: f.isHighYield,
          })),
        })),
      }));
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.getTopicsDueForReview failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * READ: Returns all materials from PostgreSQL
   */
  static async getMaterials(): Promise<MockMaterial[]> {
    try {
      const dbMaterials = await prisma.material.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { topics: true, questions: true } },
          pages: { orderBy: { pageNumber: "asc" } },
        },
      });

      return dbMaterials.map((m) => ({
        id: m.id,
        title: m.title,
        subject: m.subject || "General Medicine",
        fileType: m.fileType,
        fileUrl: m.fileUrl,
        fileKey: m.fileKey || undefined,
        fileSize: m.fileSize,
        pageCount: m.pageCount,
        status: m.status as any,
        processingStep: m.processingStep || undefined,
        summary: m.summary || "",
        createdAt: m.createdAt.toISOString(),
        topicsCount: m._count.topics,
        questionsCount: m._count.questions,
        pages: m.pages.map((p) => ({
          pageNumber: p.pageNumber,
          text: p.extractedText,
          imageUrl: p.imageUrl || undefined,
          qualityScore: p.ocrQuality || 1.0,
        })),
      }));
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.getMaterials failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * READ: Returns a single material by ID from PostgreSQL
   */
  static async getMaterialById(id: string): Promise<MockMaterial | null> {
    try {
      const m = await prisma.material.findUnique({
        where: { id },
        include: {
          _count: { select: { topics: true, questions: true } },
          pages: { orderBy: { pageNumber: "asc" } },
          topics: {
            include: {
              concepts: {
                include: { facts: true },
              },
              performance: true,
            },
          },
        },
      });

      if (!m) return null;

      return {
        id: m.id,
        title: m.title,
        subject: m.subject || "General Medicine",
        fileType: m.fileType,
        fileUrl: m.fileUrl,
        fileSize: m.fileSize,
        pageCount: m.pageCount,
        status: m.status as any,
        processingStep: m.processingStep || undefined,
        summary: m.summary || "",
        createdAt: m.createdAt.toISOString(),
        topicsCount: m._count.topics,
        questionsCount: m._count.questions,
        fileKey: m.fileKey || undefined,
        pages: m.pages.map((p) => ({
          pageNumber: p.pageNumber,
          text: p.extractedText,
          imageUrl: p.imageUrl || undefined,
          qualityScore: p.ocrQuality || 1.0,
        })),
      };
    } catch (error: any) {
      console.error(`[Database Error] MedicalRepository.getMaterialById(${id}) failed:`, error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * CREATE: Persists material, pages, topics, concepts, key facts, and questions into PostgreSQL
   */
  static async createMaterial(params: {
    id?: string;
    title: string;
    subject?: string;
    fileType: string;
    fileUrl: string;
    fileKey?: string;
    fileSize: number;
    pageCount: number;
    status?: "READY" | "UPLOADING" | "PROCESSING" | "ANALYZING" | "FAILED";
    summary?: string;
    pages?: { pageNumber: number; text: string; imageUrl?: string; qualityScore?: number }[];
    topics?: {
      name: string;
      description?: string;
      importance?: "HIGH" | "MEDIUM" | "LOW";
      examRelevance?: "HIGH" | "MEDIUM" | "LOW";
      concepts?: {
        name: string;
        definition: string;
        clinicalSignificance?: string;
        facts?: { fact: string; sourcePage?: number; isHighYield?: boolean }[];
      }[];
    }[];
    questions?: {
      prompt: string;
      topicIndex?: number;
      type?: "MCQ" | "TRUE_FALSE" | "CASE_BASED";
      difficulty?: "EASY" | "MEDIUM" | "HARD";
      options: string[] | { id: string; text: string }[];
      correctAnswer: string;
      explanation: string;
      distractorRationale?: any;
      sourceExcerpt: string;
      sourcePage: number;
    }[];
  }): Promise<MockMaterial> {
    try {
      const user = await getDefaultUser();
      const materialId = params.id || `mat-${Date.now()}`;

      // 1. Create Material, Pages, Topics, Concepts, and Facts in PostgreSQL
      const created = await prisma.material.create({
        data: {
          id: materialId,
          userId: user.id,
          title: params.title,
          subject: params.subject || "Общая медицина",
          fileType: params.fileType,
          fileUrl: params.fileUrl,
          fileKey: params.fileKey || `materials/${materialId}/source`,
          fileSize: params.fileSize,
          pageCount: params.pageCount,
          status: params.status || "READY",
          summary: params.summary || "",
          pages: {
            create: (params.pages || []).map((p) => ({
              pageNumber: p.pageNumber,
              extractedText: p.text,
              imageUrl: p.imageUrl,
              ocrQuality: p.qualityScore ?? 1.0,
            })),
          },
          topics: {
            create: (params.topics || []).map((t, tIdx) => ({
              name: t.name,
              description: t.description || "",
              importance: t.importance || "MEDIUM",
              examRelevance: t.examRelevance || "MEDIUM",
              orderIndex: tIdx,
              concepts: {
                create: (t.concepts || []).map((c, cIdx) => ({
                  name: c.name,
                  definition: c.definition,
                  clinicalSignificance: c.clinicalSignificance,
                  orderIndex: cIdx,
                  facts: {
                    create: (c.facts || []).map((f) => ({
                      fact: f.fact,
                      sourcePage: f.sourcePage || 1,
                      isHighYield: f.isHighYield ?? false,
                    })),
                  },
                })),
              },
            })),
          },
        },
        include: {
          topics: {
            include: {
              concepts: true,
            },
          },
        },
      });

      // 2. Persist Flashcards in PostgreSQL for each created concept
      for (const top of created.topics) {
        for (const con of top.concepts) {
          try {
            await prisma.flashcard.create({
              data: {
                userId: user.id,
                materialId: created.id,
                topicId: top.id,
                conceptId: con.id,
                front: con.name,
                back: `${con.definition}${
                  con.clinicalSignificance ? `\n\nКлиническое значение: ${con.clinicalSignificance}` : ""
                }`,
                sourcePage: 1,
                interval: 1,
                repetitions: 0,
                easeFactor: 2.5,
                nextReviewAt: new Date(),
              },
            });
          } catch (fcErr) {
            console.error("[Database Warning] Could not save flashcard:", fcErr);
          }
        }
      }

      // 3. Persist Questions in PostgreSQL linked to Material and primary Topic
      if (params.questions && params.questions.length > 0) {
        const defaultTopicId = created.topics[0]?.id;
        for (const q of params.questions) {
          const assignedTopicId =
            (q.topicIndex !== undefined && created.topics[q.topicIndex]?.id) ||
            defaultTopicId;

          if (assignedTopicId) {
            try {
              await prisma.question.create({
                data: {
                  materialId: created.id,
                  topicId: assignedTopicId,
                  prompt: q.prompt,
                  type: q.type || "MCQ",
                  difficulty: q.difficulty || "MEDIUM",
                  options: q.options as any,
                  correctAnswer: q.correctAnswer,
                  explanation: q.explanation,
                  distractorRationale: q.distractorRationale || {},
                  sourceExcerpt: q.sourceExcerpt,
                  sourcePage: q.sourcePage || 1,
                },
              });
            } catch (qErr) {
              console.error("[Database Warning] Could not save question:", qErr);
            }
          }
        }
      }

      const result = await this.getMaterialById(created.id);
      if (!result) throw new Error("Material was created but could not be re-fetched from DB.");
      return result;
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.createMaterial failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * UPDATE: Updates material title, subject, summary, status
   */
  static async updateMaterial(
    id: string,
    data: {
      title?: string;
      subject?: string;
      summary?: string;
      status?: "READY" | "UPLOADING" | "PROCESSING" | "ANALYZING" | "FAILED";
      processingStep?: string;
    }
  ): Promise<MockMaterial> {
    try {
      await prisma.material.update({
        where: { id },
        data,
      });
      const updated = await this.getMaterialById(id);
      if (!updated) throw new Error(`Material ${id} not found after update`);
      return updated;
    } catch (error: any) {
      console.error(`[Database Error] MedicalRepository.updateMaterial(${id}) failed:`, error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * DELETE: Cascading delete of a material and all related entities from PostgreSQL
   */
  static async deleteMaterial(id: string): Promise<boolean> {
    try {
      await prisma.material.delete({
        where: { id },
      });
      return true;
    } catch (error: any) {
      console.error(`[Database Error] MedicalRepository.deleteMaterial(${id}) failed:`, error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * UPDATE: Updates extracted page text for a material in PostgreSQL
   */
  static async updateMaterialPages(
    materialId: string,
    updatedPages: { pageNumber: number; text: string; imageUrl?: string; qualityScore?: number }[]
  ): Promise<MockMaterial | null> {
    try {
      for (const p of updatedPages) {
        await prisma.materialPage.upsert({
          where: {
            materialId_pageNumber: {
              materialId,
              pageNumber: p.pageNumber,
            },
          },
          update: {
            extractedText: p.text,
            imageUrl: p.imageUrl,
            ocrQuality: p.qualityScore ?? 1.0,
          },
          create: {
            materialId,
            pageNumber: p.pageNumber,
            extractedText: p.text,
            imageUrl: p.imageUrl,
            ocrQuality: p.qualityScore ?? 1.0,
          },
        });
      }

      return this.getMaterialById(materialId);
    } catch (error: any) {
      console.error(`[Database Error] MedicalRepository.updateMaterialPages(${materialId}) failed:`, error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * READ: Returns topics from PostgreSQL, optionally filtered by materialId
   */
  static async getTopicsByMaterial(materialId?: string): Promise<MockTopic[]> {
    try {
      const dbTopics = await prisma.topic.findMany({
        where: materialId ? { materialId } : undefined,
        include: {
          concepts: {
            include: { facts: true },
          },
          performance: true,
        },
      });

      return dbTopics.map((t) => {
        const perf = t.performance[0];
        return {
          id: t.id,
          materialId: t.materialId,
          name: t.name,
          description: t.description || "",
          importance: t.importance as any,
          examRelevance: t.examRelevance as any,
          accuracyRate: perf ? perf.accuracyRate : 0,
          totalAttempts: perf ? perf.totalAttempts : 0,
          correctAttempts: perf ? perf.correctAttempts : 0,
          isWeakTopic: perf ? perf.isWeakTopic : false,
          masteryLevel: perf ? perf.masteryLevel : 0,
          lastStudiedAt: perf ? perf.lastStudiedAt.toISOString() : undefined,
          nextReviewAt: perf ? perf.nextReviewAt.toISOString() : undefined,
          reviewCount: perf ? perf.reviewCount : 0,
          streakCorrect: perf ? perf.streakCorrect : 0,
          concepts: t.concepts.map((c) => ({
            id: c.id,
            name: c.name,
            definition: c.definition,
            clinicalSignificance: c.clinicalSignificance || undefined,
            facts: c.facts.map((f) => ({
              fact: f.fact,
              sourcePage: f.sourcePage || 1,
              isHighYield: f.isHighYield,
            })),
          })),
        };
      });
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.getTopicsByMaterial failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * READ: Evaluates and returns weak topics based on real performance in PostgreSQL
   */
  static async getWeakTopics(): Promise<MockTopic[]> {
    const all = await this.getTopicsByMaterial();
    return all.filter((t) => t.isWeakTopic || (t.totalAttempts >= 3 && t.accuracyRate < 0.65));
  }

  /**
   * READ: Returns questions from PostgreSQL matching filter
   */
  static async getQuestions(filter?: {
    materialId?: string;
    topicId?: string;
    weakOnly?: boolean;
    limit?: number;
  }): Promise<MockQuestion[]> {
    try {
      let weakTopicIds: string[] | undefined;
      if (filter?.weakOnly) {
        const weak = await this.getWeakTopics();
        weakTopicIds = weak.map((w) => w.id);
      }

      const dbQuestions = await prisma.question.findMany({
        where: {
          materialId: filter?.materialId,
          topicId: filter?.topicId
            ? filter.topicId
            : weakTopicIds
            ? { in: weakTopicIds }
            : undefined,
          validationStatus: "VALID",
        },
        include: {
          material: { select: { title: true } },
          topic: { select: { name: true } },
        },
        take: filter?.limit || 20,
      });

      return dbQuestions.map((q) => ({
        id: q.id,
        materialId: q.materialId,
        materialTitle: q.material.title,
        topicId: q.topicId,
        topicName: q.topic.name,
        type: q.type as any,
        difficulty: q.difficulty as any,
        prompt: q.prompt,
        options: q.options as any,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        distractorRationale: (q.distractorRationale as any) || {},
        sourceExcerpt: q.sourceExcerpt,
        sourcePage: q.sourcePage,
      }));
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.getQuestions failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * READ: Returns a single question by ID from PostgreSQL
   */
  static async getQuestionById(id: string): Promise<MockQuestion | null> {
    try {
      const q = await prisma.question.findUnique({
        where: { id },
        include: {
          material: { select: { title: true } },
          topic: { select: { name: true } },
        },
      });

      if (!q) return null;

      return {
        id: q.id,
        materialId: q.materialId,
        materialTitle: q.material.title,
        topicId: q.topicId,
        topicName: q.topic.name,
        type: q.type as any,
        difficulty: q.difficulty as any,
        prompt: q.prompt,
        options: q.options as any,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        distractorRationale: (q.distractorRationale as any) || {},
        sourceExcerpt: q.sourceExcerpt,
        sourcePage: q.sourcePage,
      };
    } catch (error: any) {
      console.error(`[Database Error] MedicalRepository.getQuestionById(${id}) failed:`, error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * CREATE: Adds a newly generated question directly to PostgreSQL
   */
  static async createQuestion(data: {
    id?: string;
    materialId: string;
    topicId: string;
    type?: "MCQ" | "TRUE_FALSE" | "CASE_BASED";
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    prompt: string;
    options: any;
    correctAnswer: string;
    explanation: string;
    distractorRationale?: any;
    sourceExcerpt: string;
    sourcePage: number;
  }): Promise<MockQuestion> {
    try {
      const q = await prisma.question.create({
        data: {
          id: data.id,
          materialId: data.materialId,
          topicId: data.topicId,
          type: data.type || "MCQ",
          difficulty: data.difficulty || "MEDIUM",
          prompt: data.prompt,
          options: data.options,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
          distractorRationale: data.distractorRationale || {},
          sourceExcerpt: data.sourceExcerpt,
          sourcePage: data.sourcePage,
        },
        include: {
          material: { select: { title: true } },
          topic: { select: { name: true } },
        },
      });

      return {
        id: q.id,
        materialId: q.materialId,
        materialTitle: q.material.title,
        topicId: q.topicId,
        topicName: q.topic.name,
        type: q.type as any,
        difficulty: q.difficulty as any,
        prompt: q.prompt,
        options: q.options as any,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        distractorRationale: (q.distractorRationale as any) || {},
        sourceExcerpt: q.sourceExcerpt,
        sourcePage: q.sourcePage,
      };
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.createQuestion failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * READ: Returns all flashcards ordered by next review date
   */
  static async getFlashcards(): Promise<MockFlashcard[]> {
    try {
      const dbCards = await prisma.flashcard.findMany({
        include: {
          topic: { select: { name: true } },
        },
        orderBy: { nextReviewAt: "asc" },
      });

      return dbCards.map((f) => ({
        id: f.id,
        materialId: f.materialId,
        topicId: f.topicId,
        topicName: f.topic.name,
        front: f.front,
        back: f.back,
        sourceExcerpt: f.sourceExcerpt || "",
        sourcePage: f.sourcePage || 1,
        interval: f.interval,
        repetitions: f.repetitions,
        easeFactor: f.easeFactor,
        nextReviewAt: f.nextReviewAt.toISOString(),
      }));
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.getFlashcards failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * UPDATE: Updates SuperMemo SM-2 parameters for a flashcard in PostgreSQL
   */
  static async updateFlashcard(
    id: string,
    rating: "AGAIN" | "HARD" | "GOOD" | "EASY"
  ): Promise<MockFlashcard | null> {
    try {
      const card = await prisma.flashcard.findUnique({
        where: { id },
        include: { topic: { select: { name: true } } },
      });
      if (!card) return null;

      // SuperMemo SM-2 calculation
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

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + interval);

      const [updatedCard] = await prisma.$transaction([
        prisma.flashcard.update({
          where: { id },
          data: {
            repetitions,
            interval,
            easeFactor,
            nextReviewAt: nextDate,
          },
          include: { topic: { select: { name: true } } },
        }),
        prisma.flashcardReview.create({
          data: {
            flashcardId: id,
            rating,
          },
        }),
      ]);

      return {
        id: updatedCard.id,
        materialId: updatedCard.materialId,
        topicId: updatedCard.topicId,
        topicName: updatedCard.topic.name,
        front: updatedCard.front,
        back: updatedCard.back,
        sourceExcerpt: updatedCard.sourceExcerpt || "",
        sourcePage: updatedCard.sourcePage || 1,
        interval: updatedCard.interval,
        repetitions: updatedCard.repetitions,
        easeFactor: updatedCard.easeFactor,
        nextReviewAt: updatedCard.nextReviewAt.toISOString(),
      };
    } catch (error: any) {
      console.error(`[Database Error] MedicalRepository.updateFlashcard(${id}) failed:`, error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * CREATE: Records a quiz session, updates question metrics, and updates topic performance (mastery/review) in PostgreSQL
   */
  static async recordQuizSession(params: {
    materialId?: string;
    durationSeconds?: number;
    answers: {
      questionId?: string;
      topicId?: string;
      isCorrect: boolean;
    }[];
  }): Promise<{ success: boolean; session: MockStudySession; updatedTopics: MockTopic[] }> {
    try {
      const user = await getDefaultUser();
      const { materialId, durationSeconds = 60, answers } = params;
      const totalQuestions = answers.length;
      const correctCount = answers.filter((a) => a.isCorrect).length;
      const accuracy = totalQuestions > 0 ? Number((correctCount / totalQuestions).toFixed(2)) : 0;

      const dbSession = await prisma.studySession.create({
        data: {
          userId: user.id,
          sessionType: "QUIZ",
          durationSeconds,
          questionsAnswered: totalQuestions,
          accuracy,
        },
      });

      const perTopicStats = new Map<string, { total: number; correct: number; questionIds: string[] }>();
      for (const ans of answers) {
        if (ans.questionId) {
          try {
            await prisma.question.update({
              where: { id: ans.questionId },
              data: {
                timesAnswered: { increment: 1 },
                timesCorrect: ans.isCorrect ? { increment: 1 } : undefined,
              },
            });
          } catch (e: any) {
            console.warn(`[Database Warning] Question stat update failed for ${ans.questionId}:`, e?.message || e);
          }
        }
        if (ans.topicId) {
          const key = ans.topicId;
          if (!perTopicStats.has(key)) perTopicStats.set(key, { total: 0, correct: 0, questionIds: [] });
          const stat = perTopicStats.get(key)!;
          stat.total += 1;
          if (ans.isCorrect) stat.correct += 1;
          if (ans.questionId) stat.questionIds.push(ans.questionId);
        }
      }

      const now = new Date();
      const updatedTopics: MockTopic[] = [];
      for (const [topicId, stat] of perTopicStats.entries()) {
        const sessionAccuracy = stat.total > 0 ? stat.correct / stat.total : 0;
        const existing = await prisma.topicPerformance.findUnique({
          where: { userId_topicId: { userId: user.id, topicId } },
        });

        const curTotal = (existing?.totalAttempts || 0) + stat.total;
        const curCorrect = (existing?.correctAttempts || 0) + stat.correct;
        const curRate = Number((curCorrect / curTotal).toFixed(2));
        const isWeak = curTotal >= 3 && curRate < 0.65;
        const currentStreak = existing?.streakCorrect || 0;
        const curStreak = sessionAccuracy >= 0.7 ? currentStreak + 1 : sessionAccuracy >= 0.4 ? Math.max(0, currentStreak - 1) : 0;
        const masteryLevel = this.calculateMastery(curRate, curTotal, curStreak);

        const intervalResult = this.adjustReviewInterval({
          currentReviewCount: existing?.reviewCount || 0,
          currentStreak: curStreak,
          accuracy: sessionAccuracy,
          totalAttempts: curTotal,
        });

        const updatedPerf = await prisma.topicPerformance.upsert({
          where: { userId_topicId: { userId: user.id, topicId } },
          create: {
            userId: user.id,
            topicId,
            totalAttempts: curTotal,
            correctAttempts: curCorrect,
            accuracyRate: curRate,
            isWeakTopic: isWeak,
            masteryLevel,
            lastAttemptedAt: now,
            lastStudiedAt: now,
            nextReviewAt: intervalResult.nextReviewAt,
            reviewCount: intervalResult.newReviewCount,
            streakCorrect: curStreak,
          },
          update: {
            totalAttempts: curTotal,
            correctAttempts: curCorrect,
            accuracyRate: curRate,
            isWeakTopic: isWeak,
            masteryLevel,
            lastAttemptedAt: now,
            lastStudiedAt: now,
            nextReviewAt: intervalResult.nextReviewAt,
            reviewCount: intervalResult.newReviewCount,
            streakCorrect: curStreak,
          },
          include: {
            topic: {
              include: { concepts: { include: { facts: true } } },
            },
          },
        });

        if (updatedPerf.topic && !updatedTopics.find((u) => u.id === updatedPerf.topic.id)) {
          updatedTopics.push({
            id: updatedPerf.topic.id,
            materialId: updatedPerf.topic.materialId,
            name: updatedPerf.topic.name,
            description: updatedPerf.topic.description || "",
            importance: updatedPerf.topic.importance as any,
            examRelevance: updatedPerf.topic.examRelevance as any,
            accuracyRate: curRate,
            totalAttempts: curTotal,
            correctAttempts: curCorrect,
            isWeakTopic: isWeak,
            masteryLevel,
            lastStudiedAt: now.toISOString(),
            nextReviewAt: intervalResult.nextReviewAt.toISOString(),
            reviewCount: intervalResult.newReviewCount,
            streakCorrect: curStreak,
            concepts: updatedPerf.topic.concepts.map((c) => ({
              id: c.id,
              name: c.name,
              definition: c.definition,
              clinicalSignificance: c.clinicalSignificance || undefined,
              facts: c.facts.map((f) => ({
                fact: f.fact,
                sourcePage: f.sourcePage || 1,
                isHighYield: f.isHighYield,
              })),
            })),
          });
        }
      }

      return {
        success: true,
        session: {
          id: dbSession.id,
          materialId,
          sessionType: "QUIZ",
          durationSeconds: dbSession.durationSeconds,
          questionsAnswered: dbSession.questionsAnswered,
          correctAnswers: correctCount,
          accuracy: dbSession.accuracy || 0,
          createdAt: dbSession.createdAt.toISOString(),
        },
        updatedTopics,
      };
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.recordQuizSession failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * READ: Returns study sessions for the user from PostgreSQL
   */
  static async getStudySessions(): Promise<MockStudySession[]> {
    try {
      const user = await getDefaultUser();
      const dbSessions = await prisma.studySession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return dbSessions.map((s) => ({
        id: s.id,
        sessionType: s.sessionType as any,
        durationSeconds: s.durationSeconds,
        questionsAnswered: s.questionsAnswered,
        correctAnswers: Math.round((s.accuracy || 0) * s.questionsAnswered),
        accuracy: s.accuracy || 0,
        createdAt: s.createdAt.toISOString(),
      }));
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.getStudySessions failed:", error?.code, error?.message || error);
      throw error;
    }
  }

  /**
   * READ: Dynamically computes study statistics from real PostgreSQL tables
   */
  static async getStudyStats(): Promise<StudyStats> {
    try {
      const user = await getDefaultUser();
      const [topics, sessions, performances, dueTopics] = await Promise.all([
        this.getTopicsByMaterial(),
        this.getStudySessions(),
        prisma.topicPerformance.findMany({ where: { userId: user.id } }),
        this.getTopicsDueForReview(),
      ]);

      let totalAttempts = 0;
      let totalCorrect = 0;
      for (const p of performances) {
        totalAttempts += p.totalAttempts;
        totalCorrect += p.correctAttempts;
      }

      const overallAccuracy =
        totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
      const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      const studyTimeHours = Number((totalSeconds / 3600).toFixed(1));

      const today = new Date().toISOString().slice(0, 10);
      const todaySessions = sessions.filter((s) => s.createdAt.startsWith(today));
      const completedToday = todaySessions.reduce(
        (acc, s) => acc + (s.questionsAnswered || 0),
        0
      );
      const dailyGoal = 50;
      const dailyProgressPct = dailyGoal > 0 ? Math.min(100, Math.round((completedToday / dailyGoal) * 100)) : 0;

      const weakTopics = topics.filter(
        (t) => t.isWeakTopic || (t.totalAttempts >= 3 && t.accuracyRate < 0.65)
      );
      const strongTopics = topics.filter(
        (t) => t.accuracyRate >= 0.75 && t.totalAttempts >= 3
      );

      let retentionRate: "Высокое" | "Среднее" | "Требует внимания" = "Среднее";
      if (totalAttempts > 0) {
        if (overallAccuracy >= 75) {
          retentionRate = "Высокое";
        } else if (overallAccuracy < 60) {
          retentionRate = "Требует внимания";
        }
      }

      const totalTopicsStudied = topics.filter((t) => t.totalAttempts > 0).length;
      const topicsDueToday = dueTopics;
      const dueTodayCount = topicsDueToday.length;

      return {
        streakDays: sessions.length > 0 ? 1 : 0,
        overallAccuracy,
        totalQuestionsAnswered: totalAttempts,
        studyTimeHours,
        retentionRate,
        weakTopics,
        strongTopics,
        completedToday,
        dailyGoal,
        dailyProgressPct,
        totalTopicsStudied,
        topicsDueToday,
        dueTodayCount,
      };
    } catch (error: any) {
      console.error("[Database Error] MedicalRepository.getStudyStats failed:", error?.code, error?.message || error);
      throw error;
    }
  }
}
