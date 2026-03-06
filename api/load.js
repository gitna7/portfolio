/* Vercel Function: 从 Supabase 读取最新持仓
   GET /api/load
   返回: { holdings: [...] }
*/

const SUPABASE_URL = 'https://pvqrxvioepssbwfoexna.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cXJ4dmlvZXBzc2J3Zm9leG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzM0NzUsImV4cCI6MjA4ODM0OTQ3NX0.Mt8NzLNgmg8JW_7IvmAslPzk9gLcp7-EuPtCxJBAlPo';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    /* 找最新的 batch_id */
    const bRes = await fetch(
      `${SUPABASE_URL}/rest/v1/holdings?select=batch_id&order=batch_id.desc&limit=1`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const bData = await bRes.json();
    if (!bData || bData.length === 0) return res.status(200).json({ holdings: [] });

    const latestBatch = bData[0].batch_id;
    if (!latestBatch) return res.status(200).json({ holdings: [] });

    /* 取该 batch 所有数据 */
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/holdings?batch_id=eq.${latestBatch}&order=id.asc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await r.json();

    const holdings = (data || [])
      .filter(row => row.sym !== '__empty__')
      .map((row, i) => ({
        id: i + 1,
        sym: row.sym,
        mkt: row.mkt,
        person: row.person,
        cost: parseFloat(row.cost),
        qty: parseFloat(row.qty),
        note: row.note || ''
      }));

    console.log('load ok, batch:', latestBatch, 'holdings:', holdings.length);
    return res.status(200).json({ holdings });

  } catch(e) {
    console.error('load error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
