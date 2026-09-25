# Requirements Document

## Introduction

This feature implements a complete AI-powered learning engine on top of the existing Saida Med AI infrastructure. The engine covers the full study cycle: material upload → AI analysis → structured topic/subtopic/concept extraction → AI explanation → test session → per-answer persistence → result analysis → deterministic weak-spot detection → personalized adaptive review → mastery update → spaced repetition scheduling.

The engine builds exclusively on existing infrastructure: PostgreSQL (Supabase), Prisma ORM, OpenAI API (via existing `client.ts`), Supabase Storage, existing Zod schemas, existing repository layer, existing security (`security.ts`), and existing SM-2 spaced-repetition logic in `MedicalRepository`. No existing models, routes, components, or services are replaced — only extended or supplemented.

---

## Glossary

- **Learning_Engine**: The AI-powered subsystem that orchestrates the full study cycle from material ingestion to mastery tracking.
- **Material**: An uploaded document (PDF, DOCX, PPTX, or camera scan) stored in PostgreSQL as a `Material` record.
- **Topic**: A top-level subject within a `Material`, mapped to the existing Prisma `Topic` model.
- **Subtopic**: A named subdivision within a `Topic`. Stored as a `Concept` record with `orderIndex` grouping semantics, or as a new lightweight `Subtopic` model if the schema requires it. Requirements below specify which approach is used.
- **Concept**: A discrete medical concept within a `Topic` or `Subtopic`, mapped to the existing Prisma `Concept` model.
- **QuestionPlan**: A server-side data structure that specifies how many questions to generate per subtopic/concept and at which difficulty, before any generation prompt is sent to OpenAI.
- **TestSession**: A persistent record of a single test attempt, stored in PostgreSQL. It is distinct from the existing `Quiz`/`QuizQuestion` models — new `TestSession` and `TestAnswer` Prisma models are required because the existing `Quiz` model lacks per-answer timestamping, subtopic attribution, and adaptive metadata.
- **TestAnswer**: A single answer within a `TestSession`, persisted immediately when the user submits it (not at end of session).
- **WeakSpot**: A subtopic or concept whose accuracy falls below a deterministic threshold based on real `TestAnswer` records.
- **Mastery_Level**: An integer 0–5 computed deterministically from cumulative accuracy, attempt count, and recency. Uses the existing `MedicalRepository.calculateMastery()` algorithm extended with recency weighting.
- **Review_Schedule**: The next-study date for a topic, computed by the existing SM-2-inspired `MedicalRepository.adjustReviewInterval()` logic and stored in `TopicPerformance.nextReviewAt`.
- **AI_Service**: One of the server-side TypeScript modules in `src/lib/ai/` that calls OpenAI. These modules NEVER expose the API key to the browser.
- **Source_Grounding**: The constraint that every AI-generated fact, explanation, or question must cite a verbatim `sourceExcerpt` and `sourcePage` drawn from the uploaded `Material`'s `DocumentChunk` records.
- **Verification_Token**: The AES-256-GCM encrypted token produced by the existing `createVerificationToken()` function that hides correct answers from browser state.

---

## Requirements

### Requirement 1: Enhanced Material Analysis

**User Story:** As a student, I want the system to deeply analyze my uploaded material so that every topic, subtopic, and concept is captured in structured form before I start studying.

#### Acceptance Criteria

1. WHEN a material upload completes, THE Learning_Engine SHALL invoke `analyzeMaterial()` to extract the medical specialty, high-yield executive summary, and a flat list of topics — each with name, description, importance (`HIGH`/`MEDIUM`/`LOW`), and exam relevance.
2. WHEN `analyzeMaterial()` completes, THE Learning_Engine SHALL invoke `extractSubtopics()` for each topic to identify named subdivisions, each linked to the parent `Topic` record via `topicId`.
3. WHEN `extractConcepts()` is invoked for a subtopic, THE Learning_Engine SHALL produce a list of concepts — each with name, definition, clinical significance, and at least one verifiable `KeyFact` with a `sourcePage` reference drawn from the material.
4. THE Learning_Engine SHALL not fabricate facts absent from the uploaded material; WHEN a section has no source evidence, THE Learning_Engine SHALL mark it in `missingFromSource` per the existing `TopicDeepExplainerSchema`.
5. WHEN the extracted structure is persisted, THE Learning_Engine SHALL reuse existing Prisma models (`Material`, `Topic`, `Concept`, `KeyFact`, `DocumentChunk`) and SHALL NOT create duplicate records for a material that shares the same `Material.fileKey`.
6. WHEN analysis results are stored, THE Learning_Engine SHALL update `Material.status` to `"READY"` and `Material.processingStep` to `"ANALYSIS_COMPLETE"`.
7. IF an error occurs during AI analysis, THEN THE Learning_Engine SHALL update `Material.status` to `"FAILED"` and `Material.processingStep` to `"ANALYSIS_FAILED"`, and SHALL NOT persist partial topic/concept records for that material.

---

### Requirement 2: Subtopic Persistence Model

**User Story:** As a developer, I want subtopics stored in the database so that question plans, test results, and weak-spot reports can reference them by ID.

#### Acceptance Criteria

1. THE Learning_Engine SHALL add a `Subtopic` Prisma model with the following fields and constraints: `id` (CUID primary key), `topicId` (non-null FK to `Topic`), `name` (non-null String, max 200 characters), `description` (optional String, max 1000 characters), `pageStart` (optional Int ≥ 1), `pageEnd` (optional Int ≥ 1), `contentDensity` (non-null Float, value inclusive in [0, 1], default 0.5), `orderIndex` (non-null Int ≥ 0, default 0), `createdAt` (non-null DateTime, default `now()`).
2. WHEN a `Subtopic` is created, THE Learning_Engine SHALL link it to its parent `Topic` via `topicId` and expose it through a `subtopics` relation on `Topic`.
3. THE Learning_Engine SHALL link existing `Concept` records to a `Subtopic` by adding an optional `subtopicId` FK on the `Concept` model.
4. THE Learning_Engine SHALL configure the `Subtopic` model with `onDelete: Cascade` on the `topicId` FK so that deleting a `Topic` automatically deletes its `Subtopic` records.
5. THE Learning_Engine SHALL configure the `subtopicId` FK on `Concept` with `onDelete: SetNull` so that deleting a `Subtopic` sets `Concept.subtopicId` to `NULL` without deleting the concept.
6. WHEN running the Prisma migration, THE Learning_Engine SHALL produce a migration that does not delete or modify any existing row in the `Topic`, `Concept`, or `Question` tables.

---

### Requirement 3: AI Explanation Service

**User Story:** As a student, I want a structured AI explanation for any topic or concept so that I can understand the mechanism before taking a test.

#### Acceptance Criteria

1. WHEN `generateExplanation()` is invoked with a `topicId` or `conceptId`, THE Learning_Engine SHALL retrieve the relevant `DocumentChunk` records from PostgreSQL and construct an explanation grounded exclusively in those chunks.
2. THE Learning_Engine SHALL return an explanation conforming to the existing `TopicDeepExplainerSchema`: `whatIsIt`, `whyItOccurs`, `pathogenesis`, `mainSigns`, `classification`, `diagnostics`, `treatmentApproaches`, `keyPointsToRemember[]`, `sourcePageReferences[]`, `missingFromSource[]`.
3. IF an explanation for the same `topicId`/`conceptId` has already been generated and stored in PostgreSQL, THEN THE Learning_Engine SHALL return the cached version without issuing a new OpenAI call.
4. IF the OpenAI API returns an error or empty response, THEN THE Learning_Engine SHALL throw a typed `AIServiceError` with the original cause and SHALL NOT return fabricated fallback content.
5. THE Learning_Engine SHALL never expose `OPENAI_API_KEY` in any client-facing API response, client component, or browser-accessible state.

---

### Requirement 4: Question Plan Calculation

**User Story:** As a student, I want the system to determine how many questions to generate per subtopic before generating them, so that coverage mirrors the material's actual content density.

#### Acceptance Criteria

1. WHEN `calculateQuestionPlan()` is invoked with a `topicId` and optional `mode` (`"FULL"` or `"FOCUS"`), THE Learning_Engine SHALL determine the size tier by evaluating both the subtopic count and page count, applying the higher-scoring tier when they conflict, and compute `totalCount` as the upper bound of that tier:
   - Fewer than 5 subtopics AND page count ≤ 8: `totalCount` = 25 (small)
   - 5–9 subtopics OR page count 9–20: `totalCount` = 35 (medium)
   - 10–14 subtopics OR page count 21–40: `totalCount` = 45 (large)
   - 15+ subtopics OR page count > 40: `totalCount` = 60 (very large)
2. IF `mode` is `"FOCUS"`, THEN THE Learning_Engine SHALL restrict the plan to subtopics whose `TopicPerformance.accuracyRate` is below 0.75, assigning each subtopic a weight equal to `(0.75 − accuracyRate)`, and distribute `totalCount` slots proportionally to those weights.
3. WHEN distributing `totalCount` questions across subtopics, THE Learning_Engine SHALL allocate slots proportionally to each subtopic's `contentDensity` score, apply the largest-remainder method to resolve rounding so that slot allocations sum exactly to `totalCount`, and guarantee each included subtopic receives at least 1 slot; IF `totalCount` is less than the number of included subtopics, THEN THE Learning_Engine SHALL reduce `totalCount` to equal the number of included subtopics so that each receives exactly 1 slot.
4. WHEN distributing difficulty within the `QuestionPlan`, THE Learning_Engine SHALL apply 30% EASY, 50% MEDIUM, 20% HARD when the topic's `sessionCount` is 0 (first-attempt), and 20% EASY, 40% MEDIUM, 40% HARD when the topic's `masteryLevel ≥ 3`; fractional counts SHALL be rounded to the nearest whole number using the largest-remainder method so that the three difficulty counts sum exactly to `totalCount`.
5. THE Learning_Engine SHALL return the `QuestionPlan` as a serializable object before any AI generation call is made.
6. THE Learning_Engine SHALL ensure that the sum of all per-subtopic question counts in a `QuestionPlan` equals the plan's `totalCount` field.

---

### Requirement 5: Question Generation

**User Story:** As a student, I want questions generated from my actual uploaded material covering all question types so that I am tested on real content across different cognitive levels.

#### Acceptance Criteria

1. WHEN `generateQuestions()` is invoked with a `QuestionPlan` and source `DocumentChunk` records, THE Learning_Engine SHALL produce questions distributed across the following types — factual recall, definitions, conceptual understanding, comparison, classification, cause/effect, mechanisms, application, clinical scenario, sequence/process, and identifying-incorrect-statement — with at least 1 question per type when `totalCount ≥ 11`.
2. WHEN generating MCQ questions, THE Learning_Engine SHALL produce exactly 4 options with exactly 1 correct answer and a `distractorRationale` for each incorrect option.
3. WHEN generating any question, THE Learning_Engine SHALL include a verbatim `sourceExcerpt` (10–500 characters) from a `DocumentChunk` that directly substantiates the correct answer and the corresponding `sourcePage` number.
4. IF a question fails `QuestionValidator` validation, THEN THE Learning_Engine SHALL discard it and log the rejection reason without throwing an unhandled error; IF the count of valid questions falls below the minimum for the `QuestionPlan`, THEN THE Learning_Engine SHALL retry generation for the deficient subtopics up to 2 additional times before returning the available valid questions.
5. IF a new question prompt's Jaccard token-overlap with any existing `Question.prompt` for the same topic exceeds 0.70, THEN THE Learning_Engine SHALL discard the new question as a duplicate.
6. WHEN questions are persisted to PostgreSQL, THE Learning_Engine SHALL link each `Question` record to its `materialId`, `topicId`, AND the specific `subtopicId` from the plan allocation.
7. IF the authenticated user has previously answered a question (any `TestAnswer` record linking that user to that `Question.id`), THEN THE Learning_Engine SHALL exclude that `Question` from the new session and generate a replacement question for the same concept.

---

### Requirement 6: Persistent Test Session

**User Story:** As a student, I want my test session and every individual answer saved to the database immediately so that I never lose progress if the app closes mid-session.

#### Acceptance Criteria

1. THE Learning_Engine SHALL add `TestSession` and `TestAnswer` Prisma models:
   - `TestSession`: `id` (CUID PK), `userId` (FK → `User`), `topicId` (FK → `Topic`), `subtopicIds` (JSON), `mode` (`FULL` | `FOCUS` | `ADAPTIVE`), `questionPlan` (JSON), `totalQuestions` (Int), `answeredCount` (Int, default 0), `status` (`IN_PROGRESS` | `COMPLETED` | `ABANDONED`), `startedAt` (DateTime, default now()), `completedAt` (DateTime?), `score` (Int?), `accuracyPct` (Float?)
   - `TestAnswer`: `id` (CUID PK), `sessionId` (FK → `TestSession`, onDelete Cascade), `questionId` (FK → `Question`), `subtopicId` (FK → `Subtopic`?), `conceptId` (FK → `Concept`?), `selectedOptionId` (String), `isCorrect` (Boolean), `responseTimeMs` (Int), `answeredAt` (DateTime, default now())
   - Unique constraint on `(sessionId, questionId)` to prevent duplicate answers.
2. WHEN a test session is started via `POST /api/learning/sessions`, THE Learning_Engine SHALL create a `TestSession` record with `status = "IN_PROGRESS"` and return the `sessionId` to the client.
3. WHEN the user submits an answer via `POST /api/learning/sessions/[sessionId]/answers`, THE Learning_Engine SHALL persist a `TestAnswer` record and increment `TestSession.answeredCount` within a single database transaction, completing within 500 ms of receipt.
4. WHEN a `TestAnswer` is persisted, THE Learning_Engine SHALL verify the submitted answer using `verifyAnswerToken()` and store the result in `isCorrect`.
5. WHEN `TestSession.answeredCount` equals `TestSession.totalQuestions`, THE Learning_Engine SHALL set `status = "COMPLETED"`, compute `score` and `accuracyPct` from the session's `TestAnswer` records, and return them in the response.
6. IF a `TestSession` has `status = "IN_PROGRESS"` for more than 4 hours with no new `TestAnswer`, THEN THE Learning_Engine SHALL mark it `"ABANDONED"` the next time `POST /api/learning/sessions` is called for the same topic and user.

---

### Requirement 7: Result Analysis

**User Story:** As a student, I want a detailed breakdown of my test results so that I understand exactly which subtopics, concepts, and difficulty levels I need to improve.

#### Acceptance Criteria

1. WHEN `analyzeTestResult()` is invoked with a completed `sessionId`, THE Learning_Engine SHALL compute and return: overall score (%), per-subtopic accuracy (%), per-concept accuracy (%), per-difficulty accuracy (%), and mean `responseTimeMs` across all `TestAnswer` records for the session.
2. WHEN computing per-subtopic accuracy, THE Learning_Engine SHALL group `TestAnswer` records by `subtopicId` and calculate `correctCount / totalCount` for each group; subtopics with `subtopicId = NULL` SHALL be excluded from per-subtopic breakdown but included in the overall score.
3. WHEN computing per-concept accuracy, THE Learning_Engine SHALL group `TestAnswer` records by `conceptId` and calculate `correctCount / totalCount` for each group; concepts with fewer than 2 answers SHALL be excluded entirely from the report; concepts with `conceptId = NULL` SHALL be excluded from the per-concept breakdown but included in the overall score.
4. WHEN a `TestSession` transitions to `status = "COMPLETED"`, THE Learning_Engine SHALL include the `ResultAnalysis` object in that same API response, without requiring a second client request.
5. WHEN rendering the result to the user, THE Learning_Engine SHALL display each subtopic's accuracy as a colour-coded progress bar: red for < 60%, amber for 60–74%, yellow for 75–89%, green for ≥ 90%; subtopics with no answers SHALL be omitted from the colour-coded display.
6. IF `analyzeTestResult()` is invoked on a session with no `TestAnswer` records, THEN THE Learning_Engine SHALL return an error indicating the session has no answers, and SHALL NOT return an empty or zeroed `ResultAnalysis` object.

---

### Requirement 8: Weak-Spot Detection Engine

**User Story:** As a student, I want the system to deterministically identify my weak subtopics and concepts from real answer data so that I study the right things next.

#### Acceptance Criteria

1. WHEN `calculateWeakSpots()` is invoked after a `TestSession` completes, THE Learning_Engine SHALL classify each subtopic and concept using only deterministic arithmetic on `TestAnswer` records — no LLM calls in this function.
2. THE Learning_Engine SHALL apply the following thresholds: accuracy < 60% → `"weak"`, 60–74% → `"needs_review"`, 75–89% → `"developing"`, ≥ 90% → `"strong"`.
3. IF a subtopic has fewer than 3 `TestAnswer` records or a concept has fewer than 2 `TestAnswer` records, THEN THE Learning_Engine SHALL assign classification `"insufficient_data"` and exclude it from all user-facing weak-spot displays and adaptive weighting calculations.
4. WHEN a subtopic or concept receives a classification other than `"insufficient_data"`, THE Learning_Engine SHALL upsert a `WeakSpotRecord` (matching on `userId + topicId + subtopicId + conceptId`), writing: `classification`, `accuracyPct`, `evidenceCount`, `lastUpdatedAt`.
5. WHEN displaying weak spots to the user, THE Learning_Engine SHALL show each concept name, accuracy %, evidence count, and source page numbers when the concept has a mapped `sourcePage`; IF no page mapping exists for the concept, THE Learning_Engine SHALL display the concept name and accuracy without a page reference.
6. WHEN the topic-level aggregated accuracy across all `TestAnswer` records falls below 60% AND total answer count ≥ 3, THE Learning_Engine SHALL set `TopicPerformance.isWeakTopic = true`.

---

### Requirement 9: Personalized Review Generation

**User Story:** As a student, I want a personalized review that focuses on my weak areas using the concepts I got wrong, so that I can efficiently improve rather than repeating what I already know.

#### Acceptance Criteria

1. WHEN `generateReview()` is invoked, THE Learning_Engine SHALL retrieve all `WeakSpotRecord` entries classified as `"weak"` or `"needs_review"` for the user and build a review plan of 10–20 questions with at least 2 questions per included subtopic.
2. WHEN constructing the review plan, THE Learning_Engine SHALL assign each subtopic a weight equal to `(1 − accuracyPct)` and distribute questions proportionally to those weights using the largest-remainder method, with a floor of 1 question per included subtopic.
3. WHEN generating review questions, THE Learning_Engine SHALL pass the user's previous incorrect `TestAnswer.selectedOptionId` and associated `Question.prompt` as `previousMistakes` context to the question generation call.
4. IF a `Question.id` appears in any prior `TestSession` for the same user and topic, THEN THE Learning_Engine SHALL exclude that question from the review session and request a new question for the same concept.
5. WHEN the review session completes, THE Learning_Engine SHALL reclassify each covered subtopic: a subtopic answered with ≥ 60% accuracy in the review SHALL have its `WeakSpotRecord.classification` updated based on the combined historical accuracy; a subtopic answered with < 60% SHALL retain its existing classification.

---

### Requirement 10: Adaptive Test Generation

**User Story:** As a student, I want subsequent tests to automatically allocate more questions to my weak areas and fewer to my strong areas so that I improve efficiently over time.

#### Acceptance Criteria

1. WHEN `generateAdaptiveTest()` is invoked with a caller-supplied `totalCount` (integer, 5–100), THE Learning_Engine SHALL retrieve current `WeakSpotRecord` classifications for all subtopics in the topic and compute an adaptive `QuestionPlan` by assigning each subtopic a weight per its classification, then allocating `floor(weight_i / sumOfWeights × totalCount)` questions per subtopic with remainders distributed to the highest-weight subtopics first, until allocations sum exactly to `totalCount`.
2. THE Learning_Engine SHALL apply the following adaptive weights: `"weak"` → 3.0, `"needs_review"` → 2.0, `"developing"` → 1.2, `"strong"` → 0.5, `"insufficient_data"` → 1.0.
3. WHEN all subtopics are classified as `"strong"`, THE Learning_Engine SHALL generate a uniform-distribution plan by allocating `floor(totalCount / subtopicCount)` questions per subtopic, distributing the remainder one-per-subtopic to the first N subtopics in `orderIndex` order.
4. WHEN `generateAdaptiveTest()` produces a `TestSession`, THE Learning_Engine SHALL record `mode = "ADAPTIVE"` and store the `questionPlan` JSON in `TestSession.questionPlan`.
5. IF a subtopic has fewer than 5 total `TestAnswer` records, THEN THE Learning_Engine SHALL allocate at least 1 question to it regardless of its adaptive weight.
6. IF `WeakSpotRecord` data is absent for a subtopic, THEN THE Learning_Engine SHALL treat that subtopic as `"insufficient_data"` (weight 1.0) and include a `missingData` flag for that subtopic in the returned `QuestionPlan` to aid debugging.

---

### Requirement 11: Mastery Tracking

**User Story:** As a student, I want my mastery level for each topic updated after every test session so that the dashboard reflects my real current knowledge state.

#### Acceptance Criteria

1. WHEN a `TestSession` is completed and at least 1 `TestAnswer` was recorded for a topic, THE Learning_Engine SHALL invoke the mastery update logic for that topic and every subtopic with at least 1 answer.
2. WHEN computing the recency-weighted accuracy for mastery input, THE Learning_Engine SHALL weight answers: most-recent session weight 1.0, previous session weight 0.8, all earlier sessions weight 0.5; the weighted accuracy = `sum(sessionAccuracy × sessionWeight) / sum(sessionWeight)` across the relevant sessions.
3. WHEN the updated mastery score is available, THE Learning_Engine SHALL persist it to `TopicPerformance.masteryLevel` using an upsert on `(userId, topicId)`; IF no `TopicPerformance` record exists, it SHALL be created.
4. THE Learning_Engine SHALL use the following mastery label mapping applied as `floor(clamp(score × 5, 0, 5))`: 0 → "Не изучено", 1 → "Введено", 2 → "Слабое", 3 → "Развивается", 4 → "Уверенное", 5 → "Освоено"; `masteryLevel` SHALL never exceed 5.
5. WHEN `masteryLevel` transitions to exactly 5 for the first time or after falling below 5, THE Learning_Engine SHALL schedule the next review at a boosted interval to reflect mastery.

---

### Requirement 12: Spaced Repetition Scheduling

**User Story:** As a student, I want the system to schedule each topic for review at the optimal time so that I remember it long-term without over-studying.

#### Acceptance Criteria

1. WHEN a `TestSession` is completed for a topic, THE Learning_Engine SHALL compute the new `nextReviewAt` and persist it to `TopicPerformance.nextReviewAt`.
2. WHEN `accuracyPct ≥ 0.70` in a completed session, THE Learning_Engine SHALL advance the review interval by selecting the interval at index `min(reviewCount, 6)` from the progression [1, 2, 4, 7, 14, 21, 30 days], where `reviewCount` is the value before the current session, and SHALL increment `TopicPerformance.reviewCount` by 1.
3. WHEN `accuracyPct < 0.40` in a completed session, THE Learning_Engine SHALL reset `TopicPerformance.streakCorrect` to 0, reset `TopicPerformance.reviewCount` to 0, and schedule `TopicPerformance.nextReviewAt` to exactly 1 day after the session completion timestamp.
4. WHEN `accuracyPct ≥ 0.40` AND `accuracyPct < 0.70` in a completed session, THE Learning_Engine SHALL leave `TopicPerformance.reviewCount` unchanged and schedule `TopicPerformance.nextReviewAt` to exactly 1 day after the session completion timestamp.
5. WHEN the user opens the dashboard, THE Learning_Engine SHALL retrieve all topics where `TopicPerformance.nextReviewAt` is less than or equal to the current timestamp and display them as due-today topics.
6. IF `TopicPerformance.masteryLevel = 5` AND `TopicPerformance.nextReviewAt` is more than 14 days after the current timestamp, THEN THE Learning_Engine SHALL NOT update the scheduling fields for that topic when a new session is completed.

---

### Requirement 13: Topic Page with Learning Metrics

**User Story:** As a student, I want a dedicated topic page showing mastery, last studied, next review date, subtopic breakdown, and weak concepts so that I can plan my next study action.

#### Acceptance Criteria

1. WHEN a user navigates to `/learning/topics/[topicId]`, THE Learning_Engine SHALL render a page that displays: topic name, material title, mastery level label and badge, overall accuracy % (0–100), last studied date, next review date formatted as DD MMM YYYY, and a subtopic breakdown list.
2. IF the topic page is rendered and `masteryLevel > 0`, THEN THE Learning_Engine SHALL show for each subtopic: a progress bar representing per-subtopic accuracy (0–100%), a classification badge assigned by accuracy range (`"Слабое"` for accuracy < 40%, `"Требует повторения"` for 40–59%, `"Развивается"` for 60–79%, `"Уверенное"` for ≥ 80%), and a concept count.
3. IF a subtopic contains one or more concepts with accuracy below 60%, THEN THE Learning_Engine SHALL display a collapsible list for that subtopic showing each weak concept's name, its accuracy % (0–100), and the recommended source page numbers to review when available.
4. THE Learning_Engine SHALL provide two action buttons: "Полный тест" (launches `FULL` mode `TestSession` for the entire topic) and "Фокус-тест" (launches `FOCUS` mode `TestSession` restricted to subtopics where at least one concept has accuracy below 60%).
5. IF `masteryLevel = 0` for the requested topic, THEN THE Learning_Engine SHALL hide the overall accuracy %, last studied date, next review date, and subtopic breakdown list, and SHALL display a prompt to start a full test; in this state the "Фокус-тест" button SHALL be disabled.
6. IF the requested `topicId` does not correspond to an existing topic record, THEN THE Learning_Engine SHALL render an error state indicating the topic was not found and SHALL NOT display any topic metrics or action buttons.
7. ALL data on the topic page SHALL come from PostgreSQL via server-side data fetching; no mock data or localStorage-derived values SHALL be used.

---

### Requirement 14: Dashboard Integration

**User Story:** As a student, I want the dashboard to show real statistics from my test sessions so that I can see my actual progress at a glance.

#### Acceptance Criteria

1. WHEN the dashboard renders, THE Learning_Engine SHALL display: total study time in hours (to 1 decimal place), total questions answered (integer), overall accuracy (whole-number percentage 0–100), and topic count — all sourced from real `TopicPerformance` and session records in PostgreSQL.
2. WHEN topics with a next scheduled review date on or before the current calendar date exist, THE Learning_Engine SHALL display them in the "Due Today" widget.
3. WHEN topics with accuracy below 60% exist, THE Learning_Engine SHALL display them in the "Weak Topics" widget.
4. WHEN a user completes a `TestSession`, THE Learning_Engine SHALL update the dashboard statistics within 5 seconds, without requiring a full page reload, to reflect the new session's contribution to study time and question count.
5. THE Learning_Engine SHALL NOT render mock or hardcoded placeholder data on the dashboard at any time.
6. WHEN no real study data exists for the user, THE Learning_Engine SHALL render an empty-state UI that prompts the user to upload material and to start their first test.

---

### Requirement 15: Full Test Mode

**User Story:** As a student, I want to take a full test covering my entire topic so that I can assess my overall knowledge before choosing what to focus on.

#### Acceptance Criteria

1. WHEN the user initiates a full test for a topic, THE Learning_Engine SHALL create a `TestSession` with `mode = "FULL"` using the `QuestionPlan` returned by `calculateQuestionPlan()` with `mode = "FULL"`, and SHALL return the `sessionId` and first question to the client in the same response.
2. WHILE a FULL mode `TestSession` has `status = "IN_PROGRESS"`, THE Learning_Engine SHALL present questions one at a time and persist each `TestAnswer` before making the next question available to the client.
3. WHEN the user answers a question in FULL mode, THE Learning_Engine SHALL not include the correct answer, correct option identifier, or any per-question explanation in the API response until the session `status` transitions to `"COMPLETED"`.
4. WHEN the `TestSession.status` transitions to `"COMPLETED"`, THE Learning_Engine SHALL return the `ResultAnalysis` (per-subtopic accuracy bars and identified weak spots) in that same response within 3 seconds of the final answer submission.
5. IF `calculateQuestionPlan()` returns a plan with `totalCount = 0`, THEN THE Learning_Engine SHALL return HTTP 422 with `{ error: "INSUFFICIENT_CONTENT" }` and SHALL NOT create a `TestSession` record.

---

### Requirement 16: Focus Test Mode

**User Story:** As a student, I want a shorter, targeted test that focuses only on my weak subtopics so that I can efficiently improve specific gaps without retesting mastered areas.

#### Acceptance Criteria

1. WHEN the user initiates a focus test for a topic, THE Learning_Engine SHALL create a `TestSession` with `mode = "FOCUS"` containing 5–20 questions drawn exclusively from subtopics with `WeakSpotRecord.classification` in (`"weak"`, `"needs_review"`).
2. IF no subtopics with `WeakSpotRecord.classification` in (`"weak"`, `"needs_review"`) exist for the topic, THEN THE Learning_Engine SHALL return HTTP 422 with `{ error: "NO_WEAK_SUBTOPICS" }` and SHALL NOT create a `TestSession` record; the UI SHALL display a message prompting the user to start a FULL test instead.
3. WHILE a FOCUS mode `TestSession` has `status = "IN_PROGRESS"`, THE Learning_Engine SHALL present questions at MEDIUM (50%) and HARD (50%) difficulty and reveal the correct answer and explanation immediately after each submitted answer.
4. WHILE a FOCUS mode `TestSession` has `status = "IN_PROGRESS"`, THE Learning_Engine SHALL include the correct option identifier and AI-generated explanation in the API response to each answer submission.
5. WHEN a FOCUS session completes, THE Learning_Engine SHALL update `WeakSpotRecord` classifications for all covered subtopics: a subtopic answered with ≥ 2 consecutive correct answers SHALL be reclassified as `"strong"`; otherwise its classification SHALL remain unchanged.

---

### Requirement 17: AI Services Architecture

**User Story:** As a developer, I want all AI calls encapsulated in clearly named server-side service functions so that the codebase is maintainable and testable.

#### Acceptance Criteria

1. THE Learning_Engine SHALL expose the following named functions in `src/lib/ai/learning-engine.ts`: `analyzeMaterial()`, `extractSubtopics()`, `extractConcepts()`, `generateExplanation()`, `calculateQuestionPlan()`, `generateQuestions()`, `validateQuestions()`, `analyzeTestResult()`, `calculateWeakSpots()`, `generateReview()`, `generateAdaptiveTest()`, `updateMastery()`.
2. WHEN any of these functions need an AI provider, THE Learning_Engine SHALL resolve the API key and model by calling `getActiveAIConfig()`; IF `getActiveAIConfig()` returns a Gemini provider, THE Learning_Engine SHALL use the Gemini client; IF it returns OpenAI, THE Learning_Engine SHALL use the OpenAI client; IF it returns `MOCK`, THE Learning_Engine SHALL throw `AIServiceError` with `code: "PROVIDER_UNAVAILABLE"`.
3. WHEN any AI function receives an empty, null, or schema-invalid response, THE Learning_Engine SHALL throw `AIServiceError` with `code` from the set `{ "EMPTY_RESPONSE", "SCHEMA_VALIDATION_FAILED", "PROVIDER_ERROR", "PROVIDER_UNAVAILABLE", "RATE_LIMITED" }` and `cause` set to the original error.
4. WHEN a structured JSON response is expected, THE Learning_Engine SHALL validate it against the corresponding Zod schema; IF validation fails, THE Learning_Engine SHALL throw `AIServiceError` with `code: "SCHEMA_VALIDATION_FAILED"` and the Zod error as `cause`.
5. WHEN multiple items of the same type must be generated (e.g., subtopics for multiple topics), THE Learning_Engine SHALL send all items in a single prompt rather than one prompt per item.
6. IF a generated explanation has already been stored for the given `topicId` or `conceptId`, THEN THE Learning_Engine SHALL return the stored value without issuing a new AI call.

---

### Requirement 18: API Routes

**User Story:** As a developer, I want clean REST API routes for the learning engine so that the frontend can interact with all engine functions through well-defined endpoints.

#### Acceptance Criteria

1. THE Learning_Engine SHALL expose the following Next.js API routes: `POST /api/learning/analyze`, `GET /api/learning/topics/[topicId]`, `POST /api/learning/topics/[topicId]/explain`, `POST /api/learning/sessions`, `POST /api/learning/sessions/[sessionId]/answers`, `GET /api/learning/sessions/[sessionId]/result`, `GET /api/learning/topics/[topicId]/weak-spots`, `POST /api/learning/topics/[topicId]/adaptive-test`.
2. WHEN an API route receives invalid input, THE Learning_Engine SHALL return HTTP 400 with `{ error: string, issues?: ZodIssue[] }` before any database or AI call is made.
3. WHEN an API route encounters an internal error, THE Learning_Engine SHALL return HTTP 500 with `{ error: string, code?: string }`.
4. WHEN an API route is called with a `topicId` or `sessionId` that does not exist in PostgreSQL, THE Learning_Engine SHALL return HTTP 404.
5. WHEN an unauthenticated request is made to any learning API route, THE Learning_Engine SHALL return HTTP 401 before any database or AI call is made.
6. WHEN `POST /api/learning/sessions/[sessionId]/answers` is called for a question that already has a `TestAnswer` record in the same session, THE Learning_Engine SHALL return HTTP 409 without creating a second answer record.

---

### Requirement 19: Responsive UI

**User Story:** As a student, I want all learning engine pages to work correctly on my phone, tablet, and laptop so that I can study on any device.

#### Acceptance Criteria

1. THE Learning_Engine SHALL render all new pages (topic page, test session player, result page) using the existing `SafeContainer` component and Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
2. IF screen width is ≤ 639 px, THEN THE Learning_Engine SHALL stack all grid columns vertically and ensure no horizontal overflow.
3. IF screen width is 640–1023 px, THEN THE Learning_Engine SHALL use a two-column layout for topic metrics and subtopic breakdown.
4. IF screen width is ≥ 1024 px, THEN THE Learning_Engine SHALL use a three-column layout: topic summary sidebar, main content, and a right panel showing next review date and weak concepts.
5. THE Learning_Engine SHALL use the existing `ios-press` CSS utility for all interactive buttons and the `rounded-3xl` card style.
6. WHILE a test session is `IN_PROGRESS`, WHEN the user attempts to navigate away via the browser back button or by closing the tab, THE Learning_Engine SHALL display a confirmation dialog; IF the user confirms, navigation proceeds; IF the user dismisses, the session page remains active. WHEN the user attempts SPA (in-app) router navigation away from an active session, THE Learning_Engine SHALL intercept the route change and display the same confirmation dialog before allowing navigation.

---

### Requirement 20: Test Coverage

**User Story:** As a developer, I want automated tests for all critical engine algorithms so that regressions are caught before deployment.

#### Acceptance Criteria

1. THE Learning_Engine SHALL include unit tests for `calculateQuestionPlan()` in `tests/learning-engine.test.mjs`, covering: topic sizes small (1–3 subtopics), medium (4–9 subtopics), large (10–19 subtopics), and very-large (≥ 20 subtopics); FULL vs FOCUS mode output; and the invariant `sum(perSubtopicCount) === totalCount`.
2. THE Learning_Engine SHALL include unit tests for `calculateWeakSpots()` covering: minimum evidence thresholds (subtopics with < 3 answers are excluded); all four classification bands (`"strong"` ≥ 0.75, `"needs_review"` 0.60–0.74, `"weak"` < 0.60); and the property that a subtopic with 0 correct answers and ≥ 3 total answers is always `"weak"`.
3. THE Learning_Engine SHALL include unit tests for `updateMastery()` covering: recency-weighted accuracy computation; all six mastery level transitions (0→1, 1→2, 2→3, 3→4, 4→5, 5→5 ceiling); and the property that `masteryLevel` never exceeds 5.
4. THE Learning_Engine SHALL include unit tests for adaptive weight normalization in `generateAdaptiveTest()` covering: normalized weights summing to `totalCount`; the edge case where all subtopics are `"strong"`; and the invariant that no subtopic with < 5 total answers receives 0 questions.
5. THE Learning_Engine SHALL include integration tests for `POST /api/learning/sessions/[sessionId]/answers` covering: atomic answer persistence; `isCorrect` computation via `verifyAnswerToken()`; and HTTP 409 on duplicate answer submission with no second record created.
6. ALL tests SHALL run via `node --test tests/*.test.mjs` without a live database or network connection, using synchronous in-memory stubs for all Prisma calls; tests requiring live external dependencies SHALL be marked `test.skip` with a comment identifying the blocking dependency.
