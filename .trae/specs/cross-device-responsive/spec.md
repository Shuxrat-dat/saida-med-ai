# Спецификация: Полная поддержка любого типа устройства (Cross-Device Responsive)

## 1. Проблема, пользователи, цели

### Проблема
Текущая реализация Saida Med AI спроектирована исключительно под мобильную вертикальную раскладку (смартфон):
- Все страницы жёстко ограничены `max-w-md mx-auto` независимо от размера экрана
- Навигация существует только как Bottom Navigation (мобильный вариант)
- Отсутствует Desktop layout с Sidebar и правой панелью
- Нет Drag & Drop загрузки файлов на десктопе
- Flashcards не поддерживают swipe/keyboard
- QuizPlayer — только одна колонка, без адаптивного использования пространства
- PWA манифест блокирует landscape режим (`orientation: "portrait"`)
- Safe area работает только в одном направлении
- Нет поддержки клавиатурной навигации (Tab/Enter/Escape/Arrow keys)

### Пользователи
- Основной: Saida — iPhone Safari (портрет + ландшафт), Chrome Android
- Вторичные:
  - Студент с планшетом iPad (768–1024px, обе ориентации)
  - Пользователь ноутбука Chrome/Safari (1280–1440px)
  - Пользователь настольного ПК с широкоформатным монитором (1920–2560px)
  - Пользователь, открывший приложение как PWA standalone mode

### Цели
1. **Единая кодовая база**: Один UI, одна логика, адаптирующаяся под размер экрана через responsive breakpoints — без отдельной мобильной/десктопной версии.
2. **Mobile-first с Desktop enhancement**: Базовый дизайн под 320–430px, затем progressive enhancement до 2560px.
3. **Адаптивная навигация**: Bottom Nav (< 768px) → Compact Sidebar (768–1023px) → Full Sidebar + Right Panel (≥ 1024px).
4. **Мульти-инпут**: Touch + Mouse + Keyboard одновременно работают на всех интерактивных элементах.
5. **PWA сохранена**: Манифест, service workers, standalone mode, installability — не удалять и не ломать.
6. **Состояние не теряется**: При resize/orientation change тест не сбрасывается, введённые данные сохраняются.

### Не-цели
- **НЕ** создавать отдельную `_mobile.tsx` / `_desktop.tsx` версию каждого компонента
- **НЕ** менять DATABASE_URL, Supabase, OpenAI ключи
- **НЕ** добавлять UI-фреймворки поверх Tailwind (MUI, Chakra и т.д.)
- **НЕ** переводить проект на CSS Modules / styled-components (оставить Tailwind CSS)
- **НЕ** внедрять новую систему авторизации
- **НЕ** трогать существующий OCR/AI pipeline — только обёртки/UI
- **НЕ** создавать mock-данные для responsive демонстрации

---

## 2. Функциональные требования (FR)

### FR1 — Responsive Container и Global Layout
- Удалить жёсткое ограничение `max-w-md mx-auto` из `SafeContainer.tsx` как единственный вариант.
- Заменить на адаптивный контейнер:
  - `< sm (640px)`: full-width, px-3, min-w-0
  - `sm → lg (640–1023px)`: max-w-2xl / max-w-3xl (таблет)
  - `lg → xl (1024–1279px)`: max-w-5xl (ноутбук)
  - `xl → 2xl+`: max-w-7xl (десктоп)
- В `layout.tsx` сохранить `overflow-x-hidden` и safe-area variables.
- Добавить CSS utility: `.container-responsive` или использовать inline responsive classes.
- Заменить `100dvh` fallback: `min-h-[100dvh] min-h-[100svh]` для Safari stability.

### FR2 — Адаптивная навигация (MobileBottomNav ↔ Sidebar)
- Создать общий компонент `AppNavigation.tsx`, который выбирает режим по breakpoint:
  - **< md (≥ 768px false)**: рендерит `MobileBottomNav` — bottom-fixed, 5 иконок, safe-area-bottom
  - **md → lg (768–1023px)**: Compact Sidebar слева — w-16, только иконки, expandable по hover
  - **≥ lg (1024px+)**: Full Sidebar слева — w-64, иконки + лейблы, секция "Саида" внизу, быстрый доступ: Главная / Материалы / Темы / Тесты / Карточки / Прогресс
- На ≥ lg добавить опциональную Right Panel (`ProgressSidePanel`) шириной w-80 с:
  - Today progress, Mastery summary, Weak spots list
  - По умолчанию видна на xl+ (1280px+), на 1024–1279px collapseable
- TopHeader адаптируется:
  - Mobile: compact h-14, logo + streak + profile avatar
  - Desktop: h-16, breadcrumb (текущая страница), search input, quick actions
- MobileBottomNav на `< md` показывать ТОЛЬКО 5 самых важных: Главная, Материалы, Тесты, Карточки, Прогресс. Темы → вынесены в меню (или через Library → detail).

### FR3 — Адаптивные страницы: grid columns, max-width content
Обновить все страницы под responsive grid:

| Страница | < sm (mobile) | sm → md (tablet small) | md → lg (tablet) | lg → xl (laptop) | xl+ (desktop) |
|---|---|---|---|---|---|
| Home | 1 col widgets | 1–2 col | 2 col summary + 1 col today repeat | 2 col + right panel | 3 col dashboard grid |
| Library | 1 col cards | 2 cols | 2–3 cols | 3 cols | 4 cols, max-w card = 320px |
| Library/[id] | 1 col topic list | 2 col topic grid + right summary | 2 col tree + explain | 3 col: tree + detail + mastery | 3 col + weak panel |
| Quiz page | 1 question full-width | 1 question with side progress | same left + right progress summary | 2 col: question + info panel | 2 col + source/explanation panel |
| Flashcards | 1 card full-width | 1 card max-w-md center | same, deck info right-side | 2 col: card + due list | 3 col: card + list + stats |
| Progress | 1 col stacked charts | 2 col small cards | 2 col: cards + 1 big chart | dashboard 2×2 grid | dashboard 3×3 with KPIs top |
| Profile | 1 col list | 1 col max-w-md center | same | 2 col: form + info | 2 col + activity log |

- Каждая grid ячейка: `min-w-0`, `overflow-hidden`, `truncate` для длинных заголовков.
- Карточки НЕ растягивать на всю ширину — использовать `max-w-sm`/`max-w-md` на grid item, или `grid-cols-auto-fit` через Tailwind arbitrary values.

### FR4 — Upload: Адаптивный выбор способа по устройству + Drag & Drop
- `UploadModal.tsx` реструктурировать:
  - **Mobile (< md)**: Только две кнопки 📷 Камера + 📁 Файл (как сейчас). Drag & Drop скрыт.
  - **Tablet (md → lg)**: Кнопки Камера / Файл + опциональная Drag & Drop зона (если touch с mouse support detected или всегда показывать)
  - **Desktop (≥ lg)**: Drag & Drop зона на всю ширину модалки + кнопки "Выбрать файл", "Вставить изображение из буфера" (paste), опционально "Камера" если `navigator.mediaDevices` доступен
- Drag & Drop zone реагирует на `dragover`, `dragleave`, `drop` events.
- Валидация типов файлов: `.pdf, .docx, .pptx, .txt, .png, .jpg, .jpeg, .webp, .heic`
- Paste image (desktop): слушать `paste` event на document внутри модалки → извлечь `clipboardData.items` image/png.
- После выбора Preview одинаковый на всех устройствах, далее одинаковый flow.

### FR5 — QuizPlayer адаптивный
- Mobile (< sm): 1 вопрос на экран, варианты списком вертикально, кнопка "Ответить" sticky внизу safe-area
- sm → md: same as mobile, но question card max-w-lg, center
- lg+: двухколоночный layout:
  - Left (flex-[3]): Question text + options
  - Right (flex-[2]): Progress panel, progress bar, topic info, citation source preview (если уже отвечено)
- Кнопки вариантов **на всех экранах min-h-[56px]**, px-4, touch-area увеличены (не ставить `< 44px` высоту по вертикали нигде).
- После ответа кнопка "[ Следующий вопрос → ]" всегда доступна в viewport, не скроллится за экран на 320px.
- При orientation change `currentIndex` / `selectedOptionId` сохраняются (не сбрасывать state).

### FR6 — Flashcards: Touch swipe + Mouse + Keyboard
- Добавить swipe gestures (useSwipe из framer-motion или custom `touchstart`/`touchend`):
  - Swipe left → следующая карточка (GOOD по умолчанию если уже flipped, иначе показать hint)
  - Swipe right → предыдущая карточка
  - Swipe up → flip карточки (или tap click — оставить)
- Keyboard shortcuts (useEffect + keydown):
  - `←` previous, `→` next, `Space` flip card, `Enter` = mark GOOD (если flipped), `Esc` — exit confirm
- Rate buttons (AGAIN/HARD/GOOD/EASY):
  - Mobile: 4 кнопки одной строкой или 2×2 grid, каждая min-h-[52px]
  - Desktop: одна строка 4 кнопки, можно добавить hotkey labels (1/2/3/4) в углу
- Карточка:
  - Mobile: full-width min-h-[280px]
  - Tablet+: max-w-lg, min-h-[360px], centered

### FR7 — Charts & Statistics адаптив
- Все recharts-графики оборачивать в `ResponsiveContainer` 100% width и aspect ratio 16/9 (или 4/3 mobile)
- Progress page:
  - Mobile: один график, вертикальный стек
  - Tablet: 1–2 графика рядом (grid-cols-2)
  - Desktop: dashboard 2×2 или 3×3
- Легенда графика: mobile truncate или только цифры, desktop полные лейблы.
- Никогда не разрешать `overflow-x: auto` для графиков кроме явно необходимого случая (горизонтальный bar chart с 20+ элементами). Тогда контейнер горизонтального скролла имеет `no-scrollbar` и явную `max-h-[420px]`.

### FR8 — Modals адаптивные
- Все диалоги (`UploadModal`, `CameraScannerModal`, `OcrEditorModal`, `AIExplainModal`, `SourceCitationModal`, `TopicPreStudyModal`):
  - `< sm`: `items-end justify-center p-0`, sheet-style `rounded-t-3xl`, max-h-[92dvh] safe-area-top/bottom, кнопка "закрыть" в safe-top зоне
  - `sm → lg`: `items-center justify-center p-4`, `rounded-3xl max-w-[min(640px,90vw)]`, `max-h-[85vh] overflow-y-auto`
  - `lg+`: centered dialog, `max-w-2xl` / `max-w-3xl` в зависимости от контента (OcrEditor — max-w-5xl), явная ширина не больше `80vw`
- Close actions:
  - Кнопка X (клик/touch)
  - Keyboard `Esc` закрывает любой открытый modal (закрывается верхний в стеке)
  - Backdrop click (опционально, для не-критических модалок)
- Внутренний контент: scrollable only body, header+footer sticky внутри modal.

### FR9 — Safe Areas & Orientation support
- Удалить `"orientation": "portrait"` из `manifest.json` (заменить на `"any"` или `"natural"` или удалить поле), чтобы приложение работало в landscape PWA standalone mode.
- Для layout компонентов добавить safe-areas:
  - TopHeader: `pt-[env(safe-area-inset-top)]` или `safe-area-top` (уже есть)
  - MobileBottomNav: `pb-[max(env(safe-area-inset-bottom),0.5rem)]` (частичная реализация есть)
  - FAB / floating buttons: `bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]`
  - Modals: `pb-[env(safe-area-inset-bottom)]` на `< sm`
- Добавить слушатель resize/orientationchange:
  - QuizPlayer/Flashcards: сохранить active question index через localStorage или React state (уже есть в state — достаточно не unmount-ить компонент)
  - Prevent "потеря данных" при orientation change: input value сохраняется (контролируемые компоненты уже должны это делать).

### FR10 — Keyboard navigation + focus states
- Добавить глобально видимые focus states:
  - Tailwind classes: `focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white`
  - Для всех `<button>`, `<Link role=button>`, `<a>`, `<input>`, `<select>`
- Проверить flow:
  - Tab / Shift+Tab обходит все интерактивные элементы в логичном порядке (DOM order, не использовать tabindex>0 кроме модалок)
  - Enter = активирует кнопку/ссылку, Space = toggle (чекбокс, flip карточки)
  - Arrow keys работают в Quiz options (переключение между radio), Flashcards, Tabs
  - Escape = закрыть верхний modal, снять выделение
- Focus trap в модалках: использовать Radix Dialog focus trap или реализовать простой через useEffect (ссылка Radix уже есть в зависимостях — использовать `@radix-ui/react-dialog` где возможно вместо самописных backdrop/div).

### FR11 — PWA сохранена
- `manifest.json`:
  - Убрать `"orientation": "portrait"` или сменить на `"any"`
  - Проверить `"display": "standalone"` оставлено
  - Добавить `"orientation"` опционально default `"portrait-primary"` если только phone, но **цель: разрешить landscape на планшетах/десктопах** → `"any"`
  - Icons 192/512 оставить
- `viewport` в `layout.tsx`: оставить как есть, но убедиться `viewportFit: "cover"` работает и с landscape.
- Service Worker (если есть): не удалять, проверить что в landscape mode не добавляет багов.
- Splash: не ломать.

### FR12 — Табличные данные (если появятся) на mobile → cards
- В Progress/History list:
  - Mobile: каждая запись — card (дата, score, accuracy, topic tag)
  - Desktop: таблица (thead/tbody) с колонками
- Не использовать `<table>` на mobile без обёртки overflow-x-auto + shadow.

### FR13 — Input scroll-into-view при клавиатуре (mobile)
- Для input внутри Quiz short-answer (если есть), Topic manual input, Upload filename:
  - При `onFocus` вызывать `element.scrollIntoView({block: 'center', behavior: 'smooth'})` или полагаться на `scroll-padding-bottom: env(safe-area-inset-bottom) + nav height 4rem` через CSS
  - Добавить в globals.css: `html { scroll-padding-bottom: calc(env(safe-area-inset-bottom) + 5rem); }`

---

## 3. Не-функциональные требования (NFR)

- **NFR1 (Breakpoints coverage)**: Интерфейс валиден на всех 13 разрешениях: 320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1440, 1920, 2560. Ни на одном нет horizontal overflow.
- **NFR2 (No hardcoded)**: Менее 5% компонентов используют фиксированный `width: Npx` / `height: Npx` для контейнеров; предпочитать max/min/%.
- **NFR3 (Touch targets)**: Все интерактивные элементы имеют min hit area ≥ 44×44pt по iOS guidelines; buttons не менее min-h-[44px].
- **NFR4 (Performance)**: Bundle size не увеличить > 5% (не добавлять новые библиотеки без крайней необходимости). Resize listener — debounced ≥ 150ms.
- **NFR5 (Build OK)**: `npm run build`, `tsc --noEmit`, `npm run lint` — 0 errors.
- **NFR6 (A11y contrast)**: Focus ring контрастен; text/icons на primary/secondary — WCAG AA.
- **NFR7 (PWA compatibility)**: Работает в standalone mode на iOS Safari (install), Chrome Android, без "add to home screen" багов.
- **NFR8 (Orientation data)**: При смене orientation (portrait ↔ landscape) введённый input text, Quiz currentIndex, selectedOption — не сбрасываются.

---

## 4. Ограничения, зависимости, допущения

### Ограничения
- Не трогать env vars, Supabase schema, OpenAI integration layer
- Не добавлять новые библиотеки кроме уже в package.json (framer-motion, lucide, recharts, radix уже есть — использовать их)
- Использовать Tailwind CSS responsive utility classes как основной механизм адаптивности

### Зависимости
- Radix Dialog (для modal focus trap) — уже установлен
- Framer Motion — swipe gestures, animations
- Recharts — responsive charts (уже установлен)
- Lucide icons — responsive sizes
- Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `max-*:` (Tailwind supports `max-md:` etc. natively in v3.2+)

### Допущения
- iPhone Safe-area insets работают через `env(safe-area-inset-*)` — этот механизм уже частично используется, расширяем его
- Mobile user имеет современный Safari iOS 15+ (viewport-fit=cover + env vars поддерживаются)
- QuizPlayer и Flashcards уже используют React state — при orientation change компонент не unmountится, state сохраняется автоматически
- Radix Dialog будет использован для модалок, где сейчас кастомная реализация — фокус-трап бесплатный
- Drag & Drop не требуется на touch-only мобильных — browser support `ondrop` там плохой

---

## 5. Открытые вопросы (без блокировки)
1. Использовать ли Radix Drawer/Primitive для mobile modals-sheet или оставить кастомный с framer-motion? → **Решение: Оставить кастомный motion-анимации + включить Radix Dialog только для focus-trap и keyboard Esc (можно обернуть существующие modal div'ы в `Dialog` из Radix или просто добавить keydown listener)**
2. Нужен ли toggle "свернуть правую панель" на desktop? → **Решение: Добавить collapsible right panel на lg, на xl+ всегда развернута по умолчанию**
3. Landscape mobile — Bottom Nav оставлять снизу или сделать Sidebar compact? → **Решение: landscape < 768 height (телефон горизонтально) — оставить Bottom Nav, высоту nav можно уменьшить до h-12, иконки w-4 h-4**

---

## 6. Критерии приёмки (Acceptance Criteria)

### Тип `rule` (объективный бинарный признак)
- **AC-R1**: На разрешении 320×568 (iPhone SE 1st gen) все страницы Home, Materials, Topic, Quiz, Flashcards, Progress — `document.body.scrollWidth === document.body.clientWidth` (0 horizontal overflow).
- **AC-R2**: На разрешении 430×932 (iPhone 14 Pro Max) FAB "+ Добавить материал" расположен над MobileBottomNav, не перекрыт; ни одна кнопка вариантов ответа Quiz не выходит за viewport по высоте/ширине.
- **AC-R3**: На 1280×720 открыта Home страница — слева отображается Sidebar шириной w-64 с 6 пунктами (Главная/Материалы/Темы/Тесты/Карточки/Прогресс), справа есть Right Panel с Progress/Mastery/WeakSpots summary или collapse toggle.
- **AC-R4**: На 1920×1080 Library page показывает grid карточек материалов 3–4 колонки; каждая карточка не растягивается > 360px шириной (используется max-w + justify-items-center или auto-cols).
- **AC-R5**: Drag & Drop zone в UploadModal видна и работает только при `window.matchMedia('(min-width: 768px)').matches` или feature-detect; на < 768px DnD скрыта.
- **AC-R6**: В QuizPlayer при открытом вопросе на desktop (≥ 1024px) — layout 2 колонки: question слева, progress/topic info справа; на mobile — 1 колонка.
- **AC-R7**: Flashcards поддерживают: Arrow Left/Right = prev/next, Space = flip, Swipe left/right = prev/next на touch-устройствах (эмуляция touch events или реальное устройство).
- **AC-R8**: Любой открытый Modal закрывается при нажатии Escape. Внутри модалки Tab обходит только её содержимое (focus trap работает).
- **AC-R9**: manifest.json не содержит строгой `"orientation": "portrait"` (либо удалено, либо `"any"` / `"natural"`). PWA установленное standalone запускается в landscape на iPad без обрезки.
- **AC-R10**: При повороте orientation (mobile simulator rotate → change size to landscape mode) QuizPlayer сохраняет currentIndex, selectedOptionId; уже набранный текст в input не исчезает.
- **AC-R11**: SafeContainer.tsx не содержит фиксированного `max-w-md` как единственного; есть responsive prefixes sm/md/lg/xl увеличивающие max-width.
- **AC-R12**: MobileBottomNav показывается только на `< md (767px и ниже)`; на `md+` не рендерится (рендерится Sidebar).
- **AC-R13**: `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npm test` — все проходят с 0 errors.
- **AC-R14**: Все интерактивные `<button>`, `<Link>`, `<a>` имеют явный focus-visible:ring стиль (проверка: выбрать элемент Tab → видимое кольцо).
- **AC-R15**: На каждом разрешении из списка 320/375/430/768/1024/1280/1440/1920 — Quiz options кнопки имеют min-height ≥ 44px, FAB ≥ 56×56px, nav icons tap area ≥ 44×44px.

### Тип `rubric` (оценочная шкала)
- **AC-Ru1 — Responsive breakpoints fidelity (0–2)**:
  - `0`: 2+ breakpoint-а из 13 не работают: layout ломается, overflow, карточки выходят за границы
  - `1`: основные 7 breakpoint-ов работают, но 2–5 мелких (320, 2560, 820) имеют мелкие шероховатости
  - `2`: все 13 разрешений без horizontal overflow; grid columns соответствуют таблице FR3; desktop/tablet/mobile distinction явный
  - Порог сдачи: ≥ 2

- **AC-Ru2 — Navigation adaptability (0–2)**:
  - `0`: только Bottom Nav на всех размерах, или sidebar на mobile не влезает
  - `1`: два режима (MobileNav / Sidebar), но отсутствует компактный sidebar на планшетах или right panel на десктопе
  - `2`: три режима BottomNav ↔ CompactSidebar ↔ FullSidebar+RightPanel; collapsible right panel работает; breadcrumb / search в desktop header
  - Порог сдачи: ≥ 2

- **AC-Ru3 — Input modality (touch/mouse/keyboard) (0–2)**:
  - `0`: UI работает только мышью или только touch; клавиатурный Tab → не видно фокуса, flashcards не управляются стрелками
  - `1`: touch и mouse работают везде, но keyboard-only access неполный (≤ 70% actions доступны без мыши)
  - `2`: все три модальности 100% работают; Flashcards swipe+click+keyboard; Quiz options click+touch+space/enter/arrows; modals close+focus+trap; Drag&Drop работает с мышью
  - Порог сдачи: ≥ 2

- **AC-Ru4 — Modal + Safe-area quality (0–2)**:
  - `0`: modals обрезаются на 320px, кнопки выходят за safe-area, iPhone landscape не показывает контент
  - `1`: modals влезают, но одна-две модалки не имеют sticky footer/header или escape закрывает только последнюю
  - `2`: все 6 модалок (Upload/Camera/OCR/Explain/Source/Topic) адаптивны по FR8; safe-area top/bottom/left/right учтены на iPhone; landscape/portrait — ни один элемент не выходит
  - Порог сдачи: ≥ 2

- **AC-Ru5 — PWA + Orientation stability (0–2)**:
  - `0`: после поворота экрана Quiz сбрасывается на вопрос 1, данные инпута исчезают, PWA standalone обрезает safe-area
  - `1`: state сохраняется, но при многократном rotate происходит layout jump или небольшой overflow; install to home screen работает, splash показан без обрезки
  - `2`: state Quiz/Flashcards сохраняется при любом resize/orientation; PWA install на iOS/Android — корректно; manifest orientation=any не ломает UI; safe areas работают в обеих ориентациях
  - Порог сдачи: ≥ 2
