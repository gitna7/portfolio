/* Vercel Function: FMP 逐个查询，并行发送
   免费套餐每次只能查一个symbol，并行处理所有股票
*/

const FMP_KEY = 'ivmLLEa5bz8gzxth7d1oLnYwRjCTPuvN';

function guessCcy(sym) {
  if (sym.endsWith('.T'))  return 'JPY';
  if (sym.endsWith('.HK')) return 'HKD';
  if (sym.endsWith('.SS') || sym.endsWith('.SZ')) return 'CNY';
  return 'USD';
}

async function fetchOne(sym) {
  try {
    const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(sym)}&apikey=${FMP_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    console.log('FMP', sym, r.status, JSON.stringify(data).slice(0,150));
    if (Array.isArray(data) && data[0] && data[0].price) {
      const q = data[0];
      return {
        price: q.price,
        prev:  q.previousClose || q.price,
        ccy:   q.currency || guessCcy(sym),
        name:  q.name || sym
      };
    }
  } catch(e) {
    console.log('FMP error', sym, e.message);
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const symbols = (req.query.symbols || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!symbols.length) return res.status(400).json({ error: 'no symbols' });

  /* 并行查询所有股票 */
  const results = await Promise.all(symbols.map(async sym => {
    const data = await fetchOne(sym);
    return { sym, data };
  }));

  const out = {};
  results.forEach(({ sym, data }) => { if (data) out[sym] = data; });

  console.log('returned:', Object.keys(out).length, '/', symbols.length);
  return res.status(200).json(out);
}
