# SAIDA MED AI — Personalized Medical Study Platform

A private, iPhone-first, source-grounded AI medical study assistant engineered specifically for medical student Saida.

---

## 1. Project Overview

**SAIDA MED AI** transforms uploaded medical textbooks, lecture slides (PDF, DOCX, PPTX), clinical notes, and handwritten slide photos into structured, verifiable medical knowledge.

Instead of sending raw text to an LLM to generate random questions, SAIDA MED AI executes an academic comprehension pipeline:
1. **Document Processing & Page Extraction**: Preserves page and section boundaries across PDF, DOCX, PPTX, and scanned slides (via OCR abstraction).
2. **Semantic Chunking**: Preserves anatomical headings, lists, tables, and sentence continuity with sliding overlap.
3. **Structured Knowledge Extraction**: Extracts medical subjects, topics, clinical concepts, high-yield facts with page numbers, and physiological/pharmacological relationships.
4. **Knowledge Map**: Generates interactive concept trees reflecting the hierarchy of the material.
5. **Anti-Hallucination Grounded RAG**: Generates USMLE/Board-style multiple choice and case questions where every single question cites a verbatim source excerpt and page number.
6. **Adaptive Learning & Weak-Topic Detection**: Automatically detects low accuracy topics and powers targeted study ("Quiz me on what I struggle with").
7. **Spaced Repetition (SuperMemo SM-2)**: Interactive 3D swipeable flashcards with interval scheduling (`Again`, `Hard`, `Good`, `Easy`).

---

## 2. Platform & Mobile UX

- **Target Device**: iPhone / Safari (with full desktop, tablet, and Android compatibility).
- **PWA (Progressive Web App)**: Configured for Safari **"Share → Add to Home Screen"** with native iOS full-screen execution.
- **iOS Design Language**:
  - Safe-area inset handling (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
  - Native iOS 5-tab bottom navigation (`Home`, `Library`, `Quiz`, `Cards`, `Progress`).
  - Fluid spring physics using Motion (Framer Motion).
  - Minimum tap targets $\ge 44 \times 44\text{ px}$.
  - Calm clinical palette (Medical Teal `#0d9488`, slate neutrals, soft cards).

---

## 3. Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components & Server Actions)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + custom iOS safe-area tokens
- **Animations**: Framer Motion (Motion for React) + Canvas Confetti
- **ORM & Database**: Prisma ORM with PostgreSQL (Neon / Supabase Serverless)
- **AI & RAG**: OpenAI API (`text-embedding-3-small`, `gpt-4o`, `gpt-4o-mini`)
- **Parsers**: `pdf-parse`, `mammoth` (DOCX), `jszip` (PPTX), and pluggable `OCRService`
- **Validation**: Zod (strict schema enforcement on all AI outputs and APIs)

---

## 4. Local Development Quickstart

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+`

### Installation
```bash
# 1. Clone repository & enter workspace
cd "a:/Med AI"

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run test suite (all 12 tests pass)
npm test

# 5. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) on your browser or iPhone (via local network).

---

## 5. Environment Variables (`.env`)

Create a `.env` file based on `.env.example`:

```env
# Database (Neon / Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:password@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth / Auth.js
NEXTAUTH_SECRET="super-secret-random-32-char-key"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI API Key (Embeddings & Structured Question Generation)
OPENAI_API_KEY="sk-proj-..."

# Storage Driver (local | s3 | supabase)
STORAGE_TYPE="local"

# Default student profile
DEFAULT_STUDENT_EMAIL="saida@med.ai"
DEFAULT_STUDENT_NAME="Saida"
```

*Note: In local development, the application includes a resilient offline medical repository so you can test all UI flows, quizzes, and flashcards even without active cloud database credentials.*

---

## 6. Database Setup & Prisma Migrations

When connecting to an active PostgreSQL database (such as Neon or Supabase):

```bash
# Push schema directly to database
npx prisma db push

# Or run standard migration
npx prisma migrate dev --name init
```

---

## 7. Anti-Hallucination & Medical Safety

1. **Anti-Hallucination Engine (`QuestionValidator`)**:
   - Programmatically verifies that MCQ choices have zero duplicates.
   - Ensures the correct answer matches an option identically.
   - Rejects questions if the `sourceExcerpt` cannot be verified in the uploaded document text.
2. **Medical Education Advisory**:
   - SAIDA MED AI is an educational study and review platform.
   - It is strictly not an automated diagnostic system or treatment tool.

---

## 8. Deployment to Vercel (Zero VPS Required)

1. Push your repository to GitHub / GitLab.
2. Import project into [Vercel](https://vercel.com).
3. Under **Environment Variables**, add:
   - `DATABASE_URL` (from Neon or Supabase)
   - `NEXTAUTH_SECRET`
   - `OPENAI_API_KEY`
4. Deploy! Next.js runs seamlessly across Vercel Serverless Functions with zero long-running daemons.

---

## 9. Verification & Quality Assurance

Run the test suite:
```bash
npm test
```
Build verification:
```bash
npm run build
```
