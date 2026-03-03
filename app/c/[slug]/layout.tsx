import { QuickNav } from '@/components/QuickNav';

type UniversoLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>;

export default async function UniversoLayout({ children, params }: UniversoLayoutProps) {
  const { slug } = await params;

  return (
    <main className='split-layout'>
      <QuickNav slug={slug} />
      <div className='stack'>{children}</div>
    </main>
  );
}
