# Спецификация: Saida Med AI — Полноценная доработка учебного AI-сервиса

## 1. Проблема, пользователи, цели

### Проблема
Существующая версия Saida Med AI имеет базовую архитектуру (Material → Topic → Question → Flashcard), но не реализует полный учебный цикл как персональный медицинский tutor. Ключевые пробелы:
- Отсутствует Mastery Level (0–5) для тем
- Нет расписания повторений тем (lastStudiedAt / nextReviewAt)
- При повторном прохождении теста используются те же самые вопросы
- Нет ручного ввода темы без загрузки файла
- Dashboard не показывает "сегодня повторить N тем"
- Не все кнопки UI привязаны к реальным действиям
- INITIAL_* mock-данные в mock-data.ts могут скрываться как fallback-данные

### Пользователи
- Основной пользователь: Saida — студентка медицинского университета, готовящаяся к экзаменам, использующая iPhone

### Цели
1. Реализовать полный цикл: Material → OCR → Topics → Topic Explanation → Concepts → Test → Answers → Analytics → Weak Spots → Review Schedule → Personalized Re-test
2. Добавить Mastery Level (0–5) и SM-2 подобное интервальное повторение для тем
3. Гарантировать, что при повторном тесте генерируются новые вопросы с учётом прошлых ошибок
4. Подключить все кнопки UI к реальным API/действиям
5. Убрать использование mock-данных как источника UI (оставить только как fallback AI)
6. Усилить mobile-first подход (safe-area, отсутствие overflow, доступные кнопки)

### Не-цели
- **НЕ** менять DATABASE_URL, DIRECT_URL, Supabase credentials, OpenAI API key
- **НЕ** менять регион/структуру Supabase project, Storage конфигурацию
- **НЕ** заменять Prisma, OpenAI другим провайдером, не отключать существующий OCR pipeline
- **НЕ** создавать вторую БД или второй storage provider
- **НЕ** создавать mock UI данные как основную БД

---

## 2. Функциональные требования (FR)

### FR1 — Prisma: расширение моделей TopicPerformance / QuizQuestion
- В `TopicPerformance` добавить поля:
  - `masteryLevel Int @default(0)` (0–5)
  - `lastStudiedAt DateTime @default(now())`
  - `nextReviewAt DateTime @default(now())`
  - `reviewCount Int @default(0)`
  - `streakCorrect Int @default(0)`
- В `QuizQuestion` добавить `userAnswerText String?` и `responseTimeMs Int?` (уже есть selectedAnswer, дополнить для полноты)
- Запустить `prisma generate` + `prisma migrate dev`

### FR2 — Repository: Mastery calculation + Review scheduling
- Добавить в `MedicalRepository`:
  - `calculateMastery(accuracyRate, totalAttempts, streakCorrect)` → 0..5 (детерминированно, без рандома)
  - `adjustReviewInterval(topicPerformance, sessionResult)` → обновляет nextReviewAt по SM-2-подобному правилу
  - `getTopicsDueForReview(userId, date)` → возвращает темы, у которых nextReviewAt ≤ указанной даты
  - `getTopicsWithMastery(materialId?)` → обогащает MockTopic masteryLevel, nextReviewAt, lastStudiedAt
- Усилить `recordQuizSession`: после обновления accuracy пересчитать mastery и скорректировать nextReviewAt/streakCorrect для каждой затронутой TopicPerformance

### FR3 — Не повторять один и тот же тест (новые вопросы на повтор)
- В `POST /api/quizzes/generate`:
  - Принимать дополнительные параметры: `excludeQuestionIds[]` (вопросы, которые уже были в предыдущих сессиях)
  - Запрашивать из БД вопросы, которые пользователь ещё НЕ видел (через QuizQuestion.history)
  - Если существующих вопросов не хватает, генерировать новые через QuestionGenerator
- Доработать `QuestionGenerator.generateQuestions`: опционально принимать `previousMistakes[]` и `masteryLevel` для контекстной генерации вопросов "на слабые места"
- В QuizPlayer при старте сохранять excludeQuestionIds для последующих запусков

### FR4 — AI-объяснение темы (приоритет источника → потом AI)
- Доработать `TopicExplainer` (уже есть базовая версия):
  - Добавить структуру ответа согласно требованию: 1) Что это? 2) Почему возникает? 3) Механизм/патогенез 4) Основные признаки 5) Классификация 6) Диагностика 7) Лечение (если есть в материале) 8) Что особенно важно запомнить
  - Добавить секцию "Missing from source" — явно помечать, если информация отсутствует в материале (не добавлять факты вне контекста)
- Обновить схему `TopicDeepExplainerSchema` в schemas.ts под новую структуру
- В TopicPreStudyModal отображать новую структуру блоками

### FR5 — Ручной ввод темы ("Ввести тему вручную")
- Добавить UI-кнопку в Library ("Добавить материал" → 3 опции: Камера / Файл / Тема вручную)
- Создать новый API route: `POST /api/topics/create-manual`
  - Принимает: `topicName`, `subject?`
  - Вызывает AI (через topic-explainer + question-generator + concept-extractor)
  - Создаёт Material виртуального типа "manual_topic"
  - Создаёт Topic, Concepts, KeyFacts, Questions, Flashcards для введённой темы
  - Сохраняет всё в PostgreSQL

### FR6 — Home Dashboard: реальные цифры + "Сегодня повторить"
- В `getStudyStats` добавить:
  - `topicsDueToday: MockTopic[]` — темы с nextReviewAt ≤ сегодня
  - `topicsWithMastery: { id, name, mastery, accuracy, nextReviewAt }[]`
  - `totalTopicsStudied: number`
- Home page (`/`) показывать:
  - Секцию "Сегодня стоит повторить" со списком тем (🔴 просрочено / 🟡 сегодня / 🟢 ок)
  - Кнопку "Начать повторение" → запускает quiz mode=WEAK_TOPICS + due_today filter
  - Прогресс-статитистика из реальной БД (без mock)
- Убрать любые hardcoded/фиктивные значения из dashboard UI

### FR7 — Topics раздел: полная информация по каждой теме
- Material detail page (`/library/[id]` + `KnowledgeTreeMap`):
  - Для каждой темы показывать: Mastery Level (0–5 с визуальной шкалой), accuracy, попытки, lastStudied, nextReview, количество слабых вопросов
  - При открытии темы: 1) Объяснение 2) Основные понятия 3) Карточки 4) Тест 5) История результатов 6) Слабые места 7) Повторить
- Добавить API endpoint `GET /api/topics/:id` или расширить существующие репозиторийные методы

### FR8 — Сохранение КАЖДОГО ответа (детальный аудит)
- В QuizPlayer перед отправкой на `/record-session`:
  - Для каждого ответа собирать: questionId, topicId, selectedOptionId, userAnswerText, isCorrect, responseTimeMs, answeredAt (timestamp)
- В `recordQuizSession` репозитория: для каждого ответа создать отдельную запись (через QuizQuestion update + StudySession.answers)
- Проверить, что после перезагрузки страницы история сессий доступна (не теряется)

### FR9 — AI-диагностика слабых мест после теста
- В `WeakSpotAnalyzer` (уже есть) расширить структуру:
  - `strongAreas[]` (что хорошо получилось)
  - `weakAreas[]` (что нужно повторить)
  - для каждой ошибки: почему именно ошиблась (краткое объяснение)
- В QuizPlayer результат-тест отображать:
  - "Хорошо получилось: ..."
  - "Нужно повторить: ..."
  - "Почему ошиблась: ..." для каждой ошибки
  - Кнопка "Повторить слабые места" → запускает quiz mode=REPEAT_WEAK с фильтром weakTopicIds

### FR10 — Mobile-first UI: safe-area + отсутствие overflow
- Проверить и гарантировать:
  - SafeContainer использует 100dvh и safe-area insets
  - MobileBottomNav имеет `safe-area-bottom` padding и не перекрывает контент
  - FAB-кнопка (если используется) имеет отступ над навигацией
  - Нет horizontal overflow на экранах iPhone SE / iPhone 14
  - Все кнопки имеют размер ≥ 44x44pt для касания
  - Текст не выходит за границы контейнеров (использовать truncate, wrap, min-w-0)

### FR11 — Все кнопки работают
Для каждой кнопки в UI проверить end-to-end действие:
- Добавить материал / Камера / Загрузить файл / Тема вручную
- Отправить фото / Анализировать
- Начать тест, Ответить, Следующий, Завершить
- Повторить, Повторить слабые темы
- Открыть тему, карточки, статистику
- Все они должны вызывать реальные API / навигации, а не быть декоративными

### FR12 — API validation через Zod
- Каждый существующий API route добавить Zod-схемы для входных параметров
- Логировать ошибки с деталями (catch → console.error → throw)
- Никаких `catch(() => null)`, `catch(() => [])`, `catch(() => mockData)`

---

## 3. Не-функциональные требования (NFR)

- NFR1 (Точность данных): Все dashboard/topic/quiz цифры — только из PostgreSQL через Prisma
- NFR2 (Воспроизводимость): Mastery 0–5 детерминирован; не использовать Math.random() для вычислений
- NFR3 (Производительность): API endpoints отвечают < 30s (кроме AI pipeline с maxDuration=60)
- NFR4 (Доступность): Все интерактивные элементы имеют aria-label; контрастность WCAG AA
- NFR5 (Совместимость): iPhone Safari, Chrome mobile, desktop Chrome — без горизонтального скролла и перекрытий
- NFR6 (Качество сборки): `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` должны проходить без ошибок

---

## 4. Ограничения, зависимости, допущения

### Ограничения (жесткие)
- Существующие env vars (SUPABASE_URL/KEY, OPENAI_API_KEY) **НЕ** трогать
- Существующий Supabase проект, Storage bucket **НЕ** пересоздавать
- Prisma — единственный ORM; не вносить raw SQL изменения схемы помимо миграций
- Только OpenAI провайдер для AI-вызовов (существующий client.ts)

### Зависимости
- OpenAI GPT-4o / GPT-4o-mini для анализа, объяснений, генерации вопросов
- Supabase PostgreSQL: Material, Topic, Question, Quiz, Flashcard таблицы
- Supabase Storage: загрузка файлов и страниц сканов
- Существующий OCR Service (ocr-service.ts) для фотографий

### Допущения
- Существующий `INITIAL_MATERIALS` в mock-data.ts используется ТОЛЬКО как AI fallback, не как UI плейсхолдер
- Пользователь "Saida" (defaultUser) уже используется через `getDefaultUser()`; новая Auth-система не требуется
- SM-2 для Flashcard уже реализован и работает; повторяем SM-2-подход для TopicPerformance

---

## 5. Открытые вопросы (без блокировки)
1. Сохранять ли отдельную сущность `TestSession` или достаточно существующих `Quiz` + `QuizQuestion` + `StudySession`? → **Решение в процессе реализации: использовать существующие + дополнять полями**
2. Какой минимальный порог mastery=3 ("базовое понимание")? → accuracy ≥ 70% и ≥ 3 попытки

---

## 6. Критерии приёмки (Acceptance Criteria)

### Тип `rule` (объективный бинарный признак)
- **AC-R1**: Prisma schema содержит новые поля masteryLevel, lastStudiedAt, nextReviewAt, reviewCount, streakCorrect в TopicPerformance и миграция применена без ошибок
- **AC-R2**: `MedicalRepository.getStudyStats()` возвращает topicsDueToday, основанные на реальных nextReviewAt из БД; Home Dashboard показывает этот список
- **AC-R3**: При запуске quiz второй раз подряд по той же теме, ≤20% вопросов совпадают с предыдущей сессией (для темы с ≥ 10 вопросами)
- **AC-R4**: Выбор "Ввести тему вручную" ("Патофизиология сердечной недостаточности") создаёт Material, Topic, Concepts, Questions и Flashcards в PostgreSQL, видимые в Library
- **AC-R5**: TopicPreStudyModal показывает структурированное объяснение с 8+ блоками и явной отметкой "Missing from source" для фактов вне материала
- **AC-R6**: QuizPlayer перед записью сессии собирает и отправляет responseTimeMs для каждого вопроса; QuizQuestion сохраняет данные
- **AC-R7**: После теста с ошибками WeakSpotDiagnosis содержит strongAreas, weakAreas и кнопка "Повторить слабые места" запускает quiz только по weak topicIds
- **AC-R8**: На iPhone Safari (симуляция 375x812 Safari) отсутствует горизонтальный overflow; ни одна кнопка не перекрыта safe-area
- **AC-R9**: Ни один API route не использует catch→mock fallback; ошибки логируются и возвращаются с 500/400
- **AC-R10**: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — все проходят 0 ошибок

### Тип `rubric` (оценочная шкала)
- **AC-Ru1 — Workflow completeness (0–2)**:
  - `0`: material→test flow работает только частично (≤3 из 8 этапов)
  - `1`: 5–7 из 8 этапов end-to-end, но пропущены mastery или интервальное повторение
  - `2`: все 8 этапов Material→OCR→Topics→Explanation→Test→Answers→Analytics→ReviewSchedule работают end-to-end
  - Порог сдачи: ≥ 2
- **AC-Ru2 — UI mobile fidelity (0–2)**:
  - `0`: перекрытия, overflow, кнопки за экраном на iPhone SE
  - `1`: minor layout issues, но основные действия доступны
  - `2`: без overflow, все кнопки ≥44pt, safe-area применены корректно, bottom nav не перекрывает контент
  - Порог сдачи: ≥ 2
- **AC-Ru3 — Data integrity (0–2)**:
  - `0`: UI использует mock/fake данные в 2+ местах
  - `1`: 1 mock fallback остаётся (только как AI fallback, не UI)
  - `2`: все данные dashboard/topics/quizzes из PostgreSQL; mastery и nextReviewAt пересчитываются после каждой сессии
  - Порог сдачи: ≥ 2
