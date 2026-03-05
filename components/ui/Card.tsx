type CardProps = React.ComponentPropsWithoutRef<'section'> & {
  children: React.ReactNode;
  surface?: 'panel' | 'plate' | 'blade';
};

export function Card({ children, className = '', surface = 'panel', ...props }: CardProps) {
  const surfaceClass = surface === 'panel' ? 'surface-panel' : surface === 'plate' ? 'surface-plate' : 'surface-blade';
  return (
    <section className={`card ui-card ${surfaceClass} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function Placa({ children, className }: CardProps) {
  return <Card className={className} surface='plate'>{children}</Card>;
}

export function Panel({ children, className, ...props }: CardProps) {
  return (
    <Card className={className} surface='panel' {...props}>
      {children}
    </Card>
  );
}

export function Plate({ children, className, ...props }: CardProps) {
  return (
    <Card className={className} surface='plate' {...props}>
      {children}
    </Card>
  );
}

export function Blade({ children, className, ...props }: CardProps) {
  return (
    <Card className={className} surface='blade' {...props}>
      {children}
    </Card>
  );
}
