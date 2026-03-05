import Link from 'next/link';

type ResumeJourneyCardProps = {
  title: string;
  description: string;
  href: string;
  cta?: string;
};

export function ResumeJourneyCard({ title, description, href, cta = 'Continuar' }: ResumeJourneyCardProps) {
  return (
    <article className='resume-journey-card surface-plate'>
      <h3>{title}</h3>
      <p className='muted'>{description}</p>
      <Link className='ui-button' href={href}>
        {cta}
      </Link>
    </article>
  );
}
