// ARKA Live Price Proxy — HDFC InvestRight API
// Verified working: token exchange + LTP fetch confirmed 13 May 2026

const API_KEY    = 'a642d4448e014a4293deebcdf8205057';
const API_SECRET = 'a68c1e9c86154a5fa6b6cec3d58c46d5';
const BASE       = 'https://developer.hdfcsec.com/oapi/v1';
const UA         = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// VERIFIED NSE tokens (confirmed from live LTP response 13 May 2026)
const NSE_TOKENS = {
  ITC:        1660,
  COALINDIA:  20374,
  TITAN:      3506,
  HDFCBANK:   1333,
  GOLDBEES:   46109,
  TATACONSUM: 3432,
  BSE:        543066,
  CAMS:       2908,
  KOTAKBANK:  1922,
  BHARTIARTL: 10604,
  LAURUSLABS: 19234,
  TCS:        11536,
  SARDAEN:    4739,
  FEDERALBNK: 1023,
  TITAGARH:   3971,
  EMAMILTD:   317,
  BHEL:       438,
  CYIENT:     11483,
  SUNPHARMA:  3351,
  HDFCAMC:    542173,
  POLYCAB:    542652,
  NTPC:       11630,
  SBIN:       3045,
  ANUP:       542584,
  ICICIGI:    541154,
};
const REV = Object.fromEntries(Object.entries(NSE_TOKENS).map(([s,t])=>[t,s]));

function ok(b) {
  return {
    statusCode:200,
    headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},
    body:JSON.stringify(b)
  };
}

exports.handler = async function(event) {
  const p = event.queryStringParameters || {};

  try {
    // Exchange requestToken for accessToken
    if(p.action === 'set-token') {
      const rt = p.requestToken || p.request_token;
      if(!rt) return ok({error:'requestToken required'});
      const url = `${BASE}/access-token?api_key=${API_KEY}&request_token=${rt}`;
      const r   = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json','User-Agent':UA},
        body:JSON.stringify({apiSecret:API_SECRET})
      });
      const d = await r.json();
      const token = d.accessToken || d.access_token;
      if(!token) return ok({error:'No accessToken', details:d});
      return ok({success:true, accessToken:token});
    }

    // Fetch live prices — token passed from browser
    const accessToken = p.hdfc_token;
    if(!accessToken) {
      return ok({
        prices:{}, count:0, auth_required:true,
        login_url:`${BASE}/login?api_key=${API_KEY}`,
      });
    }

    const tokenList = Object.entries(NSE_TOKENS)
      .map(([sym,tok])=>({exchange:'NSE',token:String(tok)}));

    const r = await fetch(`${BASE}/fetch-ltp?api_key=${API_KEY}`, {
      method:'PUT',
      headers:{Authorization:accessToken,'User-Agent':UA,'Content-Type':'application/json'},
      body:JSON.stringify({data:tokenList})
    });
    const d = await r.json();

    if(d.meta?.statusCode !== 'OK') {
      return ok({prices:{},count:0,error:'LTP failed',details:d.meta});
    }

    const prices = {};
    (d.data||[]).forEach(item => {
      const sym = REV[parseInt(item.token)];
      if(!sym) return;
      const ltp  = parseFloat(item.ltp);
      const prev = parseFloat(item.prev_close);
      prices[sym] = {
        price:   ltp,
        chg:     parseFloat((ltp-prev).toFixed(2)),
        chgPct:  parseFloat(((ltp-prev)/prev*100).toFixed(2)),
      };
    });

    return ok({prices, count:Object.keys(prices).length, timestamp:new Date().toISOString()});

  } catch(e) {
    return ok({prices:{},count:0,error:e.message});
  }
};
