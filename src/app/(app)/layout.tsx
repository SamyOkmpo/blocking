import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppProvider } from '@/components/AppProvider';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LockScreen } from '@/components/LockScreen';
import { RewardOverlay } from '@/components/RewardOverlay';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <AppProvider userId={user.id}>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4">
          {children}
        </main>
        <BottomNav />
      </div>
      {/* El candado y la recompensa cubren TODO, incluida la navegación */}
      <LockScreen />
      <RewardOverlay />
    </AppProvider>
  );
}
