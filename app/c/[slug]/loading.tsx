import { Card } from '@/components/ui/Card';
import { SkeletonDetail, SkeletonGrid, SkeletonLine } from '@/components/ui/Skeleton';

export default function UniversoLoading() {
  return (
    <main>
      <Card className='stack' aria-live='polite' aria-busy='true'>
        <SkeletonLine width='38%' />
        <div className='layout-shell' style={{ gridTemplateColumns: '2fr 1fr' }}>
          <SkeletonGrid count={4} />
          <SkeletonDetail />
        </div>
      </Card>
    </main>
  );
}
