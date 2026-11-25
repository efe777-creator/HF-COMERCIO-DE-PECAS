# HF — Kits: planejamento e decisões

**Data:** 2026-11-24  
**Escopo:** só HF. FAL = referência (lido, não alterado).

## Modelo de negócio (operador)

Um **kit** é um SKU de venda composto por **itens** (produtos unitários).

| Direção | Significado |
|---------|-------------|
| Itens → kit | 1+ itens que a HF compra/vende unitariamente viram **1 SKU kit** que o cliente compra |
| Kit na loja | Cliente vê/compra o kit como produto único; composição lista os itens |

**Não** é kit-dentro-de-kit (v1). Componentes = `product_kind=item` apenas.

## Decisão arquitetural (= FAL)

- Mesma tabela `products` com `product_kind = 'kit'`
- BOM em `product_kit_components` (qty + sort_order)
- **Sem estoque próprio do kit** nesta rodada (Andar 1 / catálogo)
- Preço do kit: usa listas globais do produto kit (sem motor auto-soma nesta rodada; pode vir depois)
- Fotos: **reutiliza `storage_path`** dos itens (não duplica arquivo no Storage); botão **Puxar fotos** (seleção); sync ao mudar BOM
- Aplicações: PVC **próprio** do kit; botão **Puxar aplicações** dos componentes escolhidos (ação explícita, não herda sozinho)

## Telas e guias (padrão Adaptive)

| Tela | Papel |
|------|-------|
| **`/admin/kits`** | Hub Adaptive: lista + **guia** (`KitWorkSurface`) |
| **Novo na guia** | Criação rápida no painel contextual (não sai da lista) — padrão FAL |
| Guia Kits | Menus: Composição · Identidade · Mídia · Aplicações (`hf.kits.guideMenu`) |
| **`/admin/kits/novo`** e **`/admin/kits/:id`** | Ficha completa (opcional); mesmos controles |
| **`/admin/produtos`** guia → aba **Kits** | Item: usado em kits (qty/remover/abrir). Kit: mesma `AdminProductKitSection` + CTA hub/ficha |

Controles de BOM/fotos são **compartilhados** (`AdminProductKitSection`) entre guia Kits, guia Produtos e ficha.

## UX composição

1. Buscar item **do cadastro** (SKU/nome, ≥2 chars) com thumbs  
2. Enter no destaque · clique Selecionar · multi-seleção (+ N marcados)  
3. Qty padrão com −/+; qty na linha do BOM  
4. Ao mudar BOM → sync fotos espelhadas  
5. **Puxar fotos** (checkboxes por componente)  
6. **Puxar aplicações** (checkboxes) → editor PVC do kit  

## Hierarquia / responsividade (padrão Adaptive)

| Camada | Regra |
|--------|--------|
| Hub | Título + CTAs compactos; filtros empilham no mobile; Status some em `<md` (fica sob o nome) |
| Guia | Card identidade → ações xs → **pills** vermelhas (igual Produtos) → painel do menu |
| Split | AdaptiveWorkspace dock ≤1024 overlay; BOM/seletor `flex-col` → `sm:flex-row` |
| Conteúdo | Um job por menu; CTAs vermelhos grandes só no hub, não na guia |

## Fora desta rodada (próximo epic)

- Preço auto = soma dos componentes (`kit_price_mode`)
- Import CSV de BOM
- Expansão de estoque/pedido (`kit_composition_snapshot`) — kit sem inventário próprio; baixa nos itens
- Compra/fornecedor continua no SKU do **item**
- Substituição em massa “usado em kits”

## Gaps fechados

- Hub Adaptive Kits + `KitWorkSurface`
- Section compartilhada + thumbs + puxar fotos seletivo
- Puxar aplicações dos itens
- Aba Kits na guia de Produtos alinhada
- Ficha reutiliza os mesmos controles
- `product_kind` na vitrine/PDP + selo Kit + bloco composição
- `adminUpsertProduct` seta `commercial_ref = sku` (NOT NULL no DB live)

## Smoke operador (2026-11-24) — kit `KIT-VAL-241124-A`

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Novo na guia (não full-page) | **PASS** |
| 2 | Salvar rascunho → abre composição | **PASS** (após fix `commercial_ref`) |
| 3 | BOM ≥2 itens + OK liberação | **PASS** (SK971 + SK315S) |
| 4 | Puxar fotos / sync ao adicionar | **PASS** (“já espelhadas”) |
| 5 | Puxar aplicações | **PASS** fluxo (0 PVC nos itens de teste) |
| 6 | Liberar → Publicado + BOM na lista | **PASS** |
| 7 | Catálogo + selo Kit + PDP composição | **PASS** |
| 8 | Produtos → aba Kits (usado em) | **PASS** (lista `KIT-VAL-…`) |

**Bug encontrado e corrigido na validação:** INSERT falhava com `commercial_ref` null.

## Teste completo (2026-11-24) — kit `KIT-SMOKE-241124-B`

Fluxo ponta a ponta após UX (pills, seletor, hub responsivo).

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Novo na guia · SKU `KIT-SMOKE-241124-B` · nome KIT SMOKE UI B | **PASS** |
| 2 | Composição: busca `SK4898` · qty 2 · Selecionar | **PASS** |
| 3 | Status composição mínima OK (1 linha qty ≥ 2) | **PASS** |
| 4 | Liberar na loja → badge **Publicado** | **PASS** |
| 5 | Home / destaques: selo **Kit** + ref `KIT-SMOKE-241124-B` | **PASS** |
| 6 | PDP: composição BIELETA SK4898 · qtd 2 | **PASS** |
| 7 | Produtos → SK4898 → aba Kits: listado em KIT-VAL + KIT-SMOKE · CTA Abrir tela Kits | **PASS** (lista carrega após foco na aba) |
| 8 | Lote seletor multi (smoke anterior SK4898) | **PASS** |
| 9 | Linha status H2 após liberar ainda “Rascunho · indisponível · kit” | **SOFT FAIL** (badge Publicado OK; espelho de status/disponibilidade na guia desatualizado) |
| 10 | `sessionStorage` menu guia (ex.: Midia) ao abrir kit novo | **SOFT FAIL** (menu pode herdar da sessão anterior) |

**Veredito:** fluxo comercial completo **PASS**. Soft fails #9–#10 são polish de UX, não bloqueiam liberação/vitrine.
