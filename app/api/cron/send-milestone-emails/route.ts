import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { sendMilestoneEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

// Milestone days for follow-up
const MILESTONE_DAYS = [14, 28, 56];

// Cron job to send milestone follow-up emails
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

    console.log('[Cron] Starting milestone email job...');

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // For each milestone day, find consultations that are due
    for (const milestoneDay of MILESTONE_DAYS) {
      try {
        // Find web users with consultations at this milestone
        // Only send to users who haven't completed this milestone yet
        const weekNumber = Math.floor(milestoneDay / 7);
        const weekPattern = `%Week ${weekNumber}%`;

        const dueConsultations = await sql`
          SELECT
            c.id as consultation_id,
            c.case_id,
            c.question,
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
              WHERE fm.consultation_id = c.id
                AND fm.milestone_day = ${milestoneDay}
                AND fm.completed = true
            )
            AND NOT EXISTS (
              SELECT 1 FROM notification_logs nl
              WHERE nl.fid = wu.id::text
                AND nl.title LIKE ${weekPattern}
                AND nl.created_at > NOW() - INTERVAL '1 day'
            )
          LIMIT 100
        `;

        console.log(`[Cron] Found ${dueConsultations.length} consultations due for ${milestoneDay}-day milestone`);

        for (const consultation of dueConsultations) {
          results.processed++;

          try {
            await sendMilestoneEmail(
              consultation.email,
              consultation.case_id || consultation.consultation_id.toString(),
              milestoneDay
            );

            // Log the notification
            await sql`
              INSERT INTO notification_logs (fid, title, body, target_url, delivered, created_at)
              VALUES (
                ${consultation.web_user_id.toString()},
                ${'Week ' + Math.floor(milestoneDay / 7) + ' Check-in'},
                ${'Milestone follow-up email sent'},
                ${'/track/' + (consultation.case_id || consultation.consultation_id)},
                true,
                NOW()
              )
            `;

            results.sent++;
            console.log(`[Cron] Sent ${milestoneDay}-day milestone email to ${consultation.email}`);

          } catch (emailError) {
            results.failed++;
            const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
            results.errors.push(`Failed to send to ${consultation.email}: ${errorMsg}`);
            console.error(`[Cron] Failed to send milestone email:`, emailError);
          }
        }

      } catch (queryError) {
        console.error(`[Cron] Failed to query ${milestoneDay}-day milestones:`, queryError);
        results.errors.push(`Query error for ${milestoneDay}-day milestone: ${queryError instanceof Error ? queryError.message : 'Unknown'}`);
      }
    }

    console.log(`[Cron] Milestone email job complete. Processed: ${results.processed}, Sent: ${results.sent}, Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      message: 'Milestone email job completed',
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Cron] Milestone email job failed:', error);
    return NextResponse.json(
      {
        error: 'Milestone email job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
