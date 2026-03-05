'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { CopyPackTextButton } from '@/components/share/CopyPackTextButton';
import type { SharePackChecklistChecks } from '@/lib/share/checklist';

type SharePackOpsClientProps = {
  packId: string;
  universeId: string;
  universeSlug: string;
  sharePackPath: string;
  checklist: SharePackChecklistChecks;
  captions: {
    instagram: string;
    whatsapp: string;
    telegram: string;
    twitter: string;
  };
};

const STORAGE_PREFIX = 'cv:share-pack:checklist:';

function readLocal(packId: string, fallback: SharePackChecklistChecks) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${packId}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as SharePackChecklistChecks;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeLocal(packId: string, checks: SharePackChecklistChecks) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${packId}`, JSON.stringify(checks));
  } catch {}
}

export function SharePackOpsClient({
  packId,
  universeId,
  universeSlug,
  sharePackPath,
  checklist,
  captions,
}: SharePackOpsClientProps) {
  const toast = useToast();
  const [checks, setChecks] = useState<SharePackChecklistChecks>(checklist);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChecks((current) => {
      const local = readLocal(packId, current);
      return local;
    });
  }, [packId]);

  const completion = useMemo(() => {
    const reviewedDone = checks.reviewed.length >= 2 ? 2 : checks.reviewed.length;
    const postedDone = ['instagram', 'whatsapp', 'telegram'].filter(
      (channel) => checks.posted[channel as 'instagram' | 'whatsapp' | 'telegram'],
    ).length;
    const total = 5;
    return `${reviewedDone + postedDone}/${total}`;
  }, [checks]);

  async function persist(next: SharePackChecklistChecks) {
    setChecks(next);
    writeLocal(packId, next);
    setSaving(true);
    try {
      const response = await fetch('/api/share-pack/checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, checks: next }),
      });
      if (!response.ok) throw new Error('persist_failed');
      toast.success('Checklist salvo');
    } catch {
      const local = readLocal(packId, next);
      setChecks(local);
      toast.error('Sem conexao com DB. Checklist salvo localmente.');
    } finally {
      setSaving(false);
    }
  }

  function setReviewed(itemId: string, checked: boolean) {
    const nextReviewed = checked
      ? Array.from(new Set([...checks.reviewed, itemId]))
      : checks.reviewed.filter((item) => item !== itemId);
    persist({ ...checks, reviewed: nextReviewed });
  }

  function setPosted(channel: 'instagram' | 'whatsapp' | 'telegram', checked: boolean) {
    persist({
      ...checks,
      posted: {
        ...checks.posted,
        [channel]: checked,
      },
    });
  }

  function setReminder(enabled: boolean) {
    persist({
      ...checks,
      reminder: {
        enabled,
        mode: 'instructions',
      },
    });
  }

  return (
    <>
      <section className='stack'>
        <h3 style={{ margin: 0 }}>Copiar para redes</h3>
        <p className='muted' style={{ margin: 0 }}>
          Textos determinísticos por canal (sem LLM), prontos para colar.
        </p>
        <div className='toolbar-row'>
          <CopyPackTextButton text={captions.instagram} label='Copiar legenda Instagram' />
          <CopyPackTextButton text={captions.whatsapp} label='Copiar texto WhatsApp' />
          <CopyPackTextButton text={captions.telegram} label='Copiar texto Telegram' />
          <CopyPackTextButton text={captions.twitter} label='Copiar thread X/Twitter' />
        </div>
      </section>

      <section className='stack'>
        <h3 style={{ margin: 0 }}>Checklist de postagem</h3>
        <p className='muted' style={{ margin: 0 }}>
          Progresso {completion} {saving ? '(salvando...)' : ''}
        </p>
        <label className='core-node'>
          <input
            type='checkbox'
            checked={checks.reviewed.includes('item-1')}
            onChange={(event) => setReviewed('item-1', event.target.checked)}
          />{' '}
          Abrir item 1 e revisar
        </label>
        <label className='core-node'>
          <input
            type='checkbox'
            checked={checks.reviewed.includes('item-2')}
            onChange={(event) => setReviewed('item-2', event.target.checked)}
          />{' '}
          Abrir item 2 e revisar
        </label>
        <label className='core-node'>
          <input
            type='checkbox'
            checked={checks.posted.instagram}
            onChange={(event) => setPosted('instagram', event.target.checked)}
          />{' '}
          Postar no Instagram
        </label>
        <label className='core-node'>
          <input
            type='checkbox'
            checked={checks.posted.whatsapp}
            onChange={(event) => setPosted('whatsapp', event.target.checked)}
          />{' '}
          Postar no WhatsApp
        </label>
        <label className='core-node'>
          <input
            type='checkbox'
            checked={checks.posted.telegram}
            onChange={(event) => setPosted('telegram', event.target.checked)}
          />{' '}
          Postar no Telegram
        </label>
        <div className='toolbar-row'>
          <button
            type='button'
            className='ui-button'
            data-variant='ghost'
            onClick={() => persist({ ...checks, reviewed: ['item-1', 'item-2'] })}
          >
            Marcar revisoes
          </button>
          <button
            type='button'
            className='ui-button'
            data-variant='ghost'
            onClick={() =>
              persist({
                reviewed: [],
                posted: { instagram: false, whatsapp: false, telegram: false, twitter: false },
                reminder: checks.reminder,
              })
            }
          >
            Reset checklist
          </button>
        </div>
      </section>

      <section className='stack'>
        <h3 style={{ margin: 0 }}>Rotina</h3>
        <p className='muted' style={{ margin: 0 }}>
          Segunda 09:00 (America/Sao_Paulo): postar pack semanal de {universeSlug}.
        </p>
        <div className='toolbar-row'>
          <button
            type='button'
            className='ui-button'
            onClick={() => {
              const confirmed = window.confirm(
                'Ativar lembrete semanal local? (v1: instruções guiadas, sem automação externa automática)',
              );
              if (!confirmed) return;
              setReminder(true);
              toast.success('Lembrete semanal ativado (modo instruções).');
            }}
          >
            Ativar lembrete semanal
          </button>
          <button
            type='button'
            className='ui-button'
            data-variant='ghost'
            onClick={() => {
              setReminder(false);
              toast.success('Lembrete semanal desativado.');
            }}
          >
            Desativar lembrete
          </button>
        </div>
        {checks.reminder.enabled ? (
          <article className='core-node'>
            <strong>Instruções para agendar</strong>
            <p className='muted' style={{ margin: 0 }}>
              Como não há integração de scheduler nativa no projeto, configure um lembrete externo (Google Calendar,
              Slack ou Notion) com o texto:
            </p>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`Toda segunda 09:00 (America/Sao_Paulo):
1) Abrir ${sharePackPath}
2) Gerar pack se ainda não gerou
3) Revisar item 1 e 2
4) Postar Instagram + WhatsApp + Telegram`}
            </pre>
            <CopyPackTextButton
              text={`Toda segunda 09:00 (America/Sao_Paulo)\nAbrir: ${sharePackPath}\nUniverso: ${universeSlug}\nUniverse ID: ${universeId}`}
              label='Copiar texto do lembrete'
            />
          </article>
        ) : null}
      </section>
    </>
  );
}
