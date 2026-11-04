# Careers: openings, applications and hiring

Built 2026-10-30 across all four services. The storefront shows a **Careers** tab where anyone can browse job
openings and apply with a PDF résumé. Staff work through applicants in the Web UI. A Level 1 admin screens and
shortlists, and a Level 2 admin confirms each shortlist and each final selection. The candidate is emailed at every
step. Interviews happen on Teams, Google Meet or Zoom (or by phone or in person). TinQa only sends the invite, with the
link and a calendar file.

| Service | Owns |
| --- | --- |
| Ecommerce BE | All careers data and endpoints (`/api/careers/**` public, `/api/admin/careers/**` staff), résumé storage, candidate emails, the `CAREER_DECISIONS` Approvals Hub queue |
| Procurement BE | The permissions (catalog groups `RECRUITMENT_READ / _MANAGEMENT / _APPROVAL`) |
| Web UI | Careers admin (openings, applicants, résumé preview, résumé match, interviews), hub panel |
| Storefront | `/careers` and `/careers/:jobCode` (browse, filter, sort, apply) |

## Practice we follow (from how established employers and applicant-tracking systems run hiring)

- A posting states the job ID, title, team (category), location, work mode (on-site / hybrid / remote), employment
  type, experience range, an optional salary range (shown only if the company chooses), number of positions, a
  summary, the full description, responsibilities, must-have requirements kept apart from nice-to-haves, skills,
  education, benefits and an application deadline.
- The application asks for name, email, phone, current location, total experience, current company and title, current
  and expected CTC (optional), notice period, LinkedIn / portfolio links, a cover note, how they heard about us, and a
  PDF résumé.
- The pipeline is kept short so people actually keep it up to date: Applied → Shortlisted → Interviewing → Selected.
  Rejected and Withdrawn can end it at any point.
- Every step the candidate cares about sends an email. Interview invites carry the meeting link and an `.ics`
  calendar file.
- **Privacy (India DPDP Act and Rules 2025).** The form shows a privacy notice (purpose and retention) and needs
  explicit consent. Joining the talent pool is a separate opt-in. Résumés of unsuccessful candidates who did not opt in
  are deleted `careers.retention.days` (default 180) after the decision.

## Permissions (Procurement catalog; the Ecommerce `Permission` mirror and the UI `access.ts` use the same names)

| Permission | Group | Who (by designation) |
| --- | --- | --- |
| `CAREER_OPENING_VIEW` | `RECRUITMENT_READ` | Super Admin, Store Manager, Catalog Specialist |
| `CAREER_APPLICATION_VIEW` | `RECRUITMENT_READ` | same |
| `CAREER_OPENING_MANAGE` | `RECRUITMENT_MANAGEMENT` | same |
| `CAREER_APPLICATION_SCREEN` | `RECRUITMENT_MANAGEMENT` | same |
| `CAREER_DECISION_APPROVE` | `RECRUITMENT_APPROVAL` (Level 2 only) | Super Admin and Store Manager at Level 2 |

The person who asked for a shortlist or selection can never confirm it.

## Statuses

Opening: `DRAFT` → `PUBLISHED` ⇄ `CLOSED`. Published openings past their `applicationDeadline` are hidden from the
storefront and refuse applications.

Application:

```
APPLIED --shortlist--> SHORTLIST_PENDING --approve (L2)--> SHORTLISTED --interview--> INTERVIEWING
   ^                         |return (L2)                                                  |select (needs a PASSED interview)
   +-------------------------+                                                             v
                                         SELECTED <--approve (L2)-- SELECTION_PENDING --return (L2)--> INTERVIEWING
reject / withdraw: from any non-final status -> REJECTED / WITHDRAWN (scheduled interviews are cancelled)
```

Final: `SELECTED`, `REJECTED`, `WITHDRAWN`.

Emails (EmailKind `CAREER_APPLICATION_UPDATE` with step `RECEIVED | SHORTLISTED | SELECTED | REJECTED`, and
`CAREER_INTERVIEW` with event `SCHEDULED | RESCHEDULED | CANCELLED`): sent on apply, on L2 shortlist confirmation, on
each interview change, on L2 selection confirmation and on rejection (unless `notifyCandidate: false`).

## Enums

- `workMode`: `ON_SITE | HYBRID | REMOTE`
- `employmentType`: `FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP | APPRENTICESHIP`
- `salaryPeriod`: `ANNUAL | MONTHLY` (amounts are whole rupees)
- `match.label`: `STRONG | WEAK | NONE`
- `interview.mode`: `TEAMS | GOOGLE_MEET | ZOOM | PHONE | IN_PERSON`
- `interview.status`: `SCHEDULED | COMPLETED | CANCELLED`; `interview.outcome`: `PASSED | FAILED | NO_SHOW`

All responses use the standard envelope `{ success, message, data, errorCode?, errors: [{ field, message }] }`.
Dates are `YYYY-MM-DD`, times are local ISO `YYYY-MM-DDTHH:mm:ss` (India time unless `timeZone` says otherwise).

## Hiding the Careers tab (Super Admin)

A Super Admin at Level 2 can hide the whole Careers tab and show it again. This needs `STOREFRONT_FEATURE_TOGGLE`,
which is in Procurement's `SYSTEM_ADMINISTRATION` group.

- The setting is stored in Ecommerce `storefront_features` (V33), on the `CAREERS` row.
- `GET /api/admin/careers/settings` (`CAREER_OPENING_VIEW`) returns `{ enabled, updatedBy, updatedAt }`.
  `PUT /api/admin/careers/settings` (`STOREFRONT_FEATURE_TOGGLE`) takes `{ careersEnabled }`.
- The storefront reads `careersEnabled` from the public company profile it already loads, so this costs no extra call.
  The profile's ETag gains `-careers-off` while the tab is hidden, so cached copies refresh.
- While the tab is hidden:
  - every public `/api/careers/**` call answers 404 `FEATURE_DISABLED`;
  - the storefront drops Careers from the navbar and footer;
  - `/careers` and every role page show "Careers aren't open right now" and fetch nothing;
  - staff keep working on openings and applicants.

## Public API (no sign-in)

### `GET /api/careers/openings`
Every open opening (published, deadline not passed). The list is small by design, capped at 200. It is served with
an `ETag` and `Cache-Control: no-cache`, so a repeat visit costs a 304. The storefront filters and sorts it locally.

```json
{ "openings": [OpeningSummary], "categories": [{ "name": "Manufacturing & Production", "slug": "manufacturing-production", "openings": 3 }] }
```

`OpeningSummary`:
```json
{ "jobCode": "JOB-2026-0007", "title": "CNC Machine Operator",
  "category": { "name": "Manufacturing & Production", "slug": "manufacturing-production" },
  "location": "Jaipur, Rajasthan", "workMode": "ON_SITE", "employmentType": "FULL_TIME",
  "experienceMinYears": 2, "experienceMaxYears": 5,
  "salary": { "min": 300000, "max": 450000, "period": "ANNUAL", "currency": "INR" },
  "positions": 4, "summary": "Run and set up 3-axis CNC machines…", "skills": ["CNC", "GD&T"],
  "applicationDeadline": "2026-12-15", "publishedAt": "2026-10-30T10:15:00" }
```
`salary` is `null` when the company hides it. `min` or `max` may be null for "up to" and "from" ranges.
`experienceMaxYears` and `applicationDeadline` may be null.

### `GET /api/careers/openings/{jobCode}`
`OpeningDetail` = `OpeningSummary` + `description` (text), `responsibilities`, `requirements`, `niceToHave`,
`benefits` (string arrays) and `education` (string or null). Returns 404 `CAREER_OPENING_NOT_FOUND` when the opening
is not open.

### `POST /api/careers/email-verification` and `POST /api/careers/email-verification/confirm`
Applicants need **no account**, but they must prove their email first:
1. `{ "email" }` emails a 5-digit code. It works for 10 minutes, a new code can be asked for after 60 s, and an address
   gets at most 5 codes an hour. The email says the code is for a job application.
2. `{ "email", "code" }` returns `{ email, verificationToken, expiresAt }`. The token lasts 30 minutes and is used up by
   one application.

This reuses sign-up's `EmailVerificationService`, but an address that already has a storefront account may apply too.
Errors:
- `VERIFICATION_CODE_INVALID`, `VERIFICATION_CODE_EXPIRED`, `VERIFICATION_CODE_LOCKED` (400);
- `VERIFICATION_TOO_SOON`, `TOO_MANY_ATTEMPTS` (429);
- 503 when email isn't set up.

### `POST /api/careers/openings/{jobCode}/applications` (multipart)
- Part `application`: JSON (`application/json` Blob).
- Part `resume`: the PDF, at most 5 MB. The server checks the bytes are a real, unencrypted PDF.

```json
{ "emailVerificationToken": "*", "fullName": "*", "email": "*", "phone": "*", "currentLocation": "*", "totalExperienceYears": 3.5,
  "currentCompany": null, "currentTitle": null, "currentCtc": null, "expectedCtc": null, "noticePeriodDays": 30,
  "linkedinUrl": null, "portfolioUrl": null, "coverLetter": null, "source": "LinkedIn",
  "consent": true, "talentPool": false, "website": "" }
```
- `*` fields are required, and `consent` must be true.
- `totalExperienceYears` runs from 0 to 60. `noticePeriodDays` runs from 0 to 180. `coverLetter` is at most 4000
  characters.
- Links must be `https://`.
- `website` is a honeypot: humans leave it empty.

201 returns `{ "referenceNumber": "APP-2026-000123", "jobCode": "...", "title": "..." }`.

Errors:
- 400 `EMAIL_NOT_VERIFIED` (field `emailVerificationToken`): the token is missing, expired, used, or for another
  address.
- 400 with field errors. The error codes are `RESUME_REQUIRED`, `RESUME_NOT_PDF`, `RESUME_TOO_LARGE` and
  `RESUME_UNREADABLE`.
- 409 `CAREER_ALREADY_APPLIED`: one application per email per opening.
- 409 `CAREER_OPENING_CLOSED`.
- 429 `TOO_MANY_ATTEMPTS`: 5 attempts per hour per IP, and 3 successful applications per hour per email.

## Staff API (`/api/admin/careers`)

| Method | Path | Permission | Body / query | Returns |
| --- | --- | --- | --- | --- |
| GET | `/categories` | CAREER_OPENING_VIEW | — | `[{ id, name, slug, openings }]` (small by design) |
| GET | `/openings` | CAREER_OPENING_VIEW | `status, categoryId, q, page, size(≤100)` | Page of `AdminOpeningRow` |
| GET | `/openings/{id}` | CAREER_OPENING_VIEW | — | `AdminOpening` |
| POST | `/openings` | CAREER_OPENING_MANAGE | `OpeningRequest` | `AdminOpening` (DRAFT) |
| PUT | `/openings/{id}` | CAREER_OPENING_MANAGE | `OpeningRequest` + `version` | `AdminOpening` |
| POST | `/openings/{id}/publish` | CAREER_OPENING_MANAGE | — | `AdminOpening` (also reopens a CLOSED one) |
| POST | `/openings/{id}/close` | CAREER_OPENING_MANAGE | — | `AdminOpening` |
| GET | `/applications` | CAREER_APPLICATION_VIEW | `openingId, status (comma list), match, q, sort (NEWEST\|OLDEST\|MATCH\|EXPERIENCE), page, size(≤100)` | Page of `ApplicationRow` |
| GET | `/applications/{id}` | CAREER_APPLICATION_VIEW | — | `ApplicationDetail` |
| GET | `/applications/{id}/resume` | CAREER_APPLICATION_VIEW | — | `application/pdf` (inline) |
| POST | `/applications/{id}/match` | CAREER_APPLICATION_SCREEN | `{ label, score, matchedSkills, missingSkills, summary, matcherVersion }` | `ApplicationDetail` |
| POST | `/applications/{id}/shortlist` | CAREER_APPLICATION_SCREEN | `{ note }` | `ApplicationDetail` |
| POST | `/applications/{id}/select` | CAREER_APPLICATION_SCREEN | `{ note }` | `ApplicationDetail` |
| POST | `/applications/{id}/reject` | CAREER_APPLICATION_SCREEN | `{ reason*, notifyCandidate (default true) }` | `ApplicationDetail` |
| POST | `/applications/{id}/withdraw` | CAREER_APPLICATION_SCREEN | `{ reason* }` | `ApplicationDetail` |
| POST | `/applications/{id}/decision/approve` | CAREER_DECISION_APPROVE | `{ note }` | `ApplicationDetail` |
| POST | `/applications/{id}/decision/return` | CAREER_DECISION_APPROVE | `{ note* }` | `ApplicationDetail` |
| POST | `/applications/{id}/interviews` | CAREER_APPLICATION_SCREEN | `InterviewRequest` | `ApplicationDetail` |
| PUT | `/applications/{id}/interviews/{interviewId}` | CAREER_APPLICATION_SCREEN | `InterviewRequest` (reschedule) | `ApplicationDetail` |
| POST | `/applications/{id}/interviews/{interviewId}/cancel` | CAREER_APPLICATION_SCREEN | `{ reason* }` | `ApplicationDetail` |
| POST | `/applications/{id}/interviews/{interviewId}/outcome` | CAREER_APPLICATION_SCREEN | `{ outcome*, rating (1–5), feedback }` | `ApplicationDetail` |

The Approvals Hub badge is the `CAREER_DECISIONS` key of `GET /api/admin/approvals/summary` (needs
`CAREER_DECISION_APPROVE` + `CAREER_APPLICATION_VIEW`). It counts `SHORTLIST_PENDING` + `SELECTION_PENDING`. The
hub list is `GET /applications?status=SHORTLIST_PENDING,SELECTION_PENDING&sort=OLDEST`.

`OpeningRequest`:
```json
{ "title": "*", "categoryName": "*", "location": "*", "workMode": "*", "employmentType": "*",
  "experienceMinYears": 0, "experienceMaxYears": null, "salaryMin": null, "salaryMax": null,
  "salaryPeriod": "ANNUAL", "salaryVisible": false, "positions": 1, "summary": "*", "description": "*",
  "responsibilities": [], "requirements": [], "niceToHave": [], "benefits": [], "skills": [],
  "education": null, "applicationDeadline": null, "version": 0 }
```
- `categoryName` is find-or-create by slug, like product categories.
- Limits: title 120, summary 300, description 8000, at most 30 skills of 40 characters each, at most 25 items per
  list, 300 characters per item.
- `experienceMinYears` runs from 0 to 40, and the max must be ≥ the min. `salaryMax` must be ≥ `salaryMin`.
- `positions` runs from 1 to 500.
- A deadline in the past can't be published.

`AdminOpeningRow`: `id, jobCode, title, category {id,name,slug}, location, workMode, employmentType, status,
positions, applicationDeadline, publishedAt, updatedAt, applications { total, fresh, inProgress, selected }`. Here
`fresh` counts APPLIED, and `inProgress` counts SHORTLIST_PENDING, SHORTLISTED, INTERVIEWING and SELECTION_PENDING.

`AdminOpening` = every `OpeningRequest` field + `id, jobCode, status, category {id,name,slug}, version, createdBy,
createdAt, updatedBy, updatedAt, publishedAt, closedAt, applications {…}`.

`ApplicationRow`: `id, referenceNumber, fullName, email, phone, currentLocation, totalExperienceYears, currentTitle,
currentCompany, noticePeriodDays, expectedCtc, status, match { label, score } | null, opening { id, jobCode, title },
appliedAt, updatedAt, pending { kind: SHORTLIST|SELECTION, requestedBy, requestedAt, note } | null, nextInterviewAt`.

`ApplicationDetail` = `ApplicationRow` plus:
- `currentCtc, linkedinUrl, portfolioUrl, coverLetter, source, talentPool, consentAt, emailVerifiedAt`;
- `resume { fileName, sizeBytes, pages, available }` and `resumeText` (null once the résumé is purged or when the
  PDF had no text, e.g. a scan);
- `opening { id, jobCode, title, skills, requirements, niceToHave, experienceMinYears, experienceMaxYears, education,
  description }`, so the matcher needs no second call;
- `match { label, score, matchedSkills, missingSkills, summary, matcherVersion, computedBy, computedAt } | null`;
- `interviews: [Interview]`, newest first;
- `history: [{ action, fromStatus, toStatus, note, actor, at }]`, oldest first;
- `emails: [{ subject, status: PENDING|SENT|FAILED, sentAt, createdAt }]`.

`InterviewRequest`: `{ roundName*, mode*, meetingLink, location, startsAt*, durationMinutes* (15–480), timeZone
("Asia/Kolkata"), interviewers, candidateNotes }`.
- `meetingLink` (any https link) is required for `TEAMS`, `GOOGLE_MEET` and `ZOOM`.
- `location` is required for `IN_PERSON`.
- `startsAt` must be in the future.

`Interview`: `id, roundName, mode, meetingLink, location, startsAt, durationMinutes, timeZone, interviewers,
candidateNotes, status, outcome, rating, feedback, revision, scheduledBy, scheduledAt, cancelReason`.

Error codes: `CAREER_OPENING_NOT_FOUND`, `CAREER_APPLICATION_NOT_FOUND`, `CAREER_INTERVIEW_NOT_FOUND`,
`CAREER_INVALID_TRANSITION` (409), `CAREER_SELF_APPROVAL` (409), `CAREER_STALE_VERSION` (409),
`CAREER_NEEDS_PASSED_INTERVIEW` (409), `CAREER_RESUME_PURGED` (410).

## Résumé match (Web UI, in the browser)

`features/careers/utils/resumeMatcher.ts` is a deterministic, explainable matcher. It runs on `resumeText` and the
opening from `ApplicationDetail`, and nothing leaves the browser.

- It normalises text and skill synonyms (e.g. `js` → `javascript`, `autocad` ↔ `auto cad`, `plc` / `scada`).
- It scores weighted parts:
  - skills found, 50 %;
  - requirement keywords covered, 25 %;
  - experience in range, 15 %;
  - education keywords, 5 %;
  - nice-to-haves, 5 %.
- Labels: `STRONG` (≥ 70), `WEAK` (40–69), `NONE` (< 40), with the matched and missing skills and a one-line reason.
- The first time an application is opened, its result is saved with `POST /applications/{id}/match`. The list can
  then show and filter the badge, and the L2 approver sees it.
- Re-running the match is allowed. A scanned PDF without text shows "Résumé has no readable text — review manually".
