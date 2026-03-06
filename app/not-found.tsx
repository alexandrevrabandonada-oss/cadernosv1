import Link from 'next/link';

export default function NotFound() {
  return (
    <main className='stack surface-panel' style={{ maxWidth: '48rem', margin: '4rem auto', padding: '2rem' }}>
      <p className='eyebrow'>404</p>
      <h1>Pagina nao encontrada</h1>
      <p className='muted'>O recurso solicitado nao existe ou nao esta disponivel neste ambiente.</p>
      <div className='toolbar-row'>
        <Link className='ui-button' href='/'>
          Voltar para Home
        </Link>
      </div>
    </main>
  );
}
