import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getConsultation, getConsultationMilestones } from '@/lib/database';
import TrackingClient from './TrackingClient';

interface TrackPageProps {
  params: Promise<{ caseId: string }>
}

// Milestone schedule: 2, 4, 8 weeks
const MILESTONE_DAYS = [14, 28, 56] as const;

function calculateDaysSince(createdAt: string | Date): number {
  const consultationDate = new Date(createdAt);
  const today = new Date();
  return Math.floor((today.getTime() - consultationDate.getTime()) / (1000 * 60 * 60 * 24));
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { caseId } = await params;

  let consultation = null;
  try {
    consultation = await getConsultation(caseId);
  } catch (error) {
    console.error('Error getting consultation for metadata:', error);
  }

  if (!consultation) {
    return {
      title: 'Case Not Found - OrthoIQ',
      description: 'The requested case could not be found.'
    };
  }

  const daysSince = calculateDaysSince(consultation.created_at);
  const title = `Track Case ${caseId} - OrthoIQ`;
  const description = `Track your recovery progress and validate predictions. ${daysSince} days since consultation.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website'
    },
    twitter: {
      card: 'summary',
      title,
      description
    }
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { caseId } = await params;

  // Load consultation data
  let consultation = null;
  let milestones: any[] = [];

  try {
    consultation = await getConsultation(caseId);
    if (consultation) {
      milestones = await getConsultationMilestones(caseId);
    }
  } catch (error) {
    console.error('Error loading tracking data:', error);
  }

  if (!consultation) {
    notFound();
  }

  // Parse participating specialists
  let specialists: string[] = [];
  try {
    if (consultation.participating_specialists) {
      specialists = typeof consultation.participating_specialists === 'string'
        ? JSON.parse(consultation.participating_specialists)
        : consultation.participating_specialists;
    }
  } catch {
    specialists = [];
  }

  // Calculate milestone status
  const daysSince = calculateDaysSince(consultation.created_at);
  const completedMilestoneDays = milestones.map((m: any) => m.milestone_day);

  const milestoneStatus = MILESTONE_DAYS.map(day => {
    const completed = completedMilestoneDays.includes(day);
    const milestoneData = milestones.find((m: any) => m.milestone_day === day);
    return {
      day,
      type: day === 14 ? 'pain' : day === 28 ? 'functional' : 'movement',
      label: day === 14 ? 'Week 2 - Pain Level' : day === 28 ? 'Week 4 - Functional' : 'Week 8 - Movement',
      completed,
      due: !completed && daysSince >= day,
      data: milestoneData || null
    };
  }) as Array<{
    day: number;
    type: 'pain' | 'functional' | 'movement';
    label: string;
    completed: boolean;
    due: boolean;
    data: any | null;
  }>;

  // Determine current milestone
  let currentMilestone = null;
  for (const ms of milestoneStatus) {
    if (!ms.completed) {
      currentMilestone = ms;
      break;
    }
  }

  // Format consultation date
  const consultationDate = new Date(consultation.created_at);
  const formattedDate = consultationDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Pass data to client component for interactivity
  const trackingData = {
    caseId,
    fid: consultation.fid,
    isPrivate: consultation.is_private || false,
    consultationDate: formattedDate,
    daysSince,
    specialists,
    specialistCount: consultation.specialist_count || specialists.length,
    coordinationSummary: consultation.coordination_summary,
    milestoneStatus,
    currentMilestone,
    completedCount: completedMilestoneDays.length,
    totalMilestones: MILESTONE_DAYS.length
  };

  return <TrackingClient {...trackingData} />;
}
