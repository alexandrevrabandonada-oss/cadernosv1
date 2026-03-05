import { Badge } from '@/components/ui/Badge';

export function MiniPreviewProvas() {
  return (
    <div className='mini-preview mini-preview-provas' aria-hidden='true'>
      <article className='mini-preview-card'>
        <Badge>Prova</Badge>
        <strong>Particulado acima da media no setor norte</strong>
      </article>
      <article className='mini-preview-card'>
        <Badge>Curada</Badge>
        <strong>Serie temporal indica recorrencia sazonal</strong>
      </article>
    </div>
  );
}

export function MiniPreviewMapa() {
  return (
    <div className='mini-preview mini-preview-mapa' aria-hidden='true'>
      <svg viewBox='0 0 220 90' role='presentation'>
        <g stroke='rgba(236,230,220,0.34)' strokeWidth='1.2' fill='none'>
          <path d='M20 66 L70 36 L122 58 L174 28 L206 46' />
          <path d='M20 26 L70 36 L122 18 L174 28 L206 14' />
        </g>
        <g fill='rgba(217,178,79,0.95)'>
          <circle cx='20' cy='66' r='4' />
          <circle cx='70' cy='36' r='4' />
          <circle cx='122' cy='58' r='4' />
          <circle cx='174' cy='28' r='4' />
          <circle cx='206' cy='46' r='4' />
          <circle cx='122' cy='18' r='4' />
        </g>
      </svg>
    </div>
  );
}

export function MiniPreviewLinha() {
  return (
    <div className='mini-preview mini-preview-linha' aria-hidden='true'>
      <div className='mini-timeline-item'>
        <small>2018</small>
        <strong>Relatorio tecnico publica primeiro alerta</strong>
      </div>
      <div className='mini-timeline-item'>
        <small>2021</small>
        <strong>Nova rodada de monitoramento territorial</strong>
      </div>
      <div className='mini-timeline-item'>
        <small>2024</small>
        <strong>Atualizacao de medidas e lacunas</strong>
      </div>
    </div>
  );
}

export function MiniPreviewDebate() {
  return (
    <div className='mini-preview mini-preview-debate' aria-hidden='true'>
      <article className='mini-preview-question'>
        <small>Confianca media</small>
        <strong>Quais evidencias sustentam o risco no territorio?</strong>
      </article>
      <article className='mini-preview-question'>
        <small>Confianca forte</small>
        <strong>Que marcos da linha reforcam o achado?</strong>
      </article>
    </div>
  );
}
