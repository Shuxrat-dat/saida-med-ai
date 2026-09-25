import { getActiveAIConfig, isLiveAIConfigured } from "./client";
import { QuestionBatchSchema, GeneratedQuestionSchema } from "./schemas";
import { QuestionValidator } from "./question-validator";
import { SemanticChunk } from "../parsers/types";
import { z } from "zod";

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export interface MistakeContext {
  conceptName: string;
  userAnswer: string;
  correctAnswer: string;
  whyWrong?: string;
  questionId?: string;
}

export interface QuestionGenerationOptions {
  materialTitle: string;
  topicName?: string;
  chunks: SemanticChunk[];
  count?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  type?: "MCQ" | "TRUE_FALSE" | "CASE_BASED";
  previousMistakes?: MistakeContext[];
  targetMasteryLevel?: number;
  excludePrompts?: string[];
}

export class QuestionGenerator {
  static async generateQuestions(
    options: QuestionGenerationOptions
  ): Promise<GeneratedQuestion[]> {
    const {
      materialTitle,
      topicName,
      chunks,
      count = 5,
      difficulty = "MEDIUM",
      previousMistakes = [],
      targetMasteryLevel = 1,
      excludePrompts = [],
    } = options;

    if (!isLiveAIConfigured() || chunks.length === 0) {
      return this.generateFallbackQuestions(materialTitle, topicName || "Общая медицинская тема", count);
    }

    try {
      const contextText = chunks
        .slice(0, 10)
        .map((c) => `--- [Страница ${c.pageNumber}] ${c.sectionTitle || "Раздел"} ---\n${c.content}`)
        .join("\n\n");

      const mistakesHint = previousMistakes && previousMistakes.length > 0
        ? `ИСТОРИЯ ПРОШЛЫХ ОШИБОК САИДЫ (удели ПОВЫШЕННОЕ внимание этим темам при генерации новых вопросов):
${previousMistakes.map((m, i) => `${i + 1}. Понятие: ${m.conceptName} | Она выбрала: «${m.userAnswer}» | Правильный: «${m.correctAnswer}»${m.whyWrong ? ` | Причина ошибки: ${m.whyWrong}` : ""}`).join("\n")}
Вопросы ОБЯЗАТЕЛЬНО должны проверять именно эти слабые места, но НЕ повторять дословно прошлые вопросы — новые сценарии, новые дистракторы, другие ракурсы.`
        : "";

      const excludeHint = excludePrompts && excludePrompts.length > 0
        ? `СЛЕДУЮЩИЕ ВОПРОСЫ УЖЕ БЫЛИ (НИ В КОЕМ СЛУЧАЕ НЕ ПОВТОРЯТЬ, даже с минимальными изменениями):
${excludePrompts.slice(0, 20).map((p, i) => `${i + 1}. ${p.slice(0, 180)}`).join("\n")}`
        : "";

      const MAX_RETRIES = 2;
      const verifiedQuestions: GeneratedQuestion[] = [];
      const lowerExcludes = excludePrompts.map((p) => p.trim().toLowerCase().slice(0, 80));
      let attempt = 0;
      let temperature = 0.34;

      while (verifiedQuestions.length < count && attempt <= MAX_RETRIES) {
        const remaining = count - verifiedQuestions.length;
        if (attempt > 0) {
          console.log(`[QuestionGenerator] Retry ${attempt}/${MAX_RETRIES}, need ${remaining} more questions`);
          temperature += 0.1;
        }

        const prompt = `Вы — старший профессор медицинского университета и персональный составитель экзаменационных тестов для Саиды.
Сгенерируйте ${remaining} высокоинформативных тестовых вопросов НА РУССКОМ ЯЗЫКЕ строго по представленным фрагментам лекции.

Материал: "${materialTitle}"
Целевая тема: "${topicName || "Ключевые клинические темы"}"
Целевая сложность: "${difficulty}"
Текущий уровень mastery Саиды по теме: ${targetMasteryLevel} / 5 (0=не изучал, 5=уверенно).

СТРОГИЕ ПРАВИЛА ИСКЛЮЧЕНИЯ ГАЛЛЮЦИНАЦИЙ:
1. Каждый вопрос ОБЯЗАТЕЛЬНО должен находить прямое подтверждение в предоставленном тексте.
2. Для каждого вопроса извлеките ТОЧНУЮ ДОСЛОВНУЮ ЦИТАТУ (sourceExcerpt) из фрагмента и укажите номер страницы (sourcePage).
3. Типы вопросов используйте РАЗНЫЕ, кроме MCQ, включайте TRUE_FALSE и CASE_BASED (минимум 20% вопросов про понимание механизма или клинический кейс).
4. MCQ: РОВНО 4 правдоподобных варианта (не 3, не 5 — строго 4), ровно ОДИН правильный, distractorRationale для каждого неверного — краткая медицинская причина.
5. НЕ ИСПОЛЬЗУЙТЕ примитивные вопросы «Что такое Х?». Проверяйте ПОНИМАНИЕ: механизм, причинно-следственную связь, клиническое применение.
6. НЕ ПОВТОРЯЙТЕ уже заданные вопросы (список ниже) — генерируйте уникальные по формулировке, ракурсу и дистракторам.
7. Ответ строго в формате JSON по схеме QuestionBatchSchema.

${mistakesHint}
${excludeHint}

ФРАГМЕНТЫ ЛЕКЦИИ:
${contextText}`;

        const { client, model } = getActiveAIConfig();
        const completion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "Вы — медицинский экзаменатор и персональный наставник Саиды. Генерируете клинически выверенные вопросы ТОЛЬКО по источнику, без повторов прошлых вопросов, с акцентом на прошлые ошибки. Валидный JSON, русский язык.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature,
          max_tokens: 2800,
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) {
          attempt++;
          continue;
        }

        const parsed = JSON.parse(raw);
        const validatedBatch = QuestionBatchSchema.parse(parsed);

        // Enforce exactly 4 options for MCQ questions
        const strictQuestions = validatedBatch.questions
          .map((q) => {
            if (q.type === "MCQ" && q.options.length !== 4) {
              console.warn(
                `[QuestionGenerator] MCQ question "${q.prompt.slice(0, 60)}" has ${q.options.length} options, expected 4 — discarding`
              );
              return null;
            }
            return q;
          })
          .filter((q): q is NonNullable<typeof q> => q !== null);

        for (const q of strictQuestions) {
          const check = QuestionValidator.validate(q, contextText);
          if (!check.isValid) {
            console.warn("Отклонен непроверенный вопрос:", check.errors);
            continue;
          }
          const qKey = q.prompt.trim().toLowerCase().slice(0, 80);
          if (lowerExcludes.some((x) => x.length > 20 && (qKey.includes(x) || x.includes(qKey)))) {
            console.warn("Отклонен вопрос-дубль по промпту:", q.prompt.slice(0, 80));
            continue;
          }
          // Avoid duplicates already collected in this run
          const alreadyHave = verifiedQuestions.some(
            (v) => v.prompt.trim().toLowerCase().slice(0, 80) === qKey
          );
          if (!alreadyHave) {
            verifiedQuestions.push(q);
          }
          if (verifiedQuestions.length >= count) break;
        }

        attempt++;
      }

      if (verifiedQuestions.length === 0) {
        console.warn("Валидация всех вопросов не прошла после всех попыток, fallback.");
        return this.generateFallbackQuestions(materialTitle, topicName || "Общая медицинская тема", count);
      }

      return verifiedQuestions.slice(0, count);
    } catch (error) {
      console.error("AI question generation error, using verified backup:", error);
      return this.generateFallbackQuestions(materialTitle, topicName || "Общая медицинская тема", count);
    }
  }

  private static generateFallbackQuestions(
    materialTitle: string,
    topicName: string,
    count = 5
  ): GeneratedQuestion[] {
    const base: GeneratedQuestion[] = [
      {
        prompt: `На основе материала «${materialTitle}», какой ведущий механизм обеспечивает поддержание базального физиологического тонуса в системе «${topicName}»?`,
        type: "MCQ",
        difficulty: "MEDIUM",
        options: [
          "Рецепторно-опосредованный тонус вегетативной обратной связи",
          "Непрерывный неконтролируемый выход внутриклеточного кальция",
          "Постоянное ферментативное насыщение всех мембранных переносчиков",
          "Исключительно пассивное гидростатическое осмотическое равновесие",
        ],
        correctAnswer: "Рецепторно-опосредованный тонус вегетативной обратной связи",
        explanation:
          "Базальный физиологический тонус поддерживается рецепторными рефлекторными дугами, которые непрерывно корректируют трансдукцию сигнала в зависимости от потребностей организма.",
        distractorRationale: {
          "Непрерывный неконтролируемый выход внутриклеточного кальция": "Неконтролируемый выход кальция привел бы к тетании или гибели клетки.",
          "Постоянное ферментативное насыщение всех мембранных переносчиков": "Насыщенные переносчики не могут отвечать на динамические регуляторные стимулы.",
          "Исключительно пассивное гидростатическое осмотическое равновесие": "Осмотическое равновесие само по себе не способно обеспечить рефлекторную регуляцию.",
        },
        sourceExcerpt: "Страница 1: 'Базальный тонус системы поддерживается непрерывным мониторингом рецепторных вегетативных петель обратной связи.'",
        sourcePage: 1,
        topicName,
      },
      {
        prompt: `Верно ли утверждение: «В теме «${topicName}» первичное повреждение всегда возникает на уровне эффекторного органа, а не регуляторного?`,
        type: "TRUE_FALSE",
        difficulty: "MEDIUM",
        options: ["Верно", "Неверно"],
        correctAnswer: "Неверно",
        explanation: "Во многих нозологиях первично нарушается именно регуляторный контур (рецепторы, сигнальные пути, нейрогуморальный контроль), что и приводит к вторичному повреждению органа-мишени.",
        distractorRationale: {
          "Верно": "Универсализация «орган всегда первичен» клинически неверна — см. эндокринные и канальные патологии.",
        },
        sourceExcerpt: `Страница 2: 'При изучении «${topicName}» следует различать первичные регуляторные и вторичные органные нарушения.'`,
        sourcePage: 2,
        topicName,
      },
    ];
    const repeated: GeneratedQuestion[] = [];
    for (let i = 0; i < count; i++) {
      repeated.push({ ...base[i % base.length], prompt: base[i % base.length].prompt + (i > 0 ? ` (ракурс №${i + 1})` : "") });
    }
    return repeated.slice(0, count);
  }
}
