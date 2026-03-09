/* Vercel Function: 股价查询
   US stocks/ETFs → FMP first, Finnhub fallback
   JP / HK / CN   → Yahoo Finance
*/

const FMP_KEY     = 'ivmLLEa5bz8gzxth7d1oLnYwRjCTPuvN';
const FINNHUB_KEY = 'd6kjfs9r01qg51f45rsgd6kjfs9r01qg51f45rt0';

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
};

async function fetchYahoo(sym) {
  try {
    /* Yahoo Finance symbol: 日股 7203.T, 港股 0700.HK, A股 600036.SS / 000001.SZ */
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const r = await fetch(url, { headers: YAHOO_HEADERS });
    if (!r.ok) {
      console.log('Yahoo', sym, 'status:', r.status);
      return null;
    }
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose || meta.previousClose || price;
    const ccy   = meta.currency || 'USD';
    console.log('Yahoo', sym, price, ccy);
    return { price, prev, ccy, name: sym };
  } catch(e) {
    console.log('Yahoo err', sym, e.message);
    return null;
  }
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
    if (d && d.c && d.c > 0) {
      return { price: d.c, prev: d.pc || d.c, ccy: 'USD', name: sym };
    }
  } catch(e) { console.log('Finnhub err', sym, e.message); }
  return null;
}

function isUS(sym) {
  return !sym.endsWith('.T') && !sym.endsWith('.HK') && !sym.endsWith('.SS') && !sym.endsWith('.SZ');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const symbols = (req.query.symbols || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!symbols.length) return res.status(400).json({ error: 'no symbols' });

  const results = await Promise.all(symbols.map(async sym => {
    let data = null;
    if (isUS(sym)) {
      /* 美股：FMP first, Finnhub fallback */
      data = await fetchFMP(sym);
      if (!data) data = await fetchFinnhub(sym);
    } else {
      /* 日股/港股/A股：Yahoo Finance */
      data = await fetchYahoo(sym);
    }
    return { sym, data };
  }));

  const out = {};
  results.forEach(({ sym, data }) => { if (data) out[sym] = data; });
  console.log('returned:', Object.keys(out).length, '/', symbols.length);
  return res.status(200).json(out);
}
