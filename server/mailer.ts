import 'dotenv/config';
import nodemailer from 'nodemailer';

function smtpConfiguration() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !Number.isInteger(port) || port <= 0 || !user || !password || !from) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM must be configured.');
  }
  return { host, port, user, password, from };
}

export function passwordResetUrl(rawToken: string): string {
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, '');
  if (!appUrl) throw new Error('APP_URL must be configured for password recovery.');
  return `${appUrl}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export async function sendPasswordResetEmail(recipient: string, resetUrl: string): Promise<void> {
  const configuration = smtpConfiguration();
  const transporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.port === 465,
    auth: { user: configuration.user, pass: configuration.password },
  });
  await transporter.sendMail({
    from: configuration.from,
    to: recipient,
    subject: 'Konjo Coffee CMS password reset',
    text: `A password reset was requested for your Konjo Coffee CMS Super Admin account. This link expires in 20 minutes and can be used once:\n\n${resetUrl}\n\nIf you did not request this, no action is required.`,
    html: `<p>A password reset was requested for your Konjo Coffee CMS Super Admin account.</p><p>This link expires in 20 minutes and can be used once.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, no action is required.</p>`,
  });
}
