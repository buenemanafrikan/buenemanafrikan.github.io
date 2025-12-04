// api/decrement-press-count.js
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
    const decrRes = await fetch(`${url}/decr/pressCount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const bodyText = await decrRes.text();
    let pressCount = Number(bodyText);

    if (!Number.isFinite(pressCount)) {
      try {
        const parsed = JSON.parse(bodyText);
        pressCount = parsed.result;
      } catch {
        throw new Error('Ungültige Antwort: ' + bodyText);
      }
    }

    const baseStones = 60;
    const stoneCount = baseStones + pressCount;

    console.log('[API decr] pressCount =', pressCount, '→ stoneCount =', stoneCount);

    return res.status(200).json({ pressCount, stoneCount });
  } catch (err) {
    console.error('[API decr] Fehler:', err);
    return res.status(500).json({ error: 'KV error' });
  }
}
