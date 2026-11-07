# Client outreach, meetings and custom roles

Contract between the Procurement backend (`TinQa_Procurement_Backend`), the Ecommerce backend (staff emails only)
and this Web UI. Requested 2026-10-31. All paths are Procurement, prefixed by its API base. All times are ISO-8601
with offset (`2026-11-04T15:30:00+05:30`); dates are `YYYY-MM-DD`. Lists are paginated Spring pages
(`?page=0&size=20`, size capped at 100) returning `{ content, totalElements, totalPages, number, size }`.

## Permissions (catalog already added in Procurement `Permission` / `PermissionGroup` / `DesignationAccess`)

| Permission | Group | Who (built-in) |
|---|---|---|
| `ROLE_VIEW` | EMPLOYEE_READ | Super Admin |
| `ROLE_MANAGE` | EMPLOYEE_MANAGEMENT | Super Admin |
| `OUTREACH_VIEW` | CLIENT_OUTREACH_READ | Super Admin, Store Manager, Finance & Accounts Manager |
| `OUTREACH_LOG` | CLIENT_OUTREACH_MANAGEMENT | same |
| `MEETING_VIEW_ALL` | MEETING_READ | Super Admin, Store Manager, Finance Manager, Fulfillment, Financial Auditor |
| `MEETING_SCHEDULE` | MEETING_MANAGEMENT | same |
| `MEETING_VIEW_OWN` | SELF_SERVICE | every employee |
| `MEETING_RESPOND_OWN` | SELF_SERVICE | every employee |

Custom roles (e.g. "Marketing Executive") pick any of these groups.

## 1. Custom roles

A custom role is a designation stored in the database: code, label, department, description and a set of
permission groups. It is used exactly like a built-in designation: an employee holds one designation (built-in
**or** custom), and ADMIN_L1 drops the role's approval-level groups. SELF_SERVICE is always added.

Rules (server-enforced):
- `code` is generated from the label (`MARKETING_EXECUTIVE`), unique across built-in and custom roles, never changes.
- The creator may grant only groups they hold themselves (their effective groups). `SUPPLIER_PORTAL` and
  `SYSTEM_ADMINISTRATION` can never be granted to a custom role. At least one group.
- Editing a role's groups applies to its employees from their next sign-in / token refresh (same as today).
- A role in use by any employee cannot be deleted; it can be deactivated (no new employees get it).
- Built-in roles are read-only.

Endpoints:
- `GET /v1/access/catalog` (existing) — `designations[]` now also lists active custom roles, each entry with
  `custom: boolean`, `active: boolean`, `id` (custom only). Employee create/edit forms keep using it.
- `GET /v1/access/roles` — `ROLE_VIEW`. Small list by design (not paginated): every built-in + custom role:
  `{ id|null, code, label, department, description, groups: string[], custom, active, employeeCount, createdByName|null, updatedAt|null }`.
- `POST /v1/access/roles` — `ROLE_MANAGE`. Body `{ label, department, description, groups: string[] }` → role.
- `PUT /v1/access/roles/{id}` — `ROLE_MANAGE`. Same body (+ `active: boolean`), custom roles only.
- `DELETE /v1/access/roles/{id}` — `ROLE_MANAGE`. 409 `ROLE_IN_USE` when employees hold it.
- `GET /v1/access/roles/grantable-groups` — `ROLE_MANAGE`. The groups the caller may put in a role:
  `[{ code, label, approvalLevel }]`.
- Employee create/update `designation` accepts a built-in or an active custom role code.

## 2. Client outreach (call log)

A **business** is a property or company we pitch to (hotel, home stay, corporate office, hospital, clinic,
restaurant, shopping mall, other — same `ClientType` codes as client demos). A **contact** is one call, email,
WhatsApp message or visit with it.

Business: `{ id, name, businessType, city, address, googleMapsUrl, phone, email, contactPerson, notes,
contactCount, demoRequestCount, lastContactAt, lastContactByName, latestInterest, latestRating, nextFollowUpAt,
createdByName, createdAt }`. `phone` (normalised to 10 digits for Indian numbers) and `email` (case-insensitive)
are each unique when given; adding a duplicate returns 409 `BUSINESS_EXISTS` with `{ existingId }`, so the UI
can open the existing business ("we already contacted Radisson Blu").

Contact: `{ id, businessId, businessName, contactedAt, channel, contactPerson, contactPhone, summary, response,
rating, interest, nextAction, followUpAt, proofs: [{ id, fileName, contentType, size }], loggedById, loggedByName,
createdAt, updatedAt, editable }`
- `channel`: `CALL | EMAIL | WHATSAPP | IN_PERSON | OTHER`
- `rating` (how the conversation went): `EXCELLENT | GOOD | AVERAGE | BAD | WORSE`
- `interest`: `INTERESTED | MAYBE | LATER | NOT_INTERESTED`
- `nextAction`: `NONE | CALL_BACK | DEMO_REQUESTED | MEETING_REQUESTED`; `followUpAt` required unless `NONE`
  ("call again on 5 Nov", "demo on 12 Nov").
- `summary` required (≤ 4000); `response` optional (≤ 2000).
- Proofs: image (png/jpeg/webp) or PDF, ≤ 5 MB each, ≤ 5 per contact. Optional for every channel.
- `editable`: the caller logged it. Only the logger edits or removes proofs of their contacts.

Endpoints (view = `OUTREACH_VIEW`, write = `OUTREACH_LOG`):
- `GET /v1/outreach/businesses?search=&businessType=&interest=&followUpDue=true&page=&size=` (view). `search`
  matches name, phone or email (trigram index). Sorted by `lastContactAt desc nulls last`.
- `POST /v1/outreach/businesses` (write) → business. `PUT /v1/outreach/businesses/{id}` (write).
- `GET /v1/outreach/businesses/{id}` (view) → business.
- `GET /v1/outreach/businesses/{id}/contacts?page=&size=` (view), newest first.
- `POST /v1/outreach/businesses/{id}/contacts` (write) → contact. JSON body without proofs.
- `PUT /v1/outreach/contacts/{id}` (write, own).
- `POST /v1/outreach/contacts/{id}/proofs` (write, own) multipart `file` → proof.
- `GET /v1/outreach/contacts/{id}/proofs/{proofId}` (view) → the file.
- `DELETE /v1/outreach/contacts/{id}/proofs/{proofId}` (write, own).
- `GET /v1/outreach/contacts?from=&to=&loggedBy=&channel=&interest=&mine=true&page=&size=` (view) — the log
  across businesses, newest first.
- `GET /v1/outreach/summary?from=&to=` (view) — one SQL statement:
  `{ totalContacts, businessesContacted, newBusinesses, demoRequests, followUpsDue, byDay: [{ date, contacts, businesses }],
  byExecutive: [{ userId, name, contacts, businesses, interested }], byChannel: {CALL: n, ...}, byInterest: {...} }`.
- `GET /v1/outreach/follow-ups?mine=true&page=` (view) — contacts whose `followUpAt` is due (≤ end of today) and
  not superseded by a later contact with that business, oldest first.
- Follow-up reminder: at 09:00 on the follow-up day the logger gets an in-app notification (once).

## 3. Meetings

Client Demos & Meetings gets two tabs: **Demos** (existing) and **Meetings**.

Meeting: `{ id, code ("MTG-2026-0001"), mode: ONLINE|IN_PERSON, title, subject, description, meetingType,
clientName, clientDescription, clientContact, outreachBusinessId|null, startsAt, endsAt, joinUrl (ONLINE),
placeName, address, googleMapsUrl (IN_PERSON), status: SCHEDULED|COMPLETED|CANCELLED, cancelReason,
organizerId, organizerName, attendees: Attendee[], feedbackCount, attendeeCount, completedAt, createdAt,
myAttendance: Attendee|null, canManage: boolean }`
- `meetingType`: `CLIENT | BUSINESS_TO_BUSINESS | BUSINESS_TO_SUPPLIER | CLIENT_TO_CLIENT | INTERNAL | OTHER`.
- ONLINE needs `joinUrl` (https; the organiser pastes the Meet/Teams/Zoom link, TinQa does not create it).
  IN_PERSON needs `placeName` + `address`; `googleMapsUrl` optional, validated like suppliers' `@GoogleMapsUrl`.
- `startsAt` in the future when scheduled; `endsAt` after `startsAt`, on the same day (India time), within 12 h.
- **No one is in two meetings at once** (added 2026-10-31): scheduling, changing the time, or inviting people is refused
  with 409 `MEETING_TIME_CLASH` when anyone concerned (the organiser included) is INVITED to another SCHEDULED meeting
  that overlaps (back to back is fine). The message names each person, the other meeting's code and its time; `errors[]`
  has one item per clash (`field: "employee:<id>"`). Declined/replaced attendees and cancelled/completed meetings don't
  count. The employees' rows are locked first so two bookings at the same moment can't both pass.
- `GET /v1/meetings/busy?from=&to=&employeeIds=1,2&excludeMeetingId=` — `MEETING_SCHEDULE`. Small by design (≤ 50
  people, ≤ 48 h): `[{ employeeId, name, self, meetingId, code, startsAt, endsAt }]`, the caller always included
  (`self: true`). The Web UI greys these out on the clock (whole day in the editor; the meeting's span in Invite more).

Attendee: `{ id, employeeId, userId, name, designationLabel, status: INVITED|DECLINED|REPLACED, organizer: boolean,
invitedAt, declineDeadline, declinedAt, declineReason, replacedByName, feedbackSubmittedAt }`.
The organiser is an attendee (`organizer: true`) and cannot decline.

Rules (server-enforced):
- No approval: anyone with `MEETING_SCHEDULE` schedules; invitees are active employees.
- Invite: each new attendee gets an email (with `.ics`) and an in-app notification.
- Decline: an invitee may decline **only within 24 hours of being invited** (`declineDeadline = min(invitedAt + 24h,
  startsAt)`), with a reason (required, ≤ 1000). After that they must attend. The organiser is notified.
- Replace: the organiser invites another employee in place of a DECLINED attendee (`replacesAttendeeId`); the old
  row becomes REPLACED. The organiser may also add attendees at any time while SCHEDULED. A new invitee gets their
  own 24 h window.
- Edit: the organiser edits details while SCHEDULED; a time or place/link change emails the attendees again and resets
  their 24 h reminder.
- Cancel: the organiser only, with a reason; attendees emailed + notified.
- Reminder: 24 hours before `startsAt`, every INVITED attendee gets an in-app notification and an email (once;
  meetings scheduled less than 24 h ahead get it at once with the invite).
- Complete: the organiser, once `startsAt` has passed. Every INVITED attendee (organiser included) gets a feedback
  request (in-app + email linking to `/meetings/{id}/feedback`).
- Feedback (one per attendee, final once submitted): `{ agenda, feedback, decisions, dealConfirmed: boolean,
  dealNotes, meetingType, rating: EXCELLENT|GOOD|AVERAGE|BAD|WORSE }`; `agenda`, `feedback`, `decisions` required.
- Emails are sent after commit by a scheduled job (outbox columns on the attendee row), never inside a transaction.

Endpoints:
- `GET /v1/meetings?status=&from=&to=&search=&page=&size=` — `MEETING_VIEW_ALL`. List projection without
  attendees (counts only), soonest upcoming first for SCHEDULED, latest first otherwise.
- `GET /v1/meetings/mine?status=&page=&size=` — `MEETING_VIEW_OWN`: meetings I organise or am invited to (not REPLACED),
  each with `myAttendance` and `feedbackPending: boolean`.
- `GET /v1/meetings/mine/pending-feedback-count` — `MEETING_VIEW_OWN` → `{ count }` (one SQL count; menu badge).
- `GET /v1/meetings/{id}` — `MEETING_VIEW_ALL`, or `MEETING_VIEW_OWN` when organiser/attendee (403 otherwise).
- `GET /v1/meetings/invitable-staff?search=&page=` — `MEETING_SCHEDULE`: active employees `{ employeeId, userId,
  name, designationLabel }` (no emails/phones).
- `POST /v1/meetings` — `MEETING_SCHEDULE`. Body: the meeting fields + `attendeeEmployeeIds: number[]` (≥ 1, organiser
  added automatically).
- `PUT /v1/meetings/{id}` — `MEETING_SCHEDULE`, organiser only. Same body without attendees.
- `POST /v1/meetings/{id}/attendees` — `MEETING_SCHEDULE`, organiser only. `{ employeeIds: number[], replacesAttendeeId? }`.
- `POST /v1/meetings/{id}/cancel` — `MEETING_SCHEDULE`, organiser only. `{ reason }`.
- `POST /v1/meetings/{id}/complete` — `MEETING_SCHEDULE`, organiser only.
- `POST /v1/meetings/{id}/decline` — `MEETING_RESPOND_OWN`. `{ reason }`. 409 `DECLINE_WINDOW_CLOSED`.
- `GET /v1/meetings/{id}/feedback/mine` — `MEETING_RESPOND_OWN` → feedback or 404.
- `POST /v1/meetings/{id}/feedback` — `MEETING_RESPOND_OWN`, INVITED attendee of a COMPLETED meeting, once.
- `GET /v1/meetings/{id}/feedback` — organiser or `MEETING_VIEW_ALL`: `[{ attendeeName, ...feedback, submittedAt }]`.

Error bodies follow the existing `{ code, message }` shape.

## Emails (Ecommerce sends staff mail for Procurement)

Procurement's `StaffMailer` gains meeting emails (invite, updated, reminder, cancelled, feedback request), sent by
Ecommerce with the company branding like the other staff emails. Invites and updates carry an `.ics` file.

## Backend notes (as built, 2026-10-31)

Clarifications from the implementation; no path, field name or enum value above changed.

- **Responses** are wrapped like every Procurement endpoint: `{ success, message, data, errorCode?, errors?, timestamp, path }`.
  Errors carry their code in `errorCode` (e.g. `DECLINE_WINDOW_CLOSED`, `ROLE_IN_USE`, `ROLE_EXISTS`,
  `ROLE_GROUP_NOT_GRANTABLE` (403), `OUTREACH_NOT_YOURS` (403), `OUTREACH_PROOF_LIMIT`, `MEETING_NOT_ORGANIZER` (403),
  `MEETING_WRONG_STATUS`, `MEETING_ALREADY_INVITED`, `MEETING_NOT_INVITED`, `FEEDBACK_ALREADY_SUBMITTED`); field errors
  are `VALIDATION_FAILED` with `errors: [{ field, message }]`.
- **409 BUSINESS_EXISTS** body: `{ "success": false, "errorCode": "BUSINESS_EXISTS", "message": "...",
  "data": { "existingId": 12 }, "timestamp": "...", "path": "/v1/outreach/businesses" }`.
- **Times** are returned with the India offset (`2026-11-04T15:30:00+05:30`); requests take any ISO offset.
- **Custom roles**: `code` collisions (built-in or custom) are 409 `ROLE_EXISTS`. On `PUT`, groups the role already has
  are kept even when the editor doesn't hold them; only groups being added must be the editor's own. `groups` in
  responses include `SELF_SERVICE`; sending it is allowed and ignored. Inactive roles stay effective for the employees
  who hold them. Catalog entries for built-ins have `id: null, custom: false, active: true`.
- **Outreach**: `rating` and `interest` are required on contacts. `contactedAt` defaults to now and may not be in the
  future; `followUpAt` must be after `contactedAt` and is cleared when `nextAction` is `NONE`. Summary `from`/`to`
  default to the last 30 days (max 366). `followUpDue` and `followUpsDue` count follow-ups before the end of today.
- **Meetings**: `organizerId` is the organiser's **user id** (compare with the signed-in user's id). `attendeeCount` counts
  attendees not REPLACED. `canManage` = caller is the organiser and holds `MEETING_SCHEDULE`. Lists also fill
  `myAttendance` and `feedbackPending`; `attendees` is null in lists. Write endpoints (schedule, edit, attendees, cancel,
  complete, decline) return the full meeting; `POST .../feedback` returns the saved feedback (201). A meeting starting
  less than 24 h ahead gets no separate reminder: the invite (or update) is it. Re-inviting someone already on the
  meeting (not REPLACED) is 409 `MEETING_ALREADY_INVITED`; nobody can be added once the meeting has started.
- **Badge**: `GET /v1/notifications/unread-count` → `{ unreadCount, meetingFeedbackPending }` (0 without
  `MEETING_VIEW_OWN`).
- **Links** (in-app and email): `/meetings/{id}` (invite, update, reminder, cancel, decline-to-organiser),
  `/meetings/{id}/feedback` (feedback request), `/client-outreach/businesses/{id}` (09:00 follow-up reminder).
- **Emails** go through Ecommerce `POST /internal/staff-emails` with types `MEETING_INVITE`, `MEETING_UPDATED`,
  `MEETING_REMINDER`, `MEETING_CANCELLED`, `MEETING_FEEDBACK_REQUEST` and a `meeting` object; invites and updates
  carry an `.ics` (METHOD:REQUEST), cancellations one that removes the event (METHOD:CANCEL). Sent to the employee's
  personal email, else their sign-in email.
