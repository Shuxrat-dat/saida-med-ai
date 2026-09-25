# План реализации: Saida Med AI доработка

Соответствие AC → Задачи:
- AC-R1 → Task 1
- AC-R2, AC-Ru3 → Task 2, Task 6
- AC-R3 → Task 3
- AC-R4 → Task 5
- AC-R5 → Task 4
- AC-R6 → Task 8
- AC-R7 → Task 9
- AC-R8, AC-Ru2 → Task 10
- AC-R9 → Task 11
- AC-R10 → Task 13
- AC-Ru1 → Tasks 1-9 end-to-end

---

## Task 1: Prisma schema — Mastery/Repeat поля в TopicPerformance + миграция

**Priority:** high
**Depends on:** —
**Parent AC:** AC-R1
**Files to edit:**
- `prisma/schema.prisma`

### Детали реализации
1. В модель `TopicPerformance` добавить поля:
   - `masteryLevel Int @default(0)` (шкала 0–5)
   - `lastStudiedAt DateTime @default(now())`
   - `nextReviewAt DateTime @default(now())`
   - `reviewCount Int @default(0)`
   - `streakCorrect Int @default(0)`
2. В модель `QuizQuestion` добавить (опционально, для аналитики):
   - `userAnswerText String?`
   - `responseTimeMs Int?`
3. Запустить и проверить:
   - `npx prisma generate`
   - `npx prisma migrate dev --name add_topic_mastery_review`
4. **НЕ** менять production DATABASE_URL/DIRECT_URL; использовать существующие env

### Task-local Test Requirements
- **TR-R1.1 (rule):** `npx prisma validate` → без ошибок; новые поля отображаются в `TopicPerformance` + `QuizQuestion`
- **TR-R1.2 (rule):** миграция `prisma/migrations/*` создана и применена; `prisma migrate status` = applied
- **TR-Ru1.3 (rubric):** Масштабируемость полей (0–2):
  - `0`: mastery без диапазона или nextReviewAt без reviewCount не хватает
  - `1`: все поля есть, но не хватает streakCorrect
  - `2`: mastery 0–5, lastStudiedAt, nextReviewAt, reviewCount, streakCorrect все присутствуют
  - Порог: ≥ 2

---

## Task 2: Repository — Mastery calc, ReviewInterval, getTopicsDueForReview, recordQuizSession enhancement

**Priority:** high
**Depends on:** Task 1
**Parent AC:** AC-R2, AC-R7, AC-Ru3
**Files to edit:**
- `src/lib/db/repository.ts`
- `src/lib/db/mock-data.ts` — типы `MockTopic`, `StudyStats`

### Детали реализации
1. **`calculateMastery(accuracyRate, totalAttempts, streakCorrect): 0..5`** (детерминированно):
   - 0: 0 попыток
   - 1: 1–2 попытки, accuracy < 0.5
   - 2: ≥3 попытки, accuracy 0.50–0.64 (начато → изучается)
   - 3: ≥3 попытки, accuracy 0.65–0.74 (базовое понимание)
   - 4: ≥5 попыток, accuracy 0.75–0.89 (хорошее понимание) + streak ≥ 2
   - 5: ≥8 попыток, accuracy ≥ 0.90 (уверенное владение) + streak ≥ 4
2. **`adjustReviewInterval(perf, sessionResult)`** — SM-2-подобный для темы:
   - `correct && streak < 3`: nextReviewAt = now + 1 day, reviewCount++, streakCorrect++, mastery++ (если порог пройден)
   - `correct && streak ≥ 3 && accuracy ≥ 0.8`: nextReviewAt = now + 3 days → +7 → +21 по степени
   - `incorrect`: nextReviewAt = now + 4h, streakCorrect=0, masteryLevel=max(0, mastery-1), уменьшить easeFactor-подобное смещение
3. **`getTopicsDueForReview(userId, date?)`**: `TopicPerformance.where(nextReviewAt ≤ date) include topic` → возвращает топ-10 самых срочных
4. **`getTopicsWithMastery(materialId?)`**: расширить getTopicsByMaterial, добавляя masteryLevel, nextReviewAt, reviewCount, streakCorrect
5. **`getStudyStats()`** расширить:
   - `topicsDueToday` (due ≤ сегодня)
   - `topicsWithMastery: { id, name, masteryLevel, accuracyRate, nextReviewAt }[]`
   - `totalTopicsStudied = topics.filter(t => totalAttempts > 0).length`
6. **`recordQuizSession()`** после accuracy-обновления TopicPerformance вызвать calculateMastery + adjustReviewInterval и сделать `.update` с новыми полями masteryLevel, lastStudiedAt=now, nextReviewAt, reviewCount++, streakCorrect
7. Обновить типы `MockTopic` добавить `masteryLevel?`, `nextReviewAt?`, `lastStudiedAt?`, `reviewCount?`, `streakCorrect?`; обновить `StudyStats`

### Task-local Test Requirements
- **TR-R2.1 (rule):** `calculateMastery(0.92, 10, 5) === 5`; `calculateMastery(0.5, 0, 0) === 0`; результаты не рандомные (30 повторов одинаковые)
- **TR-R2.2 (rule):** после вызова recordQuizSession с topicId и 3 правильных ответами подряд → TopicPerformance.reviewCount увеличен, nextReviewAt > now, streakCorrect ≥ 3
- **TR-R2.3 (rule):** getTopicsDueForReview возвращает темы только с nextReviewAt ≤ сегодняшней даты
- **TR-Ru2.4 (rubric):** review интервал адаптивность (0–2):
  - `0`: интервал всегда фиксированный (1 день)
  - `1`: 2 уровня интервалов
  - `2`: адаптивность по streak/accuracy (4h/1d/3d/7d/21d)
  - Порог: ≥ 2

---

## Task 3: Не повторять один и тот же тест — excludeQuestionIds + контекстная генерация

**Priority:** high
**Depends on:** Task 2
**Parent AC:** AC-R3, AC-R7
**Files to edit:**
- `src/app/api/quizzes/generate/route.ts`
- `src/lib/ai/question-generator.ts`
- `src/lib/db/repository.ts`
- `src/components/quiz/QuizPlayer.tsx`

### Детали реализации
1. **`generate/route.ts`**:
   - Принимать новые параметры в body: `excludeQuestionIds?: string[]`, `previousMistakes?: IncorrectQuestionItem[]`, `focusMasteryRange?`
   - Получать user's defaultUserId через getDefaultUser → найти уже отвеченные вопросы (QuizQuestion.answeredAt is not null where quiz.userId=user.id) → union с excludeQuestionIds
   - Запрашивать `getQuestions({..., excludeIds: unionIds, limit: count+5})`
   - Если не хватает: `QuestionGenerator.generateQuestions({..., previousMistakes, focusMasteryLevel, count: missing})`
2. **Repository.getQuestions**: добавить опцию `excludeIds?: string[]` → where id not in
3. **QuestionGenerator.generateQuestions**: добавить опциональные параметры `previousMistakes[]` и `targetMasteryLevel`
   - Prompt учитывает ошибки: "Саида раньше ошибалась в: [...]. Генерируй вопросы, проверяющие именно эти пробелы, но с новыми сценариями."
   - targetMasteryLevel: легкие вопросы для mastery=1–2, сложные клинические кейсы для mastery=4–5
4. **QuizPlayer**:
   - При прохождении теста собирать массив уже заданных `askedQuestionIds` из текущей + прошлых сессий (подтягивать из `/api/quizzes/...` или передавать при старте)
   - При нажатии "Пройти заново" или "Повторить слабые места" передавать `excludeQuestionIds` в `/generate`

### Task-local Test Requirements
- **TR-R3.1 (rule):** Повторный вызов `generate` с topicId и `excludeQuestionIds=[id1,id2,id3]` → результирующие вопросы НЕ содержат id1/2/3
- **TR-R3.2 (rule):** QuestionGenerator с previousMistakes=["АВ-задержка"] в prompt содержит контекст ошибки (проверить через spy/console в тесте)
- **TR-Ru3.3 (rubric):** Разнообразие вопросов (0–2):
  - `0`: все вопросы старые при каждом запуске
  - `1`: при нехватке только fallback-генерация, без учёта ошибок
  - `2`: exclude + контекст previousMistakes + mastery, уникальность ≥ 80% при повторных запусках
  - Порог: ≥ 2

---

## Task 4: Topic-Explainer — новая структура 8 блоков + Missing from source

**Priority:** high
**Depends on:** Task 1 (не напрямую)
**Parent AC:** AC-R5, AC-Ru1
**Files to edit:**
- `src/lib/ai/schemas.ts` — `TopicDeepExplainerSchema`
- `src/lib/ai/topic-explainer.ts`
- `src/components/study/TopicPreStudyModal.tsx`
- `src/app/api/topics/explain/route.ts` (если нужно)

### Детали реализации
1. **Schema** дополнить структуру:
   - `whatIsIt` (1. Что это?)
   - `whyItOccurs` (2. Почему возникает?)
   - `pathogenesis` (3. Механизм/патогенез)
   - `mainSigns` (4. Основные признаки)
   - `classification` (5. Классификация)
   - `diagnostics` (6. Диагностика)
   - `treatmentApproaches` (7. Лечение/подходы)
   - `keyPointsToRemember` (8. Что особенно важно запомнить)
   - `missingFromSource: string[]` — какие пункты отсутствуют в материале; по умолчанию []
   - Оставить старые поля simpleOverview, keyMechanisms, clinicalMnemonics, examTraps, sourcePageReferences для обратной совместимости
2. **TopicExplainer.explainTopic()**:
   - Промпт должен просить AI: "Сначала проанализируй, какая информация из 8 блоков реально есть в предоставленном тексте. Для отсутствующих секций указать в missingFromSource и не выдумывать факты."
   - Если chunks пустые и concepts пустые → fallback manual, но с missingFromSource=['все блоки'] или пусть всё генерируется но marked
3. **TopicPreStudyModal.tsx**: отобразить все 8 блоков как отдельные карточки с заголовками; для missing секций показать серый фон с пометкой "Этот раздел отсутствует в вашем конспекте"
4. Обновить типы

### Task-local Test Requirements
- **TR-R4.1 (rule):** Schema парсит JSON с missingFromSource; TopicDeepExplainerSchema.parse проходит без ошибок
- **TR-R4.2 (rule):** При chunks=[] concepts=[] missingFromSource не пуст; нет галлюцинаций
- **TR-Ru4.3 (rubric):** UI структуры объяснения (0–2):
  - `0`: показан только simpleOverview как раньше
  - `1`: 4–6 из 8 блоков отрендерены
  - `2`: все 8 блоков + missingFromSource бейджи + мнемоники/ловушки
  - Порог: ≥ 2

---

## Task 5: Ручной ввод темы (UI + API /api/topics/create-manual)

**Priority:** medium
**Depends on:** Task 1, Task 4
**Parent AC:** AC-R4, AC-Ru1
**Files to edit:**
- `src/app/api/topics/create-manual/route.ts` — NEW
- `src/components/library/UploadModal.tsx` или NEW `src/components/library/AddMaterialMenu.tsx`
- `src/app/(app)/library/page.tsx`

### Детали реализации
1. **New API `POST /api/topics/create-manual`**:
   - Body Zod schema: `{ topicName: string (min 3), subject?: string }`
   - Flow:
     a. Получаем тему
     b. Вызываем `TopicExplainer` с пустыми chunks (AI объясняет тему с общей медицинской точки зрения, т.к. нет конспекта пользователя)
     c. Создаём concepts/facts из полученных секций
     d. Вызываем `QuestionGenerator.generateQuestions({materialTitle, topicName, chunks=[virtualChunk с объяснением], count=8})`
     e. Создаём Material(fileType="manual_topic", fileUrl="", fileSize=0), Topic, Concepts, KeyFacts, Questions, Flashcards через `MedicalRepository.createMaterial({..., pages: [], topics: topicsWithConcepts, questions})`
   - Возвращаем сохранённый material
2. **UI: Add Material Menu** — в Library page изменить существующие две кнопки (Камера / Загрузить файл) на три + "Тема вручную":
   - Либо добавить единый FAB "+ Добавить материал" → показать action sheet с 3 опциями (📷 Камера, 📄 Файл, 📝 Тема вручную)
   - При "Тема вручную" → модалка с input "Название темы" + subject select + кнопка "Создать учебный материал"
   - Показать loading steps: "Анализирует тему..." → "Создаёт понятия..." → "Создаёт вопросы..." → "Готово"
3. Library page: при успехе prepend новый material

### Task-local Test Requirements
- **TR-R5.1 (rule):** POST /api/topics/create-manual body={topicName: "Патофизиология сердечной недостаточности"} возвращает {success:true, material} с fileType="manual_topic"; в БД появляются Material/Topic/Concept/Question/Flashcard записи
- **TR-R5.2 (rule):** Модалка "Тема вручную" имеет input, select, кнопку "Создать"; loading state показывает шаги
- **TR-Ru5.3 (rubric):** UX добавления материала (0–2):
  - `0`: 3 действия разрозненны и труднодоступны
  - `1`: 3 вида есть, но без FAB/меню
  - `2`: FAB "+ Добавить материал" → 3 понятные опции (Камера/Файл/Тема), loading steps понятен
  - Порог: ≥ 2

---

## Task 6: Home Dashboard — «Сегодня повторить N тем», реальные stats, без mock

**Priority:** high
**Depends on:** Task 2
**Parent AC:** AC-R2, AC-Ru3, AC-Ru1
**Files to edit:**
- `src/app/(app)/page.tsx` (HomePage)
- `src/components/dashboard/WeakTopicPills.tsx`
- `src/components/dashboard/ContinueStudyCard.tsx`
- `src/components/dashboard/ProgressRing.tsx` (если нужно)

### Детали реализации
1. **HomePage** — сейчас вызывает `getStudyStats()` (Server Component). Использовать новые поля:
   - Блок над кнопками "Сегодня стоит повторить": показать due topics, помеченные 🔴 (просрочено >2д), 🟡 (сегодня/завтра), 🟢 (ок)
   - Подсчитать `topicsDueToday.length` → показать "Сегодня повторить 2 темы"
   - Кнопка "[ Начать повторение ]" → Link href="/quiz?mode=WEAK_TOPICS&focusDue=1" (query param, который quiz page понимает → фильтрует due topics)
   - Прогресс блок: "Изучено: totalTopicsStudied темы", "Пройдено: totalQuestionsAnswered вопросов", "Точность: overallAccuracy%"
   - "Слабые темы": топ-5 по низкому mastery и высокой isWeakTopic → показать progress-bar mastery
   - "Последняя активность": getStudySessions()[0..2] с датой/материалом/score
2. **WeakTopicPills** — принимать masteryLevel и nextReviewAt; рисовать pill с 🔴🟡🟢
3. **ContinueStudyCard** — material dueToday или последний material; нажатие → открыть `/library/[id]`
4. **Убрать mock-init**: проверить, что HomePage **не** использует INITIAL_* данные из mock-data.ts напрямую (через getMaterials/getStudyStats должно работать из БД)
5. **Empty state**: если материалов 0 — показать "Добавь свой первый конспект: 📷 / 📄 / 📝" с навигацией

### Task-local Test Requirements
- **TR-R6.1 (rule):** При 0 тем с due date home page показывает empty state без mock-данных
- **TR-R6.2 (rule):** При 2 темах с nextReviewAt ≤ сегодня home page отображает блок "Сегодня повторить 2 темы" со ссылкой на quiz mode=WEAK_TOPICS
- **TR-Ru6.3 (rubric):** Информативность dashboard (0–2):
  - `0`: только 1 виджет с mock-числами
  - `1`: 3–4 реальных виджета, но нет due topics
  - `2`: все виджеты: today repeat, прогресс, слабые темы, последние активности — 100% из БД
  - Порог: ≥ 2

---

## Task 7: Topics раздел — Material detail с mastery/nextReview/weak spots UI

**Priority:** medium
**Depends on:** Task 2, Task 4
**Parent AC:** AC-Ru1, AC-Ru3
**Files to edit:**
- `src/components/library/KnowledgeTreeMap.tsx`
- `src/app/(app)/library/[id]/page.tsx`
- (опционально) NEW topic tabs UI

### Детали реализации
1. **KnowledgeTreeMap**: каждая тема карточка содержит:
   - Mastery Level (0–5) визуально: `0`=серый, `1-2`=жёлтый, `3-4`=синий, `5`=зелёный + progress bar "Освоено XX%"
   - accuracy rate, totalAttempts
   - `lastStudiedAt` (отформатированная дата: "Сегодня, 14:30")
   - `nextReviewAt` (badge: "Через 2 дня" / "Повторить сегодня" / "Просрочено 3 дня")
   - Клик по теме → открыть `TopicPreStudyModal` (explain) или quiz prestart
2. **Material detail page**:
   - Над `KnowledgeTreeMap` добавить summary stats по материалу: средний mastery всех тем, всего вопросов пройдено, средняя точность
   - Для каждой темы добавить под-разделы: 1) Объяснение → TopicPreStudyModal 2) Основные понятия → concepts list 3) Карточки → link /flashcards?topicId= 4) Тест → link /quiz?topicId= 5) История → прошлые StudySession для этой темы 6) Слабые места → weak spots по диагностике 7) Повторить → быстрый запуск quiz по теме
3. Добавить mock-free: убедиться, что страница полностью серверная с данными из БД, или client-side fetch без INITIAL_*

### Task-local Test Requirements
- **TR-R7.1 (rule):** KnowledgeTreeMap каждая тема отображает mastery level color/icon, nextReviewAt badge, accuracy
- **TR-R7.2 (rule):** По ссылке /library/[id] открывается объяснение темы → тест flow работает end-to-end
- **TR-Ru7.3 (rubric):** Topic detail полнота (0–2):
  - `0`: только список тем без доп. секций
  - `1`: 3–4 секции (объяснение/тест/карточки/понятия)
  - `2`: все 7 секций темы (Explain, Concepts, Cards, Test, History, Weak, Repeat)
  - Порог: ≥ 2

---

## Task 8: QuizPlayer — сохранение responseTimeMs / детальный ответ + wire кнопок

**Priority:** high
**Depends on:** Task 2, Task 3
**Parent AC:** AC-R6, AC-R11, AC-Ru1
**Files to edit:**
- `src/components/quiz/QuizPlayer.tsx`
- `src/app/api/quizzes/record-session/route.ts`
- `src/lib/db/repository.ts` (recordQuizSession)

### Детали реализации
1. **QuizPlayer**:
   - Для каждого вопроса хранить `questionStartAt=Date.now()` при монтировании вопроса
   - При handleSubmitAnswer вычислять `responseTimeMs = Date.now() - questionStartAt`
   - Собирать для каждого ответа объект: `{questionId, topicId, selectedOptionId, userAnswerText (opt.text), isCorrect, responseTimeMs, answeredAt}`
   - Перед сохранением сессии добавить эти поля в answers payload
   - **Кнопки проверить**: `Проверить ответ`, `Следующий вопрос`, `Посмотреть результаты`, `Пройти заново`, `На главную` — все должны работать (уже работают частично, проверить wire)
2. **`recordQuizSession` Repository**:
   - Принимать расширенные answers: `{ questionId, topicId, isCorrect, userAnswerText?, responseTimeMs? }`
   - Для каждого QuizQuestion в текущей Quiz (если создаём Quiz entity) обновлять selectedAnswer, isCorrect, timeSpentSeconds = round(responseTimeMs/1000), userAnswerText, responseTimeMs, answeredAt
   - Альтернатива: если Quiz не создаётся явно, всё равно сохранять ответы через существующий flow + в answers payload хранить детали
3. **History persistence**: После перезагрузки страницы `/progress` или отдельно `/quiz` показывать прошлые сессии (StudySessions)

### Task-local Test Requirements
- **TR-R8.1 (rule):** После завершения теста QuizQuestion записи (или детали в StudySession.answers) содержат responseTimeMs > 0 и userAnswerText непустой
- **TR-R8.2 (rule):** Перезагрузка страницы после теста → в getStudySessions() новая сессия видна со статистикой
- **TR-Ru8.3 (rubric):** Answer traceability (0–2):
  - `0`: только общий score сохраняется
  - `1`: per-question isCorrect, но без времени/текста ответа
  - `2`: каждый ответ с questionId/topicId/isCorrect/text/timestamp/responseTimeMs и после reload не пропадает
  - Порог: ≥ 2

---

## Task 9: WeakSpot AI Diagnostics — strong/weak areas + кнопка «Повторить слабые»

**Priority:** high
**Depends on:** Task 3, Task 8
**Parent AC:** AC-R7, AC-Ru1
**Files to edit:**
- `src/lib/ai/weak-spot-analyzer.ts`
- `src/lib/ai/schemas.ts` — WeakSpotDiagnosis schema
- `src/app/api/quizzes/diagnose-weakness/route.ts`
- `src/components/quiz/QuizPlayer.tsx` (result экран)

### Детали реализации
1. **WeakSpot Schema** дополнить:
   - `strongAreas: {conceptName, details}[]`
   - `weakAreas: {conceptName, details}[]`
   - `mistakeBreakdown: {questionPrompt, whyWrongShort}[]` — короткая «Почему ошиблась» для каждой неправильной
2. **Analyzer.prompt**:
   - В конец prompt добавить: "Отдельно выдели strongAreas (хорошо получилось) и weakAreas (нужно повторить). Для каждой ошибки напиши 1–2 предложения whyWrongShort: почему именно этот выбор был ошибочным."
3. **QuizPlayer result screen**:
   - После "Тест завершён" показать секции:
     a. **Хорошо получилось** → bulleted list strongAreas
     b. **Нужно повторить** → highlight weakAreas с иконками 📕
     c. **Почему ошиблась** → для каждой ошибки карточка с her short
   - Кнопка "[ Повторить слабые места ]" ниже (видна только если есть weak areas):
     - onClick → вызвать startQuizSession с mode="REPEAT_WEAK" и передать weakTopicIds в payload excludeQuestionIds=последние неправильные + previousMistakes
     - URL navigation `/quiz?mode=WEAK_TOPICS&weakTopicIds=...`
4. Убедиться что diagnose-weakness route возвращает новые поля

### Task-local Test Requirements
- **TR-R9.1 (rule):** WeakSpotDiagnosis при 3 правильных и 2 неправильных → strongAreas.length ≥ 1, weakAreas.length ≥ 1, mistakeBreakdown.length === 2
- **TR-R9.2 (rule):** Кнопка "Повторить слабые места" существует → при клике генерирует quiz mode=WEAK_TOPICS с фокусом на weakTopics
- **TR-Ru9.3 (rubric):** Пост-тест рефлексия UX (0–2):
  - `0`: только числовой score
  - `1`: score + diagnosis без секций strong/weak
  - `2`: strong/weak + mistakeBreakdown "Почему ошиблась" + кнопка "Повторить слабые" работает
  - Порог: ≥ 2

---

## Task 10: Mobile-first UI polish — safe-area, overflow, FAB, button sizes

**Priority:** medium
**Depends on:** Tasks 4–9 (после всех основных UI компонентов)
**Parent AC:** AC-R8, AC-R11, AC-Ru2
**Files to edit:**
- `src/app/globals.css`
- `src/components/layout/SafeContainer.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/TopHeader.tsx`
- Все страницы: library/page, quiz/page, home page, flashcards/page, progress/page, library/[id]/page

### Детали реализации
1. **SafeContainer**:
   - Уже есть pb-24; увеличить при необходимости и учесть env(safe-area-inset-bottom) для nav h-16
   - Добавить pt для safe-area-top (через TopHeader)
   - Max-w-md + mx-auto; разрешить max-w-full в landscape, но не overflow-x
2. **MobileBottomNav**:
   - Усилить safe-area-bottom padding: `pb-[max(env(safe-area-inset-bottom),0.5rem)]`
   - Каждая иконка + текст в вертикальном стеке; общая высота нажатия ≥ 44pt по вертикали
3. **FAB кнопка "+ Добавить материал"** на Library Page:
   - Фиксированная позиция `fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4` (над bottom nav!)
   - z-40, размер w-14 h-14, тень
   - Нажатие → action sheet с 3 опциями (📷 Камера, 📄 Файл, 📝 Тема вручную)
4. **Overflow audit**:
   - Всем длинным заголовкам и текстам в карточках `truncate` или `line-clamp-2/3`
   - Grid/flex с `min-w-0` везде где вложенные тексты
   - Добавить глобальный стиль `body { overflow-x: hidden }` или в layout
5. **Button sizes audit**:
   - Все интерактивные `<button>`, `<Link role=button>` → min-height ≥ 40px на мобильных
   - Touch target padding достаточный
6. **iPhone 14 Pro Max (430w) и iPhone SE (375w)** проверить в DevTools viewport:
   - Ни один элемент не выходит за правую границу w-screen
   - FAB не перекрыт bottom nav
   - Safe area: статус-бар не перекрывает TopHeader

### Task-local Test Requirements
- **TR-R10.1 (rule):** `layout.tsx` + SafeContainer + BottomNav вместе дают 0 горизонтального overflow (проверить в DevTools 375px: `document.body.scrollWidth === document.body.clientWidth`)
- **TR-R10.2 (rule):** FAB "+ Добавить материал" на Library Page расположен над bottom nav, имеет w-14 h-14, открывает 3-опционное меню
- **TR-Ru10.3 (rubric):** iPhone UX polish (0–2):
  - `0`: перекрытия, overflow, кнопки менее 36pt
  - `1`: minor issues (1 кнопка мала/частичный overflow на 1 экране)
  - `2`: 375w, 430w, 812h — 0 overflow, все touch targets ≥ 44pt, FAB/nav/safe area корректны
  - Порог: ≥ 2

---

## Task 11: Zod-схемы и proper error handling для всех API routes (без catch→mock)

**Priority:** medium
**Depends on:** — (можно параллельно с 1-10)
**Parent AC:** AC-R9
**Files to edit:**
- Все routes в `src/app/api/**/route.ts`

### Детали реализации
1. Для каждого route добавить:
   - Импорт `z` из `zod`
   - Zod-схему входных параметров (`GetParams`, `PostBody`)
   - `.safeParse()` на входе; в случае ошибки возвращаем `400 { error: 'Invalid input', details }`
   - В `catch`: console.error с stack → возвращаем `500 { error: err.message || 'Internal error' }`
   - **НИКОГДА**: `catch(() => null)`, `catch(() => [])`, `catch(() => mockData)`
2. Проверить все существующие:
   - `/api/materials/upload`
   - `/api/materials/camera-upload`
   - `/api/materials/[id]/route`
   - `/api/materials/[id]/pages/route`
   - `/api/quizzes/generate`
   - `/api/quizzes/verify`
   - `/api/quizzes/record-session`
   - `/api/quizzes/diagnose-weakness`
   - `/api/topics/explain`
   - `/api/explain`
   - `/api/flashcards/[id]/review`
3. Добавить console.error с контекстом user id / material id где нужно

### Task-local Test Requirements
- **TR-R11.1 (rule):** Ни в одном route нет catch→mock pattern; grep по коду: `catch(() => mockData)` или `catch(() => INITIAL_)` → 0 совпадений
- **TR-R11.2 (rule):** `POST /api/materials/upload` body={} → возвращает 400, не падает 500 с stack trace leak
- **TR-Ru11.3 (rubric):** Robust API (0–2):
  - `0`: 3+ routes без валидации, с молчаливыми catch
  - `1`: все routes имеют try/catch, но половина без Zod
  - `2`: все routes имеют Zod safeParse + 500/400 с деталями, нет silent fallback
  - Порог: ≥ 2

---

## Task 12: Удалить mock-плейсхолдеры из UI + проверить все кнопки

**Priority:** high
**Depends on:** Tasks 2-11
**Parent AC:** AC-R11, AC-Ru3
**Files to edit:**
- Пройти все компоненты где есть ссылки на `INITIAL_MATERIALS`, `INITIAL_TOPICS`, `INITIAL_QUESTIONS`, `INITIAL_FLASHCARDS`, `INITIAL_STUDY_SESSIONS` как UI-плейсхолдеры (не fallback AI)
- Особенно progress page, flashcards page, dashboard page

### Детали реализации
1. **Grep codebase**: найти все использования `INITIAL_` вне контекста AI fallback
2. В компонентах: если materials.length===0 — показать empty state, а не INITIAL_MATERIALS
3. **All buttons audit**: пройти UI по списку из требований 21:
   - [+] Добавить материал → FAB меню → 3 опции работают
   - [+] Камера → открывает capture=environment → preview → отправляет
   - [+] Загрузить файл → UploadModal работает с API /upload
   - [+] Отправить фото / Анализировать → /camera-upload работает
   - [+] Создать тест → /generate работает
   - [+] Начать тест → QuizPlayer показывает вопросы
   - [+] Ответить → verify API → feedback UI
   - [+] Следующий / Завершить → результаты
   - [+] Повторить → заново тот же материал с exclude
   - [+] Повторить слабые → WEAK_TOPICS mode с focus
   - [+] Открыть тему → /library/[id] или modal
   - [+] Открыть карточки → /flashcards с topicId
   - [+] Открыть статистику → /progress показывает реальные stats
4. Добавить loading skeletons вместо mock-данных, пока идёт fetch

### Task-local Test Requirements
- **TR-R12.1 (rule):** Grep `INITIAL_` в src/app и src/components (кроме src/lib/db/mock-data.ts типов/AI fallback) → 0 совпадений (или только fallback в AI, а не UI)
- **TR-R12.2 (rule):** Проверка по всем 13+ кнопкам из списка: каждая имеет working onClick/onPress handler, не только style
- **TR-Ru12.3 (rubric):** Coverage button wiring (0–2):
  - `0`: ≥ 4 кнопки декоративные
  - `1`: 1–2 decorative кнопки
  - `2`: 100% интерактивных кнопок рабочие с loading/success/error состояниями
  - Порог: ≥ 2

---

## Task 13: Build, lint, typecheck, test run + финальная верификация E2E flow

**Priority:** high
**Depends on:** Tasks 1-12 все
**Parent AC:** AC-R10, AC-Ru1, AC-Ru3

### Детали реализации
1. Последовательно запустить:
   - `npx tsc --noEmit` → исправить все TS ошибки
   - `npm run lint` → исправить eslint ошибки
   - `npm test` → node tests (tests/*.test.mjs): если падают из-за схем — обновить
   - `npm run build` → prod build проход успешно
2. **E2E manual тест по списку из требований 24**:
   1. Открыть /
   2. Saida user через getDefaultUser
   3. "+ Добавить материал" → выбрать "Тема вручную" → "Гломерулярная фильтрация в почках"
   4. Дождаться: файл → Storage (или virtual для manual), Material → Postgres
   5. OCR N/A → Analysis OK → Topics OK
   6. Открыть тему /library/[id]
   7. TopicPreStudyModal: объяснение с 8 блоками, missing пометки
   8. Нажать "Готова — начать тест"
   9. Пройти 5 вопросов (3 верно, 2 неверно)
   10. Каждый ответ POST /verify, ответ сохраняется в QuizQuestion
   11. Завершить тест → результаты /score/
   12. Слабые темы от WeakSpotAnalyzer показаны
   13. Mastery изменился (0 → 1 или 2)
   14. nextReviewAt установлен на ≈ +1 день
   15. Перезагрузить страницу → история сессии не пропала (ProgressPage)
   16. Снова открыть тему → "Повторить" → запустить повторный тест
   17. Вопросы не повторяют первый тест ≥ 80% уникальности
   18. AI учитывает прошлые 2 ошибки: они упомянуты в новых вопросах (проверить prompt контекст)
3. Записать все результаты в evidence

### Task-local Test Requirements
- **TR-R13.1 (rule):** `npx tsc --noEmit` → 0 errors; `npm run build` → success exit code 0
- **TR-R13.2 (rule):** `npm run lint` → 0 errors (warnings — возможно, но без errors)
- **TR-R13.3 (rule):** `npm test` → 0 failing tests (≥ 80% passing; если падают старые из-за schema — адаптировать тесты)
- **TR-Ru13.4 (rubric):** E2E completeness (0–2):
  - `0`: не удалось пройти до конца из-за ошибок
  - `1`: дошёл до конца, но 2–3 мелких шероховатости
  - `2`: весь flow 1..26 шагов работает без падений; mastery, nextReviewAt, unique questions на повтор
  - Порог: ≥ 2
