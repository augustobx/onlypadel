import { isPlatformRequest } from '@/lib/tenant-context';
import { notFound } from 'next/navigation';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  if (!(await isPlatformRequest())) notFound();
  return children;
}
