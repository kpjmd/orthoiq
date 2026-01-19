// Farcaster miniapp notifications service
import { UserTier } from './rateLimit';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

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

// Send notification using Farcaster notification API
export async function sendNotification(fid: string, notification: NotificationData): Promise<boolean> {
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
            targetUrl: notification.targetUrl || '/miniapp',
            tokens: [token.token]
          })
        });
        
        if (response.ok) {
          success = true;
          console.log(`Notification sent successfully to FID ${fid}`);
        } else {
          console.error(`Failed to send notification: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error sending to token ${token.token}:`, error);
      }
    }
    
    // Store notification in database for tracking
    await logNotification(fid, notification, success);
    
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
      title = '✅ Response Approved with Additions';
      body = `Your response has been approved with helpful additions by ${data.reviewerName}.`;
    } else if (reviewDetails?.reviewType === 'approve_with_corrections') {
      title = '✅ Response Approved with Corrections';
      body = `Your response has been approved with important corrections by ${data.reviewerName}.`;
    } else {
      title = '✅ Response Approved';
      body = `Your orthopedic question has been approved by ${data.reviewerName}.`;
    }
  } else {
    // Determine specific rejection reason
    if (reviewDetails?.reviewType === 'reject_medical_inaccuracy') {
      title = '❌ Response Rejected - Medical Inaccuracy';
      body = `Your response was rejected for medical inaccuracy. Please consult with a healthcare provider.`;
    } else if (reviewDetails?.reviewType === 'reject_inappropriate_scope') {
      title = '❌ Response Rejected - Inappropriate Scope';
      body = `Your question falls outside our scope. Please consult with a healthcare provider.`;
    } else if (reviewDetails?.reviewType === 'reject_poor_communication') {
      title = '❌ Response Rejected - Poor Communication';
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
  milestoneDay: number
): Promise<boolean> {
  const weekNumber = Math.floor(milestoneDay / 7);

  // Customize message based on milestone
  let focus = 'recovery progress';
  if (milestoneDay === 14) {
    focus = 'pain level and initial progress';
  } else if (milestoneDay === 28) {
    focus = 'functional improvements';
  } else if (milestoneDay === 56) {
    focus = 'long-term recovery and movement quality';
  }

  const notification: NotificationData = {
    title: `Week ${weekNumber} Check-in: How are you doing?`,
    body: `Time for your ${weekNumber}-week follow-up! Share your ${focus} to help track your recovery journey.`,
    targetUrl: `/miniapp?track=${consultationId}`,
    imageUrl: 'https://orthoiq.vercel.app/icon.png'
  };

  return await sendNotification(fid, notification);
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
async function logNotification(fid: string, notification: NotificationData, delivered: boolean = false): Promise<void> {
  try {
    console.log(`[NotificationLog] FID: ${fid}, Title: ${notification.title}, Body: ${notification.body}, Delivered: ${delivered}`);
    
    // Store in database for tracking
    await sql`
      INSERT INTO notification_logs (fid, title, body, target_url, delivered, created_at)
      VALUES (${fid}, ${notification.title}, ${notification.body}, ${notification.targetUrl || null}, ${delivered}, NOW())
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

// Schedule daily reset notifications for all users
export async function scheduleRateLimitResetNotifications(): Promise<void> {
  try {
    // Get all users who have notification tokens
    const usersWithTokens = await sql`
      SELECT DISTINCT fid FROM notification_tokens WHERE enabled = true
    `;
    
    console.log(`Scheduling reset notifications for ${usersWithTokens.length} users`);
    
    // Send reset notifications to all users
    // Note: In production, you'd want to determine user tiers properly
    for (const user of usersWithTokens) {
      try {
        await sendRateLimitResetNotification(user.fid, 'authenticated');
      } catch (error) {
        console.error(`Failed to send reset notification to FID ${user.fid}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to schedule reset notifications:', error);
  }
}