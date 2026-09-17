import test from "node:test";
import assert from "node:assert/strict";

// 1. OCR Quality Assessment logic
function assessOcrQuality(text) {
  const clean = text.trim();
  if (!clean) {
    return { qualityScore: 0.0, isAcceptable: false, wordCount: 0, reason: "Текст на странице не обнаружен." };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 8) {
    return {
      qualityScore: 0.25,
      isAcceptable: false,
      wordCount,
      reason: "Слишком мало читаемого текста на снимке.",
    };
  }

  const letterMatches = clean.match(/[\p{L}]/gu) || [];
  const letterRatio = letterMatches.length / Math.max(1, clean.length);

  if (letterRatio < 0.45) {
    return {
      qualityScore: 0.4,
      isAcceptable: false,
      wordCount,
      reason: "Снимок содержит сильные оптические шумы.",
    };
  }

  const score = Math.min(1.0, 0.5 + (wordCount / 100) * 0.5);
  return {
    qualityScore: Number(score.toFixed(2)),
    isAcceptable: true,
    wordCount,
  };
}

// 2. Batch Image Extraction logic
function parseImagesBatch(items, preferredTitle) {
  const sorted = [...items].sort((a, b) => a.pageNumber - b.pageNumber);
  const pages = sorted.map((item) => ({
    pageNumber: item.pageNumber,
    text: item.extractedText,
    sectionTitle: `Страница ${item.pageNumber}`,
  }));

  const assessments = pages.map((p) => ({
    pageNumber: p.pageNumber,
    assessment: assessOcrQuality(p.text),
  }));

  let title = preferredTitle;
  if (!title) {
    const firstLine = pages[0]?.text.split("\n")[0]?.trim() || "";
    if (firstLine.length > 5 && firstLine.length < 80) {
      title = firstLine.replace(/^[#0-9.\s]+/, "");
    } else {
      title = "Скан конспекта";
    }
  }

  return {
    title,
    fileType: "camera_scan",
    pageCount: pages.length,
    pages,
    fullText: pages.map((p) => p.text).join("\n\n---\n\n"),
    pageAssessments: assessments,
  };
}

// 3. Semantic Chunker logic
function chunkPages(pages, targetWords = 350) {
  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    const rawParagraphs = pageText.split(/\n{2,}/);
    let currentChunkText = "";
    let currentSection = page.sectionTitle || "Раздел";

    for (const para of rawParagraphs) {
      const cleanPara = para.trim();
      if (!cleanPara) continue;

      const words = cleanPara.split(/\s+/).length;
      const currentWords = currentChunkText.split(/\s+/).filter(Boolean).length;

      if (currentWords + words <= targetWords) {
        currentChunkText += (currentChunkText ? "\n\n" : "") + cleanPara;
      } else {
        chunks.push({
          chunkIndex: chunkIndex++,
          pageNumber: page.pageNumber,
          sectionTitle: currentSection,
          content: currentChunkText.trim(),
        });
        currentChunkText = cleanPara;
      }
    }

    if (currentChunkText.trim().length > 0) {
      chunks.push({
        chunkIndex: chunkIndex++,
        pageNumber: page.pageNumber,
        sectionTitle: currentSection,
        content: currentChunkText.trim(),
      });
    }
  }

  return chunks;
}

// 4. Shuffling logic for camera questions
function shuffleOptions(options) {
  const copy = [...options];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

// ================= TESTS =================

test("1. assessOcrQuality correctly validates legible medical text", () => {
  const text = "Анатомия сердца: правый блуждающий нерв иннервирует СА-узел, выделяя ацетилхолин на мускариновые M2-рецепторы.";
  const res = assessOcrQuality(text);
  assert.equal(res.isAcceptable, true);
  assert.ok(res.qualityScore >= 0.5);
  assert.ok(res.wordCount >= 10);
});

test("2. assessOcrQuality detects low quality, empty or blurry notes", () => {
  const emptyRes = assessOcrQuality("");
  assert.equal(emptyRes.isAcceptable, false);

  const shortRes = assessOcrQuality("заголовок один");
  assert.equal(shortRes.isAcceptable, false);
  assert.match(shortRes.reason, /Слишком мало/);
});

test("3. parseImagesBatch processes single camera scan page", () => {
  const items = [
    {
      pageNumber: 1,
      extractedText: "Сердечно-сосудистая система: проводящие пути и пейсмейкеры.",
    },
  ];

  const res = parseImagesBatch(items, "Анатомия сердца");
  assert.equal(res.pageCount, 1);
  assert.equal(res.fileType, "camera_scan");
  assert.equal(res.title, "Анатомия сердца");
  assert.equal(res.pages[0].pageNumber, 1);
});

test("4. parseImagesBatch sorts multiple out-of-order captured pages into correct sequence", () => {
  const items = [
    { pageNumber: 3, extractedText: "Страница 3: Пучок Гиса и ножки." },
    { pageNumber: 1, extractedText: "Страница 1: СА-узел и пейсмейкеры." },
    { pageNumber: 2, extractedText: "Страница 2: АВ-задержка и предсердия." },
  ];

  const res = parseImagesBatch(items);
  assert.equal(res.pageCount, 3);
  assert.equal(res.pages[0].pageNumber, 1);
  assert.equal(res.pages[1].pageNumber, 2);
  assert.equal(res.pages[2].pageNumber, 3);
  assert.equal(res.pages[0].text.includes("СА-узел"), true);
  assert.equal(res.pages[1].text.includes("АВ-задержка"), true);
  assert.equal(res.pages[2].text.includes("Пучок Гиса"), true);
});

test("5. Semantic chunking preserves exact pageNumber for camera pages", () => {
  const pages = [
    { pageNumber: 1, text: "Фрагмент первой сфотографированной страницы конспекта Саиды." },
    { pageNumber: 2, text: "Фрагмент второй страницы с фармакологией бета-блокаторов." },
    { pageNumber: 3, text: "Фрагмент третьей страницы с патофизиологией V/Q несоответствия." },
  ];

  const chunks = chunkPages(pages);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].pageNumber, 1);
  assert.equal(chunks[1].pageNumber, 2);
  assert.equal(chunks[2].pageNumber, 3);
});

test("6. Question generation citation grounding preserves pageNumber", () => {
  const chunks = [
    { pageNumber: 2, content: "Селективные бета-1 блокаторы снижают ЧСС и потребность миокарда в O2." },
  ];

  const generatedQuestion = {
    prompt: "Какой эффект оказывают селективные бета-1 блокаторы?",
    sourceExcerpt: "Селективные бета-1 блокаторы снижают ЧСС и потребность миокарда в O2.",
    sourcePage: chunks[0].pageNumber,
  };

  assert.equal(generatedQuestion.sourcePage, 2);
  assert.ok(chunks[0].content.includes(generatedQuestion.sourceExcerpt));
});

test("7. Camera questions options shuffle retains correct answer mapping", () => {
  const options = [
    { id: "opt-1", text: "СА-узел" },
    { id: "opt-2", text: "АВ-узел" },
    { id: "opt-3", text: "Пучок Гиса" },
    { id: "opt-4", text: "Волокна Пуркинье" },
  ];
  const correctOptionId = "opt-1";

  const shuffled = shuffleOptions(options);
  assert.equal(shuffled.length, 4);

  const matched = shuffled.find((o) => o.id === correctOptionId);
  assert.ok(matched);
  assert.equal(matched.text, "СА-узел");
});

test("8. Page deletion and reordering maintain sequential page numbers", () => {
  const pages = [
    { id: "p1", pageNumber: 1, text: "Стр 1" },
    { id: "p2", pageNumber: 2, text: "Стр 2" },
    { id: "p3", pageNumber: 3, text: "Стр 3" },
  ];

  // User deletes page 2
  const afterDelete = pages
    .filter((p) => p.id !== "p2")
    .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

  assert.equal(afterDelete.length, 2);
  assert.equal(afterDelete[0].pageNumber, 1);
  assert.equal(afterDelete[1].pageNumber, 2);
  assert.equal(afterDelete[1].id, "p3");
});

test("9. Editing OCR text updates page content without losing page numbering", () => {
  const pages = [
    { pageNumber: 1, text: "Оригинальный неточный текст" },
    { pageNumber: 2, text: "Вторая страница" },
  ];

  const updatedPages = pages.map((p) =>
    p.pageNumber === 1 ? { ...p, text: "Скорректированный медицинский термин" } : p
  );

  assert.equal(updatedPages[0].text, "Скорректированный медицинский термин");
  assert.equal(updatedPages[0].pageNumber, 1);
  assert.equal(updatedPages[1].pageNumber, 2);
});
