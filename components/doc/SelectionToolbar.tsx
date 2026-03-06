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

  const touchTargetStyle = { minHeight: 46, height: 46 };

  return (
    <div
      className='doc-selection-toolbar surface-panel'
      style={{ left: x, top: y }}
      role='dialog'
      aria-label='Acoes da selecao'
      data-testid='doc-selection-toolbar'
    >
      <div className='toolbar-row doc-selection-actions' role='toolbar' aria-label='Acoes do trecho selecionado'>
        <button className='ui-button' style={touchTargetStyle} type='button' onClick={onHighlight} aria-label='Destacar trecho selecionado'>
          Destacar
        </button>
        <button className='ui-button' data-variant='ghost' style={touchTargetStyle} type='button' onClick={onAddNote} aria-label='Adicionar nota ao trecho'>
          Adicionar nota
        </button>
        <button className='ui-button' data-variant='ghost' style={touchTargetStyle} type='button' onClick={onCopy} aria-label='Copiar trecho selecionado'>
          Copiar
        </button>
        <button className='ui-button focus-only' data-variant='ghost' style={touchTargetStyle} type='button' onClick={onExport} aria-label='Exportar trecho selecionado'>
          Exportar trecho
        </button>
        <button className='ui-button' data-variant='ghost' style={touchTargetStyle} type='button' onClick={onCancel} aria-label='Cancelar selecao'>
          Cancelar
        </button>
      </div>
      {expanded ? (
        <div className='stack doc-selection-form' style={{ marginTop: '0.75rem' }}>
          <input value={title} onChange={(event) => onTitleChange(event.currentTarget.value)} placeholder='Titulo opcional' aria-label='Titulo opcional do highlight' />
          <textarea value={note} onChange={(event) => onNoteChange(event.currentTarget.value)} rows={4} placeholder='Nota opcional' aria-label='Nota opcional do highlight' />
          <input value={tags} onChange={(event) => onTagsChange(event.currentTarget.value)} placeholder='tags csv' aria-label='Tags do highlight separadas por virgula' />
          <div className='toolbar-row'>
            <button className='ui-button' data-variant='primary' style={touchTargetStyle} type='button' onClick={onHighlight} aria-label='Salvar highlight'>
              Salvar highlight
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
