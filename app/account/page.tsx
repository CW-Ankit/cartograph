import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { AccountSettingsView } from '@/components/account-settings-view';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return <AccountSettingsView user={session.user} />;
}
