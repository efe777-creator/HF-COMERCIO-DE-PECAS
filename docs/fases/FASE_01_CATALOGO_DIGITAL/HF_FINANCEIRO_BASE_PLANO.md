# HF — Finanças base (Andar 1): condições de pagamento

**Data:** 2026-11-25  
**Escopo:** só HF. Pedidos/carrinho/checkout/gateway/títulos **fora**.

## Cadeia de preço

1. **Base** = preço da **lista assigned** do cliente B2B (`customers.assigned_price_list_id`) quando houver item.  
2. Condição **Liberada** (`status=published`) + elegível:  
   - guest → `show_to_guests` + `min_subtotal`;  
   - customer → `show_to_customers` + **IDs em `customer_payment_conditions`**; se o vínculo estiver **vazio** → só **AVISTA**;  
   - `customer_groups.default_payment_condition_id` = preferência/destaque (não substitui o N:N).  
3. Cliente escolhe **meio** → `applyMethodAdjustment(base, method)` (acréscimo ou desconto, `%` ou R$).  
4. Mesma lib serve o **carrinho futuro** (não implementado nesta base).

## Motor de agenda

| Modo | Uso |
|------|-----|
| `single` | À vista / N DDL |
| `equal_interval` | N× intervalo igual (15 em 15) |
| `custom_offsets` | Dias distintos (7/14, 30/60/90) |
| `weekday_cycle` | Quinzenal/semanal em weekday |

## Meios

`pix` \| `debit` \| `credit` \| `boleto` \| `cash` — por condição: enabled + `adjust_kind` none/percent/fixed + `adjust_sign` surcharge/discount.

## Central de Finanças

Shell: `/admin/financeiro` (`AdminFinanceiroLayout` + menu lateral).

| Rota | Módulo | Agora | Futuro |
|------|--------|-------|--------|
| `/admin/financeiro` | Visão geral | cards + atalho | dashboard |
| `/admin/financeiro/condicoes` | Condições | CRUD Adaptive + Liberar + Simular | documentos |
| — | Entradas | menu “Em breve” | títulos a receber |
| — | Saídas | menu “Em breve” | contas a pagar |
| — | Ajustes | menu “Em breve” | frete / descontos documento |

## Tabelas

- `payment_conditions`
- `payment_condition_installments`
- `payment_condition_methods`
- `customer_groups.default_payment_condition_id`
- `customer_payment_conditions` (N:N cliente↔condição; vazio = AVISTA no app)

Migrations: `migrations_hf/29_payment_conditions.sql` · `31_customer_payment_conditions.sql` (+ espelho dated `20261125010000_*`).

## Smoke (2026-11-24/25 — teste completo)

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Central `/admin/financeiro` + menu + `/condicoes` | **PASS** (UI browser) |
| 2 | CRUD Adaptive + Liberar + pills | **PASS** (admin live) |
| 3 | Agenda 15/15, 7/14, weekday + materialize | **PASS** (vitest `paymentSchedule`) |
| 4 | Pix −2% / crédito +2,99% (base 100 → 98 / 102,99) | **PASS** (vitest + seed REST) |
| 5 | Elegibilidade guest/grupo/min | **PASS** (vitest `paymentEligibility`) |
| 6 | RLS: anon vê só `published`; drafts ocultos | **PASS** (REST anon) |
| 7 | Guest notice Atendimento (AVISTA/28DDL + meios) | **PASS** |
| 8 | Grupo `default_payment_condition_id` UI | **PASS** (código Grupos) |
| 9 | Algum grupo com default preenchido no DB | **SOFT** (coluna ok; 0 grupos setados) |
| 10 | Seeds draft `15_15_3X` / `7_14` com meios | **SOFT** (0 meios enabled) |
| 11 | Cliente sem vínculos → só AVISTA; com IDs → filtro N:N | **PASS** (vitest) |
| 12 | Tabela `customer_payment_conditions` + RLS remota | **PASS** (MCP 2026-11-25) |

**Vitest financeiro:** eligibility + schedule + method adjust.  
**Migration remota:** `payment_conditions_andar1` + `customer_payment_conditions` em `owllmfcpbodqmoerdfxx`.
