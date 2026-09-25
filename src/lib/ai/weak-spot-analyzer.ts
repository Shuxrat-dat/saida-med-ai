import { getActiveAIConfig, isLiveAIConfigured } from "./client";
import { WeakSpotDiagnosisSchema } from "./schemas";
import { z } from "zod";

export type WeakSpotDiagnosis = z.infer<typeof WeakSpotDiagnosisSchema>;

export interface CorrectQuestionItem {
  prompt: string;
  selectedAnswerText: string;
  correctAnswerText: string;
  explanation: string;
  sourcePage?: number;
  conceptName?: string;
}

export interface IncorrectQuestionItem {
  prompt: string;
  selectedAnswerText: string;
  correctAnswerText: string;
  explanation: string;
  sourcePage?: number;
  conceptName?: string;
  questionId?: string;
}

export class WeakSpotAnalyzer {
  static async diagnoseWeakSpots(params: {
    topicName: string;
    totalQuestions: number;
    incorrectAnswers: IncorrectQuestionItem[];
    correctAnswers?: CorrectQuestionItem[];
  }): Promise<WeakSpotDiagnosis> {
    const { topicName, totalQuestions, incorrectAnswers, correctAnswers = [] } = params;
    const incorrectCount = incorrectAnswers.length;
    const correctCount = totalQuestions - incorrectCount;
    const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

    if (incorrectCount === 0) {
      const strongAreas = correctAnswers.length > 0
        ? [
            {
              areaName: "Понимание механизмов и критериев",
              accuracyPct: 100,
              evidence: correctAnswers.slice(0, 3).map((a) => a.prompt.slice(0, 140)),
            },
          ]
        : [];
      return {
        topicName,
        totalQuestions,
        incorrectCount: 0,
        accuracyPct: 100,
        overallAssessment: "Безупречный результат! Ты ответила на 100% вопросов верно. Концепты темы усвоены на высшем уровне.",
        identifiedGaps: [],
        recommendedAction: "Тема полностью освоена. Закрепи карточки через 3 дня для долгосрочной памяти, затем переходи к следующей теме.",
        strongAreas,
        weakAreas: [],
        mistakeBreakdown: [],
      };
    }

    if (!isLiveAIConfigured()) {
      return this.generateFallbackDiagnosis(topicName, totalQuestions, incorrectAnswers, accuracyPct, correctAnswers);
    }

    try {
      const { client, model } = getActiveAIConfig();

      const incorrectBreakdown = incorrectAnswers
        .map(
          (q, i) =>
            `❌ ОШИБКА ${i + 1}: "${q.prompt}"
Саида выбрала: "${q.selectedAnswerText}"
Правильный ответ: "${q.correctAnswerText}"
Пояснение к вопросу: "${q.explanation}"
${q.sourcePage ? `Стр. источника: ${q.sourcePage}` : ""}
${q.conceptName ? `Тег-понятие: ${q.conceptName}` : ""}`
        )
        .join("\n---\n");

      const correctBreakdown = correctAnswers.length > 0
        ? `✅ УСПЕШНЫЕ ОТВЕТЫ (выдели, в чём Саида сильна):
${correctAnswers.slice(0, 5).map(
  (q, i) =>
    `В+ ${i + 1}: "${q.prompt}"
Ответ: "${q.selectedAnswerText}"${q.conceptName ? ` | Понятие: ${q.conceptName}` : ""}`
).join("\n---\n")}`
        : "";

      const prompt = `Ты — клинический профессор и персональный медицинский ментор студентки Саиды.
Она только что завершила тестирование по теме «${topicName}».
Всего вопросов: ${totalQuestions}. Ошибок: ${incorrectCount}. Точность: ${accuracyPct}%.

ОШИБКИ САИДЫ:
${incorrectBreakdown}
${correctBreakdown}

ЗАДАЧА (строго по данным вопросам, НЕ выдумывай тем, которых нет в тесте):
1. overallAssessment: тактичная, ободряющая оценка наставника — на русском, 2–3 предложения.
2. identifiedGaps: для КАЖДОЙ ошибки conceptName/misconception/correctPrinciple/clinicalRelevance/sourcePage.
3. strongAreas: массив 1–3 областей, в которых Саида показала хорошее понимание. Каждая: areaName (название области), accuracyPct, evidence (2–3 коротких строки из правильных ответов).
4. weakAreas: массив 1–3 областей, которые нужно повторить. Аналогичная структура areaName/accuracyPct/evidence.
5. mistakeBreakdown: для каждой ошибки — {questionId?, concept, selectedAnswer, correctAnswer, whyWrong} с очень коротким объяснением «почему именно этот ответ неверен» (1 предложение).
6. recommendedAction: конкретное действие на 3–10 минут с упоминанием области и что повторить.

Ответ ТОЛЬКО валидный JSON по WeakSpotDiagnosisSchema.`;

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "Вы — опытный клинический наставник по медицине. Проводите точный и доброжелательный аудит ошибок на русском языке. Отвечайте только валидным JSON по заданной схеме.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.22,
        max_tokens: 2200,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty AI diagnosis response");

      const parsed = JSON.parse(raw);
      const validated = WeakSpotDiagnosisSchema.safeParse(parsed);
      if (!validated.success) {
        console.warn("Diagnosis schema failed, repairing with fallback:", validated.error.issues.slice(0, 3));
        return this.generateFallbackDiagnosis(topicName, totalQuestions, incorrectAnswers, accuracyPct, correctAnswers);
      }
      return validated.data;
    } catch (error) {
      console.warn("Live AI weak spot diagnosis failed, using clinical fallback:", error);
      return this.generateFallbackDiagnosis(topicName, totalQuestions, incorrectAnswers, accuracyPct, correctAnswers);
    }
  }

  private static conceptFromPrompt(q: IncorrectQuestionItem | CorrectQuestionItem): string {
    if (q.conceptName) return q.conceptName;
    const p = q.prompt.toLowerCase();
    if (p.includes("нерв") || p.includes("блуждающ")) return "Вегетативная иннервация пейсмейкеров";
    if (p.includes("задержк") || p.includes("ав-узел")) return "Механизм физиологической АВ-задержки";
    if (p.includes("рецептор") || p.includes("бета") || p.includes("альфа")) return "Селективность подтипов адренорецепторов";
    if (p.includes("канал") || p.includes("funny") || p.includes("ион")) return "Ионные каналы автоматизма (If / Ca-каналы)";
    if (p.includes("лечени") || p.includes("препарат") || p.includes("фармак")) return "Фармакотерапия и подбор препарата";
    if (p.includes("симптом") || p.includes("признак") || p.includes("жалоб")) return "Клинические симптомы и синдромы";
    if (p.includes("диагност") || p.includes("экг") || p.includes("анализ")) return "Диагностические критерии и методы";
    if (p.includes("патогенез") || p.includes("механизм")) return "Патогенез и ключевой механизм";
    return "Общие понятия темы";
  }

  private static generateFallbackDiagnosis(
    topicName: string,
    totalQuestions: number,
    incorrectAnswers: IncorrectQuestionItem[],
    accuracyPct: number,
    correctAnswers: CorrectQuestionItem[] = []
  ): WeakSpotDiagnosis {
    const mistakesByConcept = new Map<string, { total: number; incorrect: number; evidence: string[]; correctEvidence: string[] }>();

    const countByConcept = (items: (IncorrectQuestionItem | CorrectQuestionItem)[], isIncorrect: boolean) => {
      for (const q of items) {
        const concept = this.conceptFromPrompt(q);
        if (!mistakesByConcept.has(concept)) {
          mistakesByConcept.set(concept, { total: 0, incorrect: 0, evidence: [], correctEvidence: [] });
        }
        const rec = mistakesByConcept.get(concept)!;
        rec.total += 1;
        if (isIncorrect) {
          rec.incorrect += 1;
          rec.evidence.push(q.prompt.slice(0, 140));
        } else {
          rec.correctEvidence.push(q.prompt.slice(0, 140));
        }
      }
    };
    countByConcept(incorrectAnswers, true);
    countByConcept(correctAnswers, false);

    const weakAreas = [...mistakesByConcept.entries()]
      .filter(([, v]) => v.incorrect > 0)
      .sort((a, b) => b[1].incorrect - a[1].incorrect)
      .slice(0, 3)
      .map(([areaName, v]) => ({
        areaName,
        accuracyPct: v.total > 0 ? Math.round(((v.total - v.incorrect) / v.total) * 100) : 0,
        evidence: v.evidence,
      }));

    const strongAreas = [...mistakesByConcept.entries()]
      .filter(([, v]) => v.incorrect === 0 && v.total > 0)
      .slice(0, 3)
      .map(([areaName, v]) => ({
        areaName,
        accuracyPct: 100,
        evidence: v.correctEvidence.slice(0, 3),
      }));

    if (strongAreas.length === 0 && correctAnswers.length > 0) {
      strongAreas.push({
        areaName: "Общее клиническое мышление",
        accuracyPct: correctAnswers.length / Math.max(1, totalQuestions) * 100,
        evidence: correctAnswers.slice(0, 2).map((a) => a.prompt.slice(0, 140)),
      });
    }

    const identifiedGaps = incorrectAnswers.map((q) => ({
      conceptName: this.conceptFromPrompt(q),
      misconception: `Был выбран вариант «${q.selectedAnswerText}» — отражает путаницу с правильным патогенетическим/диагностическим звеном.`,
      correctPrinciple: q.correctAnswerText ? `Правильный принцип: «${q.correctAnswerText}». ${q.explanation}` : q.explanation,
      clinicalRelevance: "Понимание этого механизма критично для назначения терапии, интерпретации ЭКГ/анализов и постановки диагноза.",
      sourcePage: q.sourcePage,
    }));

    const mistakeBreakdown = incorrectAnswers.map((q) => ({
      questionId: q.questionId,
      concept: this.conceptFromPrompt(q),
      selectedAnswer: q.selectedAnswerText,
      correctAnswer: q.correctAnswerText,
      whyWrong: `Ответ «${q.selectedAnswerText}» неверен, потому что противоречит ключевому механизму/критерию: ${q.explanation.slice(0, 160)}`,
      sourcePage: q.sourcePage,
    }));

    const topWeak = weakAreas[0]?.areaName || "базовые механизмы темы";
    const action = weakAreas.length > 0
      ? `Повтори понятия/раздел: ${weakAreas.map((w) => w.areaName).join(", ")}. Сфокусируйся на whyWrong разборе каждой ошибки выше, затем пройди мини-тест из 3–5 вопросов только по слабым местам.`
      : "Повтори ключевые понятия темы и карточки через день.";

    return {
      topicName,
      totalQuestions,
      incorrectCount: incorrectAnswers.length,
      accuracyPct,
      overallAssessment:
        accuracyPct >= 70
          ? `Хороший базовый уровень по «${topicName}» (${accuracyPct}%), но есть точечные клинические нюансы в «${topWeak}», которые нужно подтянуть.`
          : `Материал темы «${topicName}» требует повторения ключевых звеньев (${accuracyPct}% правильных). Ниже выделены конкретные механизмы, где возникла путаница — не сдавайся!`,
      identifiedGaps,
      recommendedAction: action,
      strongAreas,
      weakAreas,
      mistakeBreakdown,
    };
  }
}
