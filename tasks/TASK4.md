# Task 4 — Stats + Broadcast delivery + Logs (optional)

> **Deferred / not required.** The workshop concludes at Task 3. Keep this as an optional stretch if you have time.
>
> Measure notifications, queue delivery, and show logs. Depends on Tasks 1–3.

**What we’re building overall:** managers/admins send notifications; users in a group receive them; queued items get “sent” and logged.

---

## Goal

1. Stats API + `/stats` dashboard (manager/admin)
2. Broadcast → `QUEUED` notifications
3. Worker/cron processes queue (fake email) → `SENT` / `FAILED` + delivery logs
4. Logs API + UI

---

## 4.1 Stats

### Endpoints

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/stats/notifications/summary` | Logged in | Totals by status + unread count |
| `GET` | `/stats/notifications/by-group` | Logged in | Totals grouped by group |
| `GET` | `/stats/notifications/by-status` | Logged in | Totals grouped by status |

### Permission rules

| Role | Scope |
| --- | --- |
| `USER` | Own counts only |
| `MANAGER` | Groups they belong to |
| `ADMIN` | Global |

### Page

| Path | Who | What |
| --- | --- | --- |
| `/stats` | `MANAGER`, `ADMIN` | Show totals, by group, by status |

Hide/guard the page for `USER`.

---

## 4.2 Delivery system + logs

### Flow

```text
broadcast / create (QUEUED) → worker picks up → fake “send email”
  → write DeliveryLog → set notification SENT or FAILED
```

### Broadcast

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `POST` | `/notifications/broadcast` | `ADMIN` | Queue for a **group** or **all users** |

Body examples:

```json
{ "title": "…", "body": "…", "groupId": "…" }
```

```json
{ "title": "…", "body": "…", "allUsers": true }
```

Creates `QUEUED` notifications (one per recipient).

### Worker

- Cron or background job processes `QUEUED` notifications
- “Send email” can be a **fake sender** that only writes a log row
- Update notification status to `SENT` or `FAILED`

### DeliveryLog

| Field | Notes |
| --- | --- |
| `id` | id |
| `notificationId` | fk |
| `channel` | e.g. `email` |
| `status` | `SENT` \| `FAILED` |
| `message` | debug text |
| `createdAt` | timestamp |

### Logs API

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/logs/delivery` | `MANAGER`, `ADMIN` | Query: `notificationId`, `page`, `size` |

### UI

- Show delivery logs (e.g. on `/stats` or a simple `/logs` page) for manager/admin

---

## Production-thinking (learning points)

Keep these in mind (short notes in code/README are enough):

- **Idempotency** — cron runs twice should not double-send the same notification
- **Retries & attempts** — optional `attempts` / max retries before `FAILED`
- **Logs that help debug** — store a clear `message` on success/failure

---

## Done when

1. Stats endpoints respect role + group scope; `/stats` works for manager/admin
2. Admin can broadcast to a group or all users (queued)
3. Worker moves `QUEUED` → `SENT`/`FAILED` and writes `DeliveryLog`
4. Manager/admin can list delivery logs with pagination

---

## Out of scope

Real email providers, advanced queues (SQS/BullMQ required only if you want extra credit).
