'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Carimbo } from '@/components/ui/Badge';

type ReadingLesson = {
  id: string;
  title: string;
  prompt: string;
  guidedQuestions: string[];
  recommendedEvidence: Array<{
    id: string;
    title: string;
    summary: string;
    docTitle: string | null;
  }>;
};

type PathSuggestionStep = {
  id: string;
  order: number;
  title: string;
  instruction: string;
  nodeTitle: string | null;
  portalPath: 'mapa' | 'provas' | 'linha' | 'trilhas' | 'debate' | 'tutoria';
};

type TutoriaPanelProps = {
  slug: string;
  readingLessons: ReadingLesson[];
  pathSteps: PathSuggestionStep[];
};

function storageKey(slug: string, mode: string) {
  return `cv:tutoria:${slug}:${mode}`;
}

export function TutoriaPanel({ slug, readingLessons, pathSteps }: TutoriaPanelProps) {
  const [mode, setMode] = useState<'leitura' | 'percurso'>('leitura');
  const [readingDone, setReadingDone] = useState<Record<string, boolean>>({});
  const [pathDone, setPathDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const savedReading = localStorage.getItem(storageKey(slug, 'leitura'));
      const savedPath = localStorage.getItem(storageKey(slug, 'percurso'));
      if (savedReading) setReadingDone(JSON.parse(savedReading) as Record<string, boolean>);
      if (savedPath) setPathDone(JSON.parse(savedPath) as Record<string, boolean>);
    } catch {
      setReadingDone({});
      setPathDone({});
    }
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(storageKey(slug, 'leitura'), JSON.stringify(readingDone));
  }, [slug, readingDone]);

  useEffect(() => {
    localStorage.setItem(storageKey(slug, 'percurso'), JSON.stringify(pathDone));
  }, [slug, pathDone]);

  const readingProgress = useMemo(() => {
    if (readingLessons.length === 0) return 0;
    const done = readingLessons.filter((lesson) => readingDone[lesson.id]).length;
    return Math.round((done / readingLessons.length) * 100);
  }, [readingLessons, readingDone]);

  const pathProgress = useMemo(() => {
    if (pathSteps.length === 0) return 0;
    const done = pathSteps.filter((step) => pathDone[step.id]).length;
    return Math.round((done / pathSteps.length) * 100);
  }, [pathSteps, pathDone]);

  return (
    <div className='stack'>
      <div className='toolbar-row'>
        <button
          type='button'
          className='ui-button'
          data-variant={mode === 'leitura' ? 'primary' : 'ghost'}
          onClick={() => setMode('leitura')}
        >
          Tutoria de Leitura
        </button>
        <button
          type='button'
          className='ui-button'
          data-variant={mode === 'percurso' ? 'primary' : 'ghost'}
          onClick={() => setMode('percurso')}
        >
          Tutoria de Percurso
        </button>
      </div>

      {mode === 'leitura' ? (
        <div className='stack'>
          <div className='toolbar-row'>
            <Carimbo>{`progresso:${readingProgress}%`}</Carimbo>
            <Carimbo>{`licoes:${readingLessons.length}`}</Carimbo>
          </div>
          {readingLessons.map((lesson) => (
            <article key={lesson.id} className='core-node'>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type='checkbox'
                  checked={Boolean(readingDone[lesson.id])}
                  onChange={(event) =>
                    setReadingDone((current) => ({ ...current, [lesson.id]: event.target.checked }))
                  }
                />
                <strong>{lesson.title}</strong>
              </label>
              <p style={{ margin: 0 }}>{lesson.prompt}</p>
              <div className='stack' style={{ gap: 6 }}>
                {lesson.guidedQuestions.map((question, index) => (
                  <p key={`${lesson.id}-q-${index}`} className='muted' style={{ margin: 0 }}>
                    {index + 1}. {question}
                  </p>
                ))}
              </div>
              <div className='stack' style={{ gap: 6 }}>
                <strong>Evidencias recomendadas</strong>
                {lesson.recommendedEvidence.map((evidence) => (
                  <div key={evidence.id}>
                    <p style={{ margin: 0 }}>
                      <strong>{evidence.title}</strong>
                    </p>
                    <p className='muted' style={{ margin: 0 }}>
                      {evidence.summary}
                      {evidence.docTitle ? ` (${evidence.docTitle})` : ''}
                    </p>
                  </div>
                ))}
                {lesson.recommendedEvidence.length === 0 ? (
                  <p className='muted' style={{ margin: 0 }}>
                    Sem evidencias recomendadas para esta licao.
                  </p>
                ) : null}
              </div>
            </article>
          ))}
          {readingLessons.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhuma mini-licao encontrada.
            </p>
          ) : null}
        </div>
      ) : (
        <div className='stack'>
          <div className='toolbar-row'>
            <Carimbo>{`progresso:${pathProgress}%`}</Carimbo>
            <Carimbo>{`passos:${pathSteps.length}`}</Carimbo>
          </div>
          {pathSteps.map((step) => (
            <article key={step.id} className='core-node'>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type='checkbox'
                  checked={Boolean(pathDone[step.id])}
                  onChange={(event) =>
                    setPathDone((current) => ({ ...current, [step.id]: event.target.checked }))
                  }
                />
                <strong>
                  {step.order}. {step.title}
                </strong>
              </label>
              <p style={{ margin: 0 }}>{step.instruction}</p>
              <p className='muted' style={{ margin: 0 }}>
                {step.nodeTitle ? `No sugerido: ${step.nodeTitle}` : 'No sugerido: n/d'}
              </p>
              <Link className='ui-button' href={`/c/${slug}/${step.portalPath}`}>
                Abrir porta sugerida: {step.portalPath}
              </Link>
            </article>
          ))}
          {pathSteps.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum passo de percurso encontrado.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
