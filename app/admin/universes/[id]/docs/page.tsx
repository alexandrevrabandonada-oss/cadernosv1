import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, getUniverseById, listDocuments, slugify } from '@/lib/admin/db';
import { processAllDocuments, processDocument } from '@/lib/ingest/process';

type AdminUniverseDocsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function ensureDocsBucket() {
  const db = getAdminDb();
  if (!db) return null;

  const { data: bucket } = await db.storage.getBucket('cv-docs');
  if (bucket) return db;

  await db.storage.createBucket('cv-docs', {
    public: false,
    fileSizeLimit: '50MB',
    allowedMimeTypes: ['application/pdf'],
  });

  return db;
}

async function uploadDocumentAction(formData: FormData) {
  'use server';
  const db = await ensureDocsBucket();
  if (!db) return;

  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const titleInput = String(formData.get('title') ?? '').trim();
  const file = formData.get('pdf_file');

  if (!universeId || !(file instanceof File) || file.size === 0) return;
  const fileName = file.name || 'documento.pdf';
  if (!fileName.toLowerCase().endsWith('.pdf')) return;

  const baseTitle = titleInput || fileName.replace(/\.pdf$/i, '');
  const safeTitle = baseTitle.slice(0, 140);
  const safeSlug = slugify(baseTitle || 'documento');
  const storagePath = `${universeId}/${Date.now()}-${safeSlug || 'documento'}.pdf`;

  const { error: uploadError } = await db.storage.from('cv-docs').upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (uploadError) return;

  if (documentId) {
    await db
      .from('documents')
      .update({
        title: safeTitle,
        storage_path: storagePath,
        status: 'uploaded',
        is_deleted: false,
      })
      .eq('id', documentId)
      .eq('universe_id', universeId);
  } else {
    await db.from('documents').insert({
      universe_id: universeId,
      title: safeTitle,
      storage_path: storagePath,
      status: 'uploaded',
      is_deleted: false,
    });
  }

  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function removeDocumentAction(formData: FormData) {
  'use server';
  const db = getAdminDb();
  if (!db) return;

  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  if (!universeId || !documentId) return;

  await db
    .from('documents')
    .update({ is_deleted: true })
    .eq('id', documentId)
    .eq('universe_id', universeId);

  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function processDocumentAction(formData: FormData) {
  'use server';
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  if (!universeId || !documentId) return;

  await processDocument(universeId, documentId);
  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function processAllAction(formData: FormData) {
  'use server';
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;

  await processAllDocuments(universeId);
  revalidatePath(`/admin/universes/${universeId}/docs`);
}

export default async function AdminUniverseDocsPage({ params }: AdminUniverseDocsPageProps) {
  const { id } = await params;
  const universe = await getUniverseById(id);
  const configured = Boolean(getAdminDb());

  if (!universe) {
    notFound();
  }

  const documents = await listDocuments(universe.id);

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${universe.id}`, label: universe.slug },
            { label: 'Docs' },
          ]}
          ariaLabel='Trilha admin docs'
        />
        <SectionHeader
          title={`Documentos de ${universe.title}`}
          description='Upload de PDF para Storage e registro em documents (sem ingestao por enquanto).'
          tag='Docs'
        />
      </Card>

      <Card className='stack'>
        <SectionHeader title='Upload PDF' />
        <form action={uploadDocumentAction} className='stack'>
          <input type='hidden' name='universe_id' value={universe.id} />
          <label>
            <span>Titulo (opcional)</span>
            <input name='title' style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Arquivo PDF</span>
            <input name='pdf_file' type='file' accept='application/pdf,.pdf' required />
          </label>
          <button className='ui-button' type='submit' disabled={!configured}>
            Enviar PDF
          </button>
        </form>
        <form action={processAllAction} className='toolbar-row'>
          <input type='hidden' name='universe_id' value={universe.id} />
          <button className='ui-button' type='submit' disabled={!configured}>
            Processar tudo
          </button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Documentos cadastrados' description='Status atual: uploaded/processed.' />
        <div className='stack'>
          {documents.map((doc) => (
            <article key={doc.id} className='core-node'>
              <strong>{doc.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                status: {doc.status} | criado em: {new Date(doc.created_at).toLocaleString('pt-BR')}
              </p>
              <p className='muted' style={{ margin: 0 }}>
                storage: {doc.storage_path ?? 'sem arquivo'}
              </p>
              <div className='toolbar-row'>
                <form action={processDocumentAction}>
                  <input type='hidden' name='document_id' value={doc.id} />
                  <input type='hidden' name='universe_id' value={universe.id} />
                  <button className='ui-button' type='submit' disabled={!configured}>
                    Processar
                  </button>
                </form>
                <form action={removeDocumentAction}>
                  <input type='hidden' name='document_id' value={doc.id} />
                  <input type='hidden' name='universe_id' value={universe.id} />
                  <button className='ui-button' type='submit' disabled={!configured} data-variant='ghost'>
                    Remover (soft delete)
                  </button>
                </form>
              </div>
            </article>
          ))}
          {documents.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum documento encontrado.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
