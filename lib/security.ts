// Content filtering and security utilities

export interface SecurityCheck {
  isValid: boolean;
  reason?: string;
  category?: 'spam' | 'inappropriate' | 'medical-emergency' | 'non-orthopedic';
}

// Enhanced content filtering for orthopedic relevance
export function validateOrthopedicContent(question: string): SecurityCheck {
  const cleanQuestion = question.toLowerCase().trim();
  
  // Check for emergency medical situations that require immediate care
  const emergencyKeywords = [
    'heart attack', 'stroke', 'bleeding heavily', 'can\'t breathe', 'overdose',
    'suicide', 'emergency', 'unconscious', 'severe chest pain', 'difficulty breathing'
  ];
  
  for (const keyword of emergencyKeywords) {
    if (cleanQuestion.includes(keyword)) {
      return {
        isValid: false,
        reason: 'This appears to be a medical emergency. Please seek immediate medical attention by calling emergency services.',
        category: 'medical-emergency'
      };
    }
  }
  
  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{4,}/, // Repeated characters
    /http[s]?:\/\//, // URLs
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
  ];
  
  for (const pattern of spamPatterns) {
    if (pattern.test(cleanQuestion)) {
      return {
        isValid: false,
        reason: 'This message appears to contain spam content.',
        category: 'spam'
      };
    }
  }
  
  // Check for inappropriate content
  const inappropriateKeywords = [
    'sex', 'sexual', 'porn', 'drug dealing', 'illegal', 'hack'
  ];
  
  for (const keyword of inappropriateKeywords) {
    if (cleanQuestion.includes(keyword)) {
      return {
        isValid: false,
        reason: 'This content is inappropriate for a medical platform.',
        category: 'inappropriate'
      };
    }
  }
  
  // Check for orthopedic relevance
  const orthopedicKeywords = [
    // Bones and joints
    'bone', 'fracture', 'break', 'joint', 'knee', 'shoulder', 'hip', 'ankle', 'wrist',
    'elbow', 'spine', 'back', 'neck', 'foot', 'hand', 'finger', 'toe',
    
    // Muscles and soft tissue
    'muscle', 'tendon', 'ligament', 'cartilage', 'strain', 'sprain', 'tear',
    
    // Sports medicine
    'sports', 'injury', 'athletic', 'running', 'basketball', 'football', 'tennis',
    
    // Symptoms
    'pain', 'ache', 'swelling', 'stiff', 'mobility', 'range of motion',
    
    // Treatments
    'physical therapy', 'rehabilitation', 'exercise', 'stretching', 'ice', 'heat',
    'orthopedic', 'orthopaedic', 'musculoskeletal'
  ];
  
  const hasOrthopedicContent = orthopedicKeywords.some(keyword => 
    cleanQuestion.includes(keyword)
  );
  
  if (!hasOrthopedicContent && cleanQuestion.length > 20) {
    return {
      isValid: false,
      reason: 'I specialize in orthopedic and sports medicine questions only. Please ask about topics like bone/joint injuries, muscle problems, sports injuries, physical therapy, or related medical concerns.',
      category: 'non-orthopedic'
    };
  }
  
  return { isValid: true };
}

// Rate limiting security checks
export function validateRateLimitRequest(fid: string): SecurityCheck {
  // Check for valid FID (all Farcaster users should have numeric FIDs)
  if (!fid || fid.length < 1) {
    return { isValid: false, reason: 'FID is required' };
  }
  
  // Validate FID format (numeric for Farcaster, or web user prefixes)
  const isNumeric = /^\d+$/.test(fid);
  const isWebUser = /^(guest_|email_|web-)\d+$/.test(fid);
  const isDemoUser = fid === 'demo-user';
  const isWebGuest = fid === 'web-guest';
  
  if (!isNumeric && !isWebUser && !isDemoUser && !isWebGuest) {
    return {
      isValid: false,
      reason: 'Invalid user identifier format.',
      category: 'spam'
    };
  }
  
  return { isValid: true };
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .substring(0, 2000); // Limit length
}

// Abuse reporting
export interface AbuseReport {
  fid: string;
  question: string;
  response: string;
  reason: string;
  timestamp: Date;
}

export async function reportAbuse(report: AbuseReport): Promise<void> {
  // In a real implementation, this would send to a monitoring service
  console.warn('Abuse reported:', {
    fid: report.fid,
    reason: report.reason,
    timestamp: report.timestamp
  });
}