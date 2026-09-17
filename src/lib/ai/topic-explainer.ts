import { getActiveAIConfig, isLiveAIConfigured } from "./client";
import { TopicDeepExplainerSchema } from "./schemas";
import { SemanticChunk } from "@/lib/parsers/types";
import { MockConcept } from "@/lib/db/mock-data";
import { z } from "zod";

export type TopicDeepExplanation = z.infer<typeof TopicDeepExplainerSchema>;

export class TopicExplainer {
  static async explainTopic(params: {
    topicName: string;
    materialTitle: string;
    chunks?: SemanticChunk[];
    concepts?: MockConcept[];
  }): Promise<TopicDeepExplanation> {
    const { topicName, materialTitle, chunks = [], concepts = [] } = params;

    if (!isLiveAIConfigured()) {
      return this.generateFallbackExplanation(topicName, materialTitle, concepts);
    }

    try {
      const { client, model, provider } = getActiveAIConfig();

      const contextText = chunks
        .slice(0, 8)
        .map((c) => `[Стр. ${c.pageNumber}] ${c.content}`)
        .join("\n\n");

      const conceptsHint = concepts
        .map((c) => `• ${c.name}: ${c.definition} (Клин. знач: ${c.clinicalSignificance || "важно"})`)
        .join("\n");

      const prompt = `Ты — ведущий профессор медицинского университета и клинический наставник студентки Саиды.
Твоя задача — «разжевать» тему «${topicName}» из материала «${materialTitle}» так, чтобы всё стало кристально понятно.

КОНТЕКСТ МАТЕРИАЛА:
${contextText || "Используй базовые клинические факты по этой теме."}

КЛЮЧЕВЫЕ ПОНЯТИЯ ТЕМЫ:
${conceptsHint || "Разбери базовые физиологические и патогенетические механизмы."}

ТРЕБОВАНИЯ К РАЗБОРУ:
1. simpleOverview: объясни суть темы простыми словами («на пальцах»), используя яркую медицинскую аналогию.
2. keyMechanisms: 3–4 пошаговых физиологических/клеточных механизма (stepNumber, title, explanation).
3. clinicalMnemonicsAndPearls: 2–3 клинические мнемоники или золотых правила для запоминания.
4. examTraps: 2–3 частые ловушки и дистракторы на медицинских экзаменах (pitfall + clarification).
5. sourcePageReferences: массив номеров страниц, встречающихся в контексте (например [12, 13, 14]).

Ответ верни строго в формате JSON по схеме:
{
  "topicName": "${topicName}",
  "simpleOverview": "...",
  "keyMechanisms": [
    { "stepNumber": 1, "title": "...", "explanation": "..." }
  ],
  "clinicalMnemonicsAndPearls": ["..."],
  "examTraps": [
    { "pitfall": "...", "clarification": "..." }
  ],
  "sourcePageReferences": [1, 2]
}`;

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "Вы — выдающийся профессор клинической медицины. Разъясняйте сложные темы предельно наглядно, строго научно и на чистом русском языке в формате валидного JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty AI explanation response");

      const parsed = JSON.parse(raw);
      return TopicDeepExplainerSchema.parse(parsed);
    } catch (error) {
      console.warn("Live AI topic explanation failed, using high-yield medical fallback:", error);
      return this.generateFallbackExplanation(topicName, materialTitle, concepts);
    }
  }

  private static generateFallbackExplanation(
    topicName: string,
    materialTitle: string,
    concepts: MockConcept[]
  ): TopicDeepExplanation {
    const isCvs = topicName.toLowerCase().includes("сердц") || topicName.toLowerCase().includes("проводящ");
    const isPharm = topicName.toLowerCase().includes("адрено") || topicName.toLowerCase().includes("рецептор");

    if (isCvs) {
      return {
        topicName,
        simpleOverview:
          "Представь проводящую систему сердца как электрическую сеть в умном доме: синусовый узел — это главный генератор частоты (пейсмейкер), а АВ-узел — это предохранитель с задержкой, чтобы предсердия успели полностью вытолкнуть кровь в желудочки до систолы.",
        keyMechanisms: [
          {
            stepNumber: 1,
            title: "Генерация импульса в СА-узле (медленная диастолическая деполяризация)",
            explanation:
              "Обусловлена If-каналами (funny channels), пропускающими ионы Na+, и кальциевыми каналами Т-типа. Базовая частота генерации — 60–100 импульсов в минуту.",
          },
          {
            stepNumber: 2,
            title: "Физиологическая задержка в АВ-узле (0,09–0,12 с)",
            explanation:
              "Скорость проведения падает из-за тонких волокон и малого числа щелевых контактов (gap junctions). Это даёт время предсердиям сократиться и наполнить желудочки (предсердная надбавка 15–20%).",
          },
          {
            stepNumber: 3,
            title: "Быстрое распространение по ножкам пучка Гиса и волокнам Пуркинье",
            explanation:
              "Скорость достигает 4 м/с за счёт высокой экспрессии коннексина-43, обеспечивая мгновенную одновременную систолу верхушки и стенок обоих желудочков снизу вверх.",
          },
        ],
        clinicalMnemonicsAndPearls: [
          "Правило 'СА — Сверху и Автономно, АВ — Автоматическая Выдержка времени'.",
          "Правый блуждающий нерв сильнее управляет СА-узлом (хронотропия), левый — АВ-узлом (дромотропия).",
          "Интервал PR на ЭКГ отражает именно время проведения от предсердий через АВ-узел до пучка Гиса.",
        ],
        examTraps: [
          {
            pitfall: "Думать, что ионы Na+ через быстрые каналы вызывают деполяризацию СА-узла, как в обычном миокарде.",
            clarification:
              "В СА- и АВ-узлах нет фазы 0 на быстрых натриевых каналах (они инактивированы); фаза 0 деполяризации узлов обусловлена входящим током Ca2+ через L-каналы!",
          },
          {
            pitfall: "Считать, что полная блокада АВ-узла приводит к немедленной остановке желудочков.",
            clarification:
              "Активируются пейсмейкеры 3-го порядка (пучок Гиса или волокна Пуркинье) с идиовентрикулярным ритмом 25–40 уд/мин.",
          },
        ],
        sourcePageReferences: [12, 13, 14],
      };
    }

    if (isPharm) {
      return {
        topicName,
        simpleOverview:
          "Адренорецепторы — это 'тумблеры' симпатической нервной системы (реакция 'бей или беги'). Но разные органы имеют разные подтипы, чтобы организм мог адресно ускорить сердце, но при этом расширить бронхи для притока кислорода.",
        keyMechanisms: [
          {
            stepNumber: 1,
            title: "Альфа-1: Сосудосуживающий эффект через Gq-белок",
            explanation:
              "Активация фосфолипазы C → выработка IP3 и DAG → выброс Ca2+ из саркоплазматического ретикулума гладких мышц → спазм артериол и повышение ОПСС и АД.",
          },
          {
            stepNumber: 2,
            title: "Бета-1: Стимуляция сердца через Gs-белок",
            explanation:
              "Стимуляция аденилатциклазы → рост цАМФ → активация протеинкиназы A → фосфорилирование Ca2+-каналов L-типа → повышение ЧСС, силы сокращений и проводимости.",
          },
          {
            stepNumber: 3,
            title: "Бета-2: Расширение бронхов и сосудов мышц через Gs-белок",
            explanation:
              "В гладкой мускулатуре цАМФ ингибирует киназу легких цепей миозина (MLCK), вызывая стойкую дилатацию бронхов.",
          },
        ],
        clinicalMnemonicsAndPearls: [
          "Мнемоника органов: 1 сердце (Бета-1), 2 легких (Бета-2).",
          "Альфа-2 рецепторы — это 'тормоз' (Gi), пресинаптическое аутоингибирование выброса норадреналина.",
          "Селективные Бета-2 агонисты (сальбутамол) купируют приступ астмы без выраженной тахикардии.",
        ],
        examTraps: [
          {
            pitfall: "Считать, что норадреналин одинаково сильно стимулирует все рецепторы.",
            clarification:
              "Норадреналин почти не трогает Бета-2 рецепторы; бронходилатацию вызывает адреналин из надпочечников!",
          },
          {
            pitfall: "Путать действие Бета-блокаторов у пациентов с астмой.",
            clarification:
              "Неселективные Бета-блокаторы (пропранолол) блокируют Бета-2 и вызывают смертельно опасный бронхоспазм у астматиков.",
          },
        ],
        sourcePageReferences: [19, 20, 21],
      };
    }

    // Универсальный разбор на основе переданных концептов
    const fallbackMechanisms = concepts.length > 0
      ? concepts.slice(0, 3).map((c, i) => ({
          stepNumber: i + 1,
          title: c.name,
          explanation: `${c.definition} ${c.clinicalSignificance ? `Клиническое значение: ${c.clinicalSignificance}` : ""}`,
        }))
      : [
          {
            stepNumber: 1,
            title: "Анатомический и клеточный базис",
            explanation: `Определяет морфологическую основу темы «${topicName}» и клеточные взаимосвязи.`,
          },
          {
            stepNumber: 2,
            title: "Физиологическая регуляция и сигнальные пути",
            explanation: "Обеспечивает гомеостаз органа и адекватный ответ на внешние раздражители.",
          },
          {
            stepNumber: 3,
            title: "Патогенез нарушений и клиника",
            explanation: "При повреждении регуляторных звеньев развиваются специфические симптомы и синдромы.",
          },
        ];

    return {
      topicName,
      simpleOverview: `Тема «${topicName}» из курса «${materialTitle}» разбирает ключевые физиологические процессы и их патологические изменения. Понимание этих механизмов необходимо для точной диагностики и правильного выбора медикаментозной терапии.`,
      keyMechanisms: fallbackMechanisms,
      clinicalMnemonicsAndPearls: [
        "Связывай клинический симптом напрямую с нарушенным физиологическим звеном.",
        "Обращай внимание на причинно-следственные связи: причина → патогенез → клиника → лечение.",
      ],
      examTraps: [
        {
          pitfall: "Заучивание названий без понимания механизма действия.",
          clarification: "В клинических тестах вопросы всегда строятся вокруг патогенетического звена, а не просто определений.",
        },
      ],
      sourcePageReferences: [1, 2, 3],
    };
  }
}
