type UniverseMetaItem = {
  label: string;
  value: string;
};

type UniverseMetaBarProps = {
  items: UniverseMetaItem[];
};

export function UniverseMetaBar({ items }: UniverseMetaBarProps) {
  return (
    <div className='universe-meta-bar' role='list' aria-label='Metadados do universo'>
      {items.map((item) => (
        <article key={`${item.label}-${item.value}`} className='universe-meta-item surface-blade' role='listitem'>
          <small>{item.label}</small>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}
