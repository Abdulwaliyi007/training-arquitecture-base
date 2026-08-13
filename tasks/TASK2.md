# Task 2 — Notifications API + Tests

> Build the notification backend and cover it with tests. Depends on Task 1 (users, roles, groups, JWT).

**What we’re building overall:** managers/admins send notifications; users in a group receive them.

---

## Goal

1. Create notifications (to a user or to a group)
2. List / filter / paginate notifications with correct permissions
3. Mark as read + basic status updates
4. Automated tests for **Task 1 endpoints** (auth, users, groups) **and** notifications

---

## Model

### Notification

One row **per recipient** (simple for the workshop).

| Field | Notes |
| --- | --- |
| `id` | id |
| `title` | string |
| `body` | string |
| `status` | `QUEUED` \| `SENT` \| `FAILED` \| `READ` (or use `status` + separate `readAt`) |
| `groupId` | set when targeted at a group (optional) |
| `recipientUserId` | the user who receives it |
| `createdBy` | user id of manager/admin |
| `createdAt` / `updatedAt` | timestamps |

```text
User (creator) ──* Notification *── User (recipient)
Group ──* Notification   (when targeting a group)
```

---

## Endpoints

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `POST` | `/notifications` | `MANAGER`, `ADMIN` | Create for a **user** or a **group** |
| `GET` | `/notifications` | Logged in | List scoped to role — filters, sort, pagination |
| `GET` | `/notifications/:id` | Logged in | Get one if in scope |
| `PATCH` | `/notifications/:id/read` | Logged in | Mark as read (recipient) |
| `PATCH` | `/notifications/:id/status` | `MANAGER`, `ADMIN` | Optional status update for tests |

### Create body (examples)

To one user:

```json
{ "title": "Hello", "body": "…", "userId": "…" }
```

To a group (creates one notification per member):

```json
{ "title": "Hello", "body": "…", "groupId": "…" }
```

List query (suggested): `?page=1&size=20&status=&groupId=&sort=createdAt:desc`

---

## Rules

| Role | Scope |
| --- | --- |
| `USER` | Own notifications only |
| `MANAGER` | Groups they belong to (create + view within those groups) |
| `ADMIN` | Global |

- Missing/invalid token → `401`
- Out of role → `403`
- Out of group scope → `405`
- User cannot create notifications
- Manager cannot target users/groups outside their groups

---

## Tests (required)

Cover Task 1 **and** Task 2. Use the Nest test setup (e2e and/or unit) in `apps/backend`.

### A. Task 1 — Auth / Users / Groups

1. **Login check**
   - Valid login succeeds (JWT + user)
   - Invalid login fails
   - `GET /me` and other protected routes return `401` without token
2. **Role check (users & groups)**
   - `USER` / `MANAGER` cannot call admin user/group endpoints → `403`
   - `ADMIN` can `POST/PUT/DELETE /users` and manage groups/members
3. **Group membership**
   - Add user to a group via `POST /groups/:groupId/members`
   - Remove via `DELETE /groups/:groupId/members/:userId` without dropping other groups
   - `GET /me` returns the user’s groups
4. **Users / groups fetch**
   - `GET /users`, `GET /groups`, `GET /groups/:id/members` return expected shape
   - Pagination works where defined

### B. Task 2 — Notifications

5. **Login check** — protected notification routes return `401` without token
6. **Role check** — `USER` cannot create notifications → `403`; manager/admin can
7. **Group check** — cannot target or view notifications outside group scope
8. **Success cases** — create (user or group), status update, mark-as-read; correct HTTP codes
9. **Fetch tests** — correct attributes; pagination, sorting, filtering; no user sees others’ data

---

## Done when

1. Manager/admin can create notifications to a user or group
2. List/get respect role + group rules
3. Recipient can mark as read
4. Task 1 endpoint tests (section A) pass
5. Notification tests (section B) pass

---

## Out of scope

Stats endpoints/UI, broadcast worker, delivery logs, frontend — Tasks 3–4.
