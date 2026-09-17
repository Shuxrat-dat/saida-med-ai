import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

test("PostgreSQL Database Persistence Across Disconnect & Reconnect", async (t) => {
  // Client 1 (representing first server session)
  const client1 = new PrismaClient();
  await client1.$connect();

  const testEmail = "saida-test@med.ai";
  const user = await client1.user.upsert({
    where: { email: testEmail },
    update: {},
    create: { email: testEmail, name: "Saida Test" },
  });
  assert.ok(user.id, "User must have an ID");

  const testMatId = `test-mat-${Date.now()}`;
  const testTopicId = `test-top-${Date.now()}`;
  const testConceptId = `test-con-${Date.now()}`;
  const testQId = `test-q-${Date.now()}`;
  const testCardId = `test-fc-${Date.now()}`;

  // 1. Create Material with full relational tree
  const createdMaterial = await client1.material.create({
    data: {
      id: testMatId,
      userId: user.id,
      title: "Анатомия и физиология сердечно-сосудистой системы (Тест)",
      subject: "Кардиология",
      fileType: "camera_scan",
      fileUrl: `/uploads/scans/${testMatId}.pdf`,
      fileKey: `materials/${testMatId}/source`,
      fileSize: 102400,
      pageCount: 2,
      status: "READY",
      summary: "Клинический обзор проводящей системы сердца и гемодинамики.",
      pages: {
        create: [
          { pageNumber: 1, extractedText: "Nodus sinuatrialis генерирует импульсы 60-90 уд/мин.", ocrQuality: 0.98 },
          { pageNumber: 2, extractedText: "Пучок Гиса проходит через центральное фиброзное тело.", ocrQuality: 0.95 },
        ],
      },
      topics: {
        create: [
          {
            id: testTopicId,
            name: "Проводящая система сердца",
            description: "Автоматизм и проведение возбуждения в миокарде.",
            importance: "HIGH",
            examRelevance: "HIGH",
            orderIndex: 0,
            concepts: {
              create: [
                {
                  id: testConceptId,
                  name: "Синусно-предсердный узел",
                  definition: "Первичный пейсмейкер сердца.",
                  clinicalSignificance: "Синдром слабости синусового узла приводит к брадикардии.",
                  orderIndex: 0,
                  facts: {
                    create: [
                      { fact: "Частота генерации импульсов 60-90 имп/мин.", sourcePage: 1, isHighYield: true },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
      questions: {
        create: [
          {
            id: testQId,
            topicId: testTopicId,
            prompt: "Где расположен синусно-предсердный узел?",
            options: [
              "В стенке правого предсердия",
              "В межжелудочковой перегородке",
              "В ушке левого предсердия",
              "В верхушке левого желудочка",
            ],
            correctAnswer: "В стенке правого предсердия",
            explanation: "СА-узел расположен субэпикардиально в стенке правого предсердия у устья верхней полой вены.",
            sourceExcerpt: "Nodus sinuatrialis расположен субэпикардиально в стенке правого предсердия",
            sourcePage: 1,
            type: "MCQ",
            difficulty: "MEDIUM",
          },
        ],
      },
      flashcards: {
        create: [
          {
            id: testCardId,
            userId: user.id,
            topicId: testTopicId,
            conceptId: testConceptId,
            front: "Синусно-предсердный узел",
            back: "Первичный пейсмейкер сердца (60-90 имп/мин).",
            sourcePage: 1,
            interval: 1,
            repetitions: 0,
            easeFactor: 2.5,
            nextReviewAt: new Date(),
          },
        ],
      },
    },
  });

  assert.equal(createdMaterial.id, testMatId);

  // 2. Record a quiz session for this material
  const session = await client1.studySession.create({
    data: {
      userId: user.id,
      sessionType: "QUIZ",
      durationSeconds: 120,
      questionsAnswered: 2,
      accuracy: 1.0,
    },
  });
  assert.ok(session.id);

  // Update question stats
  await client1.question.update({
    where: { id: testQId },
    data: {
      timesAnswered: { increment: 1 },
      timesCorrect: { increment: 1 },
    },
  });

  // Record topic performance
  const perf = await client1.topicPerformance.upsert({
    where: {
      userId_topicId: {
        userId: user.id,
        topicId: testTopicId,
      },
    },
    create: {
      userId: user.id,
      topicId: testTopicId,
      totalAttempts: 1,
      correctAttempts: 1,
      accuracyRate: 1.0,
      isWeakTopic: false,
    },
    update: {
      totalAttempts: { increment: 1 },
      correctAttempts: { increment: 1 },
    },
  });
  assert.equal(perf.accuracyRate, 1.0);

  // 3. SIMULATE DEV SERVER RESTART: Disconnect client1
  await client1.$disconnect();

  // 4. NEW SERVER INSTANCE: Client 2 connects from scratch
  const client2 = new PrismaClient();
  await client2.$connect();

  // 5. Verify Material and entire relational tree survived restart
  const fetchedMaterial = await client2.material.findUnique({
    where: { id: testMatId },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      topics: {
        include: {
          concepts: { include: { facts: true } },
          performance: true,
        },
      },
      questions: true,
      flashcards: true,
    },
  });

  assert.ok(fetchedMaterial, "Material must exist in DB after server restart");
  assert.equal(fetchedMaterial.title, "Анатомия и физиология сердечно-сосудистой системы (Тест)");
  assert.equal(fetchedMaterial.pages.length, 2, "Both pages must be preserved");
  assert.equal(fetchedMaterial.topics.length, 1, "Topic must be preserved");
  assert.equal(fetchedMaterial.topics[0].concepts.length, 1, "Concept must be preserved");
  assert.equal(fetchedMaterial.topics[0].concepts[0].facts.length, 1, "KeyFact must be preserved");
  assert.equal(fetchedMaterial.questions.length, 1, "Question must be preserved");
  assert.equal(fetchedMaterial.questions[0].timesAnswered, 1, "Question answered count must be preserved");
  assert.equal(fetchedMaterial.flashcards.length, 1, "Flashcard must be preserved");

  // Verify StudySession survived
  const fetchedSession = await client2.studySession.findUnique({
    where: { id: session.id },
  });
  assert.ok(fetchedSession, "StudySession must exist in DB after restart");
  assert.equal(fetchedSession.questionsAnswered, 2);

  // Verify TopicPerformance survived
  const fetchedPerf = await client2.topicPerformance.findUnique({
    where: {
      userId_topicId: {
        userId: user.id,
        topicId: testTopicId,
      },
    },
  });
  assert.ok(fetchedPerf, "TopicPerformance must exist after restart");
  assert.equal(fetchedPerf.totalAttempts, 1);

  // 6. Test SM-2 Review update in Client 2
  const updatedCard = await client2.flashcard.update({
    where: { id: testCardId },
    data: {
      repetitions: 1,
      interval: 3,
      easeFactor: 2.65,
      nextReviewAt: new Date(Date.now() + 3 * 86400000),
    },
  });
  assert.equal(updatedCard.repetitions, 1);
  assert.equal(updatedCard.interval, 3);

  // 7. Cleanup test data: Delete Material (verifying cascade delete)
  await client2.material.delete({ where: { id: testMatId } });

  // Verify cascade delete cleaned up child records
  const checkPages = await client2.materialPage.findMany({ where: { materialId: testMatId } });
  assert.equal(checkPages.length, 0, "Pages must be cascade deleted");
  const checkTopics = await client2.topic.findMany({ where: { materialId: testMatId } });
  assert.equal(checkTopics.length, 0, "Topics must be cascade deleted");
  const checkQuestions = await client2.question.findMany({ where: { materialId: testMatId } });
  assert.equal(checkQuestions.length, 0, "Questions must be cascade deleted");
  const checkFlashcards = await client2.flashcard.findMany({ where: { materialId: testMatId } });
  assert.equal(checkFlashcards.length, 0, "Flashcards must be cascade deleted");

  // Cleanup test user and session
  await client2.studySession.delete({ where: { id: session.id } });
  await client2.user.delete({ where: { id: user.id } });

  await client2.$disconnect();
});
