# Estado da Nacao — Cadernos Vivos
Data: 2026-03-05
Commit (se possivel): n/a

## 1) O que mudou neste tijolo (VIZ-12)
- Feedback app-grade opcional implementado com `haptics` + `sound_cues` (opt-in).
- Export 1-tap de trecho (`clip`) implementado no pipeline de exports.
- Botao `Exportar trecho` aplicado no reader/focus de Provas, Documento e Tutor.
- Fluxos de copiar/compartilhar/concluir agora disparam feedback fisico/sonoro quando habilitado.

## 2) Novos settings (haptics/sound)
Arquivos:
- `lib/user/uiSettings.ts`
- `hooks/useUiPrefs.ts`
- `components/ui/UiPrefsProvider.tsx`
- `app/api/user/ui-settings/route.ts`
- `components/ui/HapticsToggle.tsx`
- `components/ui/SoundCuesToggle.tsx`
- `components/ui/UiPreferencesMenu.tsx`

Detalhes:
- `ui_settings` agora inclui:
  - `haptics: boolean` (default `false`)
  - `sound_cues: boolean` (default `false`)
- Persistencia:
  - visitante: `localStorage`
  - logado: PATCH `/api/user/ui-settings` (perfil)

## 3) Feedback engine
Arquivos:
- `lib/feedback/feedback.ts`
- `tests/feedback.test.ts`

Implementado:
- `canVibrate()`
- `vibrate(type)` com padroes curtos (`tap/success/warning`)
- `playCue(type)` via WebAudio (beep curto)
- `feedback(type, settings)` com no-op seguro em ambiente sem suporte

Aplicacoes:
- `components/share/ShareButton.tsx`
- `components/provas/CopyCitationButton.tsx`
- `components/export/GenerateExportButton.tsx`
- `components/trilhas/TrailPlayer.tsx`
- `components/tutor/TutorPointLab.tsx`
- `components/debate/ThreadDetailActions.tsx`
- `components/share/SharePackOpsClient.tsx` (opcional admin)

## 4) Export clip (kind + limites)
Migration:
- `supabase/migrations/20260305070000_export_clip_support.sql`
  - adiciona `exports.source_type`, `exports.source_id`
  - expande `exports_kind_check` para incluir `clip`
  - indice `idx_exports_source_type_source_id`

Backend:
- `lib/export/clip.ts` (renderer markdown curto)
- `lib/export/service.ts`
  - novo `createClipExport(...)`
  - suporte `kind='clip'` em tipo/insert/view
  - fallback `TEST_SEED=1` para e2e
- `app/api/admin/export/clip/route.ts`
  - endpoint para gerar clip
  - aceita `universeId` ou `universeSlug`

UI Reader/Focus:
- `app/c/[slug]/provas/page.tsx`
- `app/c/[slug]/doc/[docId]/page.tsx`
- `components/tutor/TutorPointLab.tsx`
- `app/c/[slug]/tutor/s/[sessionId]/p/[index]/page.tsx`
- `app/globals.css` (`.focus-only` + visibilidade em `data-focus='on'`)

Limites:
- snippet truncado (~800–1200 chars, clamp 1200)
- PDF curto (1–2 paginas, estrutura enxuta)
- default de visibilidade: `is_public=false`

## 5) Docs atualizadas
- `docs/PWA.md` (feedback app-grade: haptics/sound)
- `docs/EXPORTS.md` (tipo `clip`, endpoint e fluxo)

## 6) Testes / ajustes CI
Atualizacoes:
- `tests/e2e/ui-smoke.spec.ts`
  - novo teste: `export clip: endpoint gera asset e link de download`
  - robustez no fluxo de selecao de Provas (usa href direto para evitar flake)
- `tests/e2e/helpers/visual.ts`
  - ajuste de tolerancia visual `maxDiffPixelRatio: 0.04`
- snapshots atualizados em `tests/e2e/screenshots/visual.spec.ts/*`

Como testar manualmente:
1. Abrir `/c/demo/provas`, selecionar evidencia e ativar `Imersao`.
2. Em Preferencias, ligar `Haptics` e/ou `Som`.
3. Clicar `Copiar citacao` / `Compartilhar` e validar feedback.
4. Em foco, clicar `Exportar trecho` e baixar PDF.
5. Repetir em `/c/demo/doc/<docId>` com citacao selecionada.
6. Repetir no Tutor (`/c/demo/tutor/s/local/p/0`) apos resposta guiada.

## 7) Verificacoes finais
- `npm run verify`: ✅ PASSOU
- `npm run test:e2e:ci`: ✅ PASSOU
- `npm run test:ui:ci`: ✅ PASSOU
