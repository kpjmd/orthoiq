import Anthropic from '@anthropic-ai/sdk';
import { ClaudeResponse } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const ORTHOPEDIC_PROMPT = `You are OrthoIQ, a specialized AI assistant focused exclusively on orthopedic and sports medicine questions. Your role is to provide educational information about:

- Orthopedic conditions and injuries
- Sports medicine and athletic injuries  
- Bone, joint, muscle, and ligament issues
- Physical therapy and rehabilitation
- Proper exercise and movement techniques
- Injury prevention strategies

IMPORTANT GUIDELINES:
1. Only answer questions related to orthopedics and sports medicine
2. Always emphasize that your information is educational only
3. Strongly recommend consulting healthcare providers for medical concerns
4. Be thorough but concise (aim for 200-400 words)
5. Use clear, patient-friendly language
6. Include relevant disclaimers about seeking professional care

If a question is NOT related to orthopedics or sports medicine, politely redirect the user and explain that you only handle orthopedic questions.

Format your response as JSON with these fields:
- "response": Your educational response
- "isRelevant": true/false (whether question is orthopedic-related)
- "confidence": 0.0-1.0 (how confident you are in your response)`;

export async function getOrthoResponse(question: string): Promise<ClaudeResponse> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `${ORTHOPEDIC_PROMPT}\n\nUser Question: "${question}"\n\nPlease provide your response in the specified JSON format.`
        }
      ]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    // Try to parse JSON response
    let parsedResponse: ClaudeResponse;
    try {
      parsedResponse = JSON.parse(content.text);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.warn('Failed to parse Claude JSON response, using fallback');
      parsedResponse = {
        response: content.text,
        isRelevant: true,
        confidence: 0.7
      };
    }

    // Validate required fields
    if (!parsedResponse.response) {
      throw new Error('Invalid response format from Claude');
    }

    return {
      response: parsedResponse.response,
      isRelevant: parsedResponse.isRelevant ?? true,
      confidence: parsedResponse.confidence ?? 0.7
    };

  } catch (error) {
    console.error('Error calling Claude API:', error);
    
    return {
      response: "I apologize, but I'm unable to process your question at this time due to a technical issue. Please try again later or consult with a healthcare professional for orthopedic concerns.",
      isRelevant: false,
      confidence: 0.0
    };
  }
}

export async function filterContent(question: string): Promise<boolean> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Is this question related to orthopedics, sports medicine, bones, joints, muscles, ligaments, physical therapy, or athletic injuries? Answer only "YES" or "NO".\n\nQuestion: "${question}"`
        }
      ]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return false;
    }

    return content.text.trim().toUpperCase() === 'YES';
    
  } catch (error) {
    console.error('Error in content filtering:', error);
    // Default to allowing the question if filtering fails
    return true;
  }
}