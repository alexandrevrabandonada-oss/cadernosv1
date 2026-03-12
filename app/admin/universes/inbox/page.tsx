import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { UniverseInboxClient } from '@/components/admin/UniverseInboxClient';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { getInboxBatch } from '@/lib/universe/inbox';

type AdminUniverseInboxPageProps = {
  searchParams: Promise<{ batch?: string }>;
};

export default async function AdminUniverseInboxPage({ searchParams }: AdminUniverseInboxPageProps) {
  await requireEditorOrAdmin();
  const sp = await searchParams;
  const initialBatch = sp.batch ? await getInboxBatch(sp.batch) : null;

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { label: 'Universe Inbox' },
          ]}
          ariaLabel='Trilha inbox de universo'
        />
        <SectionHeader
          title='Universe Inbox'
          description='Dropzone assistida para subir um lote de PDFs, revisar a leitura inicial e criar o universo ja plugado no board editorial.'
          tag='Inbox'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes/new'>Voltar ao wizard</Link>
          <Link className='ui-button' href='/admin/programa-editorial'>Abrir board editorial</Link>
        </div>
      </Card>

      <UniverseInboxClient initialBatch={initialBatch} />
    </main>
  );
}
