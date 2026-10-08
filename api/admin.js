const { q } = require("../lib/db");

module.exports = async (req, res) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || req.headers["x-admin-password"] !== pw)
    return res.status(401).json({ error: "Wrong password" });

  try {
    if (req.method === "GET") {
      const rows = await q("/birthdays?select=id,name,month,day&order=month.asc,day.asc,name.asc");
      return res.json(rows);
    }
    if (req.method === "DELETE") {
      const id = parseInt(req.query.id, 10);
      if (!id) return res.status(400).json({ error: "Bad id" });
      await q("/birthdays?id=eq." + id, { method: "DELETE" });
      return res.json({ ok: true });
    }
    res.status(405).json({ error: "Not allowed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
};
