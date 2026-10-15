# n8n Automation — Policy Maze

Policy Maze fires three webhooks into n8n for post-processing: document ingestion alerts, eligibility routing, and conflict detection.

---

## Prerequisites

- Node.js 18+ **or** Docker
- Backend running at `http://localhost:8000`
- n8n running at `http://localhost:5678` (default)

---

## Running n8n

### Option A — npx (no install)

```bash
npx n8n
```

### Option B — global install

```bash
npm install -g n8n
n8n
```

### Option C — Docker

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Open **http://localhost:5678** once it starts.

---

## Importing the Workflows

1. Log in to n8n (create a free account on first launch)
2. Click **Workflows → Import from file**
3. Import each file from `n8n/workflows/`:

| File | Purpose |
|---|---|
| `document-ingestion.json` | Fires when a policy PDF is uploaded and rules are extracted |
| `eligibility-routing.json` | Fires after every eligibility check with the verdict |
| `conflict-alert.json` | Fires when two policies have conflicting rules |

4. After importing each workflow, click **Activate** (toggle in top-right)

---

## Webhook URLs

n8n generates webhook URLs automatically when you activate a workflow. By default they are:

| Workflow | URL |
|---|---|
| Document ingested | `http://localhost:5678/webhook/document-ingested` |
| Eligibility checked | `http://localhost:5678/webhook/eligibility-checked` |
| Conflict detected | `http://localhost:5678/webhook/conflict-detected` |

The backend posts to these URLs automatically — no extra configuration needed if n8n is on `localhost:5678`.

To use a different host, set `N8N_BASE_URL` in `.env`:

```env
N8N_BASE_URL=http://your-n8n-host:5678
```

---

## Payload Reference

### `document-ingested`
```json
{
  "document_id": "abc123",
  "scheme_name": "PM Kisan Samman Nidhi",
  "rule_count": 7,
  "confidence": 0.94
}
```
Workflow branches: `rule_count > 0` → Notify Success, else → Alert No Rules

---

### `eligibility-checked`
```json
{
  "session_id": "sess_xyz",
  "scheme_name": "PM Kisan Samman Nidhi",
  "verdict": "ELIGIBLE",
  "matched": 6,
  "failed": 0,
  "unknown": 1
}
```
Workflow branches: `ELIGIBLE` → Auto Approve, `PARTIAL` → Route to Review, else → Notify Rejection

---

### `conflict-detected`
```json
{
  "document_a": "PM Kisan Samman Nidhi",
  "document_b": "PMEGP",
  "conflict_count": 3,
  "high_severity_count": 1
}
```
Workflow branches: `high_severity_count > 0` → Urgent Alert, else → Log for Review

---

## Adding Real Notifications

The imported workflows log events but don't send external alerts yet. To add real notifications:

1. Open a workflow in n8n
2. Click the terminal `noOp` node (e.g. "Notify Rejection")
3. Delete it and add a real node:
   - **Slack** — post a message to a channel
   - **Gmail / SMTP** — send an email
   - **HTTP Request** — call any external API
   - **Telegram** — send a bot message
4. Map the fields from the webhook payload (available as `{{ $json.verdict }}`, `{{ $json.scheme_name }}`, etc.)
5. Save and the workflow stays active

---

## Behaviour When n8n is Offline

The backend uses fire-and-forget webhooks with a 5-second timeout. If n8n is not running:

- The webhook call fails silently
- **No error is returned to the user**
- The eligibility check / upload still completes normally
- A debug-level log entry is written to the backend console

You do not need n8n running for the core app to work.
