// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Start a ChatKit session and return a short-lived client secret.
 * The front-end calls this first.
 */
app.post('/api/chatkit/start', async (req, res) => {
  try {
    // IMPORTANT: Pass your published workflow id
    const workflow_id = process.env.CHATKIT_WORKFLOW_ID;

    // Create a session (a.k.a. mint a client token for the widget)
    // The exact method name depends on SDK version. In current docs,
    // you create a ChatKit *session* on your server and return its
    // client_secret to the browser.
    // See "Authentication → Generate tokens on your server". :contentReference[oaicite:3]{index=3}

    // If your OpenAI SDK exposes chatkit.sessions.create:
    // const session = await openai.chatkit.sessions.create({ workflow_id });

    // Many developers simply call the REST under the hood; the starter app follows this pattern. :contentReference[oaicite:4]{index=4}
    // For compatibility across versions, we’ll call the raw endpoint via fetch from the SDK:
    const session = await openai.fetch('/v1/chatkit/sessions', {
      method: 'POST',
      body: { workflow_id },
    });

    // Return just what the front-end needs
    res.json({
      client_secret: session.client_secret,
      expires_at: session.expires_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start ChatKit session' });
  }
});

/**
 * Refresh the client secret before it expires.
 * Your widget will call this with its current client_secret.
 */
app.post('/api/chatkit/refresh', async (req, res) => {
  try {
    const { currentClientSecret } = req.body || {};

    // If your SDK has chatkit.sessions.refresh:
    // const refreshed = await openai.chatkit.sessions.refresh({ client_secret: currentClientSecret });

    // Fallback: many teams simply create a new session instead of refresh.
    // That also works for keeping the chat alive:
    const refreshed = await openai.fetch('/v1/chatkit/sessions', {
      method: 'POST',
      body: { workflow_id: process.env.CHATKIT_WORKFLOW_ID },
    });

    res.json({
      client_secret: refreshed.client_secret,
      expires_at: refreshed.expires_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to refresh ChatKit session' });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`ChatKit token server listening on http://localhost:${PORT}`);
});
