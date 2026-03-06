/* Vercel Function: 保存持仓到 Supabase
   POST /api/sync
   Body: { holdings: [...] }
*/

const SUPABASE_URL = 'https://pvqrxvioepssbwfoexna.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cXJ4dmlvZXBzc2J3Zm9leG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzM0NzUsImV4cCI6MjA4ODM0OTQ3NX0.Mt8NzLNgmg8JW_7IvmAslPzk9gLcp7-EuPtCxJBAlPo';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  try {
    const { holdings } = req.body;
    if (!Array.isArray(holdings)) return res.status(400).json({ error: 'invalid body' });

    const batchId = Date.now();
    const rows = holdings.length > 0
      ? holdings.map(h => ({ sym: h.sym, mkt: h.mkt, person: h.person, cost: h.cost, qty: h.qty, note: h.note || '', batch_id: batchId }))
      : [{ sym: '__empty__', mkt: 'US', person: 'Z', cost: 0, qty: 0, note: '', batch_id: batchId }];

    const r = await fetch(`${SUPABASE_URL}/rest/v1/holdings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(rows)
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Supabase insert failed: ${r.status} ${err}`);
    }

    console.log('sync ok, batch:', batchId, 'rows:', rows.length);
    return res.status(200).json({ ok: true, batch_id: batchId, count: holdings.length });

  } catch(e) {
    console.error('sync error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
