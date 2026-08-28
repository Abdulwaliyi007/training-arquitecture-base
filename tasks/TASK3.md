# Task 3 — Frontend: Login + Notifications + Create UI

> Wire the Next.js app to the Task 1–2 APIs. Depends on auth + notifications backend.
>
> **Workshop ends here.** Tasks 1–3 are the required path. Task 4 is optional / deferred.

**What we’re building overall:** managers/admins send notifications; users in a group receive them.

---

## Goal

1. Login flow with JWT storage + `/me`
2. My notifications page for all roles
3. Create-notification UI for manager/admin only

---

## Pages

| Path | Who | What |
| --- | --- | --- |
| `/login` | Public | Login form |
| `/notifications` | Any logged-in user | List + filters + pagination + mark as read |
| `/admin/notifications/new` | `MANAGER`, `ADMIN` | Create for a user or a group |

---

## 3.1 Login flow

Tasks:

- [ ] Login page (`/login`)
- [ ] Store token (e.g. memory + `localStorage` / cookie — pick one and stick to it)
- [ ] Logout (clear token, redirect to `/login`)
- [ ] Fetch `GET /me` after login (and on app load if token exists)
- [ ] Redirect unauthenticated users away from protected pages
- [ ] Redirect already-logged-in users away from `/login`

---

## 3.2 My notifications (`/notifications`)

Tasks:

- [ ] List notifications from `GET /notifications`
- [ ] Filters (e.g. status) + pagination
- [ ] Mark as read (`PATCH /notifications/:id/read`)
- [ ] Unread badge (count of unread / not `READ`)
- [ ] Show useful fields: title, body, status, createdAt

---

## 3.3 Create notification (`/admin/notifications/new`)

Visible only to **manager/admin** (hide link + guard the route).

Tasks:

- [ ] Form: title, body
- [ ] Target: **specific user** *or* **group** (not both required at once)
- [ ] Submit → `POST /notifications`
- [ ] Show success and error messages
- [ ] Manager only sees groups they belong to; admin sees all

---

## Rules (frontend)

- Send `Authorization: Bearer <token>` on API calls
- On `401` → logout / redirect to login
- On `403` → show “not allowed” (don’t crash)
- Do not expose admin create UI to `USER`

---

## Done when

1. User can log in, see `/me` data, and log out
2. Any role can open `/notifications`, filter/paginate, and mark as read
3. Manager/admin can create a notification to a user or group; `USER` cannot open the create page

That’s the end of the required workshop.

---

## Out of scope

Stats dashboard, broadcast, delivery logs / worker — see optional [`TASK4.md`](./TASK4.md) (not required).
