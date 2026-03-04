import { Carimbo } from '@/components/ui/Badge';

type UniverseVisibilityBadgeProps = {
  published: boolean;
  preview: boolean;
};

export function UniverseVisibilityBadge({ published, preview }: UniverseVisibilityBadgeProps) {
  if (published) {
    return <Carimbo>PUBLICADO</Carimbo>;
  }

  if (preview) {
    return <Carimbo variant='alert'>PREVIEW (nao publicado)</Carimbo>;
  }

  return <Carimbo variant='alert'>NAO PUBLICADO</Carimbo>;
}
