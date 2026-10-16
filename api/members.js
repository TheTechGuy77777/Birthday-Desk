const { q } = require("../lib/db");

module.exports = async (req, res) => {
  try {
    const rows = await q("/birthdays?approved=eq.true&select=name,occupation,photo_url&order=name.asc");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
};
