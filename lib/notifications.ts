// Farcaster miniapp notifications service
import { UserTier } from './rateLimit';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://orthoiq.vercel.app';

export interface NotificationData {
  title: string;
  body: string;
  targetUrl?: string;
  imageUrl?: string;
}

export interface ResponseReviewNotification {
  fid: string;
  questionId: string;
  isApproved: boolean;
  reviewerName: string;
  question: string;
  response: string;
}

export interface NotificationContext {
  notificationType?: string;
  consultationId?: string;
}

// Send notification using Farcaster notification API
export async function sendNotification(
  fid: string,
  notification: NotificationData,
  context?: NotificationContext
): Promise<boolean> {
  try {
    // Get the user's notification token
    const tokens = await getNotificationTokens(fid);
    
    if (tokens.length === 0) {
      console.log(`No notification tokens found for FID ${fid}`);
      return false;
    }
    
    // Generate a unique notification ID
    const notificationId = `orthoiq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let success = false;
    
    // Send to all enabled tokens for this user
    for (const token of tokens) {
      try {
        const response = await fetch(token.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId,
            title: notification.title,
            body: notification.body,
            targetUrl: (notification.targetUrl?.startsWith('/')
              ? `${APP_URL}${notification.targetUrl}`
              : notification.targetUrl) || `${APP_URL}/miniapp`,
            tokens: [token.token]
          })
        });
        
        if (response.ok) {
          success = true;
          console.log(`Notification sent successfully to FID ${fid}`);
        } else {
          const errorBody = await response.text().catch(() => 'unable to read body');
          console.error(`Failed to send notification: ${response.status} ${response.statusText}`, errorBody);
        }
      } catch (error) {
        console.error(`Error sending to token ${token.token}:`, error);
      }
    }
    
    // Store notification in database for tracking
    await logNotification(fid, notification, success, context);

    return success;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

export async function sendResponseReviewNotification(data: ResponseReviewNotification): Promise<boolean> {
  // Get the detailed review information
  const reviewDetails = await getDetailedReviewInfo(data.questionId);
  
  let title: string;
  let body: string;
  
  if (data.isApproved) {
    // Determine specific approval type
    if (reviewDetails?.reviewType === 'approve_as_is') {
      title = '✅ Response Approved As-Is';
      body = `Your orthopedic question has been approved without changes by ${data.reviewerName}.`;
    } else if (reviewDetails?.reviewType === 'approve_with_additions') {
      title = '✅ Approved with Additions';
      body = `Your response has been approved with helpful additions by ${data.reviewerName}.`;
    } else if (reviewDetails?.reviewType === 'approve_with_corrections') {
      title = '✅ Approved with Corrections';
      body = `Your response has been approved with important corrections by ${data.reviewerName}.`;
    } else {
      title = '✅ Response Approved';
      body = `Your orthopedic question has been approved by ${data.reviewerName}.`;
    }
  } else {
    // Determine specific rejection reason
    if (reviewDetails?.reviewType === 'reject_medical_inaccuracy') {
      title = '❌ Rejected: Inaccuracy';
      body = `Your response was rejected for medical inaccuracy. Please consult with a healthcare provider.`;
    } else if (reviewDetails?.reviewType === 'reject_inappropriate_scope') {
      title = '❌ Rejected: Scope Issue';
      body = `Your question falls outside our scope. Please consult with a healthcare provider.`;
    } else if (reviewDetails?.reviewType === 'reject_poor_communication') {
      title = '❌ Rejected: Communication';
      body = `Your response was rejected for communication issues. Please consult with a healthcare provider.`;
    } else {
      title = '❌ Response Rejected';
      body = `Your orthopedic question needs revision. Please consult with a healthcare provider.`;
    }
  }
  
  const notification: NotificationData = {
    title,
    body,
    targetUrl: `/miniapp?questionId=${data.questionId}`,
    imageUrl: 'https://orthoiq.vercel.app/icon.png'
  };

  return await sendNotification(data.fid, notification);
}

export async function sendRateLimitResetNotification(fid: string, tier: UserTier): Promise<boolean> {
  const tierLimits = { basic: 1, authenticated: 3, medical: 10 };
  const dailyLimit = tierLimits[tier];

  const notification: NotificationData = {
    title: '🔄 Questions Reset',
    body: `Your daily question limit has reset! You can now ask ${dailyLimit} new question${dailyLimit > 1 ? 's' : ''}.`,
    targetUrl: '/miniapp',
    imageUrl: 'https://orthoiq.vercel.app/icon.png'
  };

  return await sendNotification(fid, notification);
}

export async function sendMilestoneNotification(
  fid: string,
  consultationId: string,
  milestoneDay: number,
  bodyPart?: string | null
): Promise<boolean> {
  const weekNumber = Math.floor(milestoneDay / 7);
  const consultationPhrase = bodyPart && bodyPart !== 'other'
    ? `your ${bodyPart} consultation`
    : 'your consultation';

  const notification: NotificationData = {
    title: `Week ${weekNumber} check-in`,
    body: `${weekNumber} weeks since ${consultationPhrase}. A short check-in shows how recovery is tracking.`,
    targetUrl: `/miniapp?track=${consultationId}&milestone=${milestoneDay}`,
    imageUrl: 'https://orthoiq.vercel.app/icon.png'
  };

  return await sendNotification(fid, notification, {
    notificationType: `promis_milestone_${milestoneDay}`,
    consultationId,
  });
}

// Get notification tokens for a user
async function getNotificationTokens(fid: string): Promise<Array<{token: string, url: string}>> {
  try {
    const result = await sql`
      SELECT token, url FROM notification_tokens 
      WHERE fid = ${fid} AND enabled = true
    `;
    
    return result as Array<{token: string, url: string}>;
  } catch (error) {
    console.error('Failed to get notification tokens:', error);
    return [];
  }
}

// Get detailed review information
async function getDetailedReviewInfo(questionId: string): Promise<{reviewType: string} | null> {
  try {
    const result = await sql`
      SELECT rd.review_type
      FROM reviews r
      JOIN review_details rd ON r.id = rd.review_id
      WHERE r.question_id = ${parseInt(questionId)}
      ORDER BY r.created_at DESC
      LIMIT 1
    `;
    
    return result.length > 0 ? { reviewType: result[0].review_type } : null;
  } catch (error) {
    console.error('Failed to get detailed review info:', error);
    return null;
  }
}

// Log notifications for tracking and debugging
async function logNotification(
  fid: string,
  notification: NotificationData,
  delivered: boolean = false,
  context?: NotificationContext
): Promise<void> {
  try {
    console.log(`[NotificationLog] FID: ${fid}, Title: ${notification.title}, Body: ${notification.body}, Delivered: ${delivered}`);

    await sql`
      INSERT INTO notification_logs (
        fid, title, body, target_url, delivered, created_at,
        notification_type, consultation_id
      )
      VALUES (
        ${fid}, ${notification.title}, ${notification.body},
        ${notification.targetUrl || null}, ${delivered}, NOW(),
        ${context?.notificationType ?? null},
        ${context?.consultationId ?? null}
      )
    `;
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}

// Check if user has notifications enabled
export async function checkNotificationPermissions(fid: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM notification_tokens
      WHERE fid = ${fid} AND enabled = true
    `;

    return parseInt(result[0].count) > 0;
  } catch (error) {
    console.error('Failed to check notification permissions:', error);
    return false;
  }
}

// Check notification status with error distinction (for status endpoint)
export async function checkNotificationStatus(fid: string): Promise<{
  enabled: boolean;
  error: string | null;
  tokenCount: number;
}> {
  const result = await sql`
    SELECT COUNT(*) as count FROM notification_tokens
    WHERE fid = ${fid} AND enabled = true
  `;

  const tokenCount = parseInt(result[0].count);
  return {
    enabled: tokenCount > 0,
    error: null,
    tokenCount,
  };
}

// Request notification permissions from user (handled by mini app UI)
export async function requestNotificationPermissions(fid: string): Promise<boolean> {
  try {
    console.log(`[NotificationPermissions] User should enable notifications through mini app for FID: ${fid}`);
    // This is handled by the Farcaster client when user enables notifications
    // Our webhook will receive the token when notifications are enabled
    return await checkNotificationPermissions(fid);
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

// Enable notification permissions for a user
export async function enableNotificationPermissions(fid: string): Promise<boolean> {
  try {
    console.log(`[NotificationPermissions] Enabling notifications for FID: ${fid}`);

    // Re-enable existing notification tokens
    await sql`
      UPDATE notification_tokens
      SET enabled = true, updated_at = NOW()
      WHERE fid = ${fid}
    `;

    return true;
  } catch (error) {
    console.error('Failed to enable notification permissions:', error);
    return false;
  }
}

// Disable notification permissions for a user
export async function disableNotificationPermissions(fid: string): Promise<boolean> {
  try {
    console.log(`[NotificationPermissions] Disabling notifications for FID: ${fid}`);

    // Disable all tokens for this user
    await sql`
      UPDATE notification_tokens
      SET enabled = false
      WHERE fid = ${fid}
    `;

    return true;
  } catch (error) {
    console.error('Failed to disable notification permissions:', error);
    return false;
  }
}

// Schedule daily reset notifications — DEPRECATED
// Farcaster miniapp users have unlimited questions, and notification tokens
// are exclusively from Farcaster users, so reset notifications are no longer relevant.
export async function scheduleRateLimitResetNotifications(): Promise<void> {
  console.log('scheduleRateLimitResetNotifications: skipped — miniapp users have unlimited questions');
}