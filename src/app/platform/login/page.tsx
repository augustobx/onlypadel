import { redirect } from 'next/navigation';

export default function LegacyPlatformLoginPage() {
  redirect('/superadmin/login');
}
