type SectionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function makeSectionPage(title: string, description: string) {
  return async function SectionPage({ params }: SectionPageProps) {
    const { slug } = await params;

    return (
      <section className='card stack'>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p style={{ margin: 0 }}>
          Universo: <strong>{slug}</strong>
        </p>
        <p className='muted' style={{ margin: 0 }}>
          {description}
        </p>
      </section>
    );
  };
}