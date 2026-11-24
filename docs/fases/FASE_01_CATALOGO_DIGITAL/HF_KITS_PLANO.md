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
- Fotos: **reutiliza `storage_path`** dos itens (não duplica arquivo no Storage); botão **Puxar fotos dos itens**; sync ao mudar BOM

## Telas

| Tela | Papel |
|------|-------|
| **`/admin/kits`** | Lista só kits + Novo kit |
| **`/admin/kits/novo`** e **`/admin/kits/:id`** | Cadastro + composição + mídia + apps |
| **`/admin/produtos`** | Só **itens**; kits abrem/redirecionam para hub Kits |

## UX composição (espelho FAL)

1. Buscar item por SKU/nome  
2. Adicionar com quantidade  
3. Ajustar qty / remover  
4. Ao mudar BOM → sync fotos espelhadas  
5. Botão manual **Puxar fotos dos itens**

## Fora desta rodada (próximo epic)

- Preço auto = soma dos componentes (`kit_price_mode`)
- Import CSV de BOM
- Expansão de estoque/pedido (`kit_composition_snapshot`)
- Substituição em massa “usado em kits”
- Compra de kit como unidade de fornecedor (inbound)

## Gaps fechados nesta implementação

- Hub admin Kits + formulário  
- Qty editável + sort ao adicionar  
- Puxar / sync fotos dos componentes  
- `product_kind` na vitrine/PDP + bloco composição básico  
- Natureza kit no form de produto → link/redirect para `/admin/kits/:id`
