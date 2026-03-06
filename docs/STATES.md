# States

## Taxonomia
- `empty`: ainda nao ha material, ou o filtro zerou o recorte.
- `error`: houve falha de fetch, acao ou emissao de recurso temporario.
- `restricted`: o usuario nao pode ver aquilo por publish gating, privacidade ou papel insuficiente.
- `partial`: parte do app segue funcional, mas falta conexao ou massa critica de dados.
- `success`: confirmacao contextual depois de uma acao relevante.

## Componentes
Pasta: `components/ui/state/`

- `StatePanel`: base visual e semantica para todos os estados.
- `EmptyStateCard`: vazios editoriais e recortes sem material.
- `ErrorStateCard`: falhas leves e recuperaveis.
- `RestrictedStateCard`: gating, privacidade e acesso negado.
- `PartialDataNotice`: offline e dados insuficientes, sem dramatizar.
- `SuccessInlineNotice`: confirmacao inline depois de review, promocao ou export.

## Microcopy
- Tom editorial, direto e calmo.
- Evitar mensagens como `Erro 403`, `Sem dados`, `Nada encontrado` sem contexto.
- Sempre explicar o que falta e o que continua disponivel.
- Sempre oferecer proxima acao quando existir rota segura.

## Como decidir
1. Use `empty` quando a ausencia de conteudo for normal para o fluxo.
2. Use `error` quando algo deveria ter carregado, mas falhou.
3. Use `restricted` quando o bloqueio for intencional por regra de acesso.
4. Use `partial` quando o shell ou parte do dado ainda estiverem acessiveis.
5. Use `success` para acao concluida que merece confirmacao mais duradoura que toast.

## Casos aplicados
- Home e areas publicas quando o catalogo nao retorna universo.
- Provas, recap, coletivos e review quando o recorte zera.
- Offline page e banner quando so parte da experiencia segue disponivel.
- Export detail e preview de universo quando o conteudo esta bloqueado.
- Analytics quando ainda nao ha massa critica para leitura de produto.
