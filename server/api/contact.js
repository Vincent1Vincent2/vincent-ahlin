// ── CONTACT ENDPOINT ──────────────────────────────────────────────────────────
// Vercel serverless function — receives POST from contact.html,
// sends an email to Gmail via Nodemailer + Gmail SMTP.

const nodemailer = require("nodemailer");

// ── CORS ──────────────────────────────────────────────────────────────────────

function setCors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── VALIDATE ──────────────────────────────────────────────────────────────────

function validate(body) {
  const { name, subject, message, email } = body;
  if (!name || typeof name !== "string") return "Missing name";
  if (!subject || typeof subject !== "string") return "Missing subject";
  if (!message || typeof message !== "string") return "Missing message";
  if (!email || typeof email !== "string") return "Missing email";
  if (!email.includes("@")) return "Invalid email";
  if (name.length > 200) return "Name too long";
  if (message.length > 5000) return "Message too long";
  return null;
}

// ── HTML ESCAPE ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── FORMAT EMAIL ──────────────────────────────────────────────────────────────

function formatEmail({ name, subject, message, email }) {
  const typeLabel = subject === "job" ? "Job opportunity" : "Freelance work";

  const text = `
New contact from your portfolio

Name:    ${name}
Type:    ${typeLabel}
Email:   ${email}

Message:
${message}
  `.trim();

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#1a1a2e">
      <p style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:24px">
        New contact — portfolio
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding:8px 0;color:#888;font-size:13px;width:80px">Name</td>
          <td style="padding:8px 0;font-size:13px;font-weight:600">${esc(name)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;font-size:13px">Type</td>
          <td style="padding:8px 0;font-size:13px">${esc(typeLabel)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;font-size:13px">Reply to</td>
          <td style="padding:8px 0;font-size:13px">
            <a href="mailto:${esc(email)}" style="color:#4a9eff">${esc(email)}</a>
          </td>
        </tr>
      </table>

      <div style="background:#f4f4f8;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:14px;line-height:1.7;color:#333">
          ${esc(message).replace(/\n/g, "<br>")}
        </p>
      </div>

      <a
        href="mailto:${esc(email)}?subject=Re: Your message"
        style="display:inline-block;padding:10px 20px;background:#4a9eff;color:#fff;border-radius:999px;font-size:13px;font-weight:600;text-decoration:none"
      >
        Reply to ${esc(name)}
      </a>
    </div>
  `;

  return { text, html, typeLabel };
}

// ── TRANSPORTER ───────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  setCors(req, res);

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const error = validate(req.body || {});
  if (error) {
    return res.status(400).json({ error });
  }

  const { name, subject, message, email } = req.body;
  const { text, html, typeLabel } = formatEmail({
    name,
    subject,
    message,
    email,
  });

  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.GMAIL_USER}>`,
      to: process.env.CONTACT_TO,
      replyTo: email,
      subject: `[Portfolio] ${typeLabel} — ${name}`,
      text,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Mail send failed:", err.message);
    return res.status(500).json({ error: "Failed to send" });
  }
};
