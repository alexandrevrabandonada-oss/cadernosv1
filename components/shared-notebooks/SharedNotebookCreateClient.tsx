'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useToast } from '@/components/ui/Toast';
import { applyNotebookTemplate, listNotebookTemplates, type SharedNotebookTemplateDefinition } from '@/lib/shared-notebooks/templates';
import type { SharedNotebookSummary, SharedNotebookVisibility } from '@/lib/shared-notebooks/types';
import { buildUniverseHref } from '@/lib/universeNav';

type Props = {
  slug: string;
  universeTitle: string;
};

export function SharedNotebookCreateClient({ slug, universeTitle }: Props) {
  const router = useRouter();
  const toast = useToast();
  const templates = useMemo(() => listNotebookTemplates(), []);
  const [selected, setSelected] = useState<SharedNotebookTemplateDefinition | null>(templates[0] ?? null);
  const initial = useMemo(() => applyNotebookTemplate(selected, {}), [selected]);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary ?? '');
  const [visibility, setVisibility] = useState<SharedNotebookVisibility>(initial.visibility);
  const [saving, setSaving] = useState(false);

  function chooseTemplate(template: SharedNotebookTemplateDefinition | null) {
    setSelected(template);
    const next = applyNotebookTemplate(template, {});
    setTitle(next.title);
    setSummary(next.summary ?? '');
    setVisibility(next.visibility);
  }

  async function onCreate() {
    const applied = applyNotebookTemplate(selected, { title, summary, visibility });
    setSaving(true);
    try {
      const response = await fetch('/api/shared-notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universeSlug: slug,
          title: applied.title,
          summary: applied.summary,
          visibility: applied.visibility,
          templateId: applied.templateId,
          templateMeta: applied.templateMeta,
        }),
      });
      const payload = (await response.json()) as { notebook?: SharedNotebookSummary; error?: string };
      if (!response.ok || !payload.notebook) throw new Error(payload.error ?? 'create_failed');
      toast.success('Coletivo criado.');
      router.push(buildUniverseHref(slug, `coletivos/${payload.notebook.slug}`));
    } catch {
      toast.error('Falha ao criar coletivo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='stack'>
      <Card className='stack'>
        <SectionHeader title={`Criar coletivo em ${universeTitle}`} description='Escolha um template leve para nao comecar do zero e depois ajuste o coletivo normalmente.' tag='Template' />
        <div className='toolbar-row'>
          <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'coletivos')}>
            Voltar aos coletivos
          </Link>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Templates' description='Cada template sugere estrutura inicial, microcopy e tipos prioritarios.' />
        <div className='core-grid'>
          {templates.map((template) => (
            <button key={template.id} type='button' className='core-node stack' onClick={() => chooseTemplate(template)} data-selected={selected?.id === template.id ? 'true' : undefined}>
              <strong>{template.label}</strong>
              <p className='muted' style={{ margin: 0 }}>{template.summary}</p>
              <div className='toolbar-row'>
                <Carimbo>{`vis:${template.visibility}`}</Carimbo>
                {template.preferredSources.slice(0, 3).map((source) => (
                  <Carimbo key={source}>{source}</Carimbo>
                ))}
              </div>
              <p className='muted' style={{ margin: 0 }}>{template.microcopy}</p>
            </button>
          ))}
          <button type='button' className='core-node stack' onClick={() => chooseTemplate(null)} data-selected={selected === null ? 'true' : undefined}>
            <strong>Em branco</strong>
            <p className='muted' style={{ margin: 0 }}>Comece sem estrutura predefinida. Bom quando o coletivo ja tem rito proprio.</p>
            <div className='toolbar-row'>
              <Carimbo>vis:team</Carimbo>
              <Carimbo>livre</Carimbo>
            </div>
          </button>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Formulario rapido' description='Template e ponto de partida. Ajuste titulo, resumo e visibilidade antes de criar.' />
        <label>
          <span>Titulo</span>
          <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} style={{ width: '100%', minHeight: 42 }} />
        </label>
        <label>
          <span>Resumo</span>
          <textarea value={summary} onChange={(event) => setSummary(event.currentTarget.value)} rows={4} style={{ width: '100%' }} />
        </label>
        <label>
          <span>Visibilidade</span>
          <select value={visibility} onChange={(event) => setVisibility(event.currentTarget.value as SharedNotebookVisibility)} style={{ width: '100%', minHeight: 42 }}>
            <option value='team'>team</option>
            <option value='private'>private</option>
            <option value='public'>public</option>
          </select>
        </label>
        {selected ? (
          <div className='toolbar-row'>
            {selected.suggestedTags.map((tag) => (
              <Carimbo key={tag}>{`#${tag}`}</Carimbo>
            ))}
          </div>
        ) : null}
        <div className='toolbar-row'>
          <button className='ui-button' type='button' onClick={() => void onCreate()} disabled={saving || !title.trim()}>
            {saving ? 'Criando...' : selected?.createCta ?? 'Criar coletivo'}
          </button>
        </div>
      </Card>
    </div>
  );
}

