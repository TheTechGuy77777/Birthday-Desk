const crypto = require("crypto");
const { q } = require("../lib/db");

const same = (a, b) => {
  const h = (s) => crypto.createHash("sha256").update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store"); // gated data must never be cached
  const code = process.env.MEMBERS_CODE;
  if (!code) return res.status(503).json({ error: "Members page is not set up yet." });

  if (!same(String(req.headers["x-members-code"] || "").trim(), code.trim())) {
    await new Promise((r) => setTimeout(r, 500)); // slows down code guessing
    return res.status(401).json({ error: "Wrong code" });
  }

  try {
    const rows = await q("/birthdays?approved=eq.true&select=name,occupation,photo_url,phone&order=name.asc");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
};
