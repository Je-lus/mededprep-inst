# Codebase Concerns

**Analysis Date:** 2026-02-23

## Tech Debt

**Email Verification and Password Reset Not Implemented:**

- Issue: Three TODO comments indicate email-based workflows are not wired up to actual email service
- Files: `routes/student-auth.ts` (lines 109, 430, 565)
- Impact: Email verification tokens and password reset tokens are generated but returned in JSON responses for dev testing. In production, these tokens have no delivery mechanism—students cannot verify email or reset passwords
- Current state: API returns `verificationToken` and `resetToken` in response body with comments "DEV ONLY"
- Fix approach: Integrate email service (SendGrid, AWS SES, etc.). Create email templates for verification and password reset. Update routes to send tokens via email instead of response. Remove `verificationToken` and `resetToken` from responses in production

**Unscoped Database Queries (Partial Multi-Tenancy Enforcement):**

- Issue: `updateMany` on `assessmentResponse` does include org scoping via nested assessment relation, but pattern is fragile
- Files: `routes/student-auth.ts` (lines 96-107), `routes/question-banks.ts`
- Impact: If a bug is introduced in future bulk operations, tenant data could leak between orgs
- Fix approach: Add explicit tests for multi-tenant isolation on all `updateMany`/`deleteMany`/`createMany` operations. Document org scoping requirement in code comments

**Decimal Type Handling for Scores:**

- Issue: `scorePercentage` stored as `Decimal(5,2)` in Prisma but JavaScript handles it as string, requiring Number() conversions throughout
- Files: `routes/student-auth.ts` (lines 234-238), `lib/services/item-analysis.ts`
- Impact: Conversion bugs, floating-point precision issues, inconsistent handling across codebase
- Fix approach: Standardize score handling. Either: (1) Store scores as integers (basis points: 0-10000 for 0-100%), or (2) Create a Score class to manage Decimal conversion consistently

**Sensitive Data Exposure in Error Responses:**

- Issue: Database error messages from Prisma are caught but exposed to clients without sufficient scrubbing
- Files: `middleware/errorHandler.ts` (lines 27-46)
- Impact: If field names contain sensitive patterns, they leak to frontend. Stack traces exposed in dev mode could reveal internal paths
- Fix approach: Create generic error messages for database conflicts. Only expose meaningful context (e.g., "email already in use") not field names

---

## Security Considerations

**Email-Based Flows Lack Phishing Mitigation:**

- Risk: When email service is implemented, tokens will be sent via email. No CSRF protection, rate limiting per token, or token invalidation after failed attempts
- Files: `routes/student-auth.ts`, `routes/public-attendance.ts`
- Current mitigation: Rate limiting on endpoints (50 req/15min for student-auth)
- Recommendations:
  - Implement one-time-use tokens (delete after consumption)
  - Add token expiry enforcement (currently 1 hour in code but not enforced on verify)
  - Implement exponential backoff after N verification failures
  - Log failed verification attempts
  - Consider CAPTCHA for brute-force protection

**JWT Secret Validation:**

- Risk: JWT_SECRET validated at startup but only checks length (32 chars minimum)
- Files: `server.ts`
- Current mitigation: Runtime check prevents server startup without secret
- Recommendations: Add entropy validation (ensure secret is base64-like, not "a" repeated 32 times)

**File Upload Validation (ImageKit Integration):**

- Risk: CSV import accepts up to 1MB content with minimal validation
- Files: `lib/services/csv-import.ts`, `routes/assessments.ts` (line 41: max 1MB)
- Current mitigation: CSV parser configured with strict mode (`relax_quotes: true`)
- Recommendations: Add MIME type validation, scan for malicious headers, limit row count

**Assessment Hash Collision Risk:**

- Risk: `publicHash` uses UUID but collision check is implicit (unique constraint). No explicit validation
- Files: `prisma/schema.prisma` (line 121: `@unique`)
- Impact: Low probability but unhandled collision would cause 409 error
- Recommendations: Generate deterministic hash from assessment data, or implement explicit collision retry

**Subdomain Extraction Logic:**

- Risk: Multi-tenant slug extracted from hostname by splitting on "." - could be spoofed if reverse DNS is controlled
- Files: `middleware/tenantResolver.ts` (lines 61-68)
- Current mitigation: Org must exist and be active in DB
- Recommendations: Consider hardcoding allowed hostnames in production config

---

## Performance Bottlenecks

**Score Aggregation without Caching:**

- Problem: `/student/stats` endpoint aggregates all assessments on every request with 3 DB queries
- Files: `routes/student-auth.ts` (lines 221-231: `aggregate`, `count` calls)
- Cause: No caching; stats recalculated for every fetch
- Improvement path: Cache stats in separate `StudentStats` table, updated via triggers on `assessmentResponse.update`. TTL of 1 hour for cache

**Item Analysis Full Response Array Construction:**

- Problem: Item analysis for large assessments builds full choice distribution array even if not needed
- Files: `lib/services/item-analysis.ts` (lines 100+)
- Cause: Computes all statistics regardless of endpoint use
- Improvement path: Make choice distribution optional in analysis result. Lazy-load in endpoint handler if needed

**Org Slug Lookup in Every Request:**

- Problem: `getOrgBySlug()` queries DB for every request, with 5-minute cache
- Files: `middleware/tenantResolver.ts` (lines 12-46)
- Cause: Tenant resolver runs before route handlers
- Improvement path: Cache should be 15-30 minutes. Consider warming cache on org updates

**Survey JSON Deep Cloning:**

- Problem: `cloneJson()` uses JSON.parse(JSON.stringify()) for every assessment start
- Files: `routes/public.ts` (line 31-32), `routes/assessments.ts`
- Cause: Needed for safe mutation but inefficient for large surveys
- Improvement path: Use shallow clone for immutable portions, deep clone only question array

---

## Fragile Areas

**Quiz Scoring Logic:**

- Files: `lib/services/quiz-scoring.ts`
- Why fragile: Array sorting for answer normalization is order-dependent. If survey format changes (e.g., choice format), comparison breaks silently
- Safe modification: Add integration tests with real SurveyJS exports. Mock various choice formats (string vs object vs mixed)
- Test coverage: Missing tests for edge cases (null answers, empty arrays, special characters)

**CSV Import Parser:**

- Files: `lib/services/csv-import.ts`
- Why fragile: Relies on exact column names and order. Any variation in header names breaks silently with warnings instead of errors
- Safe modification: Add strict mode flag to reject unknown columns. Return warnings for missing optional fields only
- Test coverage: No test file found. Need tests for malformed CSV, missing columns, encoding issues

**Multi-Page Survey Randomization:**

- Files: `lib/services/randomization.ts`
- Why fragile: Randomization logic must preserve question-to-page mapping. Changes to page structure could break
- Safe modification: Add validation that question count pre/post randomization is identical
- Test coverage: Unknown—file not examined

**SurveyJS Metadata Handling:**

- Files: All route handlers that touch `surveyJson.pages[].elements[].metadata`
- Why fragile: metadata property is untyped (lives in generic `metadata` object). If survey format changes, property access fails silently
- Safe modification: Create SurveyElement interface with typed metadata. Validate shape on import/load
- Test coverage: No validation of metadata structure

---

## Test Coverage Gaps

**Multi-Tenant Isolation:**

- What's not tested: Org A user accessing Org B assessments/students/reports
- Files: `middleware/tenantResolver.ts`, `routes/assessments.ts`, `routes/students.ts`
- Risk: Medium—high impact if exploited. Could expose entire orgs' assessment data
- Priority: **High** - Add integration tests for each endpoint with mismatched org IDs

**Error Handler Edge Cases:**

- What's not tested: Prisma errors with missing `meta.target`, malformed multer errors, custom error objects
- Files: `middleware/errorHandler.ts` (lines 17-54)
- Risk: Low—server returns 500 instead of informative error, but no data leak
- Priority: **Medium** - Add unit tests for error handler with mocked error objects

**CSV Import Malformed Files:**

- What's not tested: BOM markers, mixed line endings, non-UTF8 encoding, oversized fields, null bytes
- Files: `lib/services/csv-import.ts`
- Risk: Low—parser throws and request fails 400, but experience is poor
- Priority: **Medium** - Test with real problematic CSV files from the wild

**Assessment Response Uniqueness:**

- What's not tested: Schema uniqueness constraint on (assessmentId, studentEmail, attempt)
- Files: `prisma/schema.prisma` (line 174), `routes/public.ts` (assessment submit)
- Risk: Medium—constraint violation causes 409 instead of 400, client doesn't understand
- Priority: **Medium** - Test double-submit of same assessment within same attempt window

**Rate Limiting:**

- What's not tested: Rate limiter actually blocking requests at limit
- Files: `middleware/rate-limiter.ts`
- Risk: Low—framework should work, but not verified
- Priority: **Low** - Integration test with rapid requests

---

## Missing Critical Features

**Email Service Integration:**

- Problem: Email verification and password reset cannot function without email service
- Blocks: Students cannot self-serve password resets or verify accounts
- Workaround: Admin must manually verify/reset in current state (not exposed in UI)
- Impact: User activation flow is incomplete

**Audit Logging:**

- Problem: No audit trail for data modifications (assessment creation, student registration, response submission)
- Blocks: Cannot detect unauthorized access patterns or audit exam integrity
- Impact: Compliance issue for regulated assessments

**Data Export for Instructors:**

- Problem: No endpoint to export assessment responses as CSV/Excel
- Blocks: Instructors must use item analysis view only, cannot do ad-hoc analysis
- Impact: Feature incomplete relative to typical LMS

**Assessment Rollback/Versioning:**

- Problem: Assessment updates overwrite previous version; no history of question changes
- Blocks: Cannot detect if instructor accidentally modified questions between attempts
- Impact: Item analysis becomes unreliable if questions change mid-assessment cycle

---

## Dependencies at Risk

**SurveyJS License:**

- Risk: SurveyJS 2.5.10 is tied to license key in `app/src/lib/surveyjs-license.ts`
- Impact: License expiry or invalid key breaks entire assessment UI
- Migration plan: Have backup plan to switch to open-source survey library (e.g., Formik + custom build) if license unavailable

**ImageKit Integration:**

- Risk: Third-party image hosting dependency for file uploads
- Impact: If ImageKit goes down or API changes, file upload breaks
- Migration plan: Add fallback to local filesystem storage option

**Express 5:**

- Risk: Express 5 is in beta/pre-release phase
- Impact: Breaking changes between minor versions, limited compatibility with some middleware
- Migration plan: Pin major version strictly. Monitor release notes. Plan gradual migration path

---

## Scaling Limits

**Assessment Response Storage:**

- Current capacity: No explicit limits on response payload size
- Limit: Database storage grows unbounded. CSV import accepts up to 1MB per request
- Scaling path: Implement response archival to cold storage after 90 days. Paginate large result sets

**Question Bank Lookups:**

- Current capacity: findMany on QuestionBankItem with no pagination limit visible
- Limit: If bank has 10k+ items, full load could timeout
- Scaling path: Add pagination to question bank endpoints. Implement tag-based filtering

**Org Slug Cache:**

- Current capacity: In-memory Map of all org slugs
- Limit: If 1000+ orgs, cache becomes problematic
- Scaling path: Move cache to Redis with TTL. Use LRU cache with size limit

**Assessment Randomization:**

- Current capacity: All questions randomized in memory
- Limit: Assessment with 500+ questions could be slow
- Scaling path: Randomize on client-side after fetching, not server-side

---

## Coding Pattern Issues

**Inconsistent Error Propagation:**

- Some routes use `throw new ValidationError()`, others return `res.status(403).json()`
- Files: `routes/student-auth.ts` (line 364-370 returns 403 directly vs throwing error)
- Impact: Inconsistent API response format
- Fix: Centralize error throwing. Error handler converts all to standard format

**Magic Numbers:**

- JWT expiry hardcoded as "4h" in string, converted to 4*60*60\*1000 milliseconds elsewhere
- Files: `lib/auth.ts` (line 40, 47), `routes/student-auth.ts` (line 196)
- Impact: Inconsistency if one is updated without the other
- Fix: Export `JWT_EXPIRY_SECONDS` constant, use consistently

**Minimal Prisma Type Coverage:**

- Many `as unknown as Prisma.InputJsonValue` casts to force types
- Files: `routes/assessments.ts` (line 142)
- Impact: Type safety bypassed, future schema changes undetected
- Fix: Create strict Zod schemas that match Prisma types. Validate before casting

---

_Concerns audit: 2026-02-23_
