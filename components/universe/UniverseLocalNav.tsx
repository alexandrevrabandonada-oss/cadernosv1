import { Segmented } from '@/components/ui/Segmented';
import { buildUniverseHref, universeSections } from '@/lib/universeNav';

type UniverseLocalNavProps = {
  slug: string;
  currentPath: string;
};

const GROUP_ORDER = ['Exploracao', 'Estudo', 'Coletivo'] as const;

export function UniverseLocalNav({ slug, currentPath }: UniverseLocalNavProps) {
  const items = universeSections.map((section) => ({
    href: buildUniverseHref(slug, section.path),
    label: section.label,
  }));

  const groupLabels = GROUP_ORDER.map((group) => `${group}: ${universeSections.filter((section) => section.group === group).map((section) => section.label).join(' · ')}`);

  return (
    <div className='stack' style={{ gap: '0.5rem' }}>
      <div className='toolbar-row universe-local-groups' aria-label='Grupos do universo'>
        {groupLabels.map((group) => (
          <small key={group} className='ui-eyebrow'>
            {group}
          </small>
        ))}
      </div>
      <Segmented label='Salas do universo' items={items} currentPath={currentPath} />
    </div>
  );
}
