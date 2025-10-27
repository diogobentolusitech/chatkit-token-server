// server.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;          // set in Render
const WORKFLOW_ID    = process.env.CHATKIT_WORKFLOW_ID;     // wf_... from Agent Builder

// Helper: create a ChatKit session (returns cks_...)
async function createChatKitSession() {
  const res = await fetch("https://api.openai.com/v1/chatkit/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "chatkit_beta=v1", // REQUIRED
    },
    body: JSON.stringify({
      user: "anon-" + Math.random().toString(36).slice(2),
      workflow: { id: WORKFLOW_ID }, // must be your wf_...
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${JSON.stringify(data)}`);
  }
  // data contains { client_secret: "cks_...", expires_at: ... }
  return { client_secret: data.client_secret, expires_at: data.expires_at };
}

app.post("/api/chatkit/start", async (_req, res) => {
  try {
    const session = await createChatKitSession();
    res.json(session);
  } catch (e) {
    console.error("START error:", e);
    res.status(500).json({ error: "Failed to start ChatKit session" });
  }
});

app.post("/api/chatkit/refresh", async (req, res) => {
  try {
    // EITHER call a refresh endpoint if/when exposed
    // OR simply mint a new session (works fine):
    const session = await createChatKitSession();
    res.json(session);
  } catch (e) {
    console.error("REFRESH error:", e);
    res.status(500).json({ error: "Failed to refresh ChatKit session" });
  }
});

app.get("/", (_req, res) => res.send("ChatKit token server is up"));
app.listen(process.env.PORT || 8787, () => {
  console.log("ChatKit token server listening");
});
