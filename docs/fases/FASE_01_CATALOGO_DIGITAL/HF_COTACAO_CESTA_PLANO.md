# HF — Cesta de cotação (Andar 1)

**Data:** 2026-11-26  
**Escopo:** só HF. Cesta multi-item + romaneio `wa.me` + avisos in-app. Sem checkout, pedido ou WhatsApp Cloud.

## Nome

| Superfície | Label |
|------------|--------|
| Storefront | Cotação (`/cotacao`) — cesta |
| Card / ficha | Adicionar à cotação → Ver cotação / flash Adicionado |
| Admin | Central de Pedidos (`/admin/pedidos`) · menu **Cotações** |

Não há “carrinho de compra” neste andar.

## Fluxo

1. Cliente adiciona 1..N itens (localStorage `hf-quote-basket-v1`).
2. Revisa em `/cotacao` (qtd, preço se `active`, condições).
3. `createLead(kind=quote, items[])`.
4. Protocolo na tela + abre romaneio `wa.me`.
5. Avisos: staff `quote_requested` → `/admin/pedidos/cotacoes?lead=<id>`; cliente logado `quote_sent` → `/conta/avisos`.
6. Delivery: `in_app=sent`, `whatsapp=skipped` (clique browser ≠ Graph API).

## Admin — Central de Pedidos

Espelho Finanças: layout com menu Visão geral · **Cotações** (vivo) · Pedidos/Logística (em breve).  
Fila Adaptive (`moduleKey=pedidos`): lista + guia (contato, itens via `adminListLeadItems`, status, notas, protocolo).  
Redirect: `/admin/cotacoes` → `/admin/pedidos/cotacoes`.

## Preço

- Cliente `active`: preço da lista B2B na revisão (não persistido na cesta).
- Guest / pending / suspended: “consultar”.

## Fronteira

`leads` + `lead_items` permanece a fonte até existir pedido. Promoção lead→pedido / checkout / logística = ciclo futuro. Sem copiar código FAL.

## RLS (público)

Insert de `leads` / `lead_items` com `WITH CHECK (true)` (FK garante itens).  
Emit de avisos `quote_*` liberado para anon/authenticated (migration 33). UUID no client evita `.select` pós-insert.

## Smoke

| Caso | Esperado |
|------|----------|
| 1 item | lead + romaneio + aviso staff |
| N itens | `lead_items` com N linhas |
| Preço | só com cliente `active` |
| WhatsApp | `wa.me` sem POST Graph |
| Nav admin | Central de Pedidos · menu Visão/Cotações |
| Guia cotação | Itens N linhas + status |
| `?lead=` | Abre guia do lead |
| Redirect | `/admin/cotacoes` → cotações na central |
| Mobile | sticky PDP + badge Cotação |
