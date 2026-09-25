# План реализации: Cross-Device Responsive (Задача 26)

Соответствие AC → Задачи:
- AC-R1, AC-R2, AC-R11 → Task 1
- AC-R3, AC-R12, AC-Ru2 → Task 2, Task 3
- AC-R4, AC-Ru1 → Tasks 4, 5, 6, 7, 8
- AC-R5 → Task 9
- AC-R6, AC-R15 → Task 10
- AC-R7, AC-Ru3 → Task 11
- AC-R8, AC-Ru4 → Task 12
- AC-R9, AC-R10, AC-Ru5 → Task 13
- AC-R14, AC-Ru3 → Task 14
- AC-R13 → Task 15
- AC-R15 → Global check во всех tasks

---

## Task 1: Foundation — Tailwind responsive Container, SafeContainer, globals.css

**Priority:** high
**Depends on:** —
**Parent AC:** AC-R1, AC-R2, AC-R11, AC-Ru1
**Files to edit:**
- `tailwind.config.ts` — добавить container responsive defaults, extend screens если нужно, добавить safe-area variants
- `src/app/globals.css` — scroll-padding, focus ring utilities, aspect ratios, landscape mobile nav tweaks
- `src/components/layout/SafeContainer.tsx` — заменить фиксированный max-w-md на responsive max-width
- `src/app/layout.tsx` — сохранить safe + overflow-x-hidden, добавить base vars
- `src/app/(app)/layout.tsx` — реструктурировать под sidebar layout skeleton (пустой aside placeholder на sm+, nav рендерится AppNavigation)

### Детали реализации
1. **tailwind.config.ts**:
   - Добавить `container: { center: true, padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' } }`
   - Расширить screens при необходимости (стандартные sm/md/lg/xl/2xl достаточно):
     - sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
   - Добавить `extend.screens` опционально для промежуточных: 'max-2xl' etc. не нужно, Tailwind поддерживает max-* natively.
   - Добавить в `extend.spacing` значение `safe-[...]` если есть missing — уже есть safe-top/safe-bottom margin/padding.
2. **globals.css**:
   - Добавить `html { scroll-padding-bottom: calc(env(safe-area-inset-bottom) + 5rem); }` для input scroll into view
   - Добавить utility `.focus-ring-base`: `@apply outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:rounded-md;`
   - Добавить `.landscape-mobile`: для `@media (max-height: 500px) and (orientation: landscape)` компактная навигация (MobileBottomNav h-12, иконки мельче)
   - Усилить `.safe-area-left/right` опционально: `pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]` (для iPad в split view)
   - Добавить `.min-h-dvh` fallback: `@supports not (height: 100dvh)` или использовать `min-h-[100dvh]` с min-h-screen fallback (уже есть partial)
3. **SafeContainer.tsx**:
   - Заменить `"w-full max-w-md mx-auto px-4"` на responsive:
     ```
     w-full mx-auto px-3 sm:px-4 lg:px-6
     max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl
     ```
   - pb-24 заменить на responsive: на md+ sidebar layout не нужен большой pb — `pb-8 md:pb-10` и conditional `hasBottomNav ? pb-24 md:pb-10`
4. **(app)/layout.tsx**:
   - Заменить строго TopHeader + children + MobileBottomNav на:
     ```
     <AppNavigation />
     <main class=...>{children}</main>
     ```
   - AppNavigation (создаётся в Task 2) уже включает TopHeader по необходимости и рендерит Bottom/Sidebar по breakpoint. Либо оставить TopHeader + AppNav (Sidebar/BottomNav) разделённо — решить в Task 2. Главное: layout skeleton flex с sidebar aside.

### Task-local Test Requirements
- **TR-R1.1 (rule):** `<SafeContainer>` при viewport 320px → width 100% px-3; при 1920px → max-w-7xl + lg:px-6 (в DOM видны responsive classes).
- **TR-R1.2 (rule):** `document.body.scrollWidth === document.body.clientWidth` при 320×568 после применения новых глобальных стилей (HomePage render без overflow).
- **TR-Ru1.3 (rubric):** Container scale (0–2):
  - `0`: всё ещё max-w-md жёстко на всех экранах
  - `1`: 2–3 breakpoint-а разных max-width, но 2xl / sm отсутствуют
  - `2`: sm/md/lg/xl/2xl все имеют соответствующие max-width и padding
  - Порог: ≥ 2

---

## Task 2: AppNavigation — Bottom Nav ↔ Compact Sidebar ↔ Full Sidebar

**Priority:** high
**Depends on:** Task 1
**Parent AC:** AC-R3, AC-R12, AC-Ru2
**Files to edit:**
- NEW `src/components/layout/AppNavigation.tsx`
- MOVE/UPDATE: логику из `MobileBottomNav.tsx` + `TopHeader.tsx`
- `src/app/(app)/layout.tsx` — интегрировать AppNavigation
- `src/components/layout/MobileBottomNav.tsx` — оставить как subcomponent (mobile only)
- NEW `src/components/layout/DesktopSidebar.tsx`
- NEW `src/components/layout/ProgressRightPanel.tsx` — опциональная правая панель

### Детали реализации
1. **AppNavigation.tsx** — композиция:
   ```jsx
   <div className="flex min-h-[100dvh] bg-slate-50">
     {/* Desktop Sidebar md+: */}
     <DesktopSidebar className="hidden md:flex" />
     {/* Main area with top header + content + mobile bottom nav */}
     <div className="flex-1 flex flex-col min-w-0">
       <TopHeader />
       <div className="flex flex-row flex-1 min-w-0">
         {/* main content wrapper — children from layout будет вставлен сюда или в <main> внешнем */}
         {children placeholder}
         {/* Right panel xl+: */}
         <ProgressRightPanel className="hidden xl:block w-80 shrink-0 border-l" />
       </div>
       <MobileBottomNav className="md:hidden" />
     </div>
   </div>
   ```
   Важно: Layout должен дать возможность `(app)/layout.tsx` вставить children между header и right panel. Решение: AppNavigation не содержит children, а просто рендерит Sidebar + TopHeader + BottomNav, а layout строится:
   ```
   <div>
     <DesktopSidebar />
     <main>
       <TopHeader />
       <div class="flex"><Content /><RightPanel/></div>
       <MobileBottomNav />
     </main>
   </div>
   ```
2. **DesktopSidebar.tsx**:
   - Breakpoints: `hidden md:flex`
   - md (768–1023): Compact w-16 shrink-0, icon-only, items-center justify-start, hover tooltip label
   - lg (1024+): w-64 shrink-0, icon + label, label text-sm font-medium, expand/contract toggle button в header панели
   - Пункты (6): Главная (Home), Материалы (Library), Темы — или Materials detail (TBD: можно как подпункт Library), Тесты (Quiz), Карточки (Flashcards), Прогресс (Progress)
   - Внизу панели: Profile section — аватар "С", имя "Саида", streak days badge
   - Активный пункт: text-teal-700 font-semibold, left bar indicator 3px bg-teal-600
3. **ProgressRightPanel.tsx**:
   - `hidden lg:flex xl:w-80 lg:w-64` или только xl+ (1280px+)
   - Содержимое (server or client fetch):
     - Today progress mini-ring (from ProgressRing упрощённая версия)
     - Today due topics list (топ 3 due topics badge)
     - Mastery summary: 3 темы mastery low (< 2) с pill + percentage
     - Collapse toggle: lg показать/скрыть кнопкой в header
4. **MobileBottomNav.tsx** уже работает. Добавить:
   - Class `md:hidden` корневому `<nav>` (чтобы исчезал на планшетах/десктопах)
   - Landscape mobile compact: `h-16 max-[500px]:landscape:h-12` через CSS media или класс `landscape-mobile:h-12` из globals
5. **TopHeader.tsx**:
   - На md+ добавить breadcrumb (текущая страница по pathname) вместо logo, или справа от logo
   - На lg+ добавить search input (placeholder "Поиск по материалам, темам...") серого цвета, w-80, border rounded-full
   - Стрелочка "Назад" сохраняется на всех размерах, если showBack

### Task-local Test Requirements
- **TR-R2.1 (rule):** viewport < 768px (mobile): в DOM есть MobileBottomNav, нет DesktopSidebar; viewport ≥ 768px: DesktopSidebar есть, MobileBottomNav нет (DevTools element check).
- **TR-R2.2 (rule):** viewport ≥ 1280px (xl): ProgressRightPanel существует в DOM и занимает w-80 справа от основного контента.
- **TR-Ru2.3 (rubric):** Navigation 3-mode completeness (0–2):
  - `0`: только один вид навигации на всех размерах
  - `1`: два режима (mobile bottom + desktop full), нет compact md и right panel
  - `2`: три режима (bottom/compact/full), right panel xl+, collapsible toggle, profile section в sidebar
  - Порог: ≥ 2

---

## Task 3: Home Page (Dashboard) responsive grid 1→2→3 колонки

**Priority:** high
**Depends on:** Task 1, Task 2
**Parent AC:** AC-R3, AC-Ru1
**Files to edit:**
- `src/app/(app)/page.tsx`

### Детали реализации
1. **Текущая структура SafeContainer** обновить под responsive (уже есть из Task 1).
2. **Grid виджетов dashboard**:
   - `< sm`: 1 col, все widgets stacked (`space-y-4`)
   - `sm → md`: 2 col grid (`grid-cols-2 gap-3`), ProgressRing = col-span-2, ContinueStudy = col-span-2
   - `md → lg`: 2 col summary cards col-span-1 each
   - `lg → xl`: 3 col (`grid-cols-2 lg:grid-cols-3 gap-4`), DueTodayTopics = col-span-1, WeakTopicPills col-span-1, RecentMaterials col-span-2
   - `xl+`: 3–4 col grid, RecentMaterials = col-span-2, Dashboard KPIs (grid-cols-3 earlier) становится отдельной секцией, Weak/Continue/Due наверху
3. **Content max-width**: на каждом брейкпоинте карточки виджетов не растягивать безгранично — использовать `max-w-sm mx-auto` когда внутри 1-col mobile, а grid адаптивности достаточно.
4. **Greeting section**: на десктопе справа от приветствия можно добавить streak-day flame виджет (inline) вместо того чтобы он был только в header.

### Task-local Test Requirements
- **TR-R3.1 (rule):** 1280px Home page: виджеты распределены ≥ 2 колонки; на 320px все виджеты 1 колонка, не обрезаются справа.
- **TR-R3.2 (rule):** 2560px dashboard: grid-cols-3 или 4, ширина сетки ограничена max-w-7xl SafeContainer; карточки не растягиваются на всю ширину (карточка одного виджета ≤ 480px).
- **TR-Ru3.3 (rubric):** Dashboard visual density (0–2):
  - `0`: 1 колонка на всех размерах, большие пустоты справа на desktop
  - `1`: 2 колонки на tablet, desktop использует < 60% доступной ширины
  - `2`: mobile 1 → tablet 2 → desktop 3+ колонки; density комфорт, padding адаптивный, нет пустот / переполнений
  - Порог: ≥ 2

---

## Task 4: Library page responsive (1→2→3→4 cols) + FAB позиционирование

**Priority:** high
**Depends on:** Task 1, Task 2
**Parent AC:** AC-R4, AC-R1, AC-Ru1
**Files to edit:**
- `src/app/(app)/library/page.tsx`

### Детали реализации
1. **Cards grid материалов**:
   - `< sm`: 1 col (`space-y-3`)
   - `sm → md`: 2 cols (`grid grid-cols-2 gap-3`)
   - `md → lg`: 2 cols, gap-4
   - `lg → xl`: 3 cols
   - `xl+`: 4 cols `grid-cols-4 gap-4`
   - Каждая карточка: `min-w-0 max-w-sm`, чтобы не растягивалась до бесконечности на 2560px (grid auto-flow, но col 1/4 max).
2. **FAB "+ Добавить материал"**:
   - Mobile (< md): fixed bottom-right `bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4` — над bottom nav.
   - Tablet/Desktop (md+): FAB можно спрятать в Sidebar как кнопку "Добавить материал" вверху, или оставить FAB на library page только, или разместить в TopHeader как action.
3. **Search + Subject Filter**:
   - Mobile: две строки — search bar full-width, filter chips horizontal scroll row
   - Desktop: search bar w-80 inline + chips inline в одну строку

### Task-local Test Requirements
- **TR-R4.1 (rule):** На 1920px Library grid = 3–4 колонки; каждая material card width ≤ 360px; не растягивается.
- **TR-R4.2 (rule):** На 320px FAB не перекрывает последнюю карточку материала (scroll до конца — последняя карточка влезает над FAB и BottomNav за счёт SafeContainer pb).
- **TR-Ru4.3 (rubric):** Library grid responsive (0–2):
  - `0`: 1 или 2 колонки на всех размерах, не использует desktop простор
  - `1`: 1→2→3 колонки, но без max-w на карточках; 2560px гигантские карточки
  - `2`: 1→2→3→4 колонки, каждая ≤ 360px, FAB на mobile над nav, на desktop FAB или sidebar кнопка

---

## Task 5: Material detail (library/[id]) responsive tree + topic list

**Priority:** medium
**Depends on:** Task 1, Task 2
**Parent AC:** AC-Ru1
**Files to edit:**
- `src/app/(app)/library/[id]/page.tsx`
- `src/components/library/KnowledgeTreeMap.tsx`

### Детали реализации
1. **Layout Material detail**:
   - Mobile: 1 col — Material summary → KnowledgeTreeMap списком тем
   - Tablet (sm→lg): 2 col grid: left col (2/3 width) = Topics, right col (1/3) = Summary stats (avg mastery, total questions, progress)
   - Desktop (lg+): 3 col layout:
     - Col 1 (3/12): Topic list как sidebar/nav с активной темой highlight
     - Col 2 (6/12): Детали выбранной темы (explain/concepts/history tabs)
     - Col 3 (3/12): Mastery summary + Weak spots for material
2. **KnowledgeTreeMap.tsx** адаптив:
   - Mobile: аккордеон секций Material → Topics → Concepts, каждый item full width
   - Tablet/Desktop: grid карточек тем 1/2/3 колонки с mastery/nextReview pill на каждой
3. **Tabs (Radix Tabs если нужно)** для desktop topic detail: Объяснение / Понятия / Карточки / Тест / История / Слабые места.
   - Mobile: bottom-scroll tab bar или select dropdown

### Task-local Test Requirements
- **TR-R5.1 (rule):** lg(1024px) library/[id]: трехколоночный layout виден (tree | detail | stats), при этом все 3 колонки влезают по ширине без scroll.
- **TR-R5.2 (rule):** 320px library/[id]: topics list одна колонка, аккордеон или карточки не вылезают справа.
- **TR-Ru5.3 (rubric):** Material detail density (0–2):
  - `0`: 1 колонка на всех, desktop много пустот
  - `1`: 2 колонки tablet, desktop без right info panel
  - `2`: 1→2→3 колонки, desktop tabs active, mobile компактен
  - Порог: ≥ 1 (medium priority, можно 1 оставить, 2 — хорошо)

---

## Task 6: Quiz Page + Quiz Player responsive 2-col desktop + sticky bottom submit mobile

**Priority:** high
**Depends on:** Task 1
**Parent AC:** AC-R6, AC-R15, AC-R1
**Files to edit:**
- `src/app/(app)/quiz/page.tsx`
- `src/components/quiz/QuizPlayer.tsx`

### Детали реализации
1. **QuizPlayer.tsx** — внутренняя структура:
   ```
   <div className="w-full h-full flex flex-col lg:flex-row gap-4 lg:gap-8">
     {/* Left: Question */}
     <div class="flex-1 min-w-0">
       progress bar, topic header, question text, options
       <div class="mt-auto lg:hidden sticky bottom-0 pb-safe-area pt-2 bg-gradient-to-t from-white">
         <button>Ответить</button>
       </div>
     </div>
     {/* Right: Info panel (lg+ only) */}
     <aside class="hidden lg:block w-[320px] xl:w-96 shrink-0 border-l pl-6 space-y-4">
       progress card (question 4/10, bar)
       topic summary card
       {isAnswerSubmitted && source excerpt card}
       weak spot hints mini-card
     </aside>
   </div>
   ```
2. **Option buttons**:
   - Всегда `min-h-[56px] w-full rounded-2xl px-4 text-left`, touch target достаточно
   - Mobile: `space-y-2.5` список; desktop можно grid если 4 опции, но список норм
3. **Sticky submit на mobile**: контейнер с градиентом fade-in, чтобы submit button всегда была видна, не нужно скроллить до конца чтобы ответить на короткий вопрос.
4. **Result screen (после теста)**:
   - Mobile: stacked cards
   - Desktop: 2 col — score big left, strong/weak/mistakes list right

### Task-local Test Requirements
- **TR-R6.1 (rule):** 375×812 Quiz Player: submit button visible в viewport без скролла (sticky), option buttons ≥ 56px высота.
- **TR-R6.2 (rule):** 1280px Quiz Player: есть правый aside (w-80/96) с progress+topic info; 2 колонки.
- **TR-Ru6.3 (rubric):** Quiz layout usability (0–2):
  - `0`: кнопки submit за границей viewport на 320px, desktop пустота
  - `1`: mobile submit виден, desktop 1 col без info panel
  - `2`: sticky mobile submit, desktop info panel, option 56px, result 2-col на desktop
  - Порог: ≥ 2

---

## Task 7: Progress / Statistics — responsive charts + KPIs grid (Recharts ResponsiveContainer)

**Priority:** medium
**Depends on:** Task 1
**Parent AC:** AC-Ru1, (charts адаптив — FR11)
**Files to edit:**
- `src/app/(app)/progress/page.tsx`
- Любые компоненты в `src/components/dashboard/` с графиками (если есть)

### Детали реализации
1. **KPI cards grid**:
   - Mobile: `grid-cols-2` как сейчас, gap-3 (OK)
   - Tablet/Desktop: `grid-cols-2 md:grid-cols-4 gap-4` (4 KPI в ряд: Серия / Точность / Время / Удержание)
2. **Charts (Recharts)**:
   - ВОКРУГ каждого `<Recharts_component>` обернуть:
     ```jsx
     <div className="w-full aspect-[16/9] md:aspect-[4/3]">
       <ResponsiveContainer width="100%" height="100%">
         <BarChart>...</BarChart>
       </ResponsiveContainer>
     </div>
     ```
   - Mobile: один большой график на всю ширину, следующий под ним (2 stacked)
   - Desktop: 2×2 grid графиков (`grid-cols-2 gap-6`)
3. **History list / Study Sessions table**:
   - Mobile: card per session (дата, материал, score, accuracy pill)
   - Desktop: `<table className="w-full">` с thead (Дата / Материал / Вопросы / Точность / Время)

### Task-local Test Requirements
- **TR-R7.1 (rule):** Каждый Recharts график обёрнут в `ResponsiveContainer` + aspect-ratio container; на 320px график не выходит за правую границу, нет horizontal scroll.
- **TR-R7.2 (rule):** 1440px progress page: 4 KPI cards в ряд, 2 графики рядом (grid-cols-2).
- **TR-Ru7.3 (rubric):** Progress page responsive (0–2):
  - `0`: графики выходят за экран на mobile, desktop 1 col big
  - `1`: графики влезают, но grid KPI всегда 2 col, нет table/sessions desktop
  - `2`: 4 KPI desktop, charts grid 2, history cards mobile → table desktop
  - Порог: ≥ 2

---

## Task 8: Flashcards page + FlashcardDeck responsive max-width centered

**Priority:** medium
**Depends on:** Task 1, (Task 11 keyboard/swipe отдельно)
**Parent AC:** AC-Ru1
**Files to edit:**
- `src/app/(app)/flashcards/page.tsx`
- `src/components/flashcards/FlashcardDeck.tsx` (resize only; interaction Task 11)

### Детали реализации
1. **Flashcards page layout**:
   - Mobile (< sm): card full-width, min-h-[300px], max-w-full
   - sm → lg: card max-w-md mx-auto, min-h-[360px]
   - lg+: 2–3 col layout:
     - Center col: карточка max-w-lg mx-auto
     - Right col (w-72): due topics list (top 10 карточек на сегодня)
     - Left sidebar: deck selector (если много decks — сейчас одна, можно оставить 2 col center+right)
2. **Rating buttons AGAIN/HARD/GOOD/EASY**:
   - Mobile: `grid-cols-4 gap-2` или `grid-cols-2 gap-2`, каждая min-h-[52px]
   - Desktop: inline-flex gap-3, каждая кнопка h-12 px-5
3. **Progress info**:
   - Mobile: compact 1 line top
   - Desktop: left/right от карточки больше инфо

### Task-local Test Requirements
- **TR-R8.1 (rule):** 430×932 Flashcard: 4 rating buttons все влезают по ширине без обрезки (grid-cols-4 OK).
- **TR-R8.2 (rule):** 1280px flashcards page: карточка max-w-lg/xl center, справа due list (виден).
- **TR-Ru8.3 (rubric):** Flashcards density (0–2):
  - `0`: rating buttons переполняют mobile или desktop слишком мелкая карточка
  - `1`: card adaptive max-width, но нет due list/info на desktop
  - `2`: card size responsive, rating grid mobile, inline desktop, due info panel
  - Порог: ≥ 2

---

## Task 9: UploadModal — Drag & Drop desktop zone + Paste image + Responsive modes

**Priority:** high
**Depends on:** Task 1
**Parent AC:** AC-R5, AC-Ru3
**Files to edit:**
- `src/components/library/UploadModal.tsx`

### Детали реализации
1. **Responsive mode detection**: рендерить по breakpoint (Tailwind classes для hide/show):
   - Mobile `< md`: блок DnD `hidden md:block` — скрыт; кнопки Камера и Файл в 2 col grid видны всем
   - Tablet `md+`: показать Drag&Drop зону как основной UI; кнопки "Камера" и "Файл" оставить ниже как опции
2. **Drag & Drop zone**:
   - Внутри UploadModal сделать div:
     ```
     onDragOver={e => {e.preventDefault(); setDragging(true)}}
     onDragLeave={() => setDragging(false)}
     onDrop={e => {e.preventDefault(); handleFiles(e.dataTransfer.files)}}
     ```
   - Стили: `border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-colors`; при dragging: `border-teal-500 bg-teal-50`
   - Внутри: upload cloud icon, "Перетащите файл сюда" text, "или", "Выбрать файл" button
3. **Paste image (desktop only)**:
   - При открытой модалке слушать `paste` event на `window`:
     ```
     useEffect(() => {
       if (!isOpen) return;
       const onPaste = (e: ClipboardEvent) => {
         const items = Array.from(e.clipboardData?.items || []);
         const imgItem = items.find(i => i.type.startsWith('image/'));
         if (imgItem) { const f = imgItem.getAsFile(); if (f) handleFile(f); }
       };
       window.addEventListener('paste', onPaste);
       return () => window.removeEventListener('paste', onPaste);
     }, [isOpen]);
     ```
   - Hint text под drag zone: "Также можно вставить изображение (Ctrl+V)" при md+
4. **File validation**: оставить существующую, расширить типы на .pptx/.txt/.heic/.webp в UI списке разрешённых.

### Task-local Test Requirements
- **TR-R9.1 (rule):** `window.innerWidth < 768` → UploadModal не рендерит DnD зону (DOM класс hidden md:block).
- **TR-R9.2 (rule):** Drag a test PDF file over DnD zone → dragging state true (border-teal bg-teal-50); drop → `setSelectedFile` called (проверить через console.log spy или state).
- **TR-Ru9.3 (rubric):** Upload UX cross-device (0–2):
  - `0`: только одна кнопка "Файл" на всех устройствах
  - `1`: drag & drop на desktop, но нет paste / mobile-only режима
  - `2`: mobile (camera+file only) ↔ tablet/desktop (DnD + choose file + paste image + optional camera) — все каналы работают
  - Порог: ≥ 2

---

## Task 10: Adaptive button sizes audit — min-h-[44px] everywhere + touch area

**Priority:** medium (can be parallel)
**Depends on:** Task 1 (хотя бы классы globals добавлены)
**Parent AC:** AC-R15, NFR3
**Files to edit:**
- Audit & fix: `src/components/**/*.tsx` — все кнопки и ссылки-как-кнопки
- Особенно: `quiz/QuizPlayer.tsx options buttons`, `library/page.tsx action tiles`, BottomNav icons, FAB, UploadModal buttons, dashboard card buttons

### Детали реализации
1. **Скрипт-чек**: перебрать все `<button`, `<Link href=... role=button`, `<a href>` не навигационные:
   - Гарантировать min-height ≥ 44px для action buttons (кнопки ответов, submit, navigation actions)
   - Icon-only buttons (×/close): min w&h ≥ 40px с p-2 внутри (≥36px hit OK для close, но ≥44 лучше — p-3)
   - FAB: w-14 h-14 = 56px — OK как сейчас
   - MobileBottomNav: каждая иконка + лейбл: `py-1 px-3` → общая высота >= 44px (current h-16 nav, значит OK, но каждая `<Link>` должна иметь min-h-[48px])
2. **Padding adjustments**:
   - Вместо `px-2 py-1` для важных кнопок: `px-4 py-3` или `h-11 px-4`
   - Button text size: mobile `text-sm` OK, desktop `text-base` OK
3. **Interactive non-buttons** (flashcard click, modal backdrop close):
   - Backdrop div: full width/height, z-50

### Task-local Test Requirements
- **TR-R10.1 (rule):** DevTools audit all buttons on 320px Quiz Player options: computed height ≥ 44px (в среднем по 4 опциям).
- **TR-R10.2 (rule):** FAB computed width+height ≥ 56px, Bottom Nav link hit area ≥ 44px tall (including text label below icon stack).
- **TR-Ru10.3 (rubric):** Touch target adequacy (0–2):
  - `0`: 3+ кнопки ≤ 36px высотой
  - `1`: почти все ≥ 44px, 1–2 мелкие кнопки (close × в corner)
  - `2`: все action buttons ≥ 44px, icon-only ≥ 44px, safe focus rings
  - Порог: ≥ 2

---

## Task 11: Flashcards + Quiz keyboard navigation + Swipe gestures touch

**Priority:** high
**Depends on:** Task 1
**Parent AC:** AC-R7, AC-Ru3
**Files to edit:**
- `src/components/flashcards/FlashcardDeck.tsx` — add swipe + keydown
- `src/components/quiz/QuizPlayer.tsx` — add options arrows/enter/space

### Детали реализации
1. **FlashcardDeck.tsx**:
   - **Keyboard** (useEffect + window keydown):
     - `ArrowLeft` → prev card (setCurrentIndex max(0, curr-1))
     - `ArrowRight` → next card (setCurrentIndex min(max, curr+1)), или после flipped mark GOOD
     - `Space` или `Enter` → toggle isFlipped
     - `1/2/3/4` цифры → rate AGAIN/HARD/GOOD/EASY (когда flipped, иначе hint)
     - `Escape` → можно вызывать onExit callback (если есть), или ничего
   - **Swipe gestures** (touch handlers, можно без новой библиотеки — vanilla touchstart/touchend):
     ```
     touchStartX/Y in ref
     touchend: dx = endX - startX
     if |dx| > 60 && |dx| > |dy|:
       dx > 0 → prev, else → next
     if dy < -80 && |dx|<40: flip (swipe up)
     ```
   - Добавить визуальные hints на десктопе: под карточкой маленькие подписи `← →` `Space` `1/2/3/4`
2. **QuizPlayer.tsx** keyboard:
   - `ArrowUp/ArrowDown`: менять selectedOptionId на предыдущий/следующий вариант (циклически)
   - `Enter` или `Space`: если не отвечено → submit answer; если отвечено → next question
   - `Escape`: выход confirmation (необязательно, modal confirm)
   - **Focus-visible**: каждая option-button получает focus-ring при Tab

### Task-local Test Requirements
- **TR-R11.1 (rule):** FlashcardDeck: keydown ArrowRight (simulate via dispatchEvent) → currentIndex+1 (если не последняя); Space → isFlipped true.
- **TR-R11.2 (rule):** touchstart(x=100,y=200) → touchend(x=30,y=210) (swipe left dx=-70) → currentIndex увеличился на 1 (next card).
- **TR-Ru11.3 (rubric):** Input modality score (0–2):
  - `0`: только click/tap работает; keyboard/slap — нет
  - `1`: keyboard arrows для quiz/flash работает, но swipe нет или vice versa
  - `2`: flash swipe+keyboard+click, quiz keyboard arrows+enter+space+focus ring+tab
  - Порог: ≥ 2

---

## Task 12: All Modals — Radix Dialog integration, focus trap, Esc, responsive sizing, safe-area

**Priority:** high
**Depends on:** Task 1
**Parent AC:** AC-R8, AC-Ru4
**Files to edit:**
- `src/components/library/UploadModal.tsx`
- `src/components/library/CameraScannerModal.tsx`
- `src/components/library/OcrEditorModal.tsx`
- `src/components/quiz/AIExplainModal.tsx`
- `src/components/quiz/SourceCitationModal.tsx`
- `src/components/study/TopicPreStudyModal.tsx`

### Детали реализации
1. **Общий паттерн** для каждой модалки: обернуть в Radix `Dialog` (уже установлен), или если кастомная анимация framer-motion важна:
   - Добавить keydown Escape listener при открытой модалке (onClose)
   - Добавить focus-trap simple через `useEffect`: при открытии `firstFocusable?.focus()`, Tab циклически (или просто оставить Radix)
2. **Рекомендуется**: Перевести самописные modal на Radix Dialog (можно сохранить motion.div animation как Content) для бесплатного focus-trap + esc + accessibility aria.
3. **Responsive sizing** каждого modal:
   - Корневой backdrop: `fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-...` (как сейчас частично в UploadModal)
   - Content container:
     - mobile: `w-full max-w-full rounded-t-3xl max-h-[92dvh] overflow-y-auto safe-area-top safe-area-bottom`
     - sm (tablet/desktop): `w-full max-w-md rounded-3xl` (Upload/Source/Explain) → `max-w-2xl` → `max-w-5xl` (OcrEditor)
     - OcrEditor — побольше: `md:max-w-4xl lg:max-w-5xl xl:max-w-6xl`
4. **Header/footer sticky** внутри modal:
   - Header (title + close X): `sticky top-0 bg-white z-10 pb-3 pt-4 border-b`
   - Footer (submit/cancel): `sticky bottom-0 bg-white z-10 pt-3 pb-4 safe-area-bottom border-t`
   - Body: `overflow-y-auto` промежуток

### Task-local Test Requirements
- **TR-R12.1 (rule):** 6 модалок (Upload/Camera/OCR/Explain/Source/Topic) — открытие → нажатие Escape → закрытие (onClose called).
- **TR-R12.2 (rule):** 320px UploadModal: content full-width, rounded-top only, safe-area-bottom padding applied; 1440px centered max-w-md rounded-3xl.
- **TR-Ru12.3 (rubric):** Modal quality (0–2):
  - `0`: 3+ модалок обрезают кнопки на 320px или Esc не работает
  - `1`: все открываются/закрываются, 1–2 модалки без sticky header/footer, 1 без focus-trap
  - `2`: все 6 модалок Radix/focus-trap, Esc close, responsive sizing, safe-area, sticky head/foot
  - Порог: ≥ 2

---

## Task 13: Safe area + Orientation + PWA manifest fix + state persistence

**Priority:** high
**Depends on:** Task 1, Task 2
**Parent AC:** AC-R9, AC-R10, AC-Ru5
**Files to edit:**
- `public/manifest.json`
- `src/components/layout/MobileBottomNav.tsx` (safe-area усилить)
- `src/components/layout/TopHeader.tsx` (safe-area усилить, left/right для iPad split)
- `src/components/quiz/QuizPlayer.tsx` (убедиться state resize-safe — уже useState, проверить)
- `src/components/flashcards/FlashcardDeck.tsx` (state persistence)
- Любые FAB кнопки на Library page

### Детали реализации
1. **manifest.json**:
   - Удалить `"orientation": "portrait"` строку, или заменить на `"any"` или `"natural"`.
   - Проверить остальное: display, icons, theme/background color оставить.
2. **Safe area везде усилить**:
   - TopHeader: `safe-area-top` класс (уже есть) + добавить safe-area-left/right для iPad split view.
   - MobileBottomNav: `safe-area-bottom` (уже есть) + safe-area-left/right.
   - Modals (mobile): safe-area-top (header close button) + safe-area-bottom (footer submit).
   - FAB: `bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-[max(env(safe-area-inset-right),1rem)]`.
3. **Orientation state persistence**:
   - QuizPlayer: currentIndex, selectedOptionId, results — useState; при orientation change не unmount (confirm AppNavigation layout structure не размонтирует страницу при resize)
   - Flashcards: same. Если вдруг происходит remount — можно добавить `sessionStorage` persist key:
     ```
     const [idx, setIdx] = useState(() => Number(sessionStorage.getItem('flash_idx') || '0'));
     useEffect(() => sessionStorage.setItem('flash_idx', String(idx)), [idx]);
     ```
4. **Input scroll-into-view**: добавить simple useEffect на глобальный focus:
   - globals.css уже имеет `scroll-padding-bottom` (Task 1); для input'ов также можно при onFocus:
     ```js
     <input onFocus={e => e.target.scrollIntoView({block: 'center', behavior: 'smooth'})}
     ```
   Добавить в UploadModal subject/filename inputs, Topic manual input, Profile inputs.

### Task-local Test Requirements
- **TR-R13.1 (rule):** manifest.json read: строка `"orientation": "portrait"` отсутствует (или = "any"/"natural").
- **TR-R13.2 (rule):** Quiz: выбрать вариант → изменить viewport height/width (resize) → currentIndex не сбрасывается в 0, selectedOptionId не null (проверка: открыть /quiz?topicId=X → выбрать вариант B на вопросе 3 → devtools resize от 375 до 1024 → всё сохранено).
- **TR-Ru13.3 (rubric):** Orientation + PWA stability (0–2):
  - `0`: при повороте Quiz сбрасывается, PWA standalone landscape обрезает nav, safe-area нет
  - `1`: state сохраняется, но есть 1 экран где safe-area не учтён при landscape (например FAB частично обрезан)
  - `2`: state Quiz/Flashcards/input все stable, manifest orientation any, safe areas 4 стороны, PWA standalone работает с landscape/portrait
  - Порог: ≥ 2

---

## Task 14: Keyboard navigation polish + Global focus ring utility audit

**Priority:** medium
**Depends on:** Task 1 (globals focus ring utility created)
**Parent AC:** AC-R14, AC-Ru3, NFR6
**Files to edit:**
- ALL components that render `<button>`, `<Link role=button>`, `<input>`, `<select>`, `<textarea>` — apply focus-ring utility class
- Focus audit: `src/components/**/*.tsx`, где есть интерактивные элементы

### Детали реализации
1. **Добавить focus ring** ко всем интерактивным элементам:
   - Можно через globals.css правило (Task 1 уже добавил `.focus-ring-base`) и применить к:
     ```css
     button, [role="button"], a[href]:not(.no-focus), input, select, textarea {
       @apply focus-ring-base;
     }
     ```
   Либо классами Tailwind на каждый элемент (более безопасно, чтобы не сломать кастомные focus-visible):
   - Добавить `className="... focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:rounded-md"` ко всем `<button>`/`<Link>`/`<a action>`
2. **Tab order audit**: DOM order должен быть логичный (сверху вниз, слева направо). Не использовать `tabIndex={1...N}`, только `tabIndex={-1}` для программного фокуса.
3. **Skip link** (опционально для desktop a11y): в начале страницы `Skip to main content` кнопка, видимая только при focus.

### Task-local Test Requirements
- **TR-R14.1 (rule):** Открыть Home page, нажать Tab 10 раз — каждый следующий интерактивный элемент получает видимое teal ring 2px.
- **TR-R14.2 (rule):** QuizPlayer option button: получить focus через Tab → ring виден, Enter → кнопка нажата (выбран вариант).
- **TR-Ru14.3 (rubric):** Keyboard polish (0–2):
  - `0`: 4+ элемента без видимого фокуса, Tab прыгает в странном порядке
  - `1`: focus ring есть везде, но 1 экран (например OcrEditor) нечёткий порядок таба
  - `2`: все элементы с focus ring, логичный tab order, skip link option или хотя бы no tabindex>0
  - Порог: ≥ 2

---

## Task 15: Build & Tests verification + Responsive manual smoke-test checklist

**Priority:** high
**Depends on:** Tasks 1–14 все
**Parent AC:** AC-R13 (build OK) + все AC как финальный gate
**Files to edit:** —

### Детали реализации
1. **CI-style commands** запустить последовательно:
   - `npx tsc --noEmit` → исправить type errors
   - `npm run lint` → исправить eslint errors
   - `npm test` → tests/*.test.mjs все pass (если кто-то падает из-за несвязанного — отдельно разобрать)
   - `npm run build` → next build success
2. **Manual responsive checklist** (снять evidence скриншотами или описанием) по 13 разрешениям:
   - 320×568 (iPhone SE 1): Home, Library, Library/[id], Quiz, Flashcards, Progress, Profile, UploadModal, Camera modal, OCR modal, Explain modal
   - 375×812 (iPhone X), 390×844 (iPhone 12), 430×932 (iPhone 14 Pro Max), 768×1024 (iPad), 820×1180 (iPad Air), 1024×1366 (iPad Pro 12.9)
   - 1280×720, 1366×768, 1440×900, 1920×1080, 2560×1440: Home sidebar+right panel, Library 3-4 col, Quiz 2-col, Progress KPI+charts, Upload DnD
3. **Orientation tests** (emulate):
   - Quiz: 375×812 portrait → 812×375 landscape → сохранился вопрос/выбор
   - Flashcards: swipe + keyboard в обе ориентациях
4. **PWA**: install manifest в Chrome DevTools Application panel проверить orientation any, installability.

### Task-local Test Requirements
- **TR-R15.1 (rule):** `tsc --noEmit` 0 errors, `npm run build` success exit 0.
- **TR-R15.2 (rule):** `npm test` pass rate ≥ 90% (или все pass, если падения не из-за responsive task)
- **TR-Ru15.3 (rubric):** Cross-device responsive completeness (0–2):
  - `0`: build падает или 3+ страницы/модалки на 320px или 2560px сломаны
  - `1`: build OK, 2–5 мелких layout issues на крайних разрешениях
  - `2`: build/lint/tsc/tests 0 errors; все 17 разрешений + orientations + PWA pass visual checklist
  - Порог: ≥ 2

---

## Summary dependencies DAG

```
Task 1 (Foundation)
 ├─> Task 2 (AppNavigation)
 │    ├─> Task 3 (Home responsive)
 │    └─> Task 5 (Library/[id])
 ├─> Task 4 (Library page grid)
 ├─> Task 6 (Quiz Player 2-col)
 ├─> Task 7 (Progress charts)
 ├─> Task 8 (Flashcards resize)
 ├─> Task 9 (Upload DnD + Paste)
 ├─> Task 10 (Button sizes audit) [parallel OK]
 ├─> Task 11 (Keyboard + Swipe)
 ├─> Task 12 (Modals Radix + responsive)
 ├─> Task 13 (Safe-area + PWA + Orientation)
 └─> Task 14 (Focus ring audit)   [parallel OK]

Task 15 (Build + Smoke Tests) <- depends ALL.
```
