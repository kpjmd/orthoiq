import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { WebAuthProvider } from '@/components/WebAuthProvider';
import { WagmiProviders } from '@/components/WagmiProviders';
import ProfileClient from '@/components/ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect('/?profile_required=1');
  }

  return (
    <WebAuthProvider>
      <WagmiProviders>
        <main className="min-h-screen bg-gray-50">
          <ProfileClient />
        </main>
      </WagmiProviders>
    </WebAuthProvider>
  );
}
