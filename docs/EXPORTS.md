# Exports Guide

## Objetivo

Publicar dossies compactos do Cadernos Vivos em dois formatos:
- Markdown (`.md`)
- PDF (`.pdf`) com layout Concreto Zen

Os exports sao curtos e focados em trechos citados. Nao fazem dump de documentos inteiros.

## Tipos

- `thread`: Dossie de debate (pergunta, resposta, evidencias).
- `trail`: Caderno de estudo (trilha, passos e evidencias recomendadas).

## Fluxo

1. Usuario `editor/admin` clica em:
   - Debate: `Gerar Dossie (MD+PDF)`
   - Trilhas: `Gerar Caderno de Estudo (MD+PDF)`
2. API server-side gera:
   - Markdown (`lib/export/md.ts`)
   - PDF (`lib/export/pdf.ts`)
3. Arquivos sao enviados ao bucket `cv-exports`.
4. Metadados sao salvos em `public.exports` (uma linha por formato).

## Acesso e privacidade

- Bucket `cv-exports` e privado.
- Download acontece via signed URL (tempo limitado).
- Export publico so abre para anon se:
  - `exports.is_public = true`
  - universo publicado.
- `editor/admin` pode acessar todos os exports via app.

## Limites de tamanho

- Citacoes e evidencias sao truncadas para trechos curtos.
- PDF possui secoes resumidas, sem texto bruto massivo.
- Objetivo: material publicavel e auditavel, nao backup bruto da base.

## Rotas e endpoints

- `POST /api/admin/export/thread`
- `POST /api/admin/export/trail`
- `GET /c/[slug]/exports/[exportId]` (pagina com preview + download)

## Admin

Em `/admin/universes/[id]`:
- listar exports por universo
- tornar publico/privado
- excluir export
