import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const COMPANY_NAME = process.env.COMPANY_NAME || 'LocalSM';

/**
 * Builds the subject and body for the shortlist email.
 */
const buildShortlistMessage = ({ candidateName, jobRole }) => {
  const subject = `You are shortlisted for ${jobRole} at ${COMPANY_NAME}`;
  const text = `Dear ${candidateName},\n\nWe are pleased to inform you that you have been shortlisted for the position of ${jobRole} at ${COMPANY_NAME}.\n\nYour profile and qualifications stood out during our review process, and we would like to move forward with the next stage of the recruitment process. Further details regarding the interview schedule and additional instructions will be shared with you shortly.\n\nWe appreciate your interest in joining ${COMPANY_NAME} and look forward to connecting with you.\n\nBest regards,\nHiring Team\n${COMPANY_NAME}\n`;
  return { subject, text };
};

/**
 * Sends shortlist email using fallbacks in order:
 * 1. Google Apps Script Webhook
 * 2. SMTP (Nodemailer)
 * 3. Resend API (HTTP call)
 */
export async function sendShortlistedEmail({ candidateName, candidateEmail, jobRole }) {
  const { subject, text } = buildShortlistMessage({ candidateName, jobRole });
  const attempts = [];

  console.log(`[Mailer] Preparing to email ${candidateEmail} for role ${jobRole}...`);

  // --- 1. Google Apps Script Webhook ---
  if (process.env.APPS_SCRIPT_WEBHOOK_URL) {
    try {
      console.log('[Mailer] Attempting Google Apps Script webhook...');
      const response = await fetch(process.env.APPS_SCRIPT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apps-Script-Secret': process.env.APPS_SCRIPT_SHARED_SECRET || ''
        },
        body: JSON.stringify({
          email: candidateEmail,
          subject,
          body: text,
          candidateName,
          jobRole,
          companyName: COMPANY_NAME
        })
      });
      
      if (response.ok) {
        attempts.push({ provider: 'apps-script', success: true });
        return { success: true, provider: 'apps-script', attempts };
      }
      
      const errMsg = await response.text();
      attempts.push({ provider: 'apps-script', success: false, error: errMsg });
      console.warn(`[Mailer] Apps Script webhook returned status ${response.status}:`, errMsg);
    } catch (err) {
      attempts.push({ provider: 'apps-script', success: false, error: err.message });
      console.error('[Mailer] Apps Script webhook failed:', err);
    }
  }

  // --- 2. SMTP via Nodemailer ---
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log('[Mailer] Attempting SMTP sending...');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: process.env.MAIL_FROM || `"${COMPANY_NAME} Hiring Team" <${process.env.SMTP_USER}>`,
        to: candidateEmail,
        subject,
        text
      };

      await transporter.sendMail(mailOptions);
      attempts.push({ provider: 'smtp', success: true });
      return { success: true, provider: 'smtp', attempts };
    } catch (err) {
      attempts.push({ provider: 'smtp', success: false, error: err.message });
      console.error('[Mailer] SMTP delivery failed:', err);
    }
  }

  // --- 3. Resend API ---
  if (process.env.RESEND_API_KEY) {
    try {
      console.log('[Mailer] Attempting Resend API...');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || `Hiring Team <hiring@localsm.com>`,
          to: candidateEmail,
          subject,
          text
        })
      });

      if (response.ok) {
        attempts.push({ provider: 'resend', success: true });
        return { success: true, provider: 'resend', attempts };
      }
      
      const errMsg = await response.text();
      attempts.push({ provider: 'resend', success: false, error: errMsg });
      console.warn(`[Mailer] Resend API returned status ${response.status}:`, errMsg);
    } catch (err) {
      attempts.push({ provider: 'resend', success: false, error: err.message });
      console.error('[Mailer] Resend API failed:', err);
    }
  }

  // All attempts failed or none were configured
  console.error('[Mailer] All shortlist email delivery options failed or were not configured.');
  return { 
    success: false, 
    provider: 'none', 
    attempts, 
    error: 'No email service provider was successfully configured or online.' 
  };
}
