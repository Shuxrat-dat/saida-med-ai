import { getActiveAIConfig, isLiveAIConfigured } from "./client";
import { MissingSectionSchema, TopicDeepExplainerSchema } from "./schemas";
import { SemanticChunk } from "@/lib/parsers/types";
import { MockConcept } from "@/lib/db/mock-data";
import { z } from "zod";

export type TopicDeepExplanation = z.infer<typeof TopicDeepExplainerSchema>;
export type MissingSection = z.infer<typeof MissingSectionSchema>;

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
      const { client, model } = getActiveAIConfig();

      const hasContext = chunks.length > 0 || concepts.length > 0;

      const contextText = chunks
        .slice(0, 10)
        .map((c) => `[Стр. ${c.pageNumber}] ${c.content}`)
        .join("\n\n");

      const conceptsHint = concepts
        .map((c) => `• ${c.name}: ${c.definition}${c.clinicalSignificance ? ` (Клин. знач: ${c.clinicalSignificance})` : ""}`)
        .join("\n");

      const prompt = `Ты — профессор медицинского университета, персональный наставник Саиды. Разбираешь тему «${topicName}» из конспекта «${materialTitle}».

ПРАВИЛО №1 (КРИТИЧЕСКОЕ): ИСПОЛЬЗУЙ ТОЛЬКО ФАКТЫ ИЗ ЗАГРУЖЕННОГО МАТЕРИАЛА.
Если какой-то раздел отсутствует в конспекте — НЕ ВЫДУМЫВАЙ! Вместо этого добавь его ключ в missingFromSource и напиши короткое объяснение, почему пропускаешь (например: «в материале нет информации о методах лечения»).
Для отсутствующих разделов заполни поле текстом: «Информация отсутствует в предоставленном материале» и одновременно включи его в missingFromSource.

${hasContext ? `КОНТЕКСТ МАТЕРИАЛА (используй ТОЛЬКО эти факты):
${contextText}

КЛЮЧЕВЫЕ ПОНЯТИЯ ИЗ КОСПЕКТА:
${conceptsHint || "концепты не указаны"}` : `ИСХОДНЫЙ МАТЕРИАЛ ОТСУТСТВУЕТ. Отметь ВСЕ разделы в missingFromSource, за исключением простого общего описания whatIsIt, которое можно дать на общем уровне.`}

СТРУКТУРА ОБЪЯСНЕНИЯ (8 обязательных блоков на чистом русском):
1. whatIsIt: Что это такое? Простое, медицински корректное определение, аналогия если уместна.
2. whyItOccurs: Почему возникает? Причины, этиология, триггеры, факторы риска.
3. pathogenesis: Механизм / патогенез. Как именно развивается — пошаговый каскад.
4. mainSigns: Основные признаки. Симптомы, синдромы, объективные данные, жалобы.
5. classification: Классификация. Стадии, степени, виды, формы.
6. diagnostics: Диагностика. Методы обследования, критерии, лабораторные/инструментальные данные.
7. treatmentApproaches: Лечение / подходы. Терапия согласно конспекту.
8. keyPointsToRemember: Что особенно важно запомнить — массив 3–5 high-yield пунктов.

ДОПОЛНИТЕЛЬНО:
- sourcePageReferences: массив номеров страниц из контекста (если есть).
- missingFromSource: массив {sectionKey, reason} — какие блоки не описаны в исходном материале. Допустимые ключи: whatIsIt, whyItOccurs, pathogenesis, mainSigns, classification, diagnostics, treatmentApproaches, keyPointsToRemember.

Ответ ТОЛЬКО JSON по схеме TopicDeepExplainerSchema.`;

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "Вы — профессор клинической медицины и персональный наставник Саиды. Отвечаете ТОЛЬКО валидным JSON. СТРОГО ИСПОЛЬЗУЙТЕ ТОЛЬКО ФАКТЫ ИЗ МАТЕРИАЛА; отсутствующую информацию помечайте в missingFromSource.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.22,
        max_tokens: 2200,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty AI explanation response");

      const parsed = JSON.parse(raw);
      const validated = TopicDeepExplainerSchema.safeParse(parsed);
      if (!validated.success) {
        console.warn("Topic explainer schema mismatched, running repair:", validated.error.issues.slice(0, 3));
        return this.repairWithDefaults(parsed, topicName);
      }
      return validated.data;
    } catch (error) {
      console.warn("Live AI topic explanation failed, using high-yield medical fallback:", error);
      return this.generateFallbackExplanation(topicName, materialTitle, concepts);
    }
  }

  private static repairWithDefaults(parsed: any, topicName: string): TopicDeepExplanation {
    const missing: MissingSection[] = [];
    const safeStr = (v: any, key: string) => {
      if (typeof v === "string" && v.trim().length > 0) return v;
      missing.push({ sectionKey: key, reason: "Не удалось извлечь из ответа AI" });
      return "Информация отсутствует в предоставленном материале";
    };
    const keyPoints = Array.isArray(parsed?.keyPointsToRemember) && parsed.keyPointsToRemember.length > 0
      ? parsed.keyPointsToRemember.filter((s: any) => typeof s === "string")
      : (missing.push({ sectionKey: "keyPointsToRemember", reason: "Не удалось извлечь из ответа AI" }), []);
    return {
      topicName: parsed?.topicName || topicName,
      whatIsIt: safeStr(parsed?.whatIsIt, "whatIsIt"),
      whyItOccurs: safeStr(parsed?.whyItOccurs, "whyItOccurs"),
      pathogenesis: safeStr(parsed?.pathogenesis, "pathogenesis"),
      mainSigns: safeStr(parsed?.mainSigns, "mainSigns"),
      classification: safeStr(parsed?.classification, "classification"),
      diagnostics: safeStr(parsed?.diagnostics, "diagnostics"),
      treatmentApproaches: safeStr(parsed?.treatmentApproaches, "treatmentApproaches"),
      keyPointsToRemember: keyPoints,
      sourcePageReferences: Array.isArray(parsed?.sourcePageReferences) ? parsed.sourcePageReferences : [],
      missingFromSource: Array.isArray(parsed?.missingFromSource) ? [...missing, ...parsed.missingFromSource] : missing,
    };
  }

  private static generateFallbackExplanation(
    topicName: string,
    materialTitle: string,
    concepts: MockConcept[]
  ): TopicDeepExplanation {
    const missingGeneric: MissingSection[] = [
      { sectionKey: "classification", reason: "Обобщённый fallback-разбор — классификация не уточнена по исходному материалу" },
      { sectionKey: "diagnostics", reason: "Обобщённый fallback-разбор — методы диагностики не уточнены по исходному материалу" },
      { sectionKey: "treatmentApproaches", reason: "Обобщённый fallback-разбор — подходы к лечению не уточнены по исходному материалу" },
    ];

    const isCvs = topicName.toLowerCase().includes("сердц") || topicName.toLowerCase().includes("проводящ") || topicName.toLowerCase().includes("карди");
    const isPharm = topicName.toLowerCase().includes("адрено") || topicName.toLowerCase().includes("рецептор") || topicName.toLowerCase().includes("фармак");

    if (isCvs) {
      return {
        topicName,
        whatIsIt:
          "Представь проводящую систему сердца как электрическую сеть в умном доме: синусовый узел — это главный генератор частоты (пейсмейкер), а АВ-узел — это предохранитель с задержкой, чтобы предсердия успели полностью вытолкнуть кровь в желудочки до систолы.",
        whyItOccurs:
          "Сердечная проводящая система развивается из специализированных кардиомиоцитов, утративших сократительную функцию ради генерации и проведения импульса. Нарушения возникают при ишемии, воспалении (миокардит), фиброзе, электролитных сдвигах (K+, Ca2+) или генетических канальопатиях.",
        pathogenesis:
          "Импульс возникает в СА-узле (If-каналы Na+, Т-type Ca2+), распространяется по предсердиям → АВ-узел (физиологическая задержка 0,09–0,12 с) → пучок Гиса → ножки → волокна Пуркинье → сокращение желудочков снизу вверх.",
        mainSigns:
          "При поражении проводящей системы: брадикардия, головокружение, синкопе, приступы Морганьи–Адамса–Стокса, одышка, слабость. На ЭКГ: удлинение PR, расширение QRS, выпадение зубцов P/QRS, AV-блокада I–III степени.",
        classification: "Информация отсутствует в предоставленном материале",
        diagnostics: "Информация отсутствует в предоставленном материале",
        treatmentApproaches: "Информация отсутствует в предоставленном материале",
        keyPointsToRemember: [
          "СА-узел 60–100 уд/мин — пейсмейкер первого порядка.",
          "АВ-узел — задержка 0,09–0,12 с для предсердной надбавки.",
          "Волокна Пуркинье — скорость 4 м/с, одновременная систола обоих желудочков.",
          "Нодаевая деполяризация — Ca2+ L-тип, а не быстрый Na+!",
        ],
        sourcePageReferences: [12, 13, 14],
        missingFromSource: missingGeneric,
      };
    }

    if (isPharm) {
      return {
        topicName,
        whatIsIt:
          "Адренорецепторы — это мембранные G-белковые рецепторы симпатической нервной системы. Активация — реакция «бей или беги», но разные подтипы в разных органах обеспечивают избирательность: сердце сокращается сильнее, а бронхи при этом расширяются.",
        whyItOccurs:
          "Симпатическая стимуляция → высвобождение норадреналина из пресинаптических окончаний + адреналин из мозгового слоя надпочечников → связывание с GPCR → внутриклеточные каскады (Gq/Gs/Gi).",
        pathogenesis:
          "α1 (Gq): PLC → IP3/DAG → Ca2+ → вазоконстрикция. β1 (Gs): AC↑ → cAMP↑ → PKA → Ca2+L↑ → инотропия/хронотропия/дромотропия. β2 (Gs): бронхиальная ГМ — ингибирование MLCK → бронходилатация, вазодилатация мышц. α2 (Gi) — пресинаптический тормоз выброса.",
        mainSigns:
          "При симпатикотонии: тахикардия, повышение АД, тахипноэ, сухость во рту, холодный пот, мидриаз, тремор. При блокаде β2 у астматиков — смертельно опасный бронхоспазм.",
        classification: "Информация отсутствует в предоставленном материале",
        diagnostics: "Информация отсутствует в предоставленном материале",
        treatmentApproaches: "Информация отсутствует в предоставленном материале",
        keyPointsToRemember: [
          "Мнемоника: β1 — сердце (1 орган), β2 — лёгкие (2 дыхание).",
          "Норадреналин слабо стимулирует β2 — бронходилатация = преимущественно адреналин!",
          "Неселективные β-блокаторы у астматиков КАТЕГОРИЧЕСКИ ПРОТИВОПОКАЗАНЫ.",
        ],
        sourcePageReferences: [19, 20, 21],
        missingFromSource: missingGeneric,
      };
    }

    const conceptsList = concepts.slice(0, 3).map((c) => `• ${c.name}: ${c.definition}`).join("\n");
    const keyPointsDefault = concepts.length > 0
      ? concepts.slice(0, 3).map((c) => c.name + " — " + (c.clinicalSignificance || c.definition.slice(0, 60)))
      : [
          "Причина → патогенез → клиника → лечение — причинно-следственная цепочка.",
          "Связь симптома с повреждённым регуляторным звеном.",
          "Механизм важнее заучивания названий.",
        ];

    return {
      topicName,
      whatIsIt: `Тема «${topicName}» из учебного материала «${materialTitle}» разбирает ключевые медицинские и физиологические процессы и их нарушения. ${conceptsList ? `Базовые понятия: ${conceptsList}` : ""}`,
      whyItOccurs: "Причины и триггеры зависят от конкретной нозологии/процесса; согласно источнику — не уточнены детально. Общие группы: генетические факторы, окружающая среда, инфекционные агенты, аутоиммунные процессы, образ жизни.",
      pathogenesis: "Патогенез представлен нарушением клеточных сигнальных путей, работы ионных каналов, клеточной пролиферации/апоптоза или воспалительного каскада — детали требуют уточнения по исходному материалу.",
      mainSigns: "Основные симптомы и синдромы зависят от органа/системы и тяжести процесса. Общие группы: болевой синдром, дисфункция органа, лабораторные отклонения.",
      classification: "Информация отсутствует в предоставленном материале",
      diagnostics: "Информация отсутствует в предоставленном материале",
      treatmentApproaches: "Информация отсутствует в предоставленном материале",
      keyPointsToRemember: keyPointsDefault,
      sourcePageReferences: [1, 2],
      missingFromSource: missingGeneric,
    };
  }
}
