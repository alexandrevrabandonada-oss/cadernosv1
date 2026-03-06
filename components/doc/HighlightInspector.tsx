'use client';

type HighlightInspectorProps = {
  open: boolean;
  quote: string;
  title: string;
  note: string;
  tags: string;
  pageHint: string;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function HighlightInspector({
  open,
  quote,
  title,
  note,
  tags,
  pageHint,
  onTitleChange,
  onNoteChange,
  onTagsChange,
  onSave,
  onDelete,
  onClose,
}: HighlightInspectorProps) {
  if (!open) return null;

  return (
    <aside className='doc-highlight-inspector surface-panel'>
      <div className='workspace-detail-head'>
        <strong>Editar highlight</strong>
        <button className='ui-button' data-variant='ghost' type='button' onClick={onClose}>
          Fechar
        </button>
      </div>
      <div className='workspace-detail-body'>
        <p className='muted' style={{ margin: 0 }}>
          {pageHint}
        </p>
        <blockquote className='doc-highlight-quote'>{quote}</blockquote>
        <input value={title} onChange={(event) => onTitleChange(event.currentTarget.value)} placeholder='Titulo opcional' />
        <textarea value={note} onChange={(event) => onNoteChange(event.currentTarget.value)} rows={5} placeholder='Nota' />
        <input value={tags} onChange={(event) => onTagsChange(event.currentTarget.value)} placeholder='tags csv' />
        <div className='toolbar-row'>
          <button className='ui-button' data-variant='primary' type='button' onClick={onSave}>
            Salvar
          </button>
          <button className='ui-button' type='button' onClick={onDelete}>
            Remover
          </button>
        </div>
      </div>
    </aside>
  );
}
