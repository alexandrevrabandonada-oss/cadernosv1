'use client';

type SelectionToolbarProps = {
  open: boolean;
  x: number;
  y: number;
  expanded: boolean;
  title: string;
  note: string;
  tags: string;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onHighlight: () => void;
  onAddNote: () => void;
  onCopy: () => void;
  onExport: () => void;
  onCancel: () => void;
};

export function SelectionToolbar({
  open,
  x,
  y,
  expanded,
  title,
  note,
  tags,
  onTitleChange,
  onNoteChange,
  onTagsChange,
  onHighlight,
  onAddNote,
  onCopy,
  onExport,
  onCancel,
}: SelectionToolbarProps) {
  if (!open) return null;

  return (
    <div className='doc-selection-toolbar surface-panel' style={{ left: x, top: y }} role='dialog' aria-label='Acoes da selecao'>
      <div className='toolbar-row'>
        <button className='ui-button' type='button' onClick={onHighlight}>
          Destacar
        </button>
        <button className='ui-button' data-variant='ghost' type='button' onClick={onAddNote}>
          Adicionar nota
        </button>
        <button className='ui-button' data-variant='ghost' type='button' onClick={onCopy}>
          Copiar
        </button>
        <button className='ui-button focus-only' data-variant='ghost' type='button' onClick={onExport}>
          Exportar trecho
        </button>
        <button className='ui-button' data-variant='ghost' type='button' onClick={onCancel}>
          Cancelar
        </button>
      </div>
      {expanded ? (
        <div className='stack' style={{ marginTop: '0.75rem' }}>
          <input value={title} onChange={(event) => onTitleChange(event.currentTarget.value)} placeholder='Titulo opcional' />
          <textarea value={note} onChange={(event) => onNoteChange(event.currentTarget.value)} rows={4} placeholder='Nota opcional' />
          <input value={tags} onChange={(event) => onTagsChange(event.currentTarget.value)} placeholder='tags csv' />
          <div className='toolbar-row'>
            <button className='ui-button' data-variant='primary' type='button' onClick={onHighlight}>
              Salvar highlight
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
