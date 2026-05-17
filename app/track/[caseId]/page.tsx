import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildLandingPayload } from '@/lib/landing/buildLandingPayload';
import { bodyPartPhrase } from '@/lib/bodyPart';
import TrackingClient from './TrackingClient';

interface TrackPageProps {
  params: Promise<{ caseId: string }>;
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { caseId } = await params;

  let payload = null;
  try {
    payload = await buildLandingPayload(caseId);
  } catch (error) {
    console.error('Error getting landing payload for metadata:', error);
  }

  if (!payload) {
    return {
      title: 'Case Not Found - OrthoIQ',
      description: 'The requested case could not be found.',
    };
  }

  const phrase = bodyPartPhrase(payload.consultation.bodyPart);
  const title = `Track Case ${caseId} - OrthoIQ`;
  const description = `${payload.consultation.daysSince} days since ${phrase} consultation.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { caseId } = await params;

  let payload = null;
  try {
    payload = await buildLandingPayload(caseId);
  } catch (error) {
    console.error('Error loading tracking data:', error);
  }

  if (!payload) notFound();

  return (
    <TrackingClient
      caseId={caseId}
      fid={payload.consultation.fid}
      payload={payload}
    />
  );
}
