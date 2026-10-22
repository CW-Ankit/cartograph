import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { OrganizationSettingsView } from '@/components/organization-settings-view';

export const dynamic = 'force-dynamic';

export default async function OrganizationPage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return <OrganizationSettingsView />;
}
