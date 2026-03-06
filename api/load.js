/* Vercel Function: 从 Supabase 读取最新持仓 */

const SUPABASE_URL = 'https://pvqrxvioepssbwfoexna.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cXJ4dmlvZXBzc2J3Zm9leG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzM0NzUsImV4cCI6MjA4ODM0OTQ3NX0.Mt8NzLNgmg8JW_7IvmAslPzk9gLcp7-EuPtCxJBAlPo';
const HEADERS = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    /* 取所有数据，按 batch_id 降序，找最大的 batch_id */
    const allRes = await fetch(
      `${SUPABASE_URL}/rest/v1/holdings?select=*&order=batch_id.desc`,
      { headers: HEADERS }
    );
    const allData = await allRes.json();
    console.log('total rows:', allData.length, 'sample:', JSON.stringify(allData[0]));

    if (!allData || allData.length === 0) {
      return res.status(200).json({ holdings: [] });
    }

    /* 找最大 batch_id */
    const latestBatch = allData[0].batch_id;
    console.log('latest batch_id:', latestBatch);

    /* 过滤出该 batch 的数据 */
    const rows = allData
      .filter(r => r.batch_id === latestBatch && r.sym !== '__empty__')
      .map((r, i) => ({
        id: i + 1,
        sym: r.sym,
        mkt: r.mkt,
        person: r.person,
        cost: parseFloat(r.cost),
        qty: parseFloat(r.qty),
        note: r.note || ''
      }));

    console.log('load ok, batch:', latestBatch, 'holdings:', rows.length);
    return res.status(200).json({ holdings: rows });

  } catch(e) {
    console.error('load error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
