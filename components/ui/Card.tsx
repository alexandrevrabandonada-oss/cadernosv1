type CardProps = React.ComponentPropsWithoutRef<'section'> & {
  children: React.ReactNode;
};

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <section className={`card ui-card ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function Placa({ children, className }: CardProps) {
  return <Card className={className}>{children}</Card>;
}
