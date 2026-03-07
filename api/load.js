/* Vercel Function: 从 Supabase 读取最新持仓
   修复：排序时跳过 null batch_id，只取有效 batch 的最新数据
*/

const SUPABASE_URL = 'https://pvqrxvioepssbwfoexna.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cXJ4dmlvZXBzc2J3Zm9leG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzM0NzUsImV4cCI6MjA4ODM0OTQ3NX0.Mt8NzLNgmg8JW_7IvmAslPzk9gLcp7-EuPtCxJBAlPo';
const HEADERS = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    /* 只取有效 batch_id（非null），按降序取最新一条 */
    const bRes = await fetch(
      `${SUPABASE_URL}/rest/v1/holdings?select=batch_id&batch_id=not.is.null&order=batch_id.desc&limit=1`,
      { headers: HEADERS }
    );
    const bData = await bRes.json();
    console.log('latest batch query result:', JSON.stringify(bData));

    if (!bData || bData.length === 0) {
      console.log('no valid batch found');
      return res.status(200).json({ holdings: [] });
    }

    const latestBatch = bData[0].batch_id;
    console.log('latest batch_id:', latestBatch);

    /* 取该 batch 所有数据 */
    const rRes = await fetch(
      `${SUPABASE_URL}/rest/v1/holdings?batch_id=eq.${latestBatch}&order=id.asc`,
      { headers: HEADERS }
    );
    const data = await rRes.json();
    console.log('rows in batch:', data.length);

    const holdings = (data || [])
      .filter(r => r.sym !== '__empty__')
      .map((r, i) => ({
        id: i + 1,
        sym: r.sym,
        mkt: r.mkt,
        person: r.person,
        cost: parseFloat(r.cost),
        qty: parseFloat(r.qty),
        note: r.note || ''
      }));

    console.log('load ok, holdings:', holdings.length);
    return res.status(200).json({ holdings });

  } catch(e) {
    console.error('load error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
