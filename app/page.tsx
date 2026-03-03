import Link from 'next/link';

export default function HomePage() {
  return (
    <main className='stack'>
      <section className='card stack'>
        <h1 style={{ margin: 0 }}>Cadernos Vivos</h1>
        <p className='muted' style={{ margin: 0 }}>
          Plataforma inicial com arquitetura App Router e navegação por universo.
        </p>
      </section>

      <section className='card stack'>
        <h2 style={{ margin: 0 }}>Entrar em um universo</h2>
        <p style={{ margin: 0 }}>Use o slug para abrir o hub e as seções.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href='/c/exemplo'>Abrir /c/exemplo</Link>
          <Link href='/c/matematica'>Abrir /c/matematica</Link>
        </div>
      </section>
    </main>
  );
}
