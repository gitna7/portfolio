/* Vercel Serverless Function: FMP batch quote
   路径: /api/price?symbols=AAPL,VOO,7203.T,0700.HK,600519.SS
   返回: { "AAPL": { price, prev, ccy, name }, ... }
*/

const FMP_KEY = 'ivmLLEa5bz8gzxth7d1oLnYwRjCTPuvN';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const symbols = req.query.symbols || '';
  if (!symbols) {
    return res.status(400).json({ error: 'no symbols' });
  }

  const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbols)}&apikey=${FMP_KEY}`;

  try {
    const r = await fetch(url);
    const rawText = await r.text();
    console.log('FMP status:', r.status, 'body:', rawText.slice(0, 300));

    if (!r.ok) {
      return res.status(500).json({ error: `FMP HTTP ${r.status}`, detail: rawText.slice(0, 300) });
    }

    const data = JSON.parse(rawText);
    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'unexpected response', detail: rawText.slice(0, 300) });
    }

    const out = {};
    data.forEach(q => {
      if (q && q.symbol && q.price) {
        out[q.symbol] = {
          price: q.price,
          prev:  q.previousClose || q.price,
          ccy:   q.currency || guessCcy(q.symbol),
          name:  q.name || q.symbol
        };
      }
    });

    console.log('FMP returned:', Object.keys(out).length, '/', symbols.split(',').length);
    return res.status(200).json(out);

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}

function guessCcy(sym) {
  if (sym.endsWith('.T'))  return 'JPY';
  if (sym.endsWith('.HK')) return 'HKD';
  if (sym.endsWith('.SS') || sym.endsWith('.SZ')) return 'CNY';
  return 'USD';
}
