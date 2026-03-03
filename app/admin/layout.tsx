import { notFound } from 'next/navigation';
import { isAdminModeEnabled } from '@/lib/admin/db';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isAdminModeEnabled()) {
    notFound();
  }

  return <>{children}</>;
}
