const DB_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://sweetlies-default-rtdb.asia-southeast1.firebasedatabase.app';
const BASE = DB_URL.replace(/\/$/, '');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${BASE}/likes/count.json`);
      const val = r.ok ? await r.json() : null;
      const count = typeof val === 'number' ? val : 0;
      return res.status(200).json({ count });
    }
    if (req.method === 'POST') {
      const r = await fetch(`${BASE}/likes/count.json`);
      const current = r.ok ? await r.json() : null;
      const next = (typeof current === 'number' ? current : 0) + 1;
      const put = await fetch(`${BASE}/likes/count.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!put.ok) {
        const err = await put.text();
        return res.status(put.status).json({ error: err });
      }
      return res.status(200).json({ ok: true, count: next });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e.message) });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
