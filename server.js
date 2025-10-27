import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const API_BASE = 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WORKFLOW_ID = process.env.CHATKIT_WORKFLOW_ID;

// small helper: call OpenAI Sessions API
async function createChatKitSession() {
  const res = await fetch(`${API_BASE}/chatkit/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      // This header is required for the ChatKit beta endpoints
      'OpenAI-Beta': 'chatkit_beta=v1',
    },
    body: JSON.stringify({
      workflow: { id: WORKFLOW_ID },
      // Optional: pass a stable user id if you have one; random is fine
      user: crypto.randomUUID(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  // API returns an object with client_secret and expires_at (and more)
  return res.json();
}

// Start: mint a NEW short-lived client_secret
app.post('/api/chatkit/start', async (_req, res) => {
  try {
    const session = await createChatKitSession();
    // Return just what the widget needs
    res.json({ client_secret: session.client_secret, expires_at: session.expires_at });
  } catch (err) {
    console.error('START failed:', err);
    res.status(500).json({ error: 'Failed to start ChatKit session' });
  }
});

// Refresh: simplest approach is to mint a NEW session (works fine)
app.post('/api/chatkit/refresh', async (_req, res) => {
  try {
    const session = await createChatKitSession();
    res.json({ client_secret: session.client_secret, expires_at: session.expires_at });
  } catch (err) {
    console.error('REFRESH failed:', err);
    res.status(500).json({ error: 'Failed to refresh ChatKit session' });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`ChatKit token server listening on http://localhost:${PORT}`);
});
