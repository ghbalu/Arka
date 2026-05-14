// ARKA Security Master — fetch NSE token numbers for our stocks
// Call: /.netlify/functions/secmaster?symbols=COALINDIA,ITC,HDFCBANK

const API_KEY = '26f753797a6b43fab202d33f042a62c5';
const BASE    = 'https://developer.hdfcsec.com/oapi/v1';
const UA      = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// We need an access token to call security master
// Pass it as query param for now
exports.handler = async function(event) {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  const p = event.queryStringParameters || {};

  try {
    const accessToken = p.token;
    if(!accessToken) return {
      statusCode:200, headers,
      body: JSON.stringify({error:'token required'})
    };

    // Fetch security master - search by symbol
    const symbols = (p.symbols || 'COALINDIA,ITC,GOLDBEES,TATACONSUM,TITAN,HDFCBANK,BSE,CAMS').split(',');
    const results = {};

    for(const sym of symbols) {
      try {
        const r = await fetch(`${BASE}/security-master?api_key=${API_KEY}&symbol=${sym.trim()}&exchange=NSE`, {
          headers: {'Authorization': accessToken, 'User-Agent': UA}
        });
        const d = await r.json();
        console.log(`${sym}:`, JSON.stringify(d).substring(0,150));
        results[sym] = d;
      } catch(e) {
        results[sym] = {error: e.message};
      }
    }

    return {statusCode:200, headers, body: JSON.stringify({results, timestamp: new Date().toISOString()})};

  } catch(err) {
    return {statusCode:200, headers, body: JSON.stringify({error: err.message})};
  }
};
