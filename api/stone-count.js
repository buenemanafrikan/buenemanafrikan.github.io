// api/stone-count.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    try {
      // Globalen Zähler um 1 erhöhen
      const newValue = await kv.incr('stoneCount');
      return res.status(200).json({ count: newValue });
    } catch (err) {
      console.error('KV increment error:', err);
      return res.status(500).json({ error: 'KV error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const value = (await kv.get('stoneCount')) ?? 0;
      return res.status(200).json({ count: value });
    } catch (err) {
      console.error('KV get error:', err);
      return res.status(500).json({ error: 'KV error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
