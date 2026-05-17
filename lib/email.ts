import { Resend } from 'resend';
import { bodyPartPhrase } from './bodyPart';
import { getPromisResponses } from './promisDb';

// Lazy initialize Resend client to avoid build errors when API key is missing
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Email configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'OrthoIQ <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://orthoiq.vercel.app';

// ============================================
// Email Templates - Professional but Approachable
// ============================================

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send magic link email for authentication
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const magicLink = `${APP_URL}/api/auth/verify-magic-link?token=${token}`;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Sign in to OrthoIQ',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to OrthoIQ</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">OrthoIQ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI-Powered Orthopedic Consultation</p>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

            <p style="font-size: 16px; margin-bottom: 25px;">
              Click the button below to securely access OrthoIQ:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 14px 32px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Sign In to OrthoIQ
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">

            <p style="font-size: 12px; color: #999; text-align: center;">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${magicLink}" style="color: #667eea; word-break: break-all;">${magicLink}</a>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>Best,<br>The OrthoIQ Team</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi there,

Click the link below to securely access OrthoIQ:

${magicLink}

This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.

Best,
The OrthoIQ Team
      `.trim()
    });

    if (error) {
      console.error('Error sending magic link email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Magic link email sent to ${email}, messageId: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send welcome email after email verification
 */
export async function sendWelcomeEmail(email: string): Promise<EmailResult> {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to OrthoIQ - Your Recovery Journey Begins',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to OrthoIQ</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to OrthoIQ!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your AI-Powered Recovery Partner</p>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              You now have access to AI-powered orthopedic consultations backed by a panel of specialist agents.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">What's next:</h3>
              <ul style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 10px;">Ask your first question about any orthopedic concern</li>
                <li style="margin-bottom: 10px;">Receive personalized guidance from our AI specialists</li>
                <li style="margin-bottom: 10px;">Track your recovery with milestone check-ins at 2, 4, and 8 weeks</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${APP_URL}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 14px 32px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Start Your Consultation
              </a>
            </div>

            <p style="font-size: 14px; color: #666;">
              We're here to support your recovery journey.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>Best,<br>The OrthoIQ Team</p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to OrthoIQ!

You now have access to AI-powered orthopedic consultations backed by a panel of specialist agents.

What's next:
• Ask your first question about any orthopedic concern
• Receive personalized guidance from our AI specialists
• Track your recovery with milestone check-ins at 2, 4, and 8 weeks

Visit ${APP_URL} to start your consultation.

We're here to support your recovery journey.

Best,
The OrthoIQ Team
      `.trim()
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Welcome email sent to ${email}, messageId: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Build a short, factual reference line citing the most recent completed
 * milestone's delta from baseline. Returns null if no prior completed
 * milestone exists. Pain Interference is reported with reversed sign so
 * "down N points" matches everyday language (lower interference = better).
 */
async function buildPriorMilestoneLine(
  consultationId: string,
  currentWeek: number
): Promise<string | null> {
  try {
    const rows = await getPromisResponses(consultationId);
    if (!rows || rows.length === 0) return null;

    const baseline = rows.find((r) => r.timepoint === 'baseline');
    if (!baseline) return null;

    const weekToTp: Record<number, string> = { 2: '2week', 4: '4week', 8: '8week' };
    const priorWeeks = [2, 4].filter((w) => w < currentWeek);
    let mostRecent: { week: number; row: any } | null = null;
    for (const w of priorWeeks) {
      const r = rows.find((x) => x.timepoint === weekToTp[w]);
      if (r) mostRecent = { week: w, row: r };
    }
    if (!mostRecent) return null;

    const pfBaseline = Number(baseline.physical_function_t_score);
    const pfPrior = Number(mostRecent.row.physical_function_t_score);
    const piBaseline = baseline.pain_interference_t_score != null ? Number(baseline.pain_interference_t_score) : null;
    const piPrior = mostRecent.row.pain_interference_t_score != null ? Number(mostRecent.row.pain_interference_t_score) : null;

    const fragments: string[] = [];
    if (!Number.isNaN(pfBaseline) && !Number.isNaN(pfPrior)) {
      const d = pfPrior - pfBaseline;
      if (Math.abs(d) >= 1) {
        fragments.push(`physical function ${d >= 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(0)} points from baseline`);
      }
    }
    if (piBaseline != null && piPrior != null) {
      const d = piBaseline - piPrior; // sign reversed: higher PI = worse
      if (Math.abs(d) >= 1) {
        fragments.push(`pain ${d >= 0 ? 'down' : 'up'} ${Math.abs(d).toFixed(0)} points from baseline`);
      }
    }
    if (fragments.length === 0) return null;
    return `Your week-${mostRecent.week} check-in showed ${fragments.join(' and ')}. A short update will extend the picture.`;
  } catch (e) {
    console.warn('buildPriorMilestoneLine failed:', e);
    return null;
  }
}

/**
 * Send milestone follow-up email. Plain, clinic-style — no marketing chrome.
 */
export async function sendMilestoneEmail(
  email: string,
  consultationId: string,
  milestoneDay: number,
  bodyPart?: string | null
): Promise<EmailResult> {
  const trackingLink = `${APP_URL}/track/${consultationId}`;
  const weekNumber = Math.round(milestoneDay / 7);
  const recoveryPhrase = `${bodyPartPhrase(bodyPart)} recovery`;
  const consultationPhrase = bodyPart && bodyPart !== 'other'
    ? `your ${bodyPart} consultation`
    : 'your consultation';

  const priorLine = weekNumber > 2 ? await buildPriorMilestoneLine(consultationId, weekNumber) : null;

  const subject = `Week ${weekNumber}: How is ${recoveryPhrase}?`;
  const heading = `Week ${weekNumber} check-in — ${consultationPhrase}`;

  const intro = `${weekNumber} weeks since ${consultationPhrase}.`;
  const ask = priorLine
    ? `${priorLine}`
    : `A short check-in will show how ${recoveryPhrase} is tracking against where you started. Takes about 2 minutes.`;

  const textBody = [
    intro,
    '',
    ask,
    '',
    `Start week ${weekNumber} check-in:`,
    trackingLink,
    '',
    '— OrthoIQ follow-up',
  ].join('\n');

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.55; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
  <p style="font-size: 16px; margin: 0 0 16px 0; color: #111827;">${intro}</p>
  <p style="font-size: 16px; margin: 0 0 28px 0; color: #374151;">${ask}</p>
  <p style="margin: 0 0 28px 0;">
    <a href="${trackingLink}"
       style="display: inline-block; padding: 12px 22px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">
      Start week ${weekNumber} check-in
    </a>
  </p>
  <p style="font-size: 13px; color: #6b7280; margin: 32px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
    — OrthoIQ follow-up
  </p>
</body>
</html>`;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error('Error sending milestone email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Milestone email (day ${milestoneDay}, body_part=${bodyPart ?? 'null'}) sent to ${email}, messageId: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending milestone email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send rate limit warning email (soft notification)
 */
export async function sendRateLimitWarningEmail(
  email: string,
  questionsUsed: number,
  limit: number
): Promise<EmailResult> {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'OrthoIQ: Daily Question Limit Reached',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Limit Reached</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Daily Limit Reached</h1>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              You've used all ${limit} of your daily consultations on OrthoIQ. Your questions will reset at midnight UTC.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Want unlimited access?</strong> Try OrthoIQ on Farcaster for unlimited consultations and exclusive features like recovery tracking with PROMIS milestones.
              </p>
            </div>

            <p style="font-size: 14px; color: #666;">
              Thank you for using OrthoIQ. We're here to support your recovery journey.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>Best,<br>The OrthoIQ Team</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi there,

You've used all ${limit} of your daily consultations on OrthoIQ. Your questions will reset at midnight UTC.

Want unlimited access? Try OrthoIQ on Farcaster for unlimited consultations and exclusive features like recovery tracking with PROMIS milestones.

Thank you for using OrthoIQ. We're here to support your recovery journey.

Best,
The OrthoIQ Team
      `.trim()
    });

    if (error) {
      console.error('Error sending rate limit warning email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Rate limit warning email sent to ${email}, messageId: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending rate limit warning email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
