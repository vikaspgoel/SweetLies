const DB_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://sweetlies-default-rtdb.asia-southeast1.firebasedatabase.app';
const BASE = DB_URL.replace(/\/$/, '');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body || {};
    const trimmed = String(text || '').trim().slice(0, 500);
    if (!trimmed) return res.status(400).json({ error: 'Text required' });

    const r = await fetch(`${BASE}/feedback.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, timestamp: Date.now() }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e.message) });
  }
}
