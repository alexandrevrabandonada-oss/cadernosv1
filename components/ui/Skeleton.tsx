type SkeletonProps = {
  width?: string;
  height?: string;
};

export function Skeleton({ width = '100%', height = '1rem' }: SkeletonProps) {
  return <div className='ui-skeleton' style={{ width, height }} aria-hidden='true' data-testid='skeleton' />;
}

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <Skeleton width={width} height='0.95rem' />;
}

export function SkeletonCard() {
  return (
    <article className='core-node stack' aria-hidden='true'>
      <SkeletonLine width='62%' />
      <SkeletonLine width='88%' />
      <SkeletonLine width='74%' />
      <div className='toolbar-row'>
        <Skeleton width='68px' height='26px' />
        <Skeleton width='92px' height='26px' />
      </div>
    </article>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className='core-grid' aria-hidden='true'>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={`sk-grid-${idx}`} />
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <section className='stack' aria-hidden='true'>
      <div className='core-node stack'>
        <SkeletonLine width='48%' />
        <SkeletonLine width='95%' />
        <SkeletonLine width='83%' />
      </div>
      <div className='core-node stack'>
        <SkeletonLine width='32%' />
        <SkeletonLine width='90%' />
        <SkeletonLine width='66%' />
      </div>
    </section>
  );
}

export function LoadingBlock() {
  return (
    <section className='card stack' aria-live='polite' aria-busy='true'>
      <Skeleton width='30%' height='1.3rem' />
      <Skeleton width='90%' />
      <Skeleton width='70%' />
      <Skeleton width='45%' />
    </section>
  );
}
