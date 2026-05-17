import { getConsultation, getConsultationMilestones, getSql } from '../database';
import { getPromisResponses } from '../promisDb';
import { isPainRelatedConsultation } from '../promis';
import { PROMISTimepoint } from '../promisTypes';

export const MILESTONE_DAYS = [14, 28, 56] as const;
export type MilestoneDay = typeof MILESTONE_DAYS[number];

const TIMEPOINT_FOR_DAY: Record<MilestoneDay, PROMISTimepoint> = {
  14: '2week',
  28: '4week',
  56: '8week',
};

export interface MilestoneStatus {
  day: MilestoneDay;
  timepoint: PROMISTimepoint;
  label: string;
  completed: boolean;
  due: boolean;
  data: any | null;
}

export interface PromisResponseRow {
  consultation_id: string;
  timepoint: PROMISTimepoint | 'baseline';
  physical_function_t_score: number;
  pain_interference_t_score: number | null;
  created_at: string;
}

export interface ReadoutPayload {
  consultation_id: string;
  timepoint: PROMISTimepoint;
  component1_text: string | null;
  component3_text: string | null;
  generation_status: 'success' | 'fallback';
  generated_at: string;
}

export interface LandingPayload {
  consultation: {
    caseId: string;
    fid: string;
    questionId: number | null;
    bodyPart: string | null;
    questionText: string | null;
    consultationDate: string;
    daysSince: number;
    specialists: string[];
    specialistCount: number;
    coordinationSummary: string | null;
    isPrivate: boolean;
  };
  milestones: MilestoneStatus[];
  currentMilestone: MilestoneStatus | null;
  targetTimepoint: PROMISTimepoint | null;
  completedCount: number;
  totalMilestones: number;
  promisResponses: PromisResponseRow[];
  readouts: ReadoutPayload[];
  isPainRelated: boolean;
  nextMilestoneDate: string | null;
}

function calculateDaysSince(createdAt: string | Date): number {
  const consultationDate = new Date(createdAt);
  const today = new Date();
  return Math.floor((today.getTime() - consultationDate.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateNextMilestoneDate(
  consultationDate: Date,
  milestones: MilestoneStatus[]
): string | null {
  const next = milestones.find((m) => !m.completed);
  if (!next) return null;
  const target = new Date(consultationDate.getTime() + next.day * 24 * 60 * 60 * 1000);
  return target.toISOString();
}

async function safeReadouts(consultationId: string): Promise<ReadoutPayload[]> {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT consultation_id, timepoint, component1_text, component3_text,
             generation_status, created_at AS generated_at
      FROM milestone_readouts
      WHERE consultation_id = ${consultationId}
      ORDER BY created_at DESC
    `;
    return rows as ReadoutPayload[];
  } catch {
    // Table may not exist yet in environments that haven't migrated.
    return [];
  }
}

export async function buildLandingPayload(caseId: string): Promise<LandingPayload | null> {
  const consultation = await getConsultation(caseId);
  if (!consultation) return null;

  const milestoneRows = await getConsultationMilestones(caseId);
  const completedMilestoneDays = new Set<number>(milestoneRows.map((m: any) => m.milestone_day));

  let promisResponses: PromisResponseRow[] = [];
  try {
    promisResponses = (await getPromisResponses(caseId)) as PromisResponseRow[];
  } catch {
    promisResponses = [];
  }
  const completedPromisTimepoints = new Set(promisResponses.map((r) => r.timepoint));

  const daysSince = calculateDaysSince(consultation.created_at);

  const milestones: MilestoneStatus[] = (MILESTONE_DAYS as readonly MilestoneDay[]).map((day) => {
    const timepoint = TIMEPOINT_FOR_DAY[day];
    const completed = completedMilestoneDays.has(day) || completedPromisTimepoints.has(timepoint);
    const data = milestoneRows.find((m: any) => m.milestone_day === day) || null;
    return {
      day,
      timepoint,
      label: `Week ${day / 7} check-in`,
      completed,
      due: !completed && daysSince >= day,
      data,
    };
  });

  const currentMilestone = milestones.find((m) => !m.completed) || null;
  const targetTimepoint = currentMilestone?.timepoint ?? null;

  let specialists: string[] = [];
  try {
    if (consultation.participating_specialists) {
      specialists =
        typeof consultation.participating_specialists === 'string'
          ? JSON.parse(consultation.participating_specialists)
          : consultation.participating_specialists;
    }
  } catch {
    specialists = [];
  }

  let questionText: string | null = null;
  try {
    if (consultation.question_id) {
      const sql = getSql();
      const qResult = await sql`
        SELECT question FROM questions WHERE id = ${consultation.question_id} LIMIT 1
      `;
      questionText = qResult[0]?.question || null;
    }
  } catch {
    // best-effort
  }

  const readouts = await safeReadouts(caseId);

  const consultationDate = new Date(consultation.created_at);
  const formattedDate = consultationDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isPainRelated = isPainRelatedConsultation({ question: questionText });

  return {
    consultation: {
      caseId: consultation.consultation_id,
      fid: consultation.fid,
      questionId: consultation.question_id,
      bodyPart: consultation.body_part || null,
      questionText,
      consultationDate: formattedDate,
      daysSince,
      specialists,
      specialistCount: consultation.specialist_count || specialists.length,
      coordinationSummary: consultation.coordination_summary,
      isPrivate: consultation.is_private || false,
    },
    milestones,
    currentMilestone,
    targetTimepoint,
    completedCount: milestones.filter((m) => m.completed).length,
    totalMilestones: milestones.length,
    promisResponses,
    readouts,
    isPainRelated,
    nextMilestoneDate: calculateNextMilestoneDate(consultationDate, milestones),
  };
}
