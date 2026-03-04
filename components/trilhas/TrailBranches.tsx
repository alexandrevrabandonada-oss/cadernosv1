import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { buildUniverseHref } from '@/lib/universeNav';

type TrailBranchesProps = {
  slug: string;
  coreNodes: Array<{ id: string; slug: string; title: string }>;
  tags: string[];
};

export function TrailBranches({ slug, coreNodes, tags }: TrailBranchesProps) {
  const provasPath = buildUniverseHref(slug, 'provas');
  const linhaPath = buildUniverseHref(slug, 'linha');
  const debatePath = buildUniverseHref(slug, 'debate');
  const tutorPath = buildUniverseHref(slug, 'tutor');

  return (
    <Card className='stack'>
      <SectionHeader title='Quer seguir por...' description='Ramifique por no, tipo ou tag e abra as telas v2 ja filtradas.' />

      <div className='stack'>
        <strong>Por no (core)</strong>
        <div className='toolbar-row'>
          {coreNodes.slice(0, 9).map((node) => (
            <div key={node.id} className='core-node stack' style={{ minWidth: 220 }}>
              <strong>{node.title}</strong>
              <div className='toolbar-row'>
                <Link className='ui-button' href={`${provasPath}?node=${encodeURIComponent(node.slug)}`}>
                  Provas
                </Link>
                <Link className='ui-button' data-variant='ghost' href={`${linhaPath}?node=${encodeURIComponent(node.slug)}`}>
                  Linha
                </Link>
                <Link
                  className='ui-button'
                  data-variant='ghost'
                  href={`${debatePath}?node=${encodeURIComponent(node.slug)}&status=strict_ok`}
                >
                  Debate
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='stack'>
        <strong>Por tipo</strong>
        <div className='toolbar-row'>
          <Link className='ui-button' href={provasPath}>
            Provas
          </Link>
          <Link className='ui-button' href={linhaPath}>
            Linha
          </Link>
          <Link className='ui-button' href={debatePath}>
            Debate
          </Link>
          <Link className='ui-button' href={tutorPath}>
            Tutor
          </Link>
        </div>
      </div>

      <div className='stack'>
        <strong>Por tags</strong>
        <div className='toolbar-row'>
          {tags.slice(0, 14).map((tag) => (
            <Link key={tag} className='ui-button' data-variant='ghost' href={`${provasPath}?tags=${encodeURIComponent(tag.toLowerCase())}`}>
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
