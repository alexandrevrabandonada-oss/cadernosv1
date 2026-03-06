import { EmptyStateCard } from '@/components/ui/state/EmptyStateCard';

export default function NotFound() {
  return (
    <main className='stack' style={{ maxWidth: '48rem', margin: '4rem auto' }}>
      <EmptyStateCard
        eyebrow='rota indisponivel'
        title='Pagina nao encontrada'
        description='Este caminho nao existe neste ambiente ou foi retirado da navegacao publica. Volte para a Home ou retome um universo valido.'
        primaryAction={{ label: 'Voltar para Home', href: '/' }}
        secondaryAction={{ label: 'Abrir universo demo', href: '/c/demo' }}
      />
    </main>
  );
}
