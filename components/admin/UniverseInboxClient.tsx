'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type InboxItem = {
  id: string;
  fileName: string;
  fileSize: number;
  extractedTitle: string | null;
  previewExcerpt: string | null;
  status: string;
  analysis: {
    topKeywords: string[];
    lowText: boolean;
  };
};

type InboxSuggestion = {
  title: string;
  slug: string;
  summary: string;
  templateId: string;
  confidence: number;
  warnings: string[];
  tags: string[];
  subthemes: string[];
  coreNodes: Array<{ slug: string; title: string; summary: string }>;
  glossary: Array<{ term: string; shortDef: string }>;
  questions: string[];
  trail: { title: string; summary: string; steps: string[] };
};

type InboxBatch = {
  id: string;
  status: string;
  items: InboxItem[];
  analysis: InboxSuggestion;
  createdUniverseId: string | null;
};

type CreateResult = {
  universe: { id: string; slug: string; title: string };
  program: { slug: string; title: string };
  lane: string;
  docsAttached: number;
};

export function UniverseInboxClient({ initialBatch }: { initialBatch: InboxBatch | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [batch, setBatch] = useState<InboxBatch | null>(initialBatch);
  const [title, setTitle] = useState(initialBatch?.analysis.title ?? '');
  const [slug, setSlug] = useState(initialBatch?.analysis.slug ?? '');
  const [summary, setSummary] = useState(initialBatch?.analysis.summary ?? '');
  const [templateId, setTemplateId] = useState(initialBatch?.analysis.templateId ?? 'issue_investigation');
  const [enqueueIngest, setEnqueueIngest] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasMixedThemes = (batch?.analysis.subthemes.length ?? 0) > 1;
  const confidenceLabel = useMemo(() => {
    const confidence = batch?.analysis.confidence ?? 0;
    if (confidence >= 0.8) return 'alta';
    if (confidence >= 0.55) return 'media';
    return 'baixa';
  }, [batch]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf');
    if (list.length === 0) {
      setError('Selecione 1 ou mais PDFs validos.');
      return;
    }

    setError('');
    setMessage('Enviando lote para analise...');
    setResult(null);
    const form = new FormData();
    for (const file of list) form.append('files', file);

    startTransition(() => {
      void (async () => {
        const response = await fetch('/api/admin/universes/inbox', { method: 'POST', body: form });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.batch) {
          setError('Nao foi possivel analisar o lote agora.');
          setMessage('');
          return;
        }

        const nextBatch = payload.batch as InboxBatch;
        setBatch(nextBatch);
        setTitle(nextBatch.analysis.title);
        setSlug(nextBatch.analysis.slug);
        setSummary(nextBatch.analysis.summary);
        setTemplateId(nextBatch.analysis.templateId);
        setMessage('Lote analisado. Revise a sugestao antes de criar o universo.');
        const params = new URLSearchParams(searchParams.toString());
        params.set('batch', nextBatch.id);
        router.replace(`${pathname}?${params.toString()}`);
      })();
    });
  }

  function submitCreate(enqueueValue: boolean) {
    if (!batch) return;
    setError('');
    setMessage(enqueueValue ? 'Criando universo e acoplando ao board...' : 'Criando universo sem enfileirar ingest...');
    setResult(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch('/api/admin/universes/inbox', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create_universe',
            batchId: batch.id,
            title,
            slug,
            summary,
            templateId,
            enqueueIngest: enqueueValue,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.result) {
          setError('Falha ao criar o universo a partir da inbox.');
          setMessage('');
          return;
        }

        setEnqueueIngest(enqueueValue);
        setResult(payload.result as CreateResult);
        setMessage('Universo criado com sucesso.');
      })();
    });
  }

  function suggestSplit() {
    if (!batch || !hasMixedThemes) return;
    const [primary, secondary] = batch.analysis.subthemes;
    setTemplateId('blank_minimal');
    setMessage(`Lote misto detectado. Sugestao: crie este universo para ${primary || 'o recorte principal'} e separe ${secondary || 'o recorte secundario'} em outro batch.`);
  }

  return (
    <div className='layout-shell' style={{ gridTemplateColumns: 'minmax(260px, 1.05fr) minmax(280px, 1fr) minmax(320px, 1.1fr)', alignItems: 'start' }}>
      <section className='stack'>
        <article className='core-node stack'>
          <strong>1. Dropzone de PDFs</strong>
          <p className='muted' style={{ margin: 0 }}>
            Arraste 3 a 8 PDFs de um mesmo macrotema. A inbox extrai sinais, detecta mistura e sugere o bootstrap editorial.
          </p>
          <button className='ui-button' type='button' onClick={() => inputRef.current?.click()} disabled={isPending}>
            Escolher PDFs
          </button>
          <input
            ref={inputRef}
            type='file'
            accept='application/pdf'
            multiple
            style={{ display: 'none' }}
            onChange={(event) => {
              if (event.target.files?.length) void handleFiles(event.target.files);
            }}
          />
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files?.length) void handleFiles(event.dataTransfer.files);
            }}
            style={{ minHeight: 220, border: '1px dashed var(--line-2)', borderRadius: 24, padding: 20, display: 'grid', placeItems: 'center' }}
          >
            <div className='stack' style={{ textAlign: 'center' }}>
              <strong>Solte o lote aqui</strong>
              <span className='muted'>PDFs do mesmo tema. A sugestao nasce como rascunho e segue para revisao humana.</span>
            </div>
          </div>
          {batch ? (
            <div className='stack'>
              {batch.items.map((item) => (
                <article key={item.id} className='core-node'>
                  <strong>{item.extractedTitle || item.fileName}</strong>
                  <p className='muted' style={{ margin: 0 }}>{Math.round(item.fileSize / 1024)} KB | status:{item.status}</p>
                  <p className='muted' style={{ margin: 0 }}>{item.previewExcerpt || 'Sem preview textual suficiente.'}</p>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </section>

      <section className='stack'>
        <article className='core-node stack'>
          <strong>2. Analise do lote</strong>
          {!batch ? <p className='muted' style={{ margin: 0 }}>O painel de analise aparece assim que o lote de PDFs sobe.</p> : null}
          {batch ? (
            <>
              <div className='toolbar-row'>
                <span className='badge'>{`template:${batch.analysis.templateId}`}</span>
                <span className='badge'>{`confianca:${confidenceLabel}`}</span>
                <span className='badge'>{`${batch.items.length} PDF(s)`}</span>
              </div>
              {batch.analysis.warnings.map((warning) => (
                <p key={warning} role='alert' className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>{warning}</p>
              ))}
              <div className='stack'>
                <strong>Subtemas</strong>
                <div className='toolbar-row'>
                  {batch.analysis.subthemes.map((subtheme) => <span className='badge' key={subtheme}>{subtheme}</span>)}
                </div>
              </div>
              <div className='stack'>
                <strong>Tags principais</strong>
                <div className='toolbar-row'>
                  {batch.analysis.tags.map((tag) => <span className='badge' key={tag}>#{tag}</span>)}
                </div>
              </div>
              <div className='stack'>
                <strong>Nos core sugeridos</strong>
                {batch.analysis.coreNodes.map((node) => (
                  <article key={node.slug} className='core-node'>
                    <strong>{node.title}</strong>
                    <p className='muted' style={{ margin: 0 }}>{node.summary}</p>
                  </article>
                ))}
              </div>
              <div className='stack'>
                <strong>Glossario inicial</strong>
                {batch.analysis.glossary.slice(0, 8).map((term) => (
                  <article key={term.term} className='core-node'>
                    <strong>{term.term}</strong>
                    <p className='muted' style={{ margin: 0 }}>{term.shortDef}</p>
                  </article>
                ))}
              </div>
              <div className='stack'>
                <strong>Perguntas de partida</strong>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {batch.analysis.questions.map((question) => <li key={question}>{question}</li>)}
                </ul>
              </div>
            </>
          ) : null}
        </article>
      </section>

      <section className='stack'>
        <article className='core-node stack'>
          <strong>3. Criacao do universo</strong>
          <label>
            <span>Titulo</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} style={{ width: '100%', minHeight: 40 }} disabled={!batch || isPending} />
          </label>
          <label>
            <span>Slug</span>
            <input value={slug} onChange={(event) => setSlug(event.target.value)} style={{ width: '100%', minHeight: 40 }} disabled={!batch || isPending} />
          </label>
          <label>
            <span>Resumo</span>
            <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} style={{ width: '100%' }} disabled={!batch || isPending} />
          </label>
          <label>
            <span>Template sugerido</span>
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} style={{ width: '100%', minHeight: 40 }} disabled={!batch || isPending}>
              <option value='issue_investigation'>Investigacao de tema</option>
              <option value='territorial_memory'>Memoria territorial</option>
              <option value='campaign_watch'>Monitoramento continuo</option>
              <option value='blank_minimal'>Em branco</option>
            </select>
          </label>
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type='checkbox' checked={enqueueIngest} onChange={(event) => setEnqueueIngest(event.target.checked)} disabled={!batch || isPending} />
            Enfileirar ingest apos criar
          </label>
          <div className='toolbar-row'>
            <button className='ui-button' type='button' onClick={() => submitCreate(true)} disabled={!batch || isPending}>
              Criar universo e enfileirar ingest
            </button>
            <button className='ui-button' type='button' data-variant='ghost' onClick={() => submitCreate(false)} disabled={!batch || isPending}>
              Criar universo sem ingest
            </button>
            {hasMixedThemes ? (
              <button className='ui-button' type='button' data-variant='ghost' onClick={suggestSplit} disabled={!batch || isPending}>
                Separar lote em 2 universos
              </button>
            ) : null}
          </div>
          {message ? <p className='muted' style={{ margin: 0 }}>{message}</p> : null}
          {error ? <p role='alert' className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>{error}</p> : null}
          {batch ? (
            <article className='core-node'>
              <strong>{batch.analysis.trail.title}</strong>
              <p className='muted' style={{ margin: 0 }}>{batch.analysis.trail.summary}</p>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                {batch.analysis.trail.steps.map((step) => <li key={step}>{step}</li>)}
              </ul>
            </article>
          ) : null}
          {result ? (
            <article className='core-node stack'>
              <strong>Universo criado</strong>
              <p className='muted' style={{ margin: 0 }}>{`${result.universe.title} entrou no board em ${result.lane} com ${result.docsAttached} doc(s) anexado(s).`}</p>
              <div className='toolbar-row'>
                <Link className='ui-button' href={`/c/${result.universe.slug}`}>Abrir Hub preview</Link>
                <Link className='ui-button' href={`/admin/universes/${result.universe.id}/checklist`}>Abrir Checklist</Link>
                <Link className='ui-button' href={`/admin/universes/${result.universe.id}/docs`}>Abrir Docs</Link>
                <Link className='ui-button' href={`/admin/programa-editorial/${result.program.slug}`}>Abrir board deste universo</Link>
              </div>
            </article>
          ) : null}
        </article>
      </section>
    </div>
  );
}


