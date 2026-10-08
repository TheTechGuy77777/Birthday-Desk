const headers = (extra = {}) => ({
  apikey: process.env.SUPABASE_SERVICE_KEY,
  Authorization: "Bearer " + process.env.SUPABASE_SERVICE_KEY,
  "Content-Type": "application/json",
  ...extra,
});

async function q(path, opts = {}) {
  const r = await fetch(process.env.SUPABASE_URL + "/rest/v1" + path, {
    ...opts,
    headers: headers(opts.headers),
  });
  const t = await r.text();
  if (!r.ok) {
    const e = new Error(t);
    e.status = r.status;
    throw e;
  }
  return t ? JSON.parse(t) : null;
}

module.exports = { q };
