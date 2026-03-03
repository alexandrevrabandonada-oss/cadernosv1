type UniversoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function UniversoHubPage({ params }: UniversoPageProps) {
  const { slug } = await params;

  return (
    <section className='card stack'>
      <h1 style={{ margin: 0 }}>Hub do Universo</h1>
      <p style={{ margin: 0 }}>
        Universo atual: <strong>{slug}</strong>
      </p>
      <p className='muted' style={{ margin: 0 }}>
        Use o QuickNav para explorar mapa, provas, linha, trilhas, debate e tutoria.
      </p>
    </section>
  );
}