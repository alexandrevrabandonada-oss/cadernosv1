import { QuickNav } from '@/components/QuickNav';

type UniversoLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>;

export default async function UniversoLayout({ children, params }: UniversoLayoutProps) {
  const { slug } = await params;

  return (
    <main
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 240px) minmax(0, 1fr)',
        gap: '1rem',
      }}
    >
      <QuickNav slug={slug} />
      <div className='stack'>{children}</div>
    </main>
  );
}