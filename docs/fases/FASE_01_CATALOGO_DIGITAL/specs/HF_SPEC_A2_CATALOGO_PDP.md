# Spec A2 — Catálogo / Busca / PDP

**Rotas:** `/catalogo`, `/busca`, `/produto/:id`, categorias/marcas/veículo  
**Estado:** Vivo  
**Hierarquia:** loja  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md) · [HF_COTACAO_CESTA_PLANO.md](../HF_COTACAO_CESTA_PLANO.md)

## Objetivo

Consultar peças; adicionar à cotação; exibir preço só com autorização.

## Regras de preço

| Situação | Preço |
|----------|-------|
| Visitante / pending / suspended | Não exibir (consultar) |
| `active` + `assigned_price_list_id` | Preço da lista |

Preço ≠ estoque ≠ pedido.

## CTAs cotação

- Card: Adicionar → flash → **Ver cotação**
- PDP desktop: flash **Adicionado…** → `/cotacao`
- PDP mobile: sticky acima do MobileNav; mesmo flash

## Não-fazer

Carrinho de compra · checkout · preço guest

## Smoke

Guest sem preço; active vê lista; add N itens; badge Cotação no mobile.
