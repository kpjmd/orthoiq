import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { sendMilestoneEmail } from '@/lib/email';
import { sendMilestoneNotification } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

// Milestone days for follow-up (2, 4, 8 weeks)
const MILESTONE_DAYS = [14, 28, 56];

// Combined cron job to send milestone follow-up notifications
// Handles both web email users and Farcaster miniapp users
// Runs daily at 9am UTC
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      const isVercelCron = request.headers.get('x-vercel-cron') === '1';
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[Cron] Starting milestone notification job (email + Farcaster)...');

    const results = {
      emailProcessed: 0,
      emailSent: 0,
      emailFailed: 0,
      farcasterProcessed: 0,
      farcasterSent: 0,
      farcasterFailed: 0,
      errors: [] as string[]
    };

    // For each milestone day, find consultations that are due
    for (const milestoneDay of MILESTONE_DAYS) {
      try {
        const weekNumber = Math.floor(milestoneDay / 7);
        const weekPattern = `%Week ${weekNumber}%`;

        // ===== WEB EMAIL USERS =====
        // Find web users with verified emails
        const dueEmailConsultations = await sql`
          SELECT
            c.id,
            c.consultation_id,
            c.created_at,
            wu.id as web_user_id,
            wu.email
          FROM consultations c
          INNER JOIN web_users wu ON c.web_user_id = wu.id
          WHERE wu.email_verified = true
            AND c.created_at <= NOW() - MAKE_INTERVAL(days => ${milestoneDay})
            AND c.created_at > NOW() - MAKE_INTERVAL(days => ${milestoneDay + 1})
            AND NOT EXISTS (
              SELECT 1 FROM feedback_milestones fm
              WHERE fm.consultation_id = c.consultation_id
                AND fm.milestone_day = ${milestoneDay}
                AND fm.milestone_achieved = true
            )
            AND NOT EXISTS (
              SELECT 1 FROM notification_logs nl
              WHERE nl.fid = wu.id::text
                AND nl.title LIKE ${weekPattern}
                AND nl.created_at > NOW() - INTERVAL '1 day'
            )
          LIMIT 100
        `;

        console.log(`[Cron] Found ${dueEmailConsultations.length} email consultations due for ${milestoneDay}-day milestone`);

        for (const consultation of dueEmailConsultations) {
          results.emailProcessed++;

          try {
            await sendMilestoneEmail(
              consultation.email,
              consultation.consultation_id,
              milestoneDay
            );

            // Log the notification
            await sql`
              INSERT INTO notification_logs (fid, title, body, target_url, delivered, created_at)
              VALUES (
                ${consultation.web_user_id.toString()},
                ${'Week ' + weekNumber + ' Check-in'},
                ${'Milestone follow-up email sent'},
                ${'/track/' + consultation.consultation_id},
                true,
                NOW()
              )
            `;

            results.emailSent++;
            console.log(`[Cron] Sent ${milestoneDay}-day email to ${consultation.email}`);

          } catch (emailError) {
            results.emailFailed++;
            const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
            results.errors.push(`Email failed for ${consultation.email}: ${errorMsg}`);
            console.error(`[Cron] Failed to send milestone email:`, emailError);
          }
        }

        // ===== FARCASTER MINIAPP USERS =====
        // Find Farcaster users with notification tokens enabled
        const dueFarcasterConsultations = await sql`
          SELECT
            c.id,
            c.consultation_id,
            c.fid,
            c.created_at
          FROM consultations c
          WHERE c.fid IS NOT NULL
            AND c.web_user_id IS NULL
            AND c.created_at <= NOW() - MAKE_INTERVAL(days => ${milestoneDay})
            AND c.created_at > NOW() - MAKE_INTERVAL(days => ${milestoneDay + 1})
            AND EXISTS (
              SELECT 1 FROM notification_tokens nt
              WHERE nt.fid = c.fid
                AND nt.enabled = true
            )
            AND NOT EXISTS (
              SELECT 1 FROM feedback_milestones fm
              WHERE fm.consultation_id = c.consultation_id
                AND fm.milestone_day = ${milestoneDay}
                AND fm.milestone_achieved = true
            )
            AND NOT EXISTS (
              SELECT 1 FROM notification_logs nl
              WHERE nl.fid = c.fid
                AND nl.title LIKE ${weekPattern}
                AND nl.created_at > NOW() - INTERVAL '1 day'
            )
          LIMIT 100
        `;

        console.log(`[Cron] Found ${dueFarcasterConsultations.length} Farcaster consultations due for ${milestoneDay}-day milestone`);

        for (const consultation of dueFarcasterConsultations) {
          results.farcasterProcessed++;

          try {
            const sent = await sendMilestoneNotification(
              consultation.fid,
              consultation.consultation_id,
              milestoneDay
            );

            if (sent) {
              results.farcasterSent++;
              console.log(`[Cron] Sent ${milestoneDay}-day Farcaster notification to FID ${consultation.fid}`);
            } else {
              results.farcasterFailed++;
              results.errors.push(`Farcaster notification failed for FID ${consultation.fid} (no tokens or delivery failed)`);
            }

          } catch (notificationError) {
            results.farcasterFailed++;
            const errorMsg = notificationError instanceof Error ? notificationError.message : 'Unknown error';
            results.errors.push(`Farcaster notification error for FID ${consultation.fid}: ${errorMsg}`);
            console.error(`[Cron] Failed to send Farcaster notification:`, notificationError);
          }
        }

      } catch (queryError) {
        console.error(`[Cron] Failed to query ${milestoneDay}-day milestones:`, queryError);
        results.errors.push(`Query error for ${milestoneDay}-day milestone: ${queryError instanceof Error ? queryError.message : 'Unknown'}`);
      }
    }

    const totalProcessed = results.emailProcessed + results.farcasterProcessed;
    const totalSent = results.emailSent + results.farcasterSent;
    const totalFailed = results.emailFailed + results.farcasterFailed;

    console.log(`[Cron] Milestone notification job complete.`);
    console.log(`[Cron] Email: ${results.emailSent}/${results.emailProcessed} sent`);
    console.log(`[Cron] Farcaster: ${results.farcasterSent}/${results.farcasterProcessed} sent`);
    console.log(`[Cron] Total: ${totalSent}/${totalProcessed} sent, ${totalFailed} failed`);

    return NextResponse.json({
      success: true,
      message: 'Milestone notification job completed',
      summary: {
        totalProcessed,
        totalSent,
        totalFailed
      },
      email: {
        processed: results.emailProcessed,
        sent: results.emailSent,
        failed: results.emailFailed
      },
      farcaster: {
        processed: results.farcasterProcessed,
        sent: results.farcasterSent,
        failed: results.farcasterFailed
      },
      errors: results.errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Cron] Milestone notification job failed:', error);
    return NextResponse.json(
      {
        error: 'Milestone notification job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
