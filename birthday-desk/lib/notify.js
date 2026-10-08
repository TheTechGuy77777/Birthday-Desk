const env = process.env;

async function send(text) {
  const ch = (env.NOTIFY_CHANNEL || "telegram").toLowerCase();
  const json = { "Content-Type": "application/json" };
  let r;

  if (ch === "telegram") {
    r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
    });
  } else if (ch === "email") {
    r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { ...json, Authorization: "Bearer " + env.RESEND_API_KEY },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [env.ADMIN_EMAIL],
        subject: "Birthday reminder",
        text,
      }),
    });
  } else if (ch === "whatsapp") {
    // Template variables can't contain line breaks, so flatten the text
    const flat = text.replace(/\s*\n+\s*/g, " | ");
    r = await fetch(
      `https://graph.facebook.com/${env.WHATSAPP_API_VERSION || "v23.0"}/${env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: { ...json, Authorization: "Bearer " + env.WHATSAPP_TOKEN },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: String(env.ADMIN_WHATSAPP).replace(/\D/g, ""),
          type: "template",
          template: {
            name: env.WHATSAPP_TEMPLATE,
            language: { code: "en" },
            components: [{ type: "body", parameters: [{ type: "text", text: flat }] }],
          },
        }),
      }
    );
  } else {
    throw new Error("Unknown NOTIFY_CHANNEL: " + ch);
  }

  if (!r.ok) throw new Error(ch + " failed: " + (await r.text()));
}

module.exports = { send };
