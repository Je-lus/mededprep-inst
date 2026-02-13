## Context

You are scaffolding a new product called **mededprep-inst** (Instructor Tools) in the MedEdPrep ecosystem. The ecosystem is at `/home/jeramey/projects/mededprep-ecosystem/`. The tech stack is Express 5, Prisma 5, PostgreSQL, React 19, TanStack Query v5, shadcn/ui, Tailwind, Zustand.

The `mededprep-inst/` folder already exists with only a `samplecsv/` subfolder and `AGENT-TASKS.md`. You need to copy the template files into it and configure everything.

## Problem

We need a fully scaffolded project with the Prisma schema, backend services, frontend routing, and stub pages — ready for subsequent agents to implement the actual route handlers and page UIs.

## Changes Required

### Step 1: Copy template files into mededprep-inst

Run this command to copy all template files (including hidden files) into the existing mededprep-inst directory, without overwriting existing files:

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
- `"mededprep-XXXX"` → `"mededprep-inst"`
- `PORT=XXXX` → `PORT=9001`

**app/package.json:**
- `"mededprep-XXXX-app"` → `"mededprep-inst-app"`

**docker-compose.yml:**
- `mededprep_XXXX` → `mededprep_inst`

**.env.example:**
- `mededprep_XXXX` → `mededprep_inst`
- `PORT=XXXX` → `PORT=9001`
- `CORS_ORIGINS=http://localhost:5173` → `CORS_ORIGINS=http://localhost:9000`
- `APP_BASE_URL=http://localhost:5173` → `APP_BASE_URL=http://localhost:9000`

**server.js:**
- `MedEdPrep PRODUCT` → `MedEdPrep Instructor Tools` (both occurrences)

**app/vite.config.ts:**
- `port: 5173` → `port: 9000`
- `localhost:XXXX` → `localhost:9001` (both occurrences)

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

Copy `.env.example` to `.env` and set these values:
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

Create directory: `mkdir -p lib/services`

Create `lib/services/quiz-scoring.js`:
```javascript
/**
 * Quiz Scoring Service
 * Scores survey responses against original survey JSON
 */

/**
 * Score a survey response against the original survey JSON
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
 */
export function randomizeAssessment(surveyJson, options = {}) {
  const { randomizeQuestions = true, randomizeChoices = true } = options;

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

  return { surveyJson: { pages }, questionCount: elements.length };
}
```

Create `lib/services/item-analysis.js`:
```javascript
/**
 * Item Analysis Service
 * Computes per-question statistics including point-biserial discrimination index (rpb)
 *
 * rpb = (M1 - M0) / S * sqrt(p * q)
 * M1 = mean total score of students who got the item RIGHT
 * M0 = mean total score of students who got the item WRONG
 * S  = standard deviation of ALL total scores
 * p  = proportion correct, q = 1 - p
 *
 * Interpretation: >0.3 good, 0.2-0.3 acceptable, <0.2 weak
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

export function computeItemAnalysis(originalSurveyJson, responses) {
  if (!responses.length) {
    return { totalResponses: 0, totalQuestions: 0, averageScore: 0, questions: [] };
  }

  const questions = [];
  for (const page of originalSurveyJson.pages || []) {
    for (const element of page.elements || []) {
      if ('correctAnswer' in element) questions.push(element);
    }
  }

  if (!questions.length) {
    return { totalResponses: responses.length, totalQuestions: 0, averageScore: 0, questions: [] };
  }

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

  const questionAnalyses = questions.map((q) => {
    const choices = q.choices || [];
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
      if (choiceCounts[answerStr] !== undefined) choiceCounts[answerStr]++;

      if (normalizeAnswer(answer) === normalizeAnswer(q.correctAnswer)) {
        correctCount++;
        scoresCorrect.push(student.totalCorrect);
      } else {
        scoresIncorrect.push(student.totalCorrect);
      }
    }

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
      percentCorrect: responses.length > 0 ? Math.round((correctCount / responses.length) * 10000) / 100 : 0,
      choiceDistribution: choices.map((c) => {
        const val = typeof c === 'object' ? c.value : c;
        const text = typeof c === 'object' ? c.text : c;
        return {
          value: val, text,
          count: choiceCounts[val] || 0,
          percent: responses.length > 0 ? Math.round(((choiceCounts[val] || 0) / responses.length) * 10000) / 100 : 0,
        };
      }),
      pointBiserial: Math.round(rpb * 1000) / 1000,
    };
  });

  const avgScore = responses.length > 0
    ? Math.round((totalScores.reduce((a, b) => a + b, 0) / responses.length / questions.length) * 10000) / 100
    : 0;

  return { totalResponses: responses.length, totalQuestions: questions.length, averageScore: avgScore, questions: questionAnalyses };
}
```

### Step 9: Update app.js — add route registrations

Read the current `app.js` and make these changes:

1. Uncomment the generalLimiter import — change to: `import { authLimiter, generalLimiter } from './middleware/rate-limiter.js';`

2. Add these imports after the existing route imports:
```javascript
import { requireAuth } from './lib/auth.js';
import assessmentRoutes from './routes/assessments.js';
import publicRoutes from './routes/public.js';
import studentAuthRoutes from './routes/student-auth.js';
```

3. Replace the `// TODO: Add your routes here` section with:
```javascript
app.use('/api/assessments', generalLimiter, requireAuth, assessmentRoutes);
app.use('/api/public', generalLimiter, publicRoutes);
app.use('/api/student', authLimiter, studentAuthRoutes);
```

4. Update CORS default: `const ALLOWED_ORIGINS = new Set((process.env.CORS_ORIGINS || 'http://localhost:9000').split(','));`

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

Create `app/src/types/api.ts` — this contains all TypeScript interfaces for the frontend. Include all of these types: Assessment, AssessmentDetail, AssessmentResponse, QuestionAnalysis, ChoiceDistribution, ItemAnalysisResult, SurveyJson, SurveyPage, SurveyElement, SurveyChoice, QuestionMetadata, QrCodeData, PublicAssessmentInfo, AssessmentSubmitResult, ReviewQuestion, AssessmentReviewData. (See AGENT-TASKS.md Step 11 for the complete type definitions.)

Create hook files — `app/src/hooks/useAssessments.ts`, `app/src/hooks/usePublic.ts`, `app/src/hooks/useStudentAuth.ts`. These are fully implemented TanStack Query hooks (not stubs). See AGENT-TASKS.md Step 11 for the complete implementations.

### Step 12: Create stub page files

```bash
mkdir -p app/src/pages/admin app/src/pages/public app/src/pages/student
```

Create each with a minimal default export:
- `app/src/pages/admin/AssessmentList.tsx` → `export default function AssessmentList() { return <div className="p-8">Assessment List — TODO</div>; }`
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
PGPASSWORD=mededprep_dev createdb -h localhost -U mededprep mededprep_inst 2>/dev/null || true
npm run db:push
npm run db:seed
```

Verify:
```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app
npx tsc --noEmit
npx vite build
```

Fix any TypeScript errors. Then commit:
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
- Do NOT delete the samplecsv/ folder or AGENT-TASKS.md
- Do NOT modify files in any other project (mededprep-ce, mededprep-template, etc.)
- Do NOT add extra features beyond what's specified
- Do NOT create tests

## Acceptance Criteria

- [ ] All template files copied and find-replaced correctly
- [ ] Prisma schema has all 5 models
- [ ] `npm run db:push` and `npm run db:seed` succeed
- [ ] Backend starts on port 9001
- [ ] Frontend dev server starts on port 9000
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] All 4 service files exist in lib/services/
- [ ] app.js registers all 3 route groups
- [ ] App.tsx has all routes
- [ ] Git repo initialized with initial commit

## Verification Commands

```bash
cd /home/jeramey/projects/mededprep-ecosystem/mededprep-inst
npm run db:push
npm run db:seed
PORT=9001 timeout 5 node server.js || true
cd app && npx tsc --noEmit
cd app && npx vite build
git log --oneline -1
```
