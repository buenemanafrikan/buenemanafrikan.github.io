// api/stone-count.js
//
// Diese Funktion läuft auf Vercel als Serverless Function.
// Sie benutzt Upstash KV über die REST-API.
//
// Erwartete ENV-Variablen:
//   KV_REST_API_URL
//   KV_REST_API_TOKEN
//
// Verhalten:
//   - Erhöht einen globalen Zähler "pressCount" um 1
//   - Rechnet daraus stoneCount = 60 + pressCount
//   - Antwort: { stoneCount: <number> }

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
    // 1) Globalen Aufrufzähler erhöhen
    // Key-Name "pressCount" ist komplett egal, Hauptsache überall gleich
    const incrRes = await fetch(`${url}/incr/pressCount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const bodyText = await incrRes.text();
    let pressCount;

    try {
      // Upstash-KV gibt normalerweise { "result": <number> } zurück
      const parsed = JSON.parse(bodyText);
      pressCount = parsed.result;
    } catch (e) {
      // Falls aus irgendeinem Grund nur "42" zurückkommt
      pressCount = Number(bodyText);
    }

    if (!Number.isFinite(pressCount)) {
      throw new Error('Ungültige Antwort von Upstash: ' + bodyText);
    }

    // 2) Dein eigentlicher Stein-Count:
    // Basis 60 + Anzahl Aufrufe
    const baseStones = 1;
    const stoneCount = baseStones + pressCount; // 1. Aufruf = 61, 2. = 62, ...

    console.log('[API] pressCount =', pressCount, '→ stoneCount =', stoneCount);

    return res.status(200).json({ stoneCount });
  } catch (err) {
    console.error('[API] Fehler bei Upstash:', err);
    return res.status(500).json({ error: 'KV error' });
  }
}



