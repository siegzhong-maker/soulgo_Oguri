/**
 * POST /api/embed-and-store
 * Minimal RAG (9.8): embed summary + key_facts with Gemini, store in memory.
 * Body: { summary, key_facts?, location?, date?, emotion? }
 * Response: { ok: true, id } | { error }
 */
import { embed } from 'ai';
import { google } from '@ai-sdk/google';
import { add } from '../lib/memory-vector-store.js';

const EMBED_MODEL = 'gemini-embedding-001';

function generateId() {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'missing_api_key', message: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured.' },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'invalid_body', message: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { summary, key_facts, location, date, emotion } = body || {};
  if (!summary || typeof summary !== 'string') {
    return Response.json(
      { error: 'missing_fields', message: 'summary (string) is required.' },
      { status: 400 }
    );
  }

  const keyFactsText = Array.isArray(key_facts) && key_facts.length > 0
    ? `关键词：${key_facts.join('、')}`
    : '';
  const emotionText =
    emotion && typeof emotion === 'string' && emotion.trim()
      ? `情绪：${emotion.trim()}`
      : '';
  const parts = [summary, keyFactsText, emotionText].filter(Boolean);
  const content = parts.join('。');

  try {
    const model = google.embedding(EMBED_MODEL);
    const { embedding } = await embed({
      model,
      value: content,
    });

    const id = generateId();
    const metadata = {};
    if (location) metadata.location = location;
    if (date) metadata.date = date;
    if (emotionText) metadata.emotion = emotion.trim();

    add({ id, content, embedding, metadata });

    return Response.json({ ok: true, id });
  } catch (err) {
    console.error('[embed-and-store]', err);
    return Response.json(
      { error: 'embed_failed', message: err?.message || 'Embedding request failed.' },
      { status: 500 }
    );
  }
}
