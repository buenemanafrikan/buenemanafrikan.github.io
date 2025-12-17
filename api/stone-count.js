// api/stone-count.js
//
// POST  → globalen Aufrufzähler "pressCount" in Upstash-KV erhöhen (+1)
//        und daraus stoneCount = baseStones + pressCount berechnen.
// GET   → aktuellen pressCount lesen (ohne zu erhöhen) und ebenfalls
//        stoneCount = baseStones + pressCount zurückgeben.
//
// WICHTIG: Mit CORS-Headern, damit 8th Wall (andere Domain) zugreifen darf.
//
// ENV-Variablen:
//   KV_REST_API_URL
//   KV_REST_API_TOKEN

export default async function handler(req, res) {
  // ---------- CORS für 8th Wall & Browser ----------
  res.setHeader('Access-Control-Allow-Origin', '*'); // oder spezifische Domain
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // -------------------------------------------------

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.error('KV_REST_API_URL oder KV_REST_API_TOKEN fehlt');
    return res.status(500).json({ error: 'KV config missing' });
  }

  const baseStones = 30; // dein Basiswert

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
        const parsed = JSON.parse(bodyText); // normal: { "result": <number> }
        pressCount = parsed.result;
      } catch (_e) {
        pressCount = Number(bodyText); // Fallback
      }

      if (!Number.isFinite(pressCount)) {
        throw new Error('Ungültige Antwort von Upstash: ' + bodyText);
      }

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
        if (parsed && parsed.result != null) {
          pressCount = Number(parsed.result);
        } else {
          pressCount = 0;
        }
      } catch (_e) {
        pressCount = Number(bodyText);
      }

      if (!Number.isFinite(pressCount)) {
        pressCount = 0;
      }

      const stoneCount = baseStones + pressCount;

      console.log('[API GET] pressCount =', pressCount, '→ stoneCount =', stoneCount);

      return res.status(200).json({ pressCount, stoneCount });
    } catch (err) {
      console.error('[API GET] Fehler bei Upstash:', err);
      return res.status(500).json({ error: 'KV error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}













