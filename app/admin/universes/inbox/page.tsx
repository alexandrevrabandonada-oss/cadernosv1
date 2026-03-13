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
    <main className='stack stack-editorial'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Criar universo' },
            { label: 'Inbox documental' },
          ]}
          ariaLabel='Trilha inbox de universo'
        />
        <SectionHeader
          title='Inbox documental'
          description='Sala assistida para receber um lote de PDFs, ler o tema com apoio da IA, revisar a estrutura inicial e criar o universo ja conectado ao pipeline.'
          tag='Lote documental'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes'>Voltar ao cockpit</Link>
          <Link className='ui-button' href='/admin/universes/new'>Criar por modelo</Link>
          <Link className='ui-button' href='/admin/programa-editorial'>Abrir operacao editorial</Link>
        </div>
      </Card>

      <UniverseInboxClient initialBatch={initialBatch} />
    </main>
  );
}

