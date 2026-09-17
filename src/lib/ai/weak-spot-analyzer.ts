import { getActiveAIConfig, isLiveAIConfigured } from "./client";
import { WeakSpotDiagnosisSchema } from "./schemas";
import { z } from "zod";

export type WeakSpotDiagnosis = z.infer<typeof WeakSpotDiagnosisSchema>;

export interface IncorrectQuestionItem {
  prompt: string;
  selectedAnswerText: string;
  correctAnswerText: string;
  explanation: string;
  sourcePage?: number;
}

export class WeakSpotAnalyzer {
  static async diagnoseWeakSpots(params: {
    topicName: string;
    totalQuestions: number;
    incorrectAnswers: IncorrectQuestionItem[];
  }): Promise<WeakSpotDiagnosis> {
    const { topicName, totalQuestions, incorrectAnswers } = params;
    const incorrectCount = incorrectAnswers.length;
    const correctCount = totalQuestions - incorrectCount;
    const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

    if (incorrectCount === 0) {
      return {
        topicName,
        totalQuestions,
        incorrectCount: 0,
        accuracyPct: 100,
        overallAssessment: "Безупречный результат! Ты ответила на 100% вопросов верно. Концепты темы усвоены на высшем уровне.",
        identifiedGaps: [],
        recommendedAction: "Тема полностью освоена. Закрепи карточки через 3 дня для долгосрочной памяти.",
      };
    }

    if (!isLiveAIConfigured()) {
      return this.generateFallbackDiagnosis(topicName, totalQuestions, incorrectAnswers, accuracyPct);
    }

    try {
      const { client, model } = getActiveAIConfig();

      const questionsBreakdown = incorrectAnswers
        .map(
          (q, i) =>
            `Вопрос ${i + 1}: "${q.prompt}"
Студентка выбрала (НЕВЕРНО): "${q.selectedAnswerText}"
Правильный ответ: "${q.correctAnswerText}"
Пояснение: "${q.explanation}"
${q.sourcePage ? `Стр. источника: ${q.sourcePage}` : ""}`
        )
        .join("\n---\n");

      const prompt = `Ты — клинический профессор и персональный медицинский ментор студентки Саиды.
Она только что завершила тестирование по теме «${topicName}».
Всего вопросов: ${totalQuestions}. Ошибок: ${incorrectCount}. Точность: ${accuracyPct}%.

Вот список вопросов, в которых Саида допустила ошибки:
${questionsBreakdown}

ЗАДАЧА:
Проведи глубокую клиническую диагностику её слабых мест:
1. overallAssessment: краткая тактичная и вдохновляющая оценка (без занудства, ободряюще, как мудрый врач-наставник).
2. identifiedGaps: для каждого ошибочного вопроса сформулируй:
   - conceptName: точное название анатомического/физиологического/фармакологического звена (например: "Ионные токи СА-узла (If-каналы)")
   - misconception: в чём именно заключалась её ошибка или путаница (почему выбор "${incorrectAnswers[0]?.selectedAnswerText || "дистрактора"}" неверен)
   - correctPrinciple: как процесс устроен на самом деле (строго по физиологии)
   - clinicalRelevance: почему незнание этой детали опасно у постели больного или на экзамене
   - sourcePage: номер страницы из контекста вопроса
3. recommendedAction: конкретное, четкое действие на 5 минут (например: "Перечитай стр. 13 о регуляции ЧСС блуждающим нервом и повтори 2 карточки").

Ответ верни исключительно в валидном JSON по схеме:
{
  "topicName": "${topicName}",
  "totalQuestions": ${totalQuestions},
  "incorrectCount": ${incorrectCount},
  "accuracyPct": ${accuracyPct},
  "overallAssessment": "...",
  "identifiedGaps": [
    {
      "conceptName": "...",
      "misconception": "...",
      "correctPrinciple": "...",
      "clinicalRelevance": "...",
      "sourcePage": 13
    }
  ],
  "recommendedAction": "..."
}`;

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "Вы — опытный клинический наставник по медицине. Проводите точный и доброжелательный аудит ошибок студентов на русском языке в строгом формате JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty AI diagnosis response");

      const parsed = JSON.parse(raw);
      return WeakSpotDiagnosisSchema.parse(parsed);
    } catch (error) {
      console.warn("Live AI weak spot diagnosis failed, using clinical fallback:", error);
      return this.generateFallbackDiagnosis(topicName, totalQuestions, incorrectAnswers, accuracyPct);
    }
  }

  private static generateFallbackDiagnosis(
    topicName: string,
    totalQuestions: number,
    incorrectAnswers: IncorrectQuestionItem[],
    accuracyPct: number
  ): WeakSpotDiagnosis {
    const gaps = incorrectAnswers.map((q) => {
      let conceptName = topicName;
      if (q.prompt.toLowerCase().includes("нерв") || q.prompt.toLowerCase().includes("блуждающ")) {
        conceptName = "Вегетативная иннервация пейсмейкеров сердца";
      } else if (q.prompt.toLowerCase().includes("задержк") || q.prompt.toLowerCase().includes("ав-узел")) {
        conceptName = "Механизм физиологической АВ-задержки";
      } else if (q.prompt.toLowerCase().includes("рецептор") || q.prompt.toLowerCase().includes("бета")) {
        conceptName = "Селективность подтипов адренорецепторов";
      } else if (q.prompt.toLowerCase().includes("канал") || q.prompt.toLowerCase().includes("funny")) {
        conceptName = "Ионные каналы автоматизма (If / Ca-каналы)";
      }

      return {
        conceptName,
        misconception: `Был выбран вариант «${q.selectedAnswerText}», что отражает недостаточную дифференциацию с правильным патогенетическим звеном.`,
        correctPrinciple: q.correctAnswerText
          ? `Правильный принцип: «${q.correctAnswerText}». ${q.explanation}`
          : q.explanation,
        clinicalRelevance: "Этот механизм лежит в основе назначения целевых фармпрепаратов и оценки динамики ЭКГ.",
        sourcePage: q.sourcePage || 12,
      };
    });

    return {
      topicName,
      totalQuestions,
      incorrectCount: incorrectAnswers.length,
      accuracyPct,
      overallAssessment:
        accuracyPct >= 70
          ? `Хороший базовый уровень (${accuracyPct}%), но есть точечные клинические нюансы, требующие шлифовки.`
          : `Материал темы «${topicName}» требует повторения ключевых звеньев (${accuracyPct}% правильных ответов). Ниже выделены конкретные механизмы, где возникла путаница.`,
      identifiedGaps: gaps,
      recommendedAction:
        "Изучи выделенные карточки пробелов ниже и пройди повторный мини-тест по слабым темам.",
    };
  }
}
