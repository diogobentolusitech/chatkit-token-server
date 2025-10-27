// server.js
import express from "express";
import cors from "cors";

// ✅ Built-in fetch works in Node 18+ (no need for node-fetch)
const app = express();
app.use(cors());
app.use(express.json());

// ⚙️ Environment variables (set these in Render Dashboard → Environment)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WORKFLOW_ID = process.env.CHATKIT_WORKFLOW_ID;

// 🔑 Helper: Create a ChatKit session (this returns a cks_ token)
async function createChatKitSession() {
  const res = await fetch("https://api.openai.com/v1/chatkit/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "chatkit_beta=v1", // required header
    },
    body: JSON.stringify({
      user: "anon-" + Math.random().toString(36).slice(2),
      workflow: { id: WORKFLOW_ID }, // ⚠️ must be your wf_... from Agent Builder
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("OpenAI error:", data);
    throw new Error(`OpenAI ${res.status}: ${JSON.stringify(data)}`);
  }

  // ✅ Return the fields ChatKit expects
  return { client_secret: data.client_secret, expires_at: data.expires_at };
}

// 🟢 Endpoint to create new session (used by Framer’s /start call)
app.post("/api/chatkit/start", async (_req, res) => {
  try {
    const session = await createChatKitSession();
    res.json(session);
  } catch (err) {
    console.error("START error:", err);
    res.status(500).json({ error: "Failed to start ChatKit session" });
  }
});

// 🟢 Endpoint to refresh (we just mint a new one)
app.post("/api/chatkit/refresh", async (_req, res) => {
  try {
    const session = await createChatKitSession();
    res.json(session);
  } catch (err) {
    console.error("REFRESH error:", err);
    res.status(500).json({ error: "Failed to refresh ChatKit session" });
  }
});

// 🟢 Health check
app.get("/", (_req, res) => res.send("ChatKit token server is up"));

app.listen(process.env.PORT || 8787, () => {
  console.log("ChatKit token server listening");
});
