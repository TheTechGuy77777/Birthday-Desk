const { q } = require("../lib/db");
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  if (b.website) return res.json({ ok: true }); // honeypot: bots fill this in

  const name = String(b.name || "").trim().slice(0, 80);
  const month = Number(b.month);
  const day = Number(b.day);

  if (!name || !b.consent || !(month >= 1 && month <= 12) || !(day >= 1 && day <= 31))
    return res.status(400).json({ error: "Please fill in every field and tick the consent box." });
  if (day > DAYS[month - 1])
    return res.status(400).json({ error: "That date doesn't exist." });

  try {
    await q("/birthdays", { method: "POST", body: JSON.stringify({ name, month, day }) });
    res.json({ ok: true });
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ error: "This person is already registered." });
    console.error(e);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
