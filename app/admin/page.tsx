import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default function AdminPage() {
  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: 'Admin' }]} ariaLabel='Trilha admin' />
        <SectionHeader title='Admin' description='Painel minimo para operacoes do MVP.' tag='Restrito' />
        <div className='toolbar-row'>
          <Carimbo>ADMIN_MODE=1</Carimbo>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Modulos' description='Navegacao para gestao de universos e nos.' />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes'>
            Gerenciar universos
          </Link>
        </div>
      </Card>
    </main>
  );
}
