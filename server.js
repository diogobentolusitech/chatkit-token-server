// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());               // keep this for now
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Set this in Render → Environment: CHATKIT_WORKFLOW_ID=wf_xxx from Agent Builder
const WORKFLOW_ID = process.env.CHATKIT_WORKFLOW_ID;

// 1) Create a session → returns { client_secret: "cks_...", expires_at: ... }
app.post("/api/chatkit/start", async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1"
      },
      body: JSON.stringify({
        user: "anon-" + Math.random().toString(36).slice(2),
        workflow: { id: WORKFLOW_ID }
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    // Return exactly what the ChatKit docs expect:
    res.json({ client_secret: data.client_secret, expires_at: data.expires_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2) Refresh a session when the widget asks
app.post("/api/chatkit/refresh", async (req, res) => {
  try {
    const { currentClientSecret } = req.body || {};
    const r = await fetch("https://api.openai.com/v1/chatkit/sessions/refresh", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1"
      },
      body: JSON.stringify({ client_secret: currentClientSecret })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json({ client_secret: data.client_secret, expires_at: data.expires_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (_req, res) => res.send("ChatKit token server is up"));
app.listen(process.env.PORT || 8787, () => {
  console.log("ChatKit token server listening");
});
