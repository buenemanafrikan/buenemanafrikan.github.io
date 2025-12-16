// api/stone-count.js
//
// POST  → globalen Aufrufzähler "pressCount" in Upstash-KV erhöhen (+1)
//        und daraus stoneCount = 30 + pressCount berechnen.
// GET   → aktuellen pressCount lesen (ohne zu erhöhen) und ebenfalls
//        stoneCount = 30 + pressCount zurückgeben.
//
// ENV-Variablen:
//   KV_REST_API_URL
//   KV_REST_API_TOKEN

const numberOfStones = 200;

export default async function handler(req, res) {
  // --- CORS, damit 8th Wall (andere Domain) zugreifen darf ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    // Preflight-Request vom Browser
    return res.status(200).end();
  }
  // ------------------------------------------------------------

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.error('KV_REST_API_URL oder KV_REST_API_TOKEN fehlt');
    return res.status(500).json({ error: 'KV config missing' });
  }

  if (req.method === 'POST') {
    // ---------------------------
    //  INCREMENT: +1 Aufruf
    // ---------------------------
    try {
      const incrRes = await fetch(`${url}/incr/pressCount`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const bodyText = await incrRes.text();
      let pressCount;

      try {
        // Normalfall Upstash: { "result": <number> }
        const parsed = JSON.parse(bodyText);
        pressCount = parsed.result;
      } catch (_e) {
        // Fallback, falls mal nur "42" kommt
        pressCount = Number(bodyText);
      }

      if (!Number.isFinite(pressCount)) {
        throw new Error('Ungültige Antwort von Upstash: ' + bodyText);
      }

      const baseStones = 30; // deine aktuellen Basis-Steine
      const stoneCount = baseStones + pressCount;

      console.log('[API POST] pressCount =', pressCount, '→ stoneCount =', stoneCount);

      return res.status(200).json({ pressCount, stoneCount });
    } catch (err) {
      console.error('[API POST] Fehler bei Upstash:', err);
      return res.status(500).json({ error: 'KV error' });
    }
  } else if (req.method === 'GET') {
    // ---------------------------
    //  READ: aktuellen Wert holen
    // ---------------------------
    try {
      const getRes = await fetch(`${url}/get/pressCount`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const bodyText = await getRes.text();
      let pressCount;

      try {
        const parsed = JSON.parse(bodyText);
        // Upstash: { "result": null } wenn key nicht existiert
        if (parsed && parsed.result != null) {
          pressCount = Number(parsed.result);
        } else {
          pressCount = 0;
        }
      } catch (_e) {
        pressCount = Number(bodyText);
      }

      if (!Number.isFinite(pressCount)) {
        // falls key nie gesetzt wurde o.Ä. → einfach 0
        pressCount = 0;
      }

      const baseStones = 30;
      const stoneCount = baseStones + pressCount;

      console.log('[API GET] pressCount =', pressCount, '→ stoneCount =', stoneCount);

      return res.status(200).json({ pressCount, stoneCount });
    } catch (err) {
      console.error('[API GET] Fehler bei Upstash:', err);
      return res.status(500).json({ error: 'KV error' });
    }
  } else {
    // nur GET und POST erlauben
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}













