type SkeletonProps = {
  width?: string;
  height?: string;
};

export function Skeleton({ width = '100%', height = '1rem' }: SkeletonProps) {
  return <div className='ui-skeleton' style={{ width, height }} aria-hidden='true' />;
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
