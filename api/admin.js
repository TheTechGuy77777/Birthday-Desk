const { q } = require("../lib/db");
const KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async (req, res) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || req.headers["x-admin-password"] !== pw)
    return res.status(401).json({ error: "Wrong password" });

  try {
    if (req.method === "GET") {
      const rows = await q(
        "/birthdays?select=id,name,month,day,occupation,photo_url,phone,approved&order=month.asc,day.asc,name.asc"
      );
      return res.json(rows);
    }

    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ error: "Bad id" });

    if (req.method === "PATCH") {
      await q("/birthdays?id=eq." + id, {
        method: "PATCH",
        body: JSON.stringify({ approved: req.query.approved === "1" }),
      });
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const [row] = await q("/birthdays?id=eq." + id + "&select=photo_url");
      await q("/birthdays?id=eq." + id, { method: "DELETE" });
      if (row && row.photo_url) {
        const file = row.photo_url.split("/").pop();
        await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/photos/${encodeURIComponent(file)}`, {
          method: "DELETE",
          headers: { apikey: KEY, Authorization: "Bearer " + KEY },
        }).catch(() => {});
      }
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Not allowed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
};
