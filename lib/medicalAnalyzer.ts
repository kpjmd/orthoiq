export interface MedicalAnalysis {
  bodyParts: string[];
  conditions: string[];
  treatmentContext: 'prevention' | 'acute' | 'chronic' | 'post-surgical' | 'rehabilitation' | 'general';
  emotionalTone: 'concern' | 'hope' | 'frustration' | 'confidence' | 'uncertainty' | 'neutral';
  subspecialty: 'sports-medicine' | 'joint-replacement' | 'trauma' | 'spine' | 'hand-foot' | 'general';
  complexityLevel: number; // 1-10 scale
  questionLength: number;
  medicalTermCount: number;
  timeContext: 'acute' | 'chronic' | 'recent' | 'ongoing' | 'none';
}

export class MedicalQuestionAnalyzer {
  private bodyPartPatterns = {
    knee: /\b(knee|patella|meniscus|acl|pcl|mcl|lcl|kneecap)\b/gi,
    shoulder: /\b(shoulder|rotator\s*cuff|clavicle|scapula|humerus|glenohumeral)\b/gi,
    spine: /\b(spine|spinal|back|vertebra|disc|lumbar|cervical|thoracic|scoliosis)\b/gi,
    hip: /\b(hip|pelvis|femur|acetabulum|iliac|sacrum)\b/gi,
    ankle: /\b(ankle|foot|toe|heel|achilles|plantar|metatarsal)\b/gi,
    wrist: /\b(wrist|hand|finger|thumb|carpal|metacarpal|phalanx)\b/gi,
    elbow: /\b(elbow|ulna|radius|epicondyle|olecranon)\b/gi,
    neck: /\b(neck|cervical|atlas|axis|occipital)\b/gi,
  };

  private conditionPatterns = {
    pain: /\b(pain|ache|hurt|sore|tender|discomfort|aching)\b/gi,
    injury: /\b(injury|injured|hurt|trauma|accident|fall|twist)\b/gi,
    surgery: /\b(surgery|surgical|operation|procedure|implant|replacement|fusion)\b/gi,
    arthritis: /\b(arthritis|arthritic|osteoarthritis|rheumatoid|degenerative)\b/gi,
    fracture: /\b(fracture|break|broken|crack|stress\s*fracture)\b/gi,
    strain: /\b(strain|sprain|tear|pull|stretch|overuse)\b/gi,
    inflammation: /\b(inflammation|swelling|inflamed|tendinitis|bursitis)\b/gi,
    weakness: /\b(weakness|weak|instability|unstable|giving\s*way)\b/gi,
  };

  private treatmentContextPatterns = {
    'post-surgical': /\b(after\s*surgery|post\s*op|recovery|healing|rehabilitation)\b/gi,
    'rehabilitation': /\b(rehab|therapy|exercise|strengthen|mobility|range\s*of\s*motion)\b/gi,
    'acute': /\b(sudden|acute|recent|just\s*happened|yesterday|today)\b/gi,
    'chronic': /\b(chronic|ongoing|months|years|persistent|constant)\b/gi,
    'prevention': /\b(prevent|avoid|protect|strengthen|conditioning|training)\b/gi,
  };

  private emotionalTonePatterns = {
    concern: /\b(worried|concerned|anxious|scared|afraid|nervous)\b/gi,
    hope: /\b(hope|hopeful|optimistic|better|improve|heal|recovery)\b/gi,
    frustration: /\b(frustrated|annoyed|tired|fed\s*up|struggle|difficult)\b/gi,
    confidence: /\b(confident|sure|certain|positive|strong|good)\b/gi,
    uncertainty: /\b(unsure|uncertain|confused|don't\s*know|maybe|possibly)\b/gi,
  };

  private subspecialtyPatterns = {
    'sports-medicine': /\b(running|sports|athlete|training|performance|exercise|activity|marathon|gym)\b/gi,
    'joint-replacement': /\b(replacement|implant|prosthetic|artificial|total\s*knee|total\s*hip)\b/gi,
    'trauma': /\b(accident|fall|crash|impact|emergency|fracture|break|urgent)\b/gi,
    'spine': /\b(spine|spinal|back|disc|vertebra|fusion|scoliosis|sciatica)\b/gi,
    'hand-foot': /\b(hand|finger|thumb|wrist|foot|toe|ankle|heel|carpal|plantar)\b/gi,
  };

  private timeContextPatterns = {
    acute: /\b(sudden|today|yesterday|just\s*now|recently|this\s*week)\b/gi,
    chronic: /\b(months|years|ongoing|persistent|chronic|long\s*term)\b/gi,
    recent: /\b(recent|lately|past\s*few|last\s*week|last\s*month)\b/gi,
    ongoing: /\b(ongoing|continuing|still|keeps|always|constant)\b/gi,
  };

  analyze(question: string): MedicalAnalysis {
    const bodyParts = this.extractBodyParts(question);
    const conditions = this.extractConditions(question);
    const treatmentContext = this.determineTreatmentContext(question);
    const emotionalTone = this.determineEmotionalTone(question);
    const subspecialty = this.determineSubspecialty(question);
    const complexityLevel = this.calculateComplexity(question);
    const medicalTermCount = this.countMedicalTerms(question);
    const timeContext = this.determineTimeContext(question);

    return {
      bodyParts,
      conditions,
      treatmentContext,
      emotionalTone,
      subspecialty,
      complexityLevel,
      questionLength: question.length,
      medicalTermCount,
      timeContext,
    };
  }

  private extractBodyParts(question: string): string[] {
    const bodyParts: string[] = [];
    
    Object.entries(this.bodyPartPatterns).forEach(([part, pattern]) => {
      if (pattern.test(question)) {
        bodyParts.push(part);
      }
    });

    return bodyParts;
  }

  private extractConditions(question: string): string[] {
    const conditions: string[] = [];
    
    Object.entries(this.conditionPatterns).forEach(([condition, pattern]) => {
      if (pattern.test(question)) {
        conditions.push(condition);
      }
    });

    return conditions;
  }

  private determineTreatmentContext(question: string): MedicalAnalysis['treatmentContext'] {
    for (const [context, pattern] of Object.entries(this.treatmentContextPatterns)) {
      if (pattern.test(question)) {
        return context as MedicalAnalysis['treatmentContext'];
      }
    }
    return 'general';
  }

  private determineEmotionalTone(question: string): MedicalAnalysis['emotionalTone'] {
    const toneScores: Record<string, number> = {};
    
    Object.entries(this.emotionalTonePatterns).forEach(([tone, pattern]) => {
      const matches = question.match(pattern);
      toneScores[tone] = matches ? matches.length : 0;
    });

    // Find the tone with highest score
    const maxTone = Object.entries(toneScores).reduce((a, b) => 
      toneScores[a[0]] > toneScores[b[0]] ? a : b
    );

    return maxTone[1] > 0 ? (maxTone[0] as MedicalAnalysis['emotionalTone']) : 'neutral';
  }

  private determineSubspecialty(question: string): MedicalAnalysis['subspecialty'] {
    for (const [specialty, pattern] of Object.entries(this.subspecialtyPatterns)) {
      if (pattern.test(question)) {
        return specialty as MedicalAnalysis['subspecialty'];
      }
    }
    return 'general';
  }

  private calculateComplexity(question: string): number {
    let complexity = 1;
    
    // Base complexity on length
    if (question.length > 100) complexity += 2;
    else if (question.length > 50) complexity += 1;
    
    // Add complexity for medical terms
    const medicalTerms = this.countMedicalTerms(question);
    complexity += Math.min(medicalTerms, 4);
    
    // Add complexity for multiple body parts
    const bodyParts = this.extractBodyParts(question);
    if (bodyParts.length > 1) complexity += bodyParts.length - 1;
    
    // Add complexity for multiple conditions
    const conditions = this.extractConditions(question);
    if (conditions.length > 1) complexity += conditions.length - 1;
    
    // Question marks suggest uncertainty/complexity
    const questionMarks = (question.match(/\?/g) || []).length;
    if (questionMarks > 1) complexity += 1;
    
    return Math.min(complexity, 10);
  }

  private countMedicalTerms(question: string): number {
    let count = 0;
    
    // Count matches from all pattern categories
    Object.values(this.bodyPartPatterns).forEach(pattern => {
      const matches = question.match(pattern);
      if (matches) count += matches.length;
    });
    
    Object.values(this.conditionPatterns).forEach(pattern => {
      const matches = question.match(pattern);
      if (matches) count += matches.length;
    });
    
    return count;
  }

  private determineTimeContext(question: string): MedicalAnalysis['timeContext'] {
    for (const [context, pattern] of Object.entries(this.timeContextPatterns)) {
      if (pattern.test(question)) {
        return context as MedicalAnalysis['timeContext'];
      }
    }
    return 'none';
  }
}

export const medicalAnalyzer = new MedicalQuestionAnalyzer();