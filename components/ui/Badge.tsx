type BadgeVariant = 'default' | 'alert';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className='ui-badge' data-variant={variant}>
      {children}
    </span>
  );
}

export function Carimbo({ children, variant }: BadgeProps) {
  return <Badge variant={variant}>{children}</Badge>;
}
