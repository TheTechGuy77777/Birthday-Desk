const crypto = require("crypto");
const { q } = require("../lib/db");
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const KEY = process.env.SUPABASE_SERVICE_KEY;
const PHONE_RE = /^\+\d{7,15}$/;

// Same idea as the database rule: ignore case, punctuation and word order
const nameKey = (s) =>
  String(s).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).sort().join(" ");

class BadInput extends Error {}

async function uploadPhoto(dataUrl) {
  if (typeof dataUrl !== "string" || dataUrl.length > 600000) throw new BadInput();
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new BadInput();
  const buf = Buffer.from(m[1], "base64");
  if (buf.length > 400000 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new BadInput();
  const file = crypto.randomUUID() + ".jpg";
  const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/photos/${file}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "image/jpeg" },
    body: buf,
  });
  if (!r.ok) throw new Error("upload failed: " + (await r.text()));
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/photos/${file}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot

  const name = String(b.name || "").trim().slice(0, 80);
  const occupation = String(b.occupation || "").trim().slice(0, 120);
  const phoneRaw = String(b.phone || "").trim();
  const phone = phoneRaw.replace(/[\s\-().]/g, "");
  const month = Number(b.month);
  const day = Number(b.day);

  if (!name || !b.consent || !(month >= 1 && month <= 12) || !(day >= 1 && day <= 31))
    return res.status(400).json({ error: "Please fill in your name, birthday and tick the consent box." });
  if (day > DAYS[month - 1]) return res.status(400).json({ error: "That date doesn't exist." });
  if (phoneRaw && !PHONE_RE.test(phone))
    return res.status(400).json({ error: "Enter the phone number with country code, like +234 803 000 0000." });

  try {
    const photo_url = b.photo ? await uploadPhoto(b.photo) : null;
    const hasProfile = !!(occupation || photo_url || phone);
    const row = { name, month, day };
    if (occupation) row.occupation = occupation;
    if (photo_url) row.photo_url = photo_url;
    if (phone) row.phone = phone;

    const done = () => res.json({ ok: true, pending: hasProfile });

    try {
      await q("/birthdays", { method: "POST", body: JSON.stringify(row) });
      return done();
    } catch (e) {
      if (e.status !== 409) throw e;
    }

    // Already registered: if a profile was sent, update it (hidden until the admin approves)
    const dup = { error: "This person is already registered." };
    if (!hasProfile) return res.status(409).json(dup);
    const rows = await q(`/birthdays?month=eq.${month}&day=eq.${day}&select=id,name`);
    const hit = rows.find((r) => nameKey(r.name) === nameKey(name));
    if (!hit) return res.status(409).json(dup);
    const patch = { approved: false };
    if (occupation) patch.occupation = occupation;
    if (photo_url) patch.photo_url = photo_url;
    if (phone) patch.phone = phone;
    await q("/birthdays?id=eq." + hit.id, { method: "PATCH", body: JSON.stringify(patch) });
    return done();
  } catch (e) {
    if (e instanceof BadInput)
      return res.status(400).json({ error: "That photo couldn't be used. Try a different picture." });
    console.error(e);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
