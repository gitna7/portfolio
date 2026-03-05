/* Vercel Function: 美股普通股→FMP，美股ETF→Finnhub */

const FMP_KEY     = 'ivmLLEa5bz8gzxth7d1oLnYwRjCTPuvN';
const FINNHUB_KEY = 'd6kjfs9r01qg51f45rsgd6kjfs9r01qg51f45rt0';

function guessCcy(sym) {
  if (sym.endsWith('.T'))  return 'JPY';
  if (sym.endsWith('.HK')) return 'HKD';
  if (sym.endsWith('.SS') || sym.endsWith('.SZ')) return 'CNY';
  return 'USD';
}

async function fetchFMP(sym) {
  try {
    const r = await fetch(`https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(sym)}&apikey=${FMP_KEY}`);
    const data = await r.json();
    if (Array.isArray(data) && data[0] && data[0].price) {
      const q = data[0];
      return { price: q.price, prev: q.previousClose || q.price, ccy: q.currency || 'USD', name: q.name || sym };
    }
  } catch(e) { console.log('FMP err', sym, e.message); }
  return null;
}

async function fetchFinnhub(sym) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${FINNHUB_KEY}`);
    const d = await r.json();
    console.log('Finnhub', sym, JSON.stringify(d));
    if (d && d.c && d.c > 0) {
      return { price: d.c, prev: d.pc || d.c, ccy: 'USD', name: sym };
    }
  } catch(e) { console.log('Finnhub err', sym, e.message); }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const symbols = (req.query.symbols || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!symbols.length) return res.status(400).json({ error: 'no symbols' });

  const results = await Promise.all(symbols.map(async sym => {
    /* 先试 FMP，拿不到再试 Finnhub */
    let data = await fetchFMP(sym);
    if (!data) {
      console.log(sym, 'FMP empty, trying Finnhub');
      data = await fetchFinnhub(sym);
    }
    return { sym, data };
  }));

  const out = {};
  results.forEach(({ sym, data }) => { if (data) out[sym] = data; });
  console.log('returned:', Object.keys(out).length, '/', symbols.length);
  return res.status(200).json(out);
}
