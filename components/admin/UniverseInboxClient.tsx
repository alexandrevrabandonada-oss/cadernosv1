'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { InboxAlertCard } from '@/components/admin/InboxAlertCard';
import { InboxSuggestionPanel } from '@/components/admin/InboxSuggestionPanel';
import { SuggestionConfidenceBadge } from '@/components/admin/SuggestionConfidenceBadge';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

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

type DraftFile = {
  id: string;
  file: File;
};

const TEMPLATE_OPTIONS = [
  { value: 'issue_investigation', label: 'Investigacao de tema' },
  { value: 'territorial_memory', label: 'Memoria territorial' },
  { value: 'campaign_watch', label: 'Monitoramento continuo' },
  { value: 'blank_minimal', label: 'Em branco' },
] as const;

function formatBytes(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

const MAX_SINGLE_FILE_BYTES = 4 * 1024 * 1024;

function templateLabel(templateId: string) {
  return TEMPLATE_OPTIONS.find((option) => option.value === templateId)?.label ?? templateId;
}

function classifyWarning(warning: string): { title: string; tone: 'alert' | 'warning' | 'ok' } {
  const lower = warning.toLowerCase();
  if (lower.includes('ocr') || lower.includes('texto')) return { title: 'Texto fraco ou OCR limitado', tone: 'warning' };
  if (lower.includes('mistur') || lower.includes('heterog')) return { title: 'Lote muito heterogeneo', tone: 'alert' };
  if (lower.includes('poucos sinais')) return { title: 'Poucos sinais em comum', tone: 'alert' };
  if (lower.includes('generico')) return { title: 'Titulo ainda generico', tone: 'warning' };
  if (lower.includes('template')) return { title: 'Template incerto', tone: 'warning' };
  return { title: 'Alerta editorial', tone: 'warning' };
}

export function UniverseInboxClient({ initialBatch }: { initialBatch: InboxBatch | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [batch, setBatch] = useState<InboxBatch | null>(initialBatch);
  const [title, setTitle] = useState(initialBatch?.analysis.title ?? '');
  const [slug, setSlug] = useState(initialBatch?.analysis.slug ?? '');
  const [summary, setSummary] = useState(initialBatch?.analysis.summary ?? '');
  const [templateId, setTemplateId] = useState(initialBatch?.analysis.templateId ?? 'issue_investigation');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasBatch = Boolean(batch);
  const hasMixedThemes = (batch?.analysis.subthemes.length ?? 0) > 1;
  const expectedLane = result?.lane ?? ((batch?.items.length ?? 0) > 0 ? 'ingest' : 'bootstrap');
  const dropzoneState = isPending ? 'processing' : isDragging ? 'dragging' : draftFiles.length > 0 ? 'files' : hasBatch ? 'review' : 'empty';
  const topKeywords = useMemo(() => {
    if (!batch) return [] as string[];
    const merged = batch.items.flatMap((item) => item.analysis.topKeywords ?? []);
    return Array.from(new Set(merged)).slice(0, 8);
  }, [batch]);

  function syncDraftFiles(nextFiles: FileList | File[]) {
    const list = Array.from(nextFiles).filter((file) => file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf');
    if (list.length === 0) {
      setError('Selecione 1 ou mais PDFs validos.');
      return;
    }

    setError('');
    setMessage('Lote recebido. Revise os arquivos e inicie a leitura inicial quando estiver pronto.');
    setResult(null);
    setBatch(null);
    setDraftFiles((current) => {
      const seen = new Set(current.map((item) => `${item.file.name}:${item.file.size}`));
      const additions = list
        .filter((file) => !seen.has(`${file.name}:${file.size}`))
        .map((file, index) => ({ id: `${file.name}-${file.size}-${Date.now()}-${index}`, file }));
      return [...current, ...additions];
    });
  }

  async function analyzeCurrentBatch() {
    if (draftFiles.length === 0) {
      setError('Adicione PDFs antes de iniciar a analise.');
      return;
    }

    const oversized = draftFiles.find((item) => item.file.size > MAX_SINGLE_FILE_BYTES);
    if (oversized) {
      setError(`O arquivo ${oversized.file.name} passou de 4 MB e pode ser recusado pela hospedagem atual. Divida o PDF ou use um arquivo menor.`);
      setMessage('');
      return;
    }

    setError('');
    setResult(null);

    startTransition(() => {
      void (async () => {
        let nextBatch: InboxBatch | null = null;

        for (let index = 0; index < draftFiles.length; index += 1) {
          const item = draftFiles[index];
          setMessage(`Enviando ${index + 1} de ${draftFiles.length}: ${item.file.name}`);
          const form = new FormData();
          form.append('files', item.file);
          if (nextBatch?.id) form.append('batchId', nextBatch.id);

          const response = await fetch('/api/admin/universes/inbox', { method: 'POST', body: form });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload?.batch) {
            const serverMessage = String(payload?.message ?? '').trim();
            if (response.status === 413) {
              setError(`O arquivo ${item.file.name} passou do limite aceito pela hospedagem atual. Divida o PDF ou tente um arquivo menor.`);
            } else {
              setError(serverMessage || `Nao foi possivel analisar ${item.file.name} agora.`);
            }
            setMessage('');
            return;
          }

          nextBatch = payload.batch as InboxBatch;
          setBatch(nextBatch);
        }

        if (!nextBatch) {
          setError('Nao foi possivel montar o lote da inbox.');
          setMessage('');
          return;
        }

        setTitle(nextBatch.analysis.title);
        setSlug(nextBatch.analysis.slug);
        setSummary(nextBatch.analysis.summary);
        setTemplateId(nextBatch.analysis.templateId);
        setMessage('Leitura inicial pronta. Revise as sugestoes antes de criar o universo.');
        const params = new URLSearchParams(searchParams.toString());
        params.set('batch', nextBatch.id);
        router.replace(`${pathname}?${params.toString()}`);
      })();
    });
  }
  function removeDraftFile(fileId: string) {
    setDraftFiles((current) => current.filter((item) => item.id !== fileId));
  }

  function clearDraftBatch() {
    setDraftFiles([]);
    setBatch(null);
    setMessage('');
    setError('');
    setResult(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('batch');
    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  function submitCreate(enqueueIngest: boolean) {
    if (!batch) return;
    setError('');
    setMessage(enqueueIngest ? 'Criando universo e enfileirando ingest...' : 'Criando a estrutura inicial do universo...');
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
            enqueueIngest,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.result) {
          setError(String(payload?.message ?? 'Falha ao criar o universo a partir da inbox.'));
          setMessage('');
          return;
        }

        setResult(payload.result as CreateResult);
        setMessage('Universo criado com sucesso.');
      })();
    });
  }

  function suggestSplit() {
    if (!batch || !hasMixedThemes) return;
    const [primary, secondary] = batch.analysis.subthemes;
    setTemplateId('blank_minimal');
    setMessage(`Tema misto detectado. Sugestao: mantenha ${primary || 'o recorte principal'} neste universo e separe ${secondary || 'o segundo eixo'} em um novo lote.`);
  }

  return (
    <div className='stack stack-editorial'>
      <section className='inbox-hero-grid'>
        <Card className='inbox-hero-card stack'>
          <div className='stack' style={{ gap: '0.6rem' }}>
            <small className='ui-eyebrow'>Inbox documental premium</small>
            <h2 style={{ margin: 0 }}>Sala de leitura documental assistida</h2>
            <p className='muted' style={{ margin: 0 }}>
              Arraste PDFs de um mesmo tema. A IA sugere universo, estrutura inicial e proximo passo editorial. O editor revisa tudo antes de criar.
            </p>
          </div>
          <div className='toolbar-row'>
            <Badge variant='ok'>Dropzone premium</Badge>
            <Badge variant='ok'>Analise assistida</Badge>
            <Badge variant='ok'>Board conectado</Badge>
          </div>
        </Card>

        <Card className='inbox-step-rail'>
          <div className='inbox-step-chip' data-active='true'>1. Entrar PDFs</div>
          <div className='inbox-step-chip' data-active={draftFiles.length > 0 || hasBatch ? 'true' : 'false'}>2. Lote recebido</div>
          <div className='inbox-step-chip' data-active={hasBatch ? 'true' : 'false'}>3. Leitura inicial</div>
          <div className='inbox-step-chip' data-active={hasBatch || Boolean(result) ? 'true' : 'false'}>4. Antes de criar</div>
        </Card>
      </section>

      <section className='inbox-grid'>
        <Card className='stack inbox-dropzone-panel'>
          <div className='stack' style={{ gap: '0.5rem' }}>
            <small className='ui-eyebrow'>1. Dropzone</small>
            <strong>Arraste PDFs de um mesmo tema</strong>
            <p className='muted' style={{ margin: 0 }}>
              Use de 3 a 8 arquivos quando possivel. Lotes muito mistos ou scans com pouco texto podem cair para um template mais conservador.
            </p>
          </div>

          <input
            ref={inputRef}
            type='file'
            accept='application/pdf'
            multiple
            style={{ display: 'none' }}
            onChange={(event) => {
              if (event.target.files?.length) syncDraftFiles(event.target.files);
            }}
          />

          <button className='ui-button' type='button' onClick={() => inputRef.current?.click()} disabled={isPending}>
            Selecionar arquivos
          </button>

          <div
            className='inbox-dropzone-surface'
            data-state={dropzoneState}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (event.dataTransfer.files?.length) syncDraftFiles(event.dataTransfer.files);
            }}
          >
            <div className='stack' style={{ textAlign: 'center', gap: '0.45rem' }}>
              <strong>
                {isPending
                  ? 'Processando lote...'
                  : draftFiles.length > 0
                    ? 'Lote pronto para leitura inicial'
                    : hasBatch
                      ? 'Analise pronta para revisao editorial'
                      : 'Solte o lote aqui'}
              </strong>
              <span className='muted'>A IA sugere universo, estrutura e proxima lane. Nada e publicado automaticamente.</span>
              <div className='toolbar-row' style={{ justifyContent: 'center' }}>
                <Badge variant='warning'>PDF apenas</Badge>
                <Badge variant='default'>Mesmo macrotema</Badge>
                <Badge variant='default'>Revisao humana obrigatoria</Badge>
              </div>
            </div>
          </div>

          <div className='toolbar-row'>
            <button className='ui-button' data-variant='primary' type='button' onClick={analyzeCurrentBatch} disabled={draftFiles.length === 0 || isPending}>
              Iniciar leitura do lote
            </button>
            <button className='ui-button' data-variant='ghost' type='button' onClick={clearDraftBatch} disabled={(draftFiles.length === 0 && !batch) || isPending}>
              Limpar lote
            </button>
          </div>
        </Card>

        <Card className='stack'>
          <div className='stack' style={{ gap: '0.5rem' }}>
            <small className='ui-eyebrow'>2. Lote recebido</small>
            <strong>Arquivos prontos para entrar na analise</strong>
            <p className='muted' style={{ margin: 0 }}>
              Revise o lote antes de subir. Voce pode remover arquivos destoantes para reduzir mistura tematica.
            </p>
          </div>

          {draftFiles.length === 0 && !batch ? (
            <div className='empty-state'>
              <div className='empty-state-head'>
                <small>Lote recebido</small>
                <strong>Nenhum PDF selecionado ainda</strong>
              </div>
              <p className='muted' style={{ margin: 0 }}>Assim que voce arrastar arquivos, esta area lista nome, tamanho e a fila pronta para analise.</p>
            </div>
          ) : null}

          {draftFiles.length > 0 ? (
            <div className='stack'>
              {draftFiles.map((item) => (
                <article key={item.id} className='core-node inbox-file-card'>
                  <div className='stack' style={{ gap: '0.35rem' }}>
                    <strong>{item.file.name}</strong>
                    <p className='muted' style={{ margin: 0 }}>{formatBytes(item.file.size)} | status: aguardando analise</p>
                    <p className='muted' style={{ margin: 0 }}>Titulo extraido: disponivel apos a leitura inicial.</p>
                  </div>
                  <button className='ui-button' data-variant='ghost' type='button' onClick={() => removeDraftFile(item.id)} disabled={isPending}>
                    Remover
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          {batch ? (
            <div className='stack'>
              {batch.items.map((item) => (
                <article key={item.id} className='core-node inbox-file-card'>
                  <div className='stack' style={{ gap: '0.35rem' }}>
                    <strong>{item.fileName}</strong>
                    <p className='muted' style={{ margin: 0 }}>{formatBytes(item.fileSize)} | status: {item.status}</p>
                    <p className='muted' style={{ margin: 0 }}>Titulo extraido: {item.extractedTitle || 'sem sinal forte'}</p>
                    <p className='muted' style={{ margin: 0 }}>{item.previewExcerpt || 'Sem preview textual suficiente.'}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </Card>
      </section>

      <section className='inbox-grid'>
        <div className='stack'>
          <InboxSuggestionPanel
            eyebrow='3. Leitura inicial'
            title='Tema principal'
            description='A leitura editorial abaixo resume o recorte que apareceu com mais forca no lote.'
          >
            {!batch ? (
              <p className='muted' style={{ margin: 0 }}>A analise aparece aqui assim que o lote entra na leitura inicial.</p>
            ) : (
              <div className='stack'>
                <div className='toolbar-row'>
                  <SuggestionConfidenceBadge confidence={batch.analysis.confidence} />
                  <Badge variant='default'>{`${batch.items.length} PDF(s)`}</Badge>
                  <Badge variant='default'>{templateLabel(batch.analysis.templateId)}</Badge>
                </div>
                <div className='inbox-kv-grid'>
                  <article className='core-node'>
                    <small>Tema sugerido</small>
                    <strong>{batch.analysis.title}</strong>
                    <p className='muted' style={{ margin: 0 }}>{batch.analysis.summary}</p>
                  </article>
                  <article className='core-node'>
                    <small>Slug sugerido</small>
                    <strong>{batch.analysis.slug}</strong>
                    <p className='muted' style={{ margin: 0 }}>Template sugerido: {templateLabel(batch.analysis.templateId)}</p>
                  </article>
                </div>
              </div>
            )}
          </InboxSuggestionPanel>

          <InboxSuggestionPanel
            eyebrow='Sinais detectados'
            title='O que puxou a leitura da IA'
            description='A confianca sobe quando varios PDFs repetem sinais semelhantes.'
          >
            {!batch ? (
              <p className='muted' style={{ margin: 0 }}>Sem sinais ainda.</p>
            ) : (
              <>
                <div className='toolbar-row'>
                  {topKeywords.map((keyword) => <Badge key={keyword}>#{keyword}</Badge>)}
                </div>
                <div className='toolbar-row'>
                  {batch.analysis.subthemes.map((subtheme) => <Badge key={subtheme} variant='warning'>{subtheme}</Badge>)}
                </div>
              </>
            )}
          </InboxSuggestionPanel>

          <InboxSuggestionPanel
            eyebrow='Estrutura sugerida'
            title='Bootstrap inicial do universo'
            description='Esses elementos nascem como estrutura editorial, nao como conteudo publicado.'
          >
            {!batch ? (
              <p className='muted' style={{ margin: 0 }}>Os nos core, o glossario e as perguntas aparecem apos a leitura inicial.</p>
            ) : (
              <div className='stack'>
                <div className='stack'>
                  <strong>Nos core sugeridos</strong>
                  <div className='stack'>
                    {batch.analysis.coreNodes.map((node) => (
                      <article key={node.slug} className='core-node'>
                        <strong>{node.title}</strong>
                        <p className='muted' style={{ margin: 0 }}>{node.summary}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <div className='inbox-kv-grid'>
                  <article className='core-node'>
                    <small>Glossario inicial</small>
                    <div className='stack' style={{ gap: '0.45rem' }}>
                      {batch.analysis.glossary.slice(0, 8).map((term) => (
                        <div key={term.term}>
                          <strong>{term.term}</strong>
                          <p className='muted' style={{ margin: 0 }}>{term.shortDef}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className='core-node'>
                    <small>Perguntas iniciais</small>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {batch.analysis.questions.map((question) => <li key={question}>{question}</li>)}
                    </ul>
                  </article>
                </div>
              </div>
            )}
          </InboxSuggestionPanel>
        </div>

        <div className='stack'>
          <InboxSuggestionPanel
            eyebrow='Alertas'
            title='Confianca e guardrails'
            description='Quando a base esta fraca ou misturada, a inbox aponta isso antes da criacao.'
          >
            {!batch ? (
              <p className='muted' style={{ margin: 0 }}>Os alertas aparecem apenas quando a analise encontra risco editorial.</p>
            ) : batch.analysis.warnings.length > 0 ? (
              <div className='stack'>
                {batch.analysis.warnings.map((warning) => {
                  const alert = classifyWarning(warning);
                  return <InboxAlertCard key={warning} title={alert.title} body={warning} tone={alert.tone} />;
                })}
              </div>
            ) : (
              <InboxAlertCard title='Sinais consistentes' body='O lote mostrou um eixo tematico razoavelmente coeso para o bootstrap inicial.' tone='ok' />
            )}
          </InboxSuggestionPanel>

          <Card className='stack inbox-review-card'>
            <div className='stack' style={{ gap: '0.5rem' }}>
              <small className='ui-eyebrow'>4. Antes de criar</small>
              <strong>Revise as sugestoes da IA</strong>
              <p className='muted' style={{ margin: 0 }}>
                Ajuste titulo, slug, resumo e template. O universo so nasce quando voce confirmar a operacao.
              </p>
            </div>

            <label className='stack' style={{ gap: '0.35rem' }}>
              <span>Titulo</span>
              <input aria-label='Titulo' value={title} onChange={(event) => setTitle(event.target.value)} disabled={!batch || isPending} />
            </label>
            <label className='stack' style={{ gap: '0.35rem' }}>
              <span>Slug</span>
              <input aria-label='Slug' value={slug} onChange={(event) => setSlug(event.target.value)} disabled={!batch || isPending} />
            </label>
            <label className='stack' style={{ gap: '0.35rem' }}>
              <span>Resumo</span>
              <textarea aria-label='Resumo' value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} disabled={!batch || isPending} />
            </label>
            <label className='stack' style={{ gap: '0.35rem' }}>
              <span>Template</span>
              <select aria-label='Template' value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={!batch || isPending}>
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {batch ? (
              <Card className='stack inbox-final-summary' surface='plate'>
                <div className='stack' style={{ gap: '0.35rem' }}>
                  <small className='ui-eyebrow'>Resumo final</small>
                  <strong>{title || batch.analysis.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>{summary || batch.analysis.summary}</p>
                </div>
                <div className='inbox-kv-grid'>
                  <article className='core-node'>
                    <small>Universo</small>
                    <strong>{slug || batch.analysis.slug}</strong>
                    <p className='muted' style={{ margin: 0 }}>Template: {templateLabel(templateId)}</p>
                  </article>
                  <article className='core-node'>
                    <small>Proximo passo do pipeline</small>
                    <strong>{expectedLane}</strong>
                    <p className='muted' style={{ margin: 0 }}>
                      {batch.items.length} doc(s) serao anexados e o board deve refletir a lane inicial imediatamente.
                    </p>
                  </article>
                </div>
                <article className='core-node'>
                  <small>Trilha inicial</small>
                  <strong>{batch.analysis.trail.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>{batch.analysis.trail.summary}</p>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                    {batch.analysis.trail.steps.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                </article>
              </Card>
            ) : null}

            <div className='toolbar-row'>
              <button className='ui-button' data-variant='primary' type='button' onClick={() => submitCreate(true)} disabled={!batch || isPending}>
                Criar universo e enfileirar ingest
              </button>
              <button className='ui-button' type='button' onClick={() => submitCreate(false)} disabled={!batch || isPending}>
                Criar so a estrutura
              </button>
              {hasMixedThemes ? (
                <button className='ui-button' data-variant='ghost' type='button' onClick={suggestSplit} disabled={!batch || isPending}>
                  Separar lote
                </button>
              ) : null}
            </div>

            {message ? <p className='muted' style={{ margin: 0 }}>{message}</p> : null}
            {error ? <p role='alert' className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>{error}</p> : null}
          </Card>
        </div>
      </section>

      {result ? (
        <Card className='stack inbox-success-card'>
          <div className='stack' style={{ gap: '0.4rem' }}>
            <small className='ui-eyebrow'>Universo criado</small>
            <h3 style={{ margin: 0 }}>{result.universe.title}</h3>
            <p className='muted' style={{ margin: 0 }}>
              O universo entrou no board em <strong>{result.lane}</strong> com {result.docsAttached} doc(s) anexado(s). A sala de ingest ja esta pronta para a proxima etapa.
            </p>
          </div>
          <div className='toolbar-row'>
            <Badge variant='ok'>{`Lane inicial: ${result.lane}`}</Badge>
            <Badge variant='default'>{`${result.docsAttached} docs enfileirados`}</Badge>
          </div>
          <div className='toolbar-row'>
            <Link className='ui-button' href={`/c/${result.universe.slug}`}>Abrir Hub preview</Link>
            <Link className='ui-button' href={`/admin/programa-editorial/${result.program.slug}`}>Abrir Board</Link>
            <Link className='ui-button' href={`/admin/universes/${result.universe.id}/checklist`}>Abrir Checklist</Link>
            <Link className='ui-button' href={`/admin/universes/${result.universe.id}/docs`}>Abrir Docs importados</Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}



