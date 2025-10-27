import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WORKFLOW_ID    = process.env.CHATKIT_WORKFLOW_ID;

console.log("[BOOT] Using ChatKit Sessions API (should return cks_ tokens)");
console.log("[BOOT] WORKFLOW_ID =", WORKFLOW_ID);

async function createChatKitSession() {
  console.log("[SESSIONS] Creating ChatKit session via /v1/chatkit/sessions");
  const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "chatkit_beta=v1",
    },
    body: JSON.stringify({
      user: "anon-" + Math.random().toString(36).slice(2),
      workflow: { id: WORKFLOW_ID },
    }),
  });
  const data = await r.json();
  console.log("[SESSIONS] OpenAI status:", r.status);
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${JSON.stringify(data)}`);
  return { client_secret: data.client_secret, expires_at: data.expires_at };
}

app.post('/api/chatkit/start', async (req, res) => {
  const r = await fetch('https://api.openai.com/v1/chatkit/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ workflow: { id: WORKFLOW_ID } })
  })
  const data = await r.json()
  if (!r.ok) return res.status(r.status).json(data)
  return res.json({ client_secret: data.client_secret })
})

// 2) REFRESH: exchange the current secret for a new one and return only the client_secret
app.post('/api/chatkit/refresh', async (req, res) => {
  const { currentClientSecret } = req.body || {}
  const r = await fetch('https://api.openai.com/v1/chatkit/sessions/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ client_secret: currentClientSecret })
  })
  const data = await r.json()
  if (!r.ok) return res.status(r.status).json(data)
  return res.json({ client_secret: data.client_secret })
})

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`ChatKit token server on :${port}`))

// Diagnostics
app.get("/diag/sessions", async (_req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        user: "diag-" + Math.random().toString(36).slice(2),
        workflow: { id: WORKFLOW_ID },
      }),
    });
    const data = await r.json();
    res.status(r.status).json({
      upstream_status: r.status,
      token_prefix: (data.client_secret || "").slice(0, 4),
      sample: (data.client_secret || "").slice(0, 12) || null,
      raw: data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/diag/realtime", async (_req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17"
      }),
    });
    const data = await r.json();
    res.status(r.status).json({
      upstream_status: r.status,
      token_prefix: (data.client_secret || "").slice(0, 4),
      sample: (data.client_secret || "").slice(0, 12) || null,
      raw: data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 8787, () => {
  console.log("ChatKit token server listening");
});
