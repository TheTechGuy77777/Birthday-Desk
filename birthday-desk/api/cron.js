const { q } = require("../lib/db");
const { send } = require("../lib/notify");

module.exports = async (req, res) => {
  const pw = process.env.ADMIN_PASSWORD;
  const isTest = req.query.test === "1" && pw && req.headers["x-admin-password"] === pw;
  const isCron = process.env.CRON_SECRET && req.headers.authorization === "Bearer " + process.env.CRON_SECRET;
  if (!isTest && !isCron) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (isTest) {
      await send("✅ Test reminder from Birthday Desk. If you can read this, delivery works.");
      return res.json({ ok: true });
    }

    // Today's date in the configured timezone (YYYY-MM-DD)
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: process.env.TIMEZONE || "Africa/Lagos",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const [y, m, d] = today.split("-").map(Number);

    // Cron can fire twice: claim today first, skip if already claimed
    const claimed = await q("/sent_log?on_conflict=sent_on", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({ sent_on: today }),
    });
    if (!claimed.length) return res.json({ ok: true, skipped: "already sent today" });

    try {
      const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      const filter =
        m === 2 && d === 28 && !leap
          ? "or=(and(month.eq.2,day.eq.28),and(month.eq.2,day.eq.29))" // 29 Feb people on non-leap years
          : `month=eq.${m}&day=eq.${d}`;
      const rows = await q(`/birthdays?${filter}&select=name&order=name.asc`);
      if (!rows.length) return res.json({ ok: true, sent: 0 });

      const wish = process.env.WISH_TEMPLATE ||
        "Happy birthday, {name}! 🎉 Wishing you good health, joy and success in the year ahead.";
      const text =
        `🎂 Birthdays today (${rows.length})\n` +
        rows.map((r) => "• " + r.name).join("\n") +
        "\n\nSuggested wishes:\n" +
        rows.map((r) => wish.replace("{name}", r.name)).join("\n");

      await send(text);
      res.json({ ok: true, sent: rows.length });
    } catch (e) {
      await q("/sent_log?sent_on=eq." + today, { method: "DELETE" }); // allow a retry
      throw e;
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
};
