import { NextRequest, NextResponse } from 'next/server';
import { storePromisResponse, getPromisResponses, getPromisBaseline } from '@/lib/database';
import { computeScores, calculateDelta, validateResponses } from '@/lib/promis';
import { PROMISTimepoint } from '@/lib/types';

const VALID_TIMEPOINTS: PROMISTimepoint[] = ['baseline', '2week', '4week', '8week'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      consultationId,
      patientId,
      timepoint,
      physicalFunctionResponses,
      painInterferenceResponses,
    } = body;

    // Validate required fields
    if (!consultationId || !timepoint || !physicalFunctionResponses) {
      return NextResponse.json(
        { error: 'Missing required fields: consultationId, timepoint, physicalFunctionResponses' },
        { status: 400 }
      );
    }

    if (!VALID_TIMEPOINTS.includes(timepoint)) {
      return NextResponse.json(
        { error: `Invalid timepoint. Must be one of: ${VALID_TIMEPOINTS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate physical function responses
    if (!validateResponses('physicalFunction', physicalFunctionResponses)) {
      return NextResponse.json(
        { error: 'Invalid physical function responses. All 10 questions must be answered with values 1-5.' },
        { status: 400 }
      );
    }

    // Validate pain interference responses if provided
    if (painInterferenceResponses && !validateResponses('painInterference', painInterferenceResponses)) {
      return NextResponse.json(
        { error: 'Invalid pain interference responses. All 6 questions must be answered with values 1-5.' },
        { status: 400 }
      );
    }

    // Compute scores
    const pfScores = computeScores('physicalFunction', physicalFunctionResponses);
    const piScores = painInterferenceResponses
      ? computeScores('painInterference', painInterferenceResponses)
      : null;

    // Resolve patient ID: fid → patientId param → 'anonymous'
    const resolvedPatientId = patientId || 'anonymous';

    // Store in database
    const id = await storePromisResponse({
      consultationId,
      patientId: resolvedPatientId,
      timepoint,
      physicalFunctionResponses,
      physicalFunctionRawScore: pfScores.rawScore,
      physicalFunctionTScore: pfScores.tScore,
      painInterferenceResponses: painInterferenceResponses || null,
      painInterferenceRawScore: piScores?.rawScore ?? null,
      painInterferenceTScore: piScores?.tScore ?? null,
    });

    // Calculate delta if this is a follow-up
    let delta = null;
    if (timepoint !== 'baseline') {
      const baseline = await getPromisBaseline(consultationId);
      if (baseline) {
        delta = calculateDelta(
          {
            physicalFunctionRawScore: baseline.physical_function_raw_score,
            physicalFunctionTScore: baseline.physical_function_t_score,
            painInterferenceRawScore: baseline.pain_interference_raw_score,
            painInterferenceTScore: baseline.pain_interference_t_score,
          },
          {
            physicalFunctionRawScore: pfScores.rawScore,
            physicalFunctionTScore: pfScores.tScore,
            painInterferenceRawScore: piScores?.rawScore ?? null,
            painInterferenceTScore: piScores?.tScore ?? null,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      id,
      scores: {
        physicalFunction: {
          rawScore: pfScores.rawScore,
          tScore: pfScores.tScore,
        },
        painInterference: piScores
          ? { rawScore: piScores.rawScore, tScore: piScores.tScore }
          : null,
      },
      delta,
    });
  } catch (error) {
    console.error('Error storing PROMIS response:', error);
    return NextResponse.json(
      { error: 'Failed to store PROMIS response' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get('consultationId');

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: consultationId' },
        { status: 400 }
      );
    }

    const responses = await getPromisResponses(consultationId);

    return NextResponse.json({
      consultationId,
      responses,
      count: responses.length,
    });
  } catch (error) {
    console.error('Error fetching PROMIS responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PROMIS responses' },
      { status: 500 }
    );
  }
}
