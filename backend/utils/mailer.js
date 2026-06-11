const nodemailer = require("nodemailer");

const hasResendConfig = () =>
  process.env.RESEND_API_KEY &&
  !String(process.env.RESEND_API_KEY).includes("your_") &&
  !String(process.env.RESEND_API_KEY).includes("paste_");

const hasSmtpConfig = () =>
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  !String(process.env.SMTP_USER).includes("your_email") &&
  !String(process.env.SMTP_PASS).includes("your_app_password");

const formatSender = () => {
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) return undefined;
  return from.includes("<") ? from : `"Tour Report Management" <${from}>`;
};

const sendWithResend = async ({ to, subject, text, html }) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: formatSender(),
      to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${errorText}`);
  }

  return true;
};

const emailShell = ({ title, preview, children }) => `
  <div style="margin:0;padding:24px;background:#eef2ff;font-family:Arial,'Segoe UI',sans-serif;color:#172033;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <div style="background:#5b4ce6;color:#ffffff;padding:18px 22px;">
        <div style="font-size:13px;letter-spacing:.4px;text-transform:uppercase;font-weight:700;">Tour Report Management</div>
        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;">${title}</h1>
      </div>
      <div style="padding:22px;">
        <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">${preview}</p>
        ${children}
      </div>
      <div style="padding:14px 22px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5;">
        This is an automated email from Tour Report Management. Please do not reply to this message.
      </div>
    </div>
  </div>
`;

const sendMail = async ({ to, subject, text, html }) => {
  if (hasResendConfig()) {
    return sendWithResend({ to, subject, text, html });
  }

  if (!hasSmtpConfig()) {
    console.log("[email skipped]", { to, subject, text });
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: formatSender(),
    to,
    subject,
    text,
    html,
  });

  return true;
};

module.exports = { emailShell, sendMail };
