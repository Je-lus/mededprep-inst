# Agent Tasks — MedEdPrep Instructor Tools (mededprep-inst)

## Overview

Build the mededprep-inst product from the mededprep-template. This is an instructor assessment tool with SurveyJS for creating/delivering exams via QR code, student self-service exam taking with randomized questions/choices, post-exam account creation, and an instructor results dashboard with item analysis including point-biserial discrimination index.

## Wave Plan

- **Wave 1:** Task 1 (project scaffold — run directly, NOT via worktree)
- **Wave 2:** Tasks 2, 3 (parallel — instructor backend + public/student backend, no shared files)
- **Wave 3:** Tasks 4, 5 (parallel — instructor frontend + student/public frontend, no shared files)

**IMPORTANT:** Task 1 must run directly in `mededprep-inst/` (not via worktree) because the project has no git repo yet. After Task 1 completes and commits, run `../workflow/setup-worktrees.sh 2-5` from `mededprep-inst/` for the remaining tasks.

## Integration Checks (after each wave)

```bash
cd app && npx tsc --noEmit && npx vite build
npm run lint
```

---

### Task 1: Project Scaffold

- **Agent:** Claude Sonnet
- **Branch:** main (direct — no worktree)
- **Depends on:** nothing
- **Files to modify:** All template files (find-replace), prisma/schema.prisma, app.js, app/src/App.tsx, + create ~25 new files

#### Prompt

```
## Context

You are scaffolding a new product called **mededprep-inst** (Instructor Tools) in the MedEdPrep ecosystem. The ecosystem is at `/home/jeramey/projects/mededprep-ecosystem/`. The tech stack is Express 5, Prisma 5, PostgreSQL, React 19, TanStack Query v5, shadcn/ui, Tailwind, Zustand.

The `mededprep-inst/` folder already exists with only a `samplecsv/` subfolder. You need to copy the template files into it and configure everything.

## Problem

We need a fully scaffolded project with the Prisma schema, backend services, frontend routing, and stub pages — ready for subsequent agents to implement the actual route handlers and page UIs.

## Changes Required

### Step 1: Copy template files into mededprep-inst

Run this command to copy all template files (including hidden files) into the existing mededprep-inst directory, without overwriting the existing samplecsv/:

```bash
cd /home/jeramey/projects/mededprep-ecosystem
rsync -a --ignore-existing mededprep-template/ mededprep-inst/
```

Then remove the template's .git directory if it was copied:
```bash
rm -rf /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/.git
```

### Step 2: Find-Replace in template files

All work is now in `/home/jeramey/projects/mededprep-ecosystem/mededprep-inst/`.

**package.json:**
- Line 2: `"mededprep-XXXX"` → `"mededprep-inst"`
- Line 7: `PORT=XXXX` → `PORT=9001`

**app/package.json:**
- Line 2: `"mededprep-XXXX-app"` → `"mededprep-inst-app"`

**docker-compose.yml:**
- Line 7: `mededprep_XXXX` → `mededprep_inst`

**.env.example:**
- Line 2: `mededprep_XXXX` → `mededprep_inst`
- Line 8: `PORT=XXXX` → `PORT=9001`
- Line 12: `CORS_ORIGINS=http://localhost:5173` → `CORS_ORIGINS=http://localhost:9000`
- Line 15: `APP_BASE_URL=http://localhost:5173` → `APP_BASE_URL=http://localhost:9000`

**server.js:**
- Line 2: `MedEdPrep PRODUCT` → `MedEdPrep Instructor Tools`
- Line 36: `MedEdPrep PRODUCT` → `MedEdPrep Instructor Tools`

**app/vite.config.ts:**
- Line 13: `port: 5173` → `port: 9000`
- Lines 15-16: `localhost:XXXX` → `localhost:9001`

**CLAUDE.md — replace the entire file with:**
```markdown
# CLAUDE.md

## Project Overview

**MedEdPrep Instructor Tools** — Assessment creation, QR-code delivery, and item analysis platform for EMS instructors.
URL: https://inst.mededprep.app | Repo: https://github.com/Je-lus/mededprep-inst

**Tech stack:** Express 5, Prisma 5, PostgreSQL, React 19, TanStack Query v5, shadcn/ui, Tailwind, Zustand, SurveyJS
**Ports:** Backend 9001, frontend dev 9000. Vite proxies `/api` and `/storage` to backend.

## Key Commands

docker-compose up -d               # Start PostgreSQL
npm run dev                        # Backend API on :9001
cd app && npm run dev              # Frontend on :9000
npm run db:migrate                 # Run migrations
npm run db:push                    # Push schema
npm run db:seed                    # Seed demo data
cd app && npm run build            # Production build
npm run lint                       # Lint backend
cd app && npm run lint             # Lint frontend
cd app && npm run typecheck        # TypeScript check

## Database

PostgreSQL on localhost:5432, database `mededprep_inst` (user: `mededprep` / `mededprep_dev`).

## Multi-Tenancy

Every request scoped via subdomain. Dev: `X-Org-Slug` header or `DEV_ORG_SLUG` env var.
All Prisma queries MUST include `WHERE orgId = req.orgId`.

## Auth & Test Credentials

- **Admin:** `admin@demo.org` / `password123` → POST `/api/auth/login`
- **Org slug:** `demo`

## Critical Patterns

- **API responses:** `{ success: true, data }` or `{ success: false, error: { code, message } }`
- **Brand color:** `#1b5fd0`
- SurveyJS license initialized via `app/src/lib/surveyjs-license.ts`
- Question metadata (explanation, difficulty, page number) stored in SurveyJS element `metadata` property

## Multi-Agent Workflow

Run `/director` to plan a batch. Shared tooling at `../workflow/`. See `AGENTS.md` for executor instructions.
```

### Step 3: Create .env from .env.example

Copy `.env.example` to `.env` and fill in:
```
DATABASE_URL="postgresql://mededprep:mededprep_dev@localhost:5432/mededprep_inst"
JWT_SECRET="mededprep-inst-dev-secret-key-change-in-production"
PORT=9001
NODE_ENV=development
CORS_ORIGINS=http://localhost:9000
APP_BASE_URL=http://localhost:9000
DEV_ORG_SLUG=demo
```

### Step 4: Rewrite prisma/schema.prisma

Replace the entire file with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// MULTI-TENANT: Organizations
// ============================================

model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  subdomain String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users       OrgUser[]
  students    Student[]
  assessments Assessment[]
}

// ============================================
// ADMIN USERS (Instructors)
// ============================================

model OrgUser {
  id          String    @id @default(uuid())
  orgId       String
  email       String
  password    String
  name        String
  role        String    @default("admin")
  isActive    Boolean   @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  org         Organization @relation(fields: [orgId], references: [id])
  assessments Assessment[]

  @@unique([orgId, email])
}

// ============================================
// STUDENTS
// ============================================

model Student {
  id        String   @id @default(uuid())
  orgId     String
  email     String
  firstName String
  lastName  String
  password  String?  // nullable — students can take assessments before creating an account
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org       Organization         @relation(fields: [orgId], references: [id])
  responses AssessmentResponse[]

  @@unique([orgId, email])
}

// ============================================
// ASSESSMENTS
// ============================================

model Assessment {
  id                 String           @id @default(uuid())
  orgId              String
  createdById        String
  title              String
  description        String?
  surveyJson         Json             // SurveyJS JSON with questions, choices, correctAnswer, metadata
  status             AssessmentStatus @default(draft)
  publicHash         String           @unique @default(uuid())
  resultsReleased    Boolean          @default(false)
  passingScore       Int?             @default(70)
  timeLimitMinutes   Int?
  randomizeQuestions Boolean          @default(true)
  randomizeChoices   Boolean          @default(true)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  org       Organization         @relation(fields: [orgId], references: [id])
  createdBy OrgUser              @relation(fields: [createdById], references: [id])
  responses AssessmentResponse[]

  @@index([orgId])
  @@index([publicHash])
}

enum AssessmentStatus {
  draft
  active
  closed
}

// ============================================
// ASSESSMENT RESPONSES
// ============================================

model AssessmentResponse {
  id              String    @id @default(uuid())
  assessmentId    String
  studentId       String?   // null until student creates an account
  studentEmail    String
  studentName     String
  responseData    Json      // { questionName: answerValue }
  questionOrder   Json?     // array of question names in the randomized order shown
  totalQuestions  Int?
  totalCorrect    Int?
  scorePercentage Decimal?  @db.Decimal(5, 2)
  passed          Boolean?
  timeTaken       Int?      // seconds
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  assessment Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  student    Student?   @relation(fields: [studentId], references: [id])

  @@unique([assessmentId, studentEmail])
  @@index([assessmentId])
  @@index([studentEmail])
}
```

### Step 5: Install backend dependencies

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst
npm install qrcode csv-parse
```

### Step 6: Install frontend dependencies

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app
npm install survey-creator-core survey-creator-react survey-core survey-react-ui dompurify recharts
npm install -D @types/dompurify
```

### Step 7: Install additional shadcn/ui components

First create `app/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

Then install components:
```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app
npx shadcn@latest add badge tabs table separator dialog skeleton select dropdown-menu textarea alert -y
```

If the shadcn CLI fails or prompts, manually copy these component files from the CE project:
```bash
cd /home/jeramey/projects/mededprep-ecosystem
for comp in badge tabs table separator dialog skeleton select dropdown-menu textarea alert; do
  cp -n mededprep-ce/app/src/components/ui/${comp}.tsx mededprep-inst/app/src/components/ui/${comp}.tsx 2>/dev/null || true
done
```
And install the missing radix deps:
```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs
```

### Step 8: Create backend service files

Create `lib/services/quiz-scoring.js`:
```javascript
/**
 * Quiz Scoring Service
 * Scores survey responses against original survey JSON
 */

/**
 * Score a survey response against the original survey JSON
 * @param {object} originalSurveyJson - The full SurveyJS JSON with correctAnswer properties
 * @param {object} responseData - The student's response data { questionName: answer }
 * @param {number} passingScore - Minimum passing score percentage (default 70)
 * @returns {{ totalQuestions, totalCorrect, scorePercentage, passed }}
 */
export function scoreSurveyResponse(originalSurveyJson, responseData, passingScore = 70) {
  let totalCorrect = 0;
  let totalQuestions = 0;

  const questionMap = {};
  for (const page of originalSurveyJson.pages || []) {
    for (const element of page.elements || []) {
      if (element.name) questionMap[element.name] = element;
    }
  }

  for (const [questionName, element] of Object.entries(questionMap)) {
    if (!('correctAnswer' in element)) continue;
    totalQuestions++;

    const studentAnswer = responseData[questionName];
    const correctAnswer = element.correctAnswer;

    const normalizedStudent = Array.isArray(studentAnswer)
      ? JSON.stringify([...studentAnswer].sort())
      : String(studentAnswer ?? '');
    const normalizedCorrect = Array.isArray(correctAnswer)
      ? JSON.stringify([...correctAnswer].sort())
      : String(correctAnswer ?? '');

    if (normalizedStudent === normalizedCorrect) totalCorrect++;
  }

  const scorePercentage = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
    : 0;

  return {
    totalQuestions,
    totalCorrect,
    scorePercentage,
    passed: totalQuestions > 0 ? scorePercentage >= passingScore : true,
  };
}

/**
 * Recursively remove all correctAnswer and metadata properties from survey JSON
 * @param {object|array} obj - Survey JSON (mutated in place)
 * @returns {object|array}
 */
export function stripSensitiveData(obj) {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) stripSensitiveData(item);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    delete obj.correctAnswer;
    delete obj.metadata;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) stripSensitiveData(value);
    }
  }
  return obj;
}
```

Create `lib/services/randomization.js`:
```javascript
/**
 * Assessment Randomization Service
 * Shuffles questions and answer choices per student
 */

import crypto from 'crypto';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Randomize an assessment's questions and choices
 * @param {object} surveyJson - The full SurveyJS JSON
 * @param {{ randomizeQuestions?: boolean, randomizeChoices?: boolean }} options
 * @returns {{ surveyJson: object, questionOrder: string[] }}
 */
export function randomizeAssessment(surveyJson, options = {}) {
  const { randomizeQuestions = true, randomizeChoices = true } = options;

  // Collect all elements with correctAnswer (scorable questions)
  const allElements = [];
  for (const page of surveyJson.pages || []) {
    for (const element of page.elements || []) {
      if ('correctAnswer' in element) {
        allElements.push({ ...element });
      }
    }
  }

  const orderedElements = randomizeQuestions ? shuffle(allElements) : [...allElements];
  const questionOrder = orderedElements.map((el) => el.name);

  const finalElements = orderedElements.map((el) => {
    if (randomizeChoices && Array.isArray(el.choices)) {
      return { ...el, choices: shuffle(el.choices) };
    }
    return el;
  });

  const randomizedJson = {
    ...surveyJson,
    pages: [{ name: 'assessment', elements: finalElements }],
  };

  return { surveyJson: randomizedJson, questionOrder };
}
```

Create `lib/services/csv-import.js`:
```javascript
/**
 * CSV Import Service
 * Parses CSV files and converts to SurveyJS JSON format
 *
 * Expected CSV columns:
 * Chapter, Question Code, Question, Question Choice, Answer 1-6, Correct Answer,
 * Difficulty Level, Category, Sub Topics, Explanation, Page Number
 */

import { parse } from 'csv-parse/sync';

/**
 * Parse a CSV string and convert to SurveyJS JSON
 * @param {string} csvContent - Raw CSV content
 * @returns {{ surveyJson: object, questionCount: number }}
 */
export function parseCsvToSurveyJson(csvContent) {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  const elements = [];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (const row of records) {
    const questionCode = row['Question Code']?.trim();
    const questionText = row['Question']?.trim();
    const questionChoice = row['Question Choice']?.trim() || 'Single';

    if (!questionCode || !questionText) continue;

    // Build choices from Answer 1-6 columns
    const choices = [];
    for (let i = 1; i <= 6; i++) {
      const answerText = row[`Answer ${i}`]?.trim();
      if (answerText) {
        choices.push({ value: letters[i - 1], text: answerText });
      }
    }

    const correctAnswer = row['Correct Answer']?.trim();
    const difficulty = parseInt(row['Difficulty Level']) || null;

    const element = {
      type: questionChoice.toLowerCase() === 'multiple' ? 'checkbox' : 'radiogroup',
      name: questionCode,
      title: questionText,
      isRequired: true,
      choices,
      correctAnswer:
        questionChoice.toLowerCase() === 'multiple'
          ? correctAnswer?.split(',').map((a) => a.trim())
          : correctAnswer,
      metadata: {
        chapter: row['Chapter']?.trim() || null,
        questionCode,
        difficulty,
        category: row['Category']?.trim() || null,
        subTopics: row['Sub Topics']?.trim() || null,
        explanation: row['Explanation']?.trim() || null,
        pageNumber: row['Page Number']?.trim() || null,
      },
    };

    elements.push(element);
  }

  // Group by chapter for pages
  const chapterMap = new Map();
  for (const el of elements) {
    const chapter = el.metadata?.chapter || 'Questions';
    if (!chapterMap.has(chapter)) chapterMap.set(chapter, []);
    chapterMap.get(chapter).push(el);
  }

  const pages = [];
  for (const [chapter, chapterElements] of chapterMap) {
    pages.push({
      name: chapter.replace(/\s+/g, '_').toLowerCase(),
      title: chapter,
      elements: chapterElements,
    });
  }

  return {
    surveyJson: { pages },
    questionCount: elements.length,
  };
}
```

Create `lib/services/item-analysis.js`:
```javascript
/**
 * Item Analysis Service
 * Computes per-question statistics including point-biserial discrimination index (rpb)
 *
 * Point-biserial formula:
 *   rpb = (M1 - M0) / S * sqrt(p * q)
 *   M1 = mean total score of students who got the item RIGHT
 *   M0 = mean total score of students who got the item WRONG
 *   S  = standard deviation of ALL total scores
 *   p  = proportion who got it right
 *   q  = 1 - p
 *
 * Interpretation: >0.3 = good, 0.2-0.3 = acceptable, <0.2 = weak discriminator
 */

function normalizeAnswer(val) {
  if (Array.isArray(val)) return JSON.stringify([...val].sort());
  return String(val ?? '');
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const squaredDiffs = arr.map((x) => (x - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

/**
 * Compute item analysis for an assessment
 * @param {object} originalSurveyJson - Full SurveyJS JSON with correctAnswer + metadata
 * @param {Array<{ responseData: object }>} responses - Array of response records
 * @returns {{ totalResponses, totalQuestions, averageScore, questions: QuestionAnalysis[] }}
 */
export function computeItemAnalysis(originalSurveyJson, responses) {
  if (!responses.length) {
    return { totalResponses: 0, totalQuestions: 0, averageScore: 0, questions: [] };
  }

  // Collect scorable questions
  const questions = [];
  for (const page of originalSurveyJson.pages || []) {
    for (const element of page.elements || []) {
      if ('correctAnswer' in element) questions.push(element);
    }
  }

  if (!questions.length) {
    return { totalResponses: responses.length, totalQuestions: 0, averageScore: 0, questions: [] };
  }

  // Compute total correct for each student (needed for PBS)
  const studentScores = responses.map((r) => {
    let correct = 0;
    for (const q of questions) {
      const answer = r.responseData?.[q.name];
      if (normalizeAnswer(answer) === normalizeAnswer(q.correctAnswer)) correct++;
    }
    return { responseData: r.responseData || {}, totalCorrect: correct };
  });

  const totalScores = studentScores.map((s) => s.totalCorrect);
  const sdTotal = standardDeviation(totalScores);

  // Per-question analysis
  const questionAnalyses = questions.map((q) => {
    const choices = q.choices || [];

    // Initialize choice counts
    const choiceCounts = {};
    for (const c of choices) {
      const val = typeof c === 'object' ? c.value : c;
      choiceCounts[val] = 0;
    }

    let correctCount = 0;
    const scoresCorrect = [];
    const scoresIncorrect = [];

    for (const student of studentScores) {
      const answer = student.responseData[q.name];
      const answerStr = typeof answer === 'string' ? answer : String(answer ?? '');

      if (choiceCounts[answerStr] !== undefined) {
        choiceCounts[answerStr]++;
      }

      if (normalizeAnswer(answer) === normalizeAnswer(q.correctAnswer)) {
        correctCount++;
        scoresCorrect.push(student.totalCorrect);
      } else {
        scoresIncorrect.push(student.totalCorrect);
      }
    }

    // Point-biserial discrimination index
    const p = responses.length > 0 ? correctCount / responses.length : 0;
    const qVal = 1 - p;
    const M1 = mean(scoresCorrect);
    const M0 = mean(scoresIncorrect);

    let rpb = 0;
    if (sdTotal > 0 && p > 0 && p < 1) {
      rpb = ((M1 - M0) / sdTotal) * Math.sqrt(p * qVal);
    }

    return {
      questionName: q.name,
      questionTitle: q.title || q.name,
      questionCode: q.metadata?.questionCode || q.name,
      chapter: q.metadata?.chapter || null,
      difficulty: q.metadata?.difficulty || null,
      totalResponses: responses.length,
      correctAnswer: String(q.correctAnswer),
      percentCorrect:
        responses.length > 0
          ? Math.round((correctCount / responses.length) * 10000) / 100
          : 0,
      choiceDistribution: choices.map((c) => {
        const val = typeof c === 'object' ? c.value : c;
        const text = typeof c === 'object' ? c.text : c;
        return {
          value: val,
          text,
          count: choiceCounts[val] || 0,
          percent:
            responses.length > 0
              ? Math.round(((choiceCounts[val] || 0) / responses.length) * 10000) / 100
              : 0,
        };
      }),
      pointBiserial: Math.round(rpb * 1000) / 1000,
    };
  });

  const avgScore =
    responses.length > 0
      ? Math.round(
          (totalScores.reduce((a, b) => a + b, 0) / responses.length / questions.length) * 10000,
        ) / 100
      : 0;

  return {
    totalResponses: responses.length,
    totalQuestions: questions.length,
    averageScore: avgScore,
    questions: questionAnalyses,
  };
}
```

### Step 9: Update app.js — add route registrations

Read the current `app.js` and make these changes:

Add these imports after the existing route imports (after `import authRoutes from './routes/auth.js';`):
```javascript
import assessmentRoutes from './routes/assessments.js';
import publicRoutes from './routes/public.js';
import studentAuthRoutes from './routes/student-auth.js';
```

Uncomment the generalLimiter import:
```javascript
import { authLimiter, generalLimiter } from './middleware/rate-limiter.js';
```

Replace the `// TODO: Add your routes here` block with:
```javascript
app.use('/api/assessments', generalLimiter, requireAuth, assessmentRoutes);
app.use('/api/public', generalLimiter, publicRoutes);
app.use('/api/student', authLimiter, studentAuthRoutes);
```

Add the requireAuth import at the top with other imports:
```javascript
import { requireAuth } from './lib/auth.js';
```

Also update the CORS_ORIGINS default to port 9000:
```javascript
const ALLOWED_ORIGINS = new Set((process.env.CORS_ORIGINS || 'http://localhost:9000').split(','));
```

### Step 10: Create stub route files

Create `routes/assessments.js`:
```javascript
import { Router } from 'express';
const router = Router();

// TODO: Implement in Task 2
router.get('/', (req, res) => res.json({ success: true, data: [] }));

export default router;
```

Create `routes/public.js`:
```javascript
import { Router } from 'express';
const router = Router();

// TODO: Implement in Task 3
router.get('/assessment/:hash', (req, res) => res.json({ success: true, data: null }));

export default router;
```

Create `routes/student-auth.js`:
```javascript
import { Router } from 'express';
const router = Router();

// TODO: Implement in Task 3
router.post('/login', (req, res) => res.json({ success: true, data: null }));

export default router;
```

### Step 11: Create frontend files

Create `app/src/lib/surveyjs-license.ts`:
```typescript
import { slk } from 'survey-core';

let initialized = false;

export function initializeSurveyJS(): void {
  if (initialized) return;
  slk('MmIyOTlhZGQtZDYzZi00OWI1LThlNDktNDUwNGU0ZGVlMGZhOzE9MjAyNy0wMi0wNiwyPTIwMjctMDItMDYsND0yMDI3LTAyLTA2');
  initialized = true;
}
```

Create `app/src/lib/student-auth.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StudentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
}

interface StudentAuthState {
  student: StudentUser | null;
  login: (student: StudentUser) => void;
  logout: () => void;
}

export const useStudentAuthStore = create<StudentAuthState>()(
  persist(
    (set) => ({
      student: null,
      login: (student) => set({ student }),
      logout: () => {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/student/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});
        set({ student: null });
      },
    }),
    { name: 'student-auth-storage' },
  ),
);

export const useIsStudentAuthenticated = () => useStudentAuthStore((s) => !!s.student);
```

Create `app/src/types/api.ts`:
```typescript
// Assessment types
export interface Assessment {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed';
  publicHash: string;
  resultsReleased: boolean;
  passingScore?: number;
  timeLimitMinutes?: number;
  randomizeQuestions: boolean;
  randomizeChoices: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { responses: number };
}

export interface AssessmentDetail extends Assessment {
  surveyJson: SurveyJson;
}

export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  studentEmail: string;
  studentName: string;
  totalQuestions?: number;
  totalCorrect?: number;
  scorePercentage?: string;
  passed?: boolean;
  timeTaken?: number;
  startedAt: string;
  completedAt?: string;
}

export interface QuestionAnalysis {
  questionName: string;
  questionTitle: string;
  questionCode: string;
  chapter?: string;
  difficulty?: number;
  totalResponses: number;
  correctAnswer: string;
  percentCorrect: number;
  choiceDistribution: ChoiceDistribution[];
  pointBiserial: number;
}

export interface ChoiceDistribution {
  value: string;
  text: string;
  count: number;
  percent: number;
}

export interface ItemAnalysisResult {
  totalResponses: number;
  totalQuestions: number;
  averageScore: number;
  questions: QuestionAnalysis[];
}

// SurveyJS types
export interface SurveyJson {
  pages?: SurveyPage[];
  showTimer?: boolean;
  timeLimit?: number;
  [key: string]: unknown;
}

export interface SurveyPage {
  name?: string;
  title?: string;
  description?: string;
  elements?: SurveyElement[];
}

export interface SurveyElement {
  type: string;
  name: string;
  title?: string;
  description?: string;
  isRequired?: boolean;
  choices?: SurveyChoice[];
  correctAnswer?: string | string[];
  metadata?: QuestionMetadata;
  html?: string;
  rows?: SurveyChoice[];
  columns?: SurveyChoice[];
  rateMax?: number;
  [key: string]: unknown;
}

export type SurveyChoice = string | { value: string; text: string };

export interface QuestionMetadata {
  chapter?: string;
  questionCode?: string;
  difficulty?: number;
  category?: string;
  subTopics?: string;
  explanation?: string;
  pageNumber?: string;
}

// QR Code
export interface QrCodeData {
  url: string;
  qrCode: string;
}

// Public assessment
export interface PublicAssessmentInfo {
  id: string;
  title: string;
  description?: string;
  questionCount: number;
  timeLimitMinutes?: number;
}

export interface AssessmentSubmitResult {
  responseId: string;
  totalQuestions?: number;
  totalCorrect?: number;
  scorePercentage?: string;
  passed?: boolean;
}

// Student review
export interface ReviewQuestion {
  questionName: string;
  questionTitle: string;
  choices: { value: string; text: string }[];
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  pageNumber?: string;
}

export interface AssessmentReviewData {
  assessment: { title: string; description?: string };
  totalQuestions: number;
  totalCorrect: number;
  scorePercentage: string;
  questions: ReviewQuestion[];
}
```

Create stub hook files.

`app/src/hooks/useAssessments.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type {
  Assessment,
  AssessmentDetail,
  AssessmentResponse,
  ItemAnalysisResult,
  QrCodeData,
} from '../types/api';

export function useAssessments() {
  return useQuery({
    queryKey: ['assessments'],
    queryFn: async () => ensureSuccess(await api.get<Assessment[]>('/api/assessments')),
  });
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: ['assessments', id],
    queryFn: async () => ensureSuccess(await api.get<AssessmentDetail>(`/api/assessments/${id}`)),
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; surveyJson?: string; passingScore?: number; timeLimitMinutes?: number; randomizeQuestions?: boolean; randomizeChoices?: boolean }) =>
      ensureSuccess(await api.post<Assessment>('/api/assessments', data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessments'] }),
  });
}

export function useUpdateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; surveyJson?: string; passingScore?: number; timeLimitMinutes?: number; resultsReleased?: boolean; randomizeQuestions?: boolean; randomizeChoices?: boolean }) =>
      ensureSuccess(await api.put<Assessment>(`/api/assessments/${id}`, data)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['assessments', vars.id] });
    },
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await api.delete<void>(`/api/assessments/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessments'] }),
  });
}

export function usePublishAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await api.post<Assessment>(`/api/assessments/${id}/publish`)),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['assessments', id] });
    },
  });
}

export function useCloseAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await api.post<Assessment>(`/api/assessments/${id}/close`)),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['assessments', id] });
    },
  });
}

export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, csvContent }: { id: string; csvContent: string }) =>
      ensureSuccess(await api.post<{ questionCount: number }>(`/api/assessments/${id}/import-csv`, { csvContent })),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assessments', vars.id] });
    },
  });
}

export function useAssessmentQrCode(id: string) {
  return useQuery({
    queryKey: ['assessments', id, 'qr-code'],
    queryFn: async () => ensureSuccess(await api.get<QrCodeData>(`/api/assessments/${id}/qr-code`)),
    enabled: !!id,
  });
}

export function useAssessmentResponses(id: string) {
  return useQuery({
    queryKey: ['assessments', id, 'responses'],
    queryFn: async () => ensureSuccess(await api.get<AssessmentResponse[]>(`/api/assessments/${id}/responses`)),
    enabled: !!id,
  });
}

export function useItemAnalysis(id: string) {
  return useQuery({
    queryKey: ['assessments', id, 'item-analysis'],
    queryFn: async () => ensureSuccess(await api.get<ItemAnalysisResult>(`/api/assessments/${id}/item-analysis`)),
    enabled: !!id,
  });
}

export function useReleaseResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, released }: { id: string; released: boolean }) =>
      ensureSuccess(await api.put<Assessment>(`/api/assessments/${id}/release-results`, { released })),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assessments', vars.id] });
    },
  });
}
```

`app/src/hooks/usePublic.ts`:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type { PublicAssessmentInfo, AssessmentSubmitResult } from '../types/api';

export function usePublicAssessment(hash: string) {
  return useQuery({
    queryKey: ['public-assessment', hash],
    queryFn: async () => ensureSuccess(await api.get<PublicAssessmentInfo & { surveyJson: unknown }>(`/api/public/assessment/${hash}`)),
    enabled: !!hash,
  });
}

export function useStartAssessment(hash: string) {
  return useMutation({
    mutationFn: async (data: { studentName: string; studentEmail: string }) =>
      ensureSuccess(await api.post<{ surveyJson: unknown; questionOrder: string[]; responseId: string }>(`/api/public/assessment/${hash}/start`, data)),
  });
}

export function useSubmitAssessment(hash: string) {
  return useMutation({
    mutationFn: async (data: { responseId: string; responseData: Record<string, unknown>; timeTaken?: number }) =>
      ensureSuccess(await api.post<AssessmentSubmitResult>(`/api/public/assessment/${hash}/submit`, data)),
  });
}
```

`app/src/hooks/useStudentAuth.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import { useStudentAuthStore, type StudentUser } from '../lib/student-auth';
import type { AssessmentReviewData } from '../types/api';

export function useStudentLogin() {
  const login = useStudentAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const result = ensureSuccess(await api.post<{ student: StudentUser }>('/api/student/login', data));
      login(result.student);
      return result;
    },
  });
}

export function useStudentRegister() {
  const login = useStudentAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const result = ensureSuccess(await api.post<{ student: StudentUser }>('/api/student/register', data));
      login(result.student);
      return result;
    },
  });
}

export function useStudentAssessments() {
  return useQuery({
    queryKey: ['student-assessments'],
    queryFn: async () => ensureSuccess(await api.get<Array<{ id: string; assessmentTitle: string; scorePercentage?: string; passed?: boolean; completedAt?: string; resultsReleased: boolean }>>('/api/student/assessments')),
  });
}

export function useAssessmentReview(responseId: string) {
  return useQuery({
    queryKey: ['student-review', responseId],
    queryFn: async () => ensureSuccess(await api.get<AssessmentReviewData>(`/api/student/assessments/${responseId}/review`)),
    enabled: !!responseId,
  });
}
```

### Step 12: Create stub page files

Create these directories:
```bash
mkdir -p app/src/pages/admin app/src/pages/public app/src/pages/student
```

Create each stub file with a minimal default export. Example pattern for each:

`app/src/pages/admin/AssessmentList.tsx`:
```tsx
export default function AssessmentList() {
  return <div className="p-8">Assessment List — TODO</div>;
}
```

Create the same pattern for:
- `app/src/pages/admin/AssessmentCreate.tsx` → `AssessmentCreate`
- `app/src/pages/admin/AssessmentDetail.tsx` → `AssessmentDetail`
- `app/src/pages/admin/QrPresenter.tsx` → `QrPresenter`
- `app/src/pages/public/TakeAssessment.tsx` → `TakeAssessment`
- `app/src/pages/public/CreateAccount.tsx` → `CreateAccount`
- `app/src/pages/student/StudentLogin.tsx` → `StudentLogin`
- `app/src/pages/student/StudentDashboard.tsx` → `StudentDashboard`
- `app/src/pages/student/AssessmentReview.tsx` → `AssessmentReview`

Create stub `app/src/components/SurveyEditor.tsx`:
```tsx
import { forwardRef, useImperativeHandle } from 'react';

export interface SurveyEditorRef {
  getJson: () => string | null;
}

interface SurveyEditorProps {
  initialJson?: string;
  onSave: (json: string) => void;
}

const SurveyEditor = forwardRef<SurveyEditorRef, SurveyEditorProps>(
  ({ initialJson, onSave }, ref) => {
    useImperativeHandle(ref, () => ({
      getJson: () => initialJson || null,
    }), [initialJson]);

    return <div className="p-4 border rounded">SurveyEditor — TODO</div>;
  },
);

SurveyEditor.displayName = 'SurveyEditor';
export default SurveyEditor;
```

### Step 13: Rewrite App.tsx with all routes

Replace `app/src/App.tsx` with:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from './lib/auth';
import { useIsStudentAuthenticated } from './lib/student-auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssessmentList from './pages/admin/AssessmentList';
import AssessmentCreate from './pages/admin/AssessmentCreate';
import AssessmentDetail from './pages/admin/AssessmentDetail';
import QrPresenter from './pages/admin/QrPresenter';
import TakeAssessment from './pages/public/TakeAssessment';
import CreateAccount from './pages/public/CreateAccount';
import StudentLogin from './pages/student/StudentLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import AssessmentReview from './pages/student/AssessmentReview';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function StudentProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsStudentAuthenticated();
  if (!isAuthenticated) return <Navigate to="/student/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Admin routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/assessments" element={<ProtectedRoute><AssessmentList /></ProtectedRoute>} />
      <Route path="/assessments/new" element={<ProtectedRoute><AssessmentCreate /></ProtectedRoute>} />
      <Route path="/assessments/:id" element={<ProtectedRoute><AssessmentDetail /></ProtectedRoute>} />
      <Route path="/assessments/:id/present" element={<ProtectedRoute><QrPresenter /></ProtectedRoute>} />

      {/* Public routes (no auth) */}
      <Route path="/take/:hash" element={<TakeAssessment />} />
      <Route path="/create-account" element={<CreateAccount />} />

      {/* Student routes */}
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student" element={<StudentProtectedRoute><StudentDashboard /></StudentProtectedRoute>} />
      <Route path="/student/review/:responseId" element={<StudentProtectedRoute><AssessmentReview /></StudentProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

### Step 14: Initialize git, database, and verify

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst
git init
```

Create the database and push schema:
```bash
PGPASSWORD=mededprep_dev createdb -h localhost -U mededprep mededprep_inst 2>/dev/null || true
npm run db:push
npm run db:seed
```

Verify everything compiles:
```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app
npx tsc --noEmit
npx vite build
```

If there are TypeScript errors, fix them. Common issues:
- Missing type imports
- Mismatched function signatures
- Path alias issues

Then commit:
```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst
git add -A
git commit -m "Initial scaffold from mededprep-template

Configured for Instructor Tools product:
- Prisma schema: Assessment, AssessmentResponse, Student (nullable password)
- Backend services: quiz-scoring, randomization, CSV import, item analysis (PBS)
- Frontend: All routes, stub pages, hooks, SurveyJS license, types
- Ports: 9001 backend, 9000 frontend
- Database: mededprep_inst"
```

## What NOT to Do

- Do NOT implement real route handlers — only create stubs
- Do NOT implement real page UIs — only create stubs with "TODO" text
- Do NOT delete the samplecsv/ folder
- Do NOT modify files in any other project (mededprep-ce, mededprep-template, etc.)
- Do NOT add extra features, patterns, or abstractions beyond what's specified
- Do NOT create tests (they'll be added later)

## Acceptance Criteria

- [ ] All template files copied and find-replaced correctly
- [ ] Prisma schema has Organization, OrgUser, Student (nullable password), Assessment, AssessmentResponse
- [ ] `npm run db:push` succeeds
- [ ] `npm run db:seed` creates demo org + admin user
- [ ] Backend starts on port 9001 without errors
- [ ] Frontend dev server starts on port 9000
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] All 4 service files exist: quiz-scoring.js, randomization.js, csv-import.js, item-analysis.js
- [ ] app.js registers all 3 route groups (assessments, public, student)
- [ ] App.tsx has all routes (admin, public, student)
- [ ] All stub pages render without errors
- [ ] Git repo initialized with initial commit

## Verification Commands

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst
npm run db:push
npm run db:seed
PORT=9001 timeout 5 node server.js || true  # Should print "server started" then timeout
cd app && npx tsc --noEmit
cd app && npx vite build
git log --oneline -1  # Should show initial commit
```
```

---

### Task 2: Instructor Backend — Assessment CRUD, CSV Import, QR, Results

- **Agent:** Codex
- **Branch:** task-2-instructor-backend
- **Depends on:** Task 1
- **Files to modify:** routes/assessments.js

#### Prompt

```
## Context

You are working on **mededprep-inst**, an instructor assessment tool in the MedEdPrep ecosystem. Tech stack: Express 5, Prisma 5, PostgreSQL. The project is already scaffolded with a full Prisma schema and backend services.

The Prisma schema has these relevant models:
- `Assessment` — id, orgId, createdById, title, description, surveyJson (Json), status (draft/active/closed), publicHash (unique), resultsReleased, passingScore, timeLimitMinutes, randomizeQuestions, randomizeChoices
- `AssessmentResponse` — id, assessmentId, studentId?, studentEmail, studentName, responseData (Json), questionOrder (Json?), totalQuestions, totalCorrect, scorePercentage, passed, timeTaken, startedAt, completedAt

Available services (already created, just import them):
- `lib/services/quiz-scoring.js` — exports `scoreSurveyResponse(surveyJson, responseData, passingScore)` and `stripSensitiveData(obj)`
- `lib/services/csv-import.js` — exports `parseCsvToSurveyJson(csvContent)` returns `{ surveyJson, questionCount }`
- `lib/services/item-analysis.js` — exports `computeItemAnalysis(surveyJson, responses)` returns `{ totalResponses, totalQuestions, averageScore, questions: [{ questionName, questionTitle, questionCode, chapter, difficulty, percentCorrect, choiceDistribution, pointBiserial }] }`

Auth middleware: `req.user` is set by `requireAuth` (already applied in app.js). Access `req.user.id` and `req.orgId`.

Validation: `import { z, validate } from '../lib/validate.js';`
Errors: `import { NotFoundError, ValidationError } from '../lib/errors.js';`
Prisma: `import { prisma } from '../lib/prisma.js';`

API response format: `{ success: true, data }` or `{ success: false, error: { code, message } }`

## Problem

The `routes/assessments.js` file currently has a single placeholder GET route. Replace it with the full instructor-side API.

## Current State

`routes/assessments.js` (the entire file):
```javascript
import { Router } from 'express';
const router = Router();

// TODO: Implement in Task 2
router.get('/', (req, res) => res.json({ success: true, data: [] }));

export default router;
```

## Changes Required

Replace the entire content of `routes/assessments.js` with a full implementation containing these endpoints:

### GET / — List assessments
- Query: `where: { orgId: req.orgId }`, order by `createdAt desc`
- Include `_count: { select: { responses: true } }`
- Return array of assessments with response counts

### POST / — Create assessment
- Validate body: `{ title: z.string().min(1), description: z.string().optional(), surveyJson: z.string().optional(), passingScore: z.number().int().min(0).max(100).optional(), timeLimitMinutes: z.number().int().positive().optional(), randomizeQuestions: z.boolean().optional(), randomizeChoices: z.boolean().optional() }`
- If surveyJson is provided, parse it with JSON.parse (validate it's valid JSON)
- Create with `createdById: req.user.id, orgId: req.orgId`
- If no surveyJson, default to `{ pages: [] }`
- Return the created assessment

### GET /:id — Get assessment detail
- Find by id AND orgId (tenant scoping!)
- Include `_count: { select: { responses: true } }`
- 404 if not found
- Return assessment with surveyJson

### PUT /:id — Update assessment
- Validate body: same fields as POST (all optional)
- Find by id AND orgId, 404 if not found
- Only allow updates if status is 'draft' or only updating resultsReleased/description/title
- If surveyJson provided, JSON.parse to validate
- Return updated assessment

### DELETE /:id — Delete assessment
- Find by id AND orgId, 404 if not found
- Only allow delete if status is 'draft'
- Delete the assessment (cascade will remove responses)
- Return `{ success: true, data: { deleted: true } }`

### POST /:id/publish — Publish assessment
- Find by id AND orgId, 404 if not found
- Validate surveyJson has at least one question with correctAnswer
- Update status to 'active'
- Return updated assessment

### POST /:id/close — Close assessment
- Find by id AND orgId, 404 if not found
- Update status to 'closed'
- Return updated assessment

### POST /:id/import-csv — Import questions from CSV
- Validate body: `{ csvContent: z.string().min(1) }`
- Find assessment by id AND orgId, 404 if not found
- Only allow if status is 'draft'
- Call `parseCsvToSurveyJson(csvContent)` from csv-import service
- Update assessment's surveyJson with the result
- Return `{ questionCount }` from the parser

### GET /:id/qr-code — Generate QR code
- Find assessment by id AND orgId, 404 if not found
- Assessment must be 'active'
- Import `QRCode from 'qrcode'`
- Build URL: dev = `http://localhost:9000/take/${assessment.publicHash}`, prod = `https://${org.subdomain}.mededprep.app/take/${assessment.publicHash}`
- Generate QR with: `QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#000000', light: '#ffffff' } })`
- Return `{ url, qrCode }` (qrCode is the data URL)

### GET /:id/responses — Get all responses
- Find assessment by id AND orgId, 404 if not found
- Query AssessmentResponse where assessmentId, ordered by completedAt desc
- Return array of responses (exclude responseData and questionOrder for the list view — they're large)

### GET /:id/item-analysis — Compute item analysis
- Find assessment by id AND orgId, 404 if not found
- Fetch all responses with responseData included
- Call `computeItemAnalysis(assessment.surveyJson, responses)`
- Return the analysis result (includes per-question PBS numbers)

### PUT /:id/release-results — Toggle results release
- Validate body: `{ released: z.boolean() }`
- Find by id AND orgId, 404 if not found
- Update `resultsReleased` to the value
- Return updated assessment

All endpoints must:
- Scope queries with `orgId: req.orgId`
- Use try/catch with `next(error)` for error handling
- Use the validate middleware for body validation

## What NOT to Do

- Do NOT modify any other file besides routes/assessments.js
- Do NOT add authentication middleware (it's already applied in app.js)
- Do NOT create tests
- Do NOT add pagination (keep it simple for now)
- Do NOT add file upload for CSV — accept the CSV content as a string in the POST body

## Acceptance Criteria

- [ ] All 11 endpoints implemented
- [ ] Every query scoped by `orgId: req.orgId`
- [ ] CSV import calls parseCsvToSurveyJson and updates assessment
- [ ] QR code generation works with qrcode library
- [ ] Item analysis endpoint calls computeItemAnalysis and returns PBS numbers
- [ ] Release results toggle works
- [ ] Proper error handling with try/catch/next
- [ ] Body validation with Zod on all POST/PUT endpoints

## Verification Commands

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst
npm run lint
PORT=9001 timeout 5 node server.js || true  # Should start without errors
```
```

---

### Task 3: Public + Student Backend — Take Assessment, Auth, Review

- **Agent:** Codex
- **Branch:** task-3-public-backend
- **Depends on:** Task 1
- **Files to modify:** routes/public.js, routes/student-auth.js

#### Prompt

```
## Context

You are working on **mededprep-inst**, an instructor assessment tool in the MedEdPrep ecosystem. Tech stack: Express 5, Prisma 5, PostgreSQL. The project is already scaffolded.

The Prisma schema has these relevant models:
- `Assessment` — id, orgId, createdById, title, description, surveyJson (Json), status (draft/active/closed), publicHash (unique), resultsReleased, passingScore, timeLimitMinutes, randomizeQuestions, randomizeChoices
- `AssessmentResponse` — id, assessmentId, studentId?, studentEmail, studentName, responseData (Json), questionOrder (Json?), totalQuestions, totalCorrect, scorePercentage (Decimal), passed, timeTaken, startedAt, completedAt
  - Unique constraint: @@unique([assessmentId, studentEmail])
- `Student` — id, orgId, email, firstName, lastName, password? (nullable), isActive

Available services:
- `lib/services/quiz-scoring.js` — exports `scoreSurveyResponse(surveyJson, responseData, passingScore)` returns `{ totalQuestions, totalCorrect, scorePercentage, passed }`
- `lib/services/quiz-scoring.js` — exports `stripSensitiveData(obj)` removes correctAnswer and metadata from survey JSON
- `lib/services/randomization.js` — exports `randomizeAssessment(surveyJson, { randomizeQuestions, randomizeChoices })` returns `{ surveyJson, questionOrder }`

Auth: `import { generateStudentToken, setAuthCookie, clearAuthCookie, verifyToken, requireStudentAuth } from '../lib/auth.js';`
Validation: `import { z, validate } from '../lib/validate.js';`
Errors: `import { NotFoundError, ValidationError, UnauthorizedError } from '../lib/errors.js';`
Prisma: `import { prisma } from '../lib/prisma.js';`
Bcrypt: `import bcrypt from 'bcrypt';`

API response format: `{ success: true, data }` or `{ success: false, error: { code, message } }`

Public routes have NO auth middleware. Student routes need `requireStudentAuth` applied per-route.

## Problem

Replace the placeholder routes in `routes/public.js` and `routes/student-auth.js` with full implementations.

## Current State

`routes/public.js`:
```javascript
import { Router } from 'express';
const router = Router();
router.get('/assessment/:hash', (req, res) => res.json({ success: true, data: null }));
export default router;
```

`routes/student-auth.js`:
```javascript
import { Router } from 'express';
const router = Router();
router.post('/login', (req, res) => res.json({ success: true, data: null }));
export default router;
```

## Changes Required

### FILE 1: routes/public.js

Replace entirely. These are public (no auth) endpoints for students taking assessments.

#### GET /assessment/:hash — Get assessment info
- Find assessment by `publicHash: req.params.hash` AND `orgId: req.orgId` AND `status: 'active'`
- 404 if not found
- Return: `{ id, title, description, timeLimitMinutes, questionCount }` where questionCount is the number of elements with correctAnswer in surveyJson
- Do NOT return surveyJson yet (that happens on /start)

#### POST /assessment/:hash/start — Start assessment
- Validate body: `{ studentName: z.string().min(1), studentEmail: z.string().email() }`
- Find assessment by publicHash AND orgId AND status 'active'
- 404 if not found
- Check for existing response: `findFirst where { assessmentId, studentEmail }`. If exists AND completedAt is set, return error "You have already completed this assessment"
- If exists but not completed, return the existing randomized survey (re-fetch from the response's questionOrder)
- Find or create Student record: `upsert` by `orgId_email` — create with null password if new
- Randomize the assessment: call `randomizeAssessment(assessment.surveyJson, { randomizeQuestions: assessment.randomizeQuestions, randomizeChoices: assessment.randomizeChoices })`
- Strip sensitive data (correctAnswer, metadata) from the randomized JSON before sending to client
- Create AssessmentResponse record with `studentId: student.id, studentEmail, studentName, questionOrder, startedAt: new Date()`
- Inject timer if configured: if `assessment.timeLimitMinutes`, set `surveyJson.showTimer = true; surveyJson.timeLimit = assessment.timeLimitMinutes * 60`
- Return `{ responseId, surveyJson (stripped), questionOrder }`

#### POST /assessment/:hash/submit — Submit response
- Validate body: `{ responseId: z.string(), responseData: z.record(z.string(), z.unknown()), timeTaken: z.number().int().optional() }`
- Find the AssessmentResponse by id, include assessment
- Verify `assessment.publicHash` matches `:hash` and `assessment.orgId === req.orgId`
- 404 if not found, error if already completed
- Score the response: `scoreSurveyResponse(assessment.surveyJson, responseData, assessment.passingScore || 70)`
- Update the response: set `responseData, completedAt: new Date(), timeTaken, totalQuestions, totalCorrect, scorePercentage, passed`
- Return `{ responseId, totalQuestions, totalCorrect, scorePercentage, passed }`

### FILE 2: routes/student-auth.js

Replace entirely. Mix of public and authenticated endpoints.

#### POST /register — Create student account (public)
- Validate body: `{ email: z.string().email(), password: z.string().min(6), firstName: z.string().min(1), lastName: z.string().min(1) }`
- Find existing student by `orgId_email`
- If exists AND already has a password, return error "Account already exists. Please log in."
- If exists but no password, update: set `password: await bcrypt.hash(password, 12), firstName, lastName`
- If doesn't exist, create new student with hashed password
- Link any existing AssessmentResponses: `updateMany where { studentEmail: email, orgId: req.orgId, studentId: null } set { studentId: student.id }`
- Generate token: `generateStudentToken(student)`, set cookie: `setAuthCookie(res, 'student-token', token)`
- Return `{ student: { id, email, firstName, lastName, orgId } }`

#### POST /login — Student login (public)
- Validate body: `{ email: z.string().email(), password: z.string() }`
- Find student by `orgId_email`
- If not found or no password set, return 401 "Invalid credentials"
- Compare password with bcrypt
- Generate token, set cookie
- Return `{ student: { id, email, firstName, lastName, orgId } }`

#### POST /logout — Student logout (public)
- `clearAuthCookie(res, 'student-token')`
- Return `{ success: true, data: { loggedOut: true } }`

#### GET /me — Get current student (requires auth)
- Apply `requireStudentAuth` middleware
- Return `{ student: req.student }`

#### GET /assessments — List past assessments (requires auth)
- Apply `requireStudentAuth` middleware
- Find all AssessmentResponses where `studentId: req.student.id` AND `completedAt IS NOT NULL`
- Include assessment: `select { title, resultsReleased }`
- Return array: `{ id, assessmentTitle, scorePercentage, passed, completedAt, resultsReleased }`

#### GET /assessments/:id/review — Get assessment review (requires auth)
- Apply `requireStudentAuth` middleware
- Find AssessmentResponse by id where `studentId: req.student.id`
- 404 if not found
- Include the assessment
- If `assessment.resultsReleased` is false, return error "Results have not been released yet"
- Build review data: for each question in the ORIGINAL surveyJson that has correctAnswer:
  - Get the student's answer from responseData
  - Get the correct answer
  - Get explanation and pageNumber from metadata
  - Determine if correct
- Return: `{ assessment: { title, description }, totalQuestions, totalCorrect, scorePercentage, questions: [{ questionName, questionTitle, choices (value+text only), studentAnswer, correctAnswer, isCorrect, explanation, pageNumber }] }`

## What NOT to Do

- Do NOT modify any file besides routes/public.js and routes/student-auth.js
- Do NOT add rate limiting (already configured in app.js)
- Do NOT add tenant resolver (already in middleware chain)
- Do NOT create tests
- Do NOT add file upload functionality
- Do NOT add attendance check-in/check-out (will be added later)

## Acceptance Criteria

- [ ] Public assessment flow works: get info → start (randomize) → submit (score)
- [ ] Randomization uses the randomizeAssessment service
- [ ] Sensitive data (correctAnswer, metadata) stripped before sending to student
- [ ] Student register links existing responses to the new account
- [ ] Student login with bcrypt password comparison
- [ ] Student can view past assessments and review (when released) with explanations
- [ ] All queries scoped by `orgId: req.orgId`
- [ ] Proper error handling with try/catch/next

## Verification Commands

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst
npm run lint
PORT=9001 timeout 5 node server.js || true
```
```

---

### Task 4: Instructor Frontend — Assessment Management, QR, Results Dashboard

- **Agent:** Claude Sonnet
- **Branch:** task-4-instructor-frontend
- **Depends on:** Task 1
- **Files to modify:** app/src/pages/admin/AssessmentList.tsx, app/src/pages/admin/AssessmentCreate.tsx, app/src/pages/admin/AssessmentDetail.tsx, app/src/pages/admin/QrPresenter.tsx, app/src/components/SurveyEditor.tsx, app/src/pages/Dashboard.tsx

#### Prompt

```
## Context

You are building the instructor-facing frontend for **mededprep-inst**, an assessment tool. Tech stack: React 19, TypeScript, TanStack Query v5, shadcn/ui, Tailwind, Zustand, SurveyJS Creator.

The project is fully scaffolded. You have access to:
- **Hooks** at `app/src/hooks/useAssessments.ts` — already implemented with: useAssessments, useAssessment, useCreateAssessment, useUpdateAssessment, useDeleteAssessment, usePublishAssessment, useCloseAssessment, useImportCsv, useAssessmentQrCode, useAssessmentResponses, useItemAnalysis, useReleaseResults
- **Types** at `app/src/types/api.ts` — Assessment, AssessmentDetail, AssessmentResponse, QuestionAnalysis, ItemAnalysisResult, QrCodeData, etc.
- **API client** at `app/src/lib/api.ts` — `api.get/post/put/delete`, `ensureSuccess`, `getFieldErrors`, `ApiError`
- **Auth store** at `app/src/lib/auth.ts` — `useAuthStore`, `useIsAuthenticated`
- **SurveyJS license** at `app/src/lib/surveyjs-license.ts` — `initializeSurveyJS()`
- **shadcn/ui components** in `app/src/components/ui/` — button, card, input, label, badge, tabs, table, separator, dialog, skeleton, select, dropdown-menu, textarea, alert
- **Routing** already set up in App.tsx:
  - `/assessments` → AssessmentList
  - `/assessments/new` → AssessmentCreate
  - `/assessments/:id` → AssessmentDetail
  - `/assessments/:id/present` → QrPresenter

Brand color: `#1b5fd0`. Use `sonner` for toast notifications. Use `lucide-react` for icons. Use `react-router-dom` for navigation.

## Problem

The stub pages need to be replaced with full implementations. The instructor needs to:
1. See a list of assessments
2. Create new assessments (with SurveyJS Creator or CSV import)
3. View assessment details (QR code, responses, item analysis with PBS)
4. Present a full-screen QR code for students to scan
5. Release/lock results

## Changes Required

### FILE 1: app/src/components/SurveyEditor.tsx

Replace the stub with a real SurveyJS Creator wrapper. Model it after this pattern:

```tsx
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-react';
import { initializeSurveyJS } from '../lib/surveyjs-license';
import 'survey-core/survey-core.min.css';
import 'survey-creator-core/survey-creator-core.min.css';

// ... (same pattern as CE's SurveyEditor — forwardRef, SurveyCreator options, save callback, getJson imperative handle)
```

Key settings for the Creator:
- showSidebar: false
- showJSONEditorTab: true
- showLogicTab: false
- showThemeTab: false
- showSaveButton: true
- autoSaveEnabled: true
- expandCollapseButtonVisibility: 'never'

Include the amber tip about marking correct answers: "To mark correct answers: Select a question → find 'Correct Answer' in the right sidebar under 'General'."

### FILE 2: app/src/pages/admin/AssessmentList.tsx

Full assessment list page:
- Header: "Assessments" title + "Create Assessment" button (links to /assessments/new)
- Table with columns: Title, Status (badge: draft=outline, active=default, closed=secondary), Questions (count from surveyJson), Responses (from _count), Created, Actions
- Status badges with color coding
- Click row to navigate to /assessments/:id
- Empty state if no assessments
- Use the useAssessments() hook

### FILE 3: app/src/pages/admin/AssessmentCreate.tsx

Assessment creation page:
- Form fields: Title (required), Description (optional), Passing Score (number, default 70), Time Limit in minutes (optional)
- Checkboxes: Randomize Questions (default true), Randomize Choices (default true)
- Two tabs for question input:
  - **Tab 1: "Survey Builder"** — SurveyJS Creator component (the SurveyEditor)
  - **Tab 2: "CSV Import"** — textarea to paste CSV content + "Import" button. Show a sample format hint. On import, call useImportCsv() but FIRST create the assessment (since import needs an assessment ID). Flow: user fills title → clicks "Create & Import" → creates assessment → imports CSV → navigates to detail page
- "Create Assessment" button at bottom
- On success, navigate to /assessments/:id
- Use useCreateAssessment() and useImportCsv() hooks

### FILE 4: app/src/pages/admin/AssessmentDetail.tsx

Tabbed detail page for an assessment:
- Header: Assessment title + status badge + action buttons
- Action buttons based on status:
  - draft: "Publish" button, "Delete" button
  - active: "Close" button, "Present QR" button (links to /assessments/:id/present)
  - closed: "Release Results" toggle
- All statuses: "Release Results" toggle switch (if there are responses)

**Tab: "Overview"**
- Title, description, settings (passing score, time limit, randomization)
- Question count
- If active: show the public URL for sharing
- Edit button (only if draft) — could inline edit or navigate

**Tab: "QR Code"** (only if active)
- Display the QR code large (300x300) with the URL below
- "Present Full Screen" button → navigates to /assessments/:id/present
- "Copy Link" button
- Print button (opens new window with QR for printing)

**Tab: "Responses"** (always visible)
- Table: Student Name, Email, Score, Passed (badge), Time Taken, Completed At
- If no responses, show empty state
- Use useAssessmentResponses() hook

**Tab: "Item Analysis"** (only if responses exist)
- Summary: Total Responses, Average Score, Total Questions
- Table with one row per question:
  - Question Code, Question (truncated), % Correct, Point-Biserial (rpb number, 3 decimal places)
  - Color code PBS: green (>0.3), yellow (0.2-0.3), red (<0.2)
- Expandable row detail showing:
  - Full question text
  - Choice distribution: bar chart or simple bars showing % per choice
  - Highlight the correct answer
  - Difficulty level, chapter
- Use useItemAnalysis() hook
- Consider using recharts for simple bar charts for choice distribution

### FILE 5: app/src/pages/admin/QrPresenter.tsx

Full-screen QR code presenter page:
- Dark background, centered white card
- Assessment title at top
- Very large QR code (fills most of the screen, 400-500px)
- URL displayed below QR
- "Scan to join" instruction text
- Number of responses counter (live, refetch every 5 seconds) showing "X students joined"
- ESC or click "Exit" button to go back
- Use useAssessmentQrCode() hook
- Use useAssessmentResponses() with refetchInterval for live count
- Make it look professional for projecting on screen

### FILE 6: app/src/pages/Dashboard.tsx

Update the existing Dashboard to be an instructor home page:
- Keep the existing user/org info
- Add a quick link card to "Assessments" with count
- Make it a useful landing page

## What NOT to Do

- Do NOT modify App.tsx (routing is already set up)
- Do NOT modify hooks or types files (they're already complete)
- Do NOT modify any backend files
- Do NOT add new shadcn/ui components — use only what's installed
- Do NOT create new hook files
- Do NOT add student-facing pages (that's Task 5)
- Do NOT add tests

## Acceptance Criteria

- [ ] SurveyEditor wraps SurveyJS Creator with correct CSS imports and license
- [ ] AssessmentList shows table of assessments with status badges and response counts
- [ ] AssessmentCreate has SurveyJS Creator and CSV import tabs
- [ ] AssessmentDetail has tabs: Overview, QR Code, Responses, Item Analysis
- [ ] Item Analysis tab shows PBS number per question with color coding
- [ ] QrPresenter is full-screen with live response counter
- [ ] Dashboard links to assessments
- [ ] All pages use proper loading states (Skeleton) and error handling
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] `cd app && npx vite build` succeeds

## Verification Commands

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app
npx tsc --noEmit
npx vite build
```
```

---

### Task 5: Student/Public Frontend — Take Assessment, Account, Review

- **Agent:** Claude Sonnet
- **Branch:** task-5-student-frontend
- **Depends on:** Task 1
- **Files to modify:** app/src/pages/public/TakeAssessment.tsx, app/src/pages/public/CreateAccount.tsx, app/src/pages/student/StudentLogin.tsx, app/src/pages/student/StudentDashboard.tsx, app/src/pages/student/AssessmentReview.tsx

#### Prompt

```
## Context

You are building the student-facing frontend for **mededprep-inst**, an assessment tool. Tech stack: React 19, TypeScript, TanStack Query v5, shadcn/ui, Tailwind, Zustand.

The project is fully scaffolded. You have access to:
- **Hooks** at `app/src/hooks/usePublic.ts` — usePublicAssessment(hash), useStartAssessment(hash), useSubmitAssessment(hash)
- **Hooks** at `app/src/hooks/useStudentAuth.ts` — useStudentLogin, useStudentRegister, useStudentAssessments, useAssessmentReview(responseId)
- **Types** at `app/src/types/api.ts` — PublicAssessmentInfo, AssessmentSubmitResult, AssessmentReviewData, ReviewQuestion, SurveyElement, SurveyChoice, etc.
- **Student auth store** at `app/src/lib/student-auth.ts` — useStudentAuthStore (student, login, logout), useIsStudentAuthenticated
- **API client** at `app/src/lib/api.ts` — same pattern as admin side
- **shadcn/ui components** in `app/src/components/ui/` — button, card, input, label, badge, tabs, separator, skeleton, alert
- **Routing** in App.tsx:
  - `/take/:hash` → TakeAssessment (public, no auth)
  - `/create-account` → CreateAccount (public)
  - `/student/login` → StudentLogin
  - `/student` → StudentDashboard (requires student auth)
  - `/student/review/:responseId` → AssessmentReview (requires student auth)

Brand color: `#1b5fd0`. Use `sonner` for toasts. Use `lucide-react` for icons.

## Problem

The stub pages need to be replaced with full implementations for the student flow:
1. Scan QR → see assessment info → enter name/email → take assessment → see score → prompt to create account
2. Log in → see past assessments → review with explanations

## Changes Required

### FILE 1: app/src/pages/public/TakeAssessment.tsx

This is the main student-facing page. Multi-step flow:

**Step 1: Assessment Info**
- Use usePublicAssessment(hash) to load assessment info
- Display: title, description, question count, time limit (if any)
- Form: Student Name (text input), Student Email (email input)
- "Start Assessment" button
- Loading/error states

**Step 2: Taking the Assessment**
- On start, call useStartAssessment with name + email
- Backend returns randomized surveyJson (already stripped of correct answers)
- Render the survey questions from the JSON. For each element in surveyJson.pages[].elements[]:
  - type "radiogroup" → render radio buttons with the choices
  - type "checkbox" → render checkboxes
  - Other types: render as text input (fallback)
- Show question number (e.g., "Question 3 of 25")
- If timer is configured (surveyJson.timeLimit exists), show countdown timer at top
  - When timer hits 0, auto-submit
- "Submit Assessment" button at bottom
- Track answers in local state: `Record<string, unknown>`
- Track start time for timeTaken calculation

**Step 3: Results**
- On submit, call useSubmitAssessment with responseId + responseData + timeTaken
- Show score: "You scored X out of Y (Z%)"
- Show passed/failed badge
- **Post-exam account creation prompt:**
  - Card: "Create an account to save your results and review later"
  - Form: Password (min 6 chars), Confirm Password
  - "Create Account" button → calls useStudentRegister with the email from step 1 + the new password + first/last name parsed from studentName (split on first space)
  - "Skip" link
- After account creation: show link to /student (dashboard)
- If skipped: show "You can create an account later at [login link]"

**Key implementation notes:**
- Do NOT use the SurveyJS library for rendering — render questions manually with standard HTML/React. This keeps the student page lightweight and avoids needing the full SurveyJS bundle.
- The surveyJson structure is: `{ pages: [{ elements: [{ type, name, title, choices: [{value, text}], isRequired }] }] }`
- Store the responseId from the start call — it's needed for submit

### FILE 2: app/src/pages/public/CreateAccount.tsx

Standalone account creation page (for students who skipped it after the exam):
- Form: Email, First Name, Last Name, Password, Confirm Password
- "Create Account" button → useStudentRegister
- Link to /student/login if already have account
- On success: redirect to /student

### FILE 3: app/src/pages/student/StudentLogin.tsx

Student login page:
- Form: Email, Password
- "Login" button → useStudentLogin
- On success: redirect to /student
- Link to /create-account if no account
- Error handling for invalid credentials
- Clean, simple design matching the brand

### FILE 4: app/src/pages/student/StudentDashboard.tsx

Student home page (requires auth):
- Header: "My Assessments" + student name + logout button
- Use useStudentAssessments() hook
- Table/card list of past assessments:
  - Assessment title
  - Score (percentage + passed/failed badge)
  - Completed date
  - "Review" button (only if resultsReleased is true, otherwise show "Results pending" text)
- Empty state if no assessments
- "Review" links to /student/review/:responseId

### FILE 5: app/src/pages/student/AssessmentReview.tsx

Question-by-question review page (requires auth):
- Header: Assessment title + overall score
- Use useAssessmentReview(responseId) hook
- For each question:
  - Question number + question text
  - List all choices with visual indicators:
    - Green highlight/checkmark on the correct answer
    - Red highlight/X on the student's wrong answer (if applicable)
    - Gray for unselected choices
  - "Your answer: X" and "Correct answer: Y"
  - If explanation exists: show in a blue/info card below the question
  - If pageNumber exists: show as "Reference: [pageNumber]" below explanation
- Summary at top: X correct out of Y (Z%)
- Back button to /student

## What NOT to Do

- Do NOT modify App.tsx (routing is already set up)
- Do NOT modify hooks or types files (they're already complete)
- Do NOT modify any backend files
- Do NOT modify any admin pages (that's Task 4)
- Do NOT use the SurveyJS library for rendering the student assessment — render manually
- Do NOT add new hook files or store files
- Do NOT add tests
- Do NOT add the SurveyJS CSS imports in student-facing pages

## Acceptance Criteria

- [ ] TakeAssessment has 3-step flow: info → take → results with account prompt
- [ ] Questions rendered manually (no SurveyJS dependency) with radio/checkbox inputs
- [ ] Timer shows countdown and auto-submits when expired
- [ ] Post-exam account creation links existing responses to new account
- [ ] CreateAccount page works as standalone registration
- [ ] StudentLogin authenticates and redirects to dashboard
- [ ] StudentDashboard lists past assessments with "Review" button (only if released)
- [ ] AssessmentReview shows question-by-question breakdown with explanations and page numbers
- [ ] Correct/wrong answers visually distinguished (green/red)
- [ ] All pages handle loading and error states
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] `cd app && npx vite build` succeeds

## Verification Commands

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app
npx tsc --noEmit
npx vite build
```
```

---

## Dispatch Instructions

### Phase 1: Run Task 1 directly

Task 1 must be run directly in `mededprep-inst/` (no worktree) because there's no git repo yet:

```
Open a terminal in /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/
Paste: "Read TASK.md and execute all tasks in it. Commit your changes when done."
```

(Copy the Task 1 prompt above into a TASK.md file in mededprep-inst/ before running.)

### Phase 2: After Task 1 completes, run Tasks 2-5 via worktrees

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst
../workflow/setup-worktrees.sh 2-5
```

This creates worktrees and prints dispatch blocks for each executor terminal.

### Merge Order

1. Merge Task 2 → main, run integration checks
2. Merge Task 3 → main, run integration checks
3. Merge Task 4 → main, run integration checks
4. Merge Task 5 → main, run integration checks

Tasks 2+3 can merge in any order. Tasks 4+5 can merge in any order. But all Wave 2 tasks must merge before Wave 3 tasks.

## What's NOT in This Batch

The following features should be a follow-up batch after this one merges:

- **Attendance tracking** (check-in/check-out QR codes, separate from assessment)
- **Assessment editing** (inline edit of existing questions after creation)
- **CSV export** (export results to CSV/Excel)
- **Assessment duplication** (clone an existing assessment)
- **Bulk operations** (delete multiple, close multiple)
- **Student password reset**
- **Assessment scheduling** (auto-activate/close by date)
- **E2E tests**
