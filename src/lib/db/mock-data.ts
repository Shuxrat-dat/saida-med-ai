export interface MockPageItem {
  pageNumber: number;
  text: string;
  imageUrl?: string;
  qualityScore?: number;
}

export interface MockMaterial {
  id: string;
  title: string;
  subject: string;
  fileType: string;
  fileUrl: string;
  fileKey?: string;
  fileSize: number;
  pageCount: number;
  status: "READY" | "ANALYZING" | "PROCESSING" | "FAILED";
  processingStep?: string;
  summary: string;
  createdAt: string;
  topicsCount: number;
  questionsCount: number;
  pages?: MockPageItem[];
}

export interface MockTopic {
  id: string;
  materialId: string;
  name: string;
  description: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  examRelevance: "HIGH" | "MEDIUM" | "LOW";
  accuracyRate: number;
  totalAttempts: number;
  correctAttempts?: number;
  isWeakTopic: boolean;
  masteryLevel?: number;
  lastStudiedAt?: string;
  nextReviewAt?: string;
  reviewCount?: number;
  streakCorrect?: number;
  concepts: MockConcept[];
}

export interface MockConcept {
  id: string;
  name: string;
  definition: string;
  clinicalSignificance?: string;
  facts: { fact: string; sourcePage: number; isHighYield: boolean }[];
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface MockQuestion {
  id: string;
  materialId: string;
  materialTitle: string;
  topicId: string;
  topicName: string;
  type: "MCQ" | "TRUE_FALSE" | "CASE_BASED";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  options: (string | QuizOption)[];
  correctAnswer?: string;
  correctOptionId?: string;
  explanation?: string;
  distractorRationale?: Record<string, string>;
  sourceExcerpt?: string;
  sourcePage: number;
  verificationToken?: string;
}

export interface MockFlashcard {
  id: string;
  materialId: string;
  topicId: string;
  topicName: string;
  front: string;
  back: string;
  sourceExcerpt: string;
  sourcePage: number;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewAt: string;
}

export const INITIAL_MATERIALS: MockMaterial[] = [
  {
    id: "mat-cvs-01",
    title: "Сердечно-сосудистая система и гемодинамика.pdf",
    subject: "Анатомия и физиология",
    fileType: "pdf",
    fileUrl: "/uploads/cvs-hemodynamics.pdf",
    fileSize: 4820000,
    pageCount: 38,
    status: "READY",
    summary:
      "Курс лекций, охватывающий анатомию камер сердца, архитектонику клапанов, коронарное кровообращение, проводящую систему (синусно-предсердный узел, АВ-узел, пучок Гиса, волокна Пуркинье) и петли давление-объём.",
    createdAt: "2026-09-10T09:30:00Z",
    topicsCount: 5,
    questionsCount: 24,
  },
  {
    id: "mat-ans-02",
    title: "Вегетативная фармакология и рецепторы.docx",
    subject: "Фармакология",
    fileType: "docx",
    fileUrl: "/uploads/autonomic-pharmacology.docx",
    fileSize: 2150000,
    pageCount: 42,
    status: "READY",
    summary:
      "Подробный анализ симпатического и парасимпатического отделов, подтипов адренорецепторов (Альфа-1, Альфа-2, Бета-1, Бета-2, Бета-3), G-белковых каскадов, агонистов и блокаторов мускариновых рецепторов.",
    createdAt: "2026-09-12T14:15:00Z",
    topicsCount: 4,
    questionsCount: 20,
  },
  {
    id: "mat-pulm-03",
    title: "Механика дыхания и газообмен.pptx",
    subject: "Физиология",
    fileType: "pptx",
    fileUrl: "/uploads/pulmonary-mechanics.pptx",
    fileSize: 6300000,
    pageCount: 29,
    status: "READY",
    summary:
      "Вентиляционно-перфузионные соотношения (V/Q), кривая диссоциации оксигемоглобина, расчет мертвого пространства, податливость лёгких и дифференциальная диагностика гипоксемии.",
    createdAt: "2026-09-14T11:00:00Z",
    topicsCount: 3,
    questionsCount: 16,
  },
];

export const INITIAL_TOPICS: MockTopic[] = [
  {
    id: "top-cvs-conduction",
    materialId: "mat-cvs-01",
    name: "Проводящая система сердца",
    description: "Специализированная миокардиальная ткань, генерирующая и проводящая электрические импульсы по сердцу.",
    importance: "HIGH",
    examRelevance: "HIGH",
    accuracyRate: 0.78,
    totalAttempts: 25,
    isWeakTopic: false,
    concepts: [
      {
        id: "con-sa-node",
        name: "Синусно-предсердный (СА) узел",
        definition: "Главный водитель ритма (пейсмейкер), расположенный у слияния верхней полой вены и правого предсердия. Базовая частота генерации импульсов — 60–100 уд/мин.",
        clinicalSignificance: "Синдром слабости синусового узла проявляется чередованием брадикардии и тахикардии, часто требует имплантации электрокардиостимулятора.",
        facts: [
          { fact: "Автоматизм СА-узла обеспечивается медленными натриевыми 'funny'-каналами (If).", sourcePage: 12, isHighYield: true },
          { fact: "Иннервируется как симпатическими ганглиями, так и правым блуждающим нервом.", sourcePage: 13, isHighYield: false },
        ],
      },
      {
        id: "con-av-node",
        name: "Атриовентрикулярная (АВ) задержка",
        definition: "Физиологическая задержка импульса в АВ-узле на 0,09–0,12 секунды, обеспечивающая полное опорожнение предсердий до начала систолы желудочков.",
        clinicalSignificance: "АВ-блокады (I, II и III степени) нарушают синхронность работы камер и приводят к удлинению интервала PR.",
        facts: [
          { fact: "АВ-задержка позволяет систоле предсердий увеличить конечно-диастолический объём желудочков на 15–20% (предсердная надбавка).", sourcePage: 14, isHighYield: true },
        ],
      },
    ],
  },
  {
    id: "top-pharm-adrenergic",
    materialId: "mat-ans-02",
    name: "Подтипы адренорецепторов",
    description: "Рецепторы, сопряжённые с G-белками, опосредующие физиологические реакции на норадреналин и адреналин.",
    importance: "HIGH",
    examRelevance: "HIGH",
    accuracyRate: 0.54,
    totalAttempts: 28,
    isWeakTopic: true,
    concepts: [
      {
        id: "con-beta-1",
        name: "Бета-1 адренорецепторы",
        definition: "Gs-сопряжённые рецепторы кардиомиоцитов и юкстагломерулярных клеток. Повышают уровень цАМФ через аденилатциклазу, активируя протеинкиназу А (ПКА).",
        clinicalSignificance: "Селективные бета-1 блокаторы (метопролол, бисопролол) снижают потребность миокарда в кислороде при ИБС и ХСН.",
        facts: [
          { fact: "Стимуляция Бета-1 увеличивает ЧСС (хронотропия), силу сокращений (инотропия) и скорость проведения (дромотропия).", sourcePage: 18, isHighYield: true },
          { fact: "Стимулирует секрецию ренина клетками юкстагломерулярного аппарата почек.", sourcePage: 19, isHighYield: true },
        ],
      },
      {
        id: "con-beta-2",
        name: "Бета-2 адренорецепторы",
        definition: "Gs-сопряжённые рецепторы гладкой мускулатуры, вызывающие бронходилатацию, расслабление сосудов скелетных мышц и гликогенолиз.",
        clinicalSignificance: "Селективные агонисты короткого действия (сальбутамол) применяются для купирования приступов бронхиальной астмы.",
        facts: [
          { fact: "Бета-2 вызывают расслабление бронхов и миометрия путём снижения внутриклеточного кальция.", sourcePage: 22, isHighYield: true },
          { fact: "Стимулируют захват калия клетками через Na+/K+-АТФазу, что может приводить к транзиторной гипокалиемии.", sourcePage: 23, isHighYield: true },
        ],
      },
    ],
  },
  {
    id: "top-pulm-vq",
    materialId: "mat-pulm-03",
    name: "V/Q несоответствие и шунтирование",
    description: "Патофизиология соотношения альвеолярной вентиляции и капиллярной перфузии в различных зонах лёгких.",
    importance: "HIGH",
    examRelevance: "HIGH",
    accuracyRate: 0.61,
    totalAttempts: 18,
    isWeakTopic: true,
    concepts: [
      {
        id: "con-physiologic-shunt",
        name: "Сброс крови справа налево (V/Q = 0)",
        definition: "Перфузия полностью невентилируемых альвеол, при которой дезоксигенированная венозная кровь поступает в артериальное русло без оксигенации.",
        clinicalSignificance: "Ключевой диагностический признак: гипоксемия НЕ устраняется ингаляцией 100% кислорода.",
        facts: [
          { fact: "Истинный шунт (ателектаз, массивный отек лёгких) не поддается полной коррекции повышением FiO2.", sourcePage: 15, isHighYield: true },
        ],
      },
    ],
  },
];

export const INITIAL_QUESTIONS: MockQuestion[] = [
  {
    id: "q-cvs-01",
    materialId: "mat-cvs-01",
    materialTitle: "Сердечно-сосудистая система и гемодинамика.pdf",
    topicId: "top-cvs-conduction",
    topicName: "Проводящая система сердца",
    type: "MCQ",
    difficulty: "MEDIUM",
    prompt: "Какой нерв преимущественно обеспечивает парасимпатическую иннервацию синусно-предсердного (СА) узла, вызывая снижение базального ритма?",
    options: [
      "Правый блуждающий нерв",
      "Левый возвратный гортанный нерв",
      "Правый диафрагмальный нерв",
      "Симпатические ганглии T1–T4",
    ],
    correctAnswer: "Правый блуждающий нерв",
    explanation:
      "Правый блуждающий нерв (X пара ЧМН) преимущественно иннервирует СА-узел, выделяя ацетилхолин на мускариновые M2-рецепторы и вызывая отрицательный хронотропный эффект. Левый блуждающий нерв сильнее влияет на АВ-узел.",
    distractorRationale: {
      "Левый возвратный гортанный нерв": "Огибает дугу аорты и иннервирует внутренние мышцы гортани, не управляя узлами сердца.",
      "Правый диафрагмальный нерв": "Иннервирует диафрагму и перикард (C3–C5, моторная и сенсорная иннервация), не являясь вегетативным пейсмейкерным нервом.",
      "Симпатические ганглии T1–T4": "Обеспечивают симпатическую адренергическую стимуляцию, которая увеличивает ЧСС, а не снижает её.",
    },
    sourceExcerpt:
      "Страница 13, Раздел 3.2: 'Парасимпатическая регуляция сердца осуществляется волокнами блуждающих нервов. В частности, правый блуждающий нерв преимущественно модулирует работу СА-узла, высвобождая ацетилхолин для гиперполяризации мембраны клеток-пейсмейкеров...'",
    sourcePage: 13,
  },
  {
    id: "q-cvs-02",
    materialId: "mat-cvs-01",
    materialTitle: "Сердечно-сосудистая система и гемодинамика.pdf",
    topicId: "top-cvs-conduction",
    topicName: "Проводящая система сердца",
    type: "MCQ",
    difficulty: "HARD",
    prompt: "Каково главное физиологическое значение задержки импульса на 0,09–0,12 секунды в атриовентрикулярном (АВ) узле?",
    options: [
      "Обеспечение достаточного времени для систолы предсердий и полного наполнения желудочков",
      "Предотвращение ретроградного проведения импульса из волокон Пуркинье в предсердия",
      "Синхронизация деполяризации правой и левой ножек пучка Гиса",
      "Стимуляция немедленного выброса предсердного натрийуретического пептида (НУП)",
    ],
    correctAnswer: "Обеспечение достаточного времени для систолы предсердий и полного наполнения желудочков",
    explanation:
      "АВ-задержка необходима для того, чтобы предсердия успели полностью сократиться и перекачать дополнительный объём крови (предсердный вклад) в желудочки до начала систолы желудочков.",
    distractorRationale: {
      "Предотвращение ретроградного проведения импульса из волокон Пуркинье в предсердия": "Ретроградное проведение предотвращается фиброзным скелетом сердца и периодом рефрактерности клеток.",
      "Синхронизация деполяризации правой и левой ножек пучка Гиса": "Синхронизация обеспечивается быстрым проведением по миокарду межжелудочковой перегородки.",
      "Стимуляция немедленного выброса предсердного натрийуретического пептида (НУП)": "НУП секретируется в ответ на растяжение стенок предсердий повышенным объёмом крови, а не на электрическую задержку узла.",
    },
    sourceExcerpt:
      "Страница 14, Раздел 3.3: 'Физиологическая задержка в АВ-узле (~0,1 с) критически важна для завершения систолы предсердий, что обеспечивает дополнительное наполнение желудочков на 15–20% в состоянии покоя.'",
    sourcePage: 14,
  },
  {
    id: "q-pharm-01",
    materialId: "mat-ans-02",
    materialTitle: "Вегетативная фармакология и рецепторы.docx",
    topicId: "top-pharm-adrenergic",
    topicName: "Подтипы адренорецепторов",
    type: "MCQ",
    difficulty: "HARD",
    prompt: "Пациенту с острой декомпенсацией сердечной недостаточности назначен добутамин. Какой внутриклеточный сигнальный путь стимулируется его селективной мишенью?",
    options: [
      "Активация белка Gs → повышение активности аденилатциклазы → рост уровня цАМФ",
      "Активация белка Gq → фосфолипаза C → повышение ИФ3 и ДАГ",
      "Активация белка Gi → ингибирование аденилатциклазы → снижение цАМФ",
      "Прямое открытие лиганд-зависимых хлорных ионных каналов",
    ],
    correctAnswer: "Активация белка Gs → повышение активности аденилатциклазы → рост уровня цАМФ",
    explanation:
      "Добутамин преимущественно стимулирует Бета-1 адренорецепторы. Они сопряжены с Gs-белком, активирующим аденилатциклазу, что ведет к накоплению цАМФ, активации протеинкиназы А (ПКА) и усилению входа кальция в кардиомиоциты (положительный инотропный эффект).",
    distractorRationale: {
      "Активация белка Gq → фосфолипаза C → повышение ИФ3 и ДАГ": "Характерно для Альфа-1 адренорецепторов и M1/M3 холинорецепторов.",
      "Активация белка Gi → ингибирование аденилатциклазы → снижение цАМФ": "Опосредуется Альфа-2 адренорецепторами и M2 холинорецепторами сердца.",
      "Прямое открытие лиганд-зависимых хлорных ионных каналов": "Механизм ГАМК-А рецепторов, не относящийся к адренергическим GPCR.",
    },
    sourceExcerpt:
      "Страница 18, Раздел 4.1: 'Бета-1 рецепторы сопряжены с белком Gs, стимулирующим аденилатциклазу. Возрастающий уровень цАМФ активирует протеинкиназу А, фосфорилирует L-тип кальциевых каналов и усиливает выход кальция из саркоплазматического ретикулума.'",
    sourcePage: 18,
  },
  {
    id: "q-pulm-01",
    materialId: "mat-pulm-03",
    materialTitle: "Механика дыхания и газообмен.pptx",
    topicId: "top-pulm-vq",
    topicName: "V/Q несоответствие и шунтирование",
    type: "MCQ",
    difficulty: "MEDIUM",
    prompt: "Какой признак наиболее надежно отличает истинный легочный сброс крови справа налево (V/Q = 0) от зон с низким V/Q соотношением?",
    options: [
      "Отсутствие значимого прироста PaO2 при ингаляции 100% кислорода (FiO2 1.0)",
      "Развитие выраженной гиперкапнии, немедленно купируемой ИВЛ",
      "Существенное увеличение жизненной емкости легких (ЖЕЛ) на спирометрии",
      "Полная нормализация альвеолярно-артериального градиента после ингаляции бронхолитиков",
    ],
    correctAnswer: "Отсутствие значимого прироста PaO2 при ингаляции 100% кислорода (FiO2 1.0)",
    explanation:
      "При истинном шунте венозная кровь перфузирует совершенно невентилируемые участки и не контактирует с альвеолярным газом. Поэтому повышение концентрации кислорода во вдыхаемой смеси даже до 100% не может устранить артериальную гипоксемию.",
    distractorRationale: {
      "Развитие выраженной гиперкапнии, немедленно купируемой ИВЛ": "Гиперкапния указывает на гиповентиляцию, а не дифференцирует шунт от низкого V/Q.",
      "Существенное увеличение жизненной емкости легких (ЖЕЛ) на спирометрии": "При патологии паренхимы легких ЖЕЛ, как правило, снижается.",
      "Полная нормализация альвеолярно-артериального градиента после ингаляции бронхолитиков": "Бронхолитики не устраняют альвеолярный ателектаз или анатомические шунты.",
    },
    sourceExcerpt:
      "Страница 15, Раздел 2.4: 'Фундаментальный дифференциальный признак: артериальная гипоксемия вследствие истинного шунта (V/Q = 0) не устраняется дыханием 100% кислородом, так как шунтируемая кровь вообще не соприкасается с вентилируемыми поверхностями.'",
    sourcePage: 15,
  },
];

export const INITIAL_FLASHCARDS: MockFlashcard[] = [
  {
    id: "fc-01",
    materialId: "mat-cvs-01",
    topicId: "top-cvs-conduction",
    topicName: "Проводящая система сердца",
    front: "Какая анатомическая структура служит единственным физиологическим проводящим путем между предсердиями и желудочками?",
    back: "Атриовентрикулярный пучок (пучок Гиса), пронизывающий фиброзный скелет сердца.",
    sourceExcerpt: "Страница 15: 'Пучок Гиса является единственным проводящим мостом через электрически непроницаемый фиброзный скелет сердца.'",
    sourcePage: 15,
    interval: 3,
    repetitions: 2,
    easeFactor: 2.5,
    nextReviewAt: "2026-09-17T08:00:00Z",
  },
  {
    id: "fc-02",
    materialId: "mat-ans-02",
    topicId: "top-pharm-adrenergic",
    topicName: "Подтипы адренорецепторов",
    front: "Какой G-белок активируют Альфа-2 адренорецепторы и к какому эффекту на пресинаптической мембране это приводит?",
    back: "Белок Gi → ингибирует аденилатциклазу → снижает цАМФ → уменьшает приток Ca2+ → тормозит выброс норадреналина (аутоингибирование).",
    sourceExcerpt: "Страница 20: 'Пресинаптические Альфа-2 рецепторы выполняют функцию отрицательной обратной связи, ограничивая дальнейший симпатический выброс.'",
    sourcePage: 20,
    interval: 1,
    repetitions: 0,
    easeFactor: 2.3,
    nextReviewAt: "2026-09-16T12:00:00Z",
  },
  {
    id: "fc-03",
    materialId: "mat-pulm-03",
    topicId: "top-pulm-vq",
    topicName: "V/Q несоответствие и шунтирование",
    front: "Как сосудистое русло лёгких реагирует на локальную альвеолярную гипоксию?",
    back: "Гипоксическая легочная вазоконстрикция (рефлекс Эйлера–Лильестранда): прекапиллярные артериолы сужаются в гипоксических зонах, перераспределяя кровоток в вентилируемые участки.",
    sourceExcerpt: "Страница 18: 'В отличие от системных сосудов, легочные артериолы вазоконстриктируют при падении альвеолярного PO2 ниже 60 мм рт. ст.'",
    sourcePage: 18,
    interval: 2,
    repetitions: 1,
    easeFactor: 2.5,
    nextReviewAt: "2026-09-16T18:00:00Z",
  },
];

export interface MockStudySession {
  id: string;
  materialId?: string;
  sessionType: "QUIZ" | "FLASHCARD" | "READING";
  durationSeconds: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  createdAt: string;
}

export interface StudyStats {
  streakDays: number;
  overallAccuracy: number;
  totalQuestionsAnswered: number;
  studyTimeHours: number;
  retentionRate: "Высокое" | "Среднее" | "Требует внимания";
  weakTopics: MockTopic[];
  strongTopics: MockTopic[];
  completedToday: number;
  dailyGoal: number;
  dailyProgressPct: number;
  totalTopicsStudied: number;
  topicsDueToday: MockTopic[];
  dueTodayCount: number;
}

export const INITIAL_STUDY_SESSIONS: MockStudySession[] = [
  {
    id: "sess-01",
    materialId: "mat-cvs-01",
    sessionType: "QUIZ",
    durationSeconds: 420,
    questionsAnswered: 10,
    correctAnswers: 8,
    accuracy: 0.8,
    createdAt: "2026-09-15T14:30:00Z",
  },
  {
    id: "sess-02",
    materialId: "mat-ans-02",
    sessionType: "QUIZ",
    durationSeconds: 580,
    questionsAnswered: 15,
    correctAnswers: 9,
    accuracy: 0.6,
    createdAt: "2026-09-16T09:15:00Z",
  },
  {
    id: "sess-03",
    materialId: "mat-cvs-01",
    sessionType: "FLASHCARD",
    durationSeconds: 300,
    questionsAnswered: 14,
    correctAnswers: 12,
    accuracy: 0.85,
    createdAt: "2026-09-16T11:00:00Z",
  },
];
