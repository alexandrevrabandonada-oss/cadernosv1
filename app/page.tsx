import { PortalLink } from '@/components/ui/PortalLink';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Placa } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <main className='stack'>
      <Placa className='stack'>
        <SectionHeader
          title='Cadernos Vivos'
          description='Design system Concreto Zen com arquitetura App Router e componentes de base reutilizaveis.'
          tag='Plataforma'
        />
        <div className='toolbar-row'>
          <Button href='/c/exemplo' variant='primary'>
            Abrir universo exemplo
          </Button>
          <Button href='/admin' variant='neutral'>
            Ir para admin
          </Button>
        </div>
      </Placa>

      <Placa className='stack'>
        <SectionHeader
          title='Portais de universo'
          description='Selecione um portal para navegar pelas secoes de mapa, provas, linha, trilhas, debate e tutoria.'
        />
        <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <PortalLink href='/c/exemplo' title='Universo Exemplo' description='Hub inicial com as secoes completas.' />
          <PortalLink href='/c/matematica' title='Universo Matematica' description='Placeholder para trilhas e provas.' />
        </div>
      </Placa>
    </main>
  );
}
