// api/reset-press-count.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.error('KV_REST_API_URL oder KV_REST_API_TOKEN fehlt');
    return res.status(500).json({ error: 'KV config missing' });
  }

  try {
    const setRes = await fetch(`${url}/set/pressCount/0`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await setRes.text();
    if (!setRes.ok) {
      throw new Error(`KV returned ${setRes.status}: ${text}`);
    }

    const pressCount = 0;
    const baseStones = 1;  // vorher 60
    const stoneCount = baseStones + pressCount;

    console.log('[API reset] pressCount =', pressCount, '→ stoneCount =', stoneCount);

    return res.status(200).json({
      ok: true,
      pressCount,
      stoneCount,
    });
  } catch (err) {
    console.error('[API reset] Fehler bei Upstash:', err);
    return res.status(500).json({ error: 'KV error' });
  }
}


