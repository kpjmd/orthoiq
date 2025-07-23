import { NextRequest, NextResponse } from 'next/server';
import { logInteraction } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Sample test data for admin dashboard testing
    const testQuestions = [
      {
        fid: 'test001',
        question: 'I hurt my knee playing basketball. It\'s swollen and painful. What should I do?',
        response: 'Based on your symptoms, this sounds like a potential knee injury from basketball. Here\'s what I recommend:\n\n1. **Immediate Care (RICE protocol):**\n   - Rest: Avoid putting weight on the knee\n   - Ice: Apply ice for 15-20 minutes every 2-3 hours\n   - Compression: Use an elastic bandage (not too tight)\n   - Elevation: Keep your knee elevated above heart level\n\n2. **Pain Management:**\n   - Over-the-counter anti-inflammatory medication (ibuprofen/naproxen)\n   - Avoid activities that worsen pain\n\n3. **When to seek medical attention:**\n   - If pain is severe or worsening\n   - If you cannot bear weight\n   - If swelling doesn\'t improve in 48-72 hours\n   - If you hear or feel a "pop" when the injury occurred\n\n**Important:** This advice is for general information only. Please consult with a healthcare professional for proper diagnosis and treatment, especially if symptoms persist or worsen.',
        confidence: 0.92
      },
      {
        fid: 'test002',
        question: 'My lower back has been aching for a week after lifting heavy boxes. Is this serious?',
        response: 'Lower back pain after heavy lifting is common but should be taken seriously. Here\'s my assessment:\n\n**Likely Cause:** Muscle strain or ligament sprain from improper lifting technique or overexertion.\n\n**Immediate Management:**\n1. **Activity modification:** Avoid heavy lifting and bending\n2. **Pain relief:** Alternate heat and cold therapy\n3. **Gentle movement:** Light walking and stretching (avoid bed rest)\n4. **Posture:** Maintain good posture when sitting/standing\n\n**Red flag symptoms requiring immediate medical attention:**\n- Pain radiating down your leg\n- Numbness or tingling in legs\n- Loss of bladder/bowel control\n- Fever with back pain\n- Severe pain that doesn\'t improve with rest\n\n**Expected timeline:** Most muscle strains improve within 1-2 weeks with proper care.\n\n**Prevention:** Learn proper lifting technique, strengthen core muscles, and maintain flexibility.\n\nSince this has persisted for a week, consider consulting a healthcare provider if pain doesn\'t start improving in the next few days.',
        confidence: 0.88
      },
      {
        fid: 'test003',
        question: 'I think I sprained my ankle. Should I go to the emergency room?',
        response: 'An ankle sprain doesn\'t always require emergency care. Let me help you determine the severity:\n\n**Mild Sprain (Grade 1) - Home care appropriate:**\n- Mild pain and swelling\n- Can bear some weight\n- Minimal bruising\n- Joint feels stable\n\n**Moderate Sprain (Grade 2) - Consider urgent care:**\n- Moderate pain and swelling\n- Difficult to bear weight\n- Some bruising and tenderness\n- Joint feels somewhat loose\n\n**Severe Sprain (Grade 3) - Seek immediate care:**\n- Severe pain and swelling\n- Cannot bear weight at all\n- Significant bruising\n- Joint feels very loose or unstable\n- Numbness or inability to move ankle\n\n**Home treatment for mild sprains:**\n1. RICE protocol (Rest, Ice, Compression, Elevation)\n2. Over-the-counter pain medication\n3. Avoid weight-bearing activities\n\n**Seek medical attention if:**\n- Severe pain or inability to walk\n- Numbness or tingling\n- Signs of fracture (bone protruding, severe deformity)\n- No improvement after 2-3 days\n\nBased on your symptoms, you can likely manage this at home initially, but don\'t hesitate to seek care if you\'re concerned.',
        confidence: 0.85
      }
    ];

    // Insert test data into database
    const results = [];
    for (const test of testQuestions) {
      try {
        const questionId = await logInteraction(
          test.fid, 
          test.question, 
          test.response, 
          false, 
          test.confidence
        );
        results.push({ questionId, status: 'created' });
      } catch (error) {
        console.error('Failed to create test question:', error);
        results.push({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${results.length} test responses for admin review`,
      results
    });

  } catch (error) {
    console.error('Error generating test data:', error);
    return NextResponse.json(
      { error: 'Failed to generate test data' },
      { status: 500 }
    );
  }
}