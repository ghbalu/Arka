// ARKA MF NAV Proxy — Netlify Serverless Function
// Fetches MF NAVs from mfapi.in server-side (no CORS issues)
// Endpoint: /api/navs

const MF_SEARCH = {
  hdfc_def:   {q:'HDFC Defence Fund Direct Growth',                    min:22,  max:40},
  kotak_mc:   {q:'Kotak Flexicap Fund Regular Growth',                 min:100, max:200},
  canara_sc:  {q:'Canara Robeco Small Cap Regular Growth',             min:30,  max:55},
  axis_sc:    {q:'Axis Small Cap Fund Regular Growth',                 min:80,  max:150},
  icici_ma:   {q:'ICICI Prudential Multi Asset Fund Regular Growth',   min:700, max:950},
  bajaj_fc:   {q:'Bajaj Finserv Flexi Cap Fund Regular Growth',        min:10,  max:25},
  hdfc_arb:   {q:'HDFC Arbitrage Fund Wholesale Growth',               min:28,  max:38},
  icici_arb:  {q:'ICICI Prudential Equity Arbitrage Fund Regular',     min:30,  max:42},
  nippon_mc:  {q:'Nippon India Multi Cap Fund Growth',                 min:250, max:380},
  mirae_es:   {q:'Mirae Asset Equity Savings Fund Regular Growth',     min:18,  max:26},
  hdfc_mc:    {q:'HDFC Multi Cap Fund Regular Growth',                 min:15,  max:25},
  hdfc_mid:   {q:'HDFC Mid Cap Opportunities Fund Regular Growth',     min:170, max:240},
  icici_gilt: {q:'ICICI Prudential Gilt Fund Regular Growth',          min:90,  max:120},
  sbi_gilt:   {q:'SBI Gilt Fund Regular Growth',                       min:58,  max:78},
};

async function getNav(id, info) {
  try {
    const searchUrl = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(info.q)}`;
    const r = await fetch(searchUrl, {headers:{'User-Agent':'Mozilla/5.0'}});
    if(!r.ok) return null;
    const results = await r.json();
    if(!results?.length) return null;

    for(const fund of results.slice(0,5)) {
      try {
        const r2 = await fetch(`https://api.mfapi.in/mf/${fund.schemeCode}/latest`);
        if(!r2.ok) continue;
        const d = await r2.json();
        const nav = parseFloat(d?.data?.[0]?.nav);
        if(!isNaN(nav) && nav >= info.min && nav <= info.max) {
          return { nav, date: d?.data?.[0]?.date || '', name: fund.schemeName };
        }
      } catch {}
    }
  } catch {}
  return null;
}

exports.handler = async function() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // Fetch all NAVs in parallel
    const entries = Object.entries(MF_SEARCH);
    const results = await Promise.allSettled(
      entries.map(([id, info]) => getNav(id, info))
    );

    const navs = {};
    results.forEach((r, i) => {
      const [id] = entries[i];
      if(r.status === 'fulfilled' && r.value) {
        navs[id] = r.value;
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        navs,
        timestamp: new Date().toISOString(),
        count: Object.keys(navs).length
      })
    };
  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({error: err.message}) };
  }
};
