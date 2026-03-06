# Exports Guide

## Objetivo

Publicar dossies compactos do Cadernos Vivos em dois formatos:
- Markdown (`.md`)
- PDF (`.pdf`) com layout Concreto Zen

Os exports sao curtos e focados em trechos citados. Nao fazem dump de documentos inteiros.

## Tipos

- `thread`: Dossie de debate (pergunta, resposta, evidencias).
- `trail`: Caderno de estudo (trilha, passos e evidencias recomendadas).
- `tutor_session`: Dossie de fechamento da sessao do tutor.
- `clip`: export rapido de trecho (reader/focus mode), curto e privado por padrao.

## Fluxo

1. Usuario `editor/admin` clica em:
   - Debate: `Gerar Dossie (MD+PDF)`
   - Trilhas: `Gerar Caderno de Estudo (MD+PDF)`
   - Reader/Focus (Provas, Doc e Tutor): `Exportar trecho`
2. API server-side gera:
   - Markdown (`lib/export/md.ts`)
   - Markdown de clip (`lib/export/clip.ts`)
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
- `clip` limita o trecho para ~800-1200 caracteres e PDF curto (1-2 paginas).

## Rotas e endpoints

- `POST /api/admin/export/thread`
- `POST /api/admin/export/trail`
- `POST /api/admin/export/session`
- `POST /api/admin/export/clip`
- `GET /c/[slug]/exports/[exportId]` (pagina com preview + download)

## Admin

Em `/admin/universes/[id]`:
- listar exports por universo
- tornar publico/privado
- excluir export

## Kind notebook

- exports.kind agora aceita `notebook`.
- O kind `notebook` representa o pack de estudo do Meu Caderno e usa meta com universeSlug, itemCount, tags e kinds.
- Compartilhamento segue a mesma pagina de exports, mas continua bloqueado por default com is_public=false.

## Highlights de documento no notebook

- O export `notebook` inclui highlights do Doc Viewer quando o usuario exporta o proprio Meu Caderno.
- Cada item leva quote clampado, fonte documental e link `Abrir no app` de volta ao reader no highlight salvo.
- Esses highlights continuam privados por padrao e nao aparecem em share publico sem publicacao explicita do export.
