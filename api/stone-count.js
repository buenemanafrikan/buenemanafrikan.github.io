// api/stone-count.js

export default async function handler(req, res) {
  // immer JSON schicken
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error('[stone-count] KV env vars fehlen');
    return res.status(500).json({
      error: 'Server misconfigured: KV_REST_API_URL oder KV_REST_API_TOKEN fehlt'
    });
  }

  try {
    // Upstash KV: key "stoneCount" um 1 erhöhen
    const url = `${KV_REST_API_URL}/incr/stoneCount`;

    const upstashRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`
      }
    });

    const text = await upstashRes.text();
    let data = null;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[stone-count] Upstash hat kein JSON zurückgegeben:', text);
      return res.status(500).json({
        error: 'Upstash returned non-JSON response',
        raw: text
      });
    }

    if (!upstashRes.ok) {
      console.error('[stone-count] Upstash-Fehler:', data);
      return res.status(500).json({
        error: 'Upstash error',
        details: data
      });
    }

    const result = data.result;
    const stoneCount =
      typeof result === 'number' ? result : Number(result) || 0;

    console.log('[stone-count] Neuer stoneCount:', stoneCount);

    return res.status(200).json({ stoneCount });
  } catch (err) {
    console.error('[stone-count] Unerwarteter Serverfehler:', err);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
