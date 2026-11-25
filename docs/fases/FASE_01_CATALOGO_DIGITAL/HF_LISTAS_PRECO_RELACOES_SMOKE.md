# Listas de preço HF — relações, rotas e smoke

## Cascata de resolução

`resolve_product_price(product_id, customer_id, at)`:

1. **Override** avulso ativo (`product_price_overrides`)
2. **Assigned** do cliente (`customers.assigned_price_list_id` → lista `scope=assigned`)
3. **Public** ativa (maior `priority`)
4. **Default** (`price_lists.is_default`)

Flag `price_enabled` permanece **off** para guest/anon.  
Exceção B2B: cliente **active** com lista assigned e item na lista → `priceVisible` no card/PDP (app layer; sem ligar preço público).

## Formação (staff)

Fluxo: custo (fornecedor) → `list_extra_cost_percent` (%) → base → regra da lista (markup/margem ou fixo) → preço.  
`list_extra_cost` (R$) é informativo e **não** entra no cálculo.  
Itens `imported` / `manual` não são recalculados pela formação.

**Cálculo ativo** (`pricingMethod` = margem ou markup):
- Faixa global **editável** (regra + adicional % + Salvar / Aplicar → venda) na guia e aba Produtos
- Seleção: calcular pela regra · % margem/markup da seleção · adicional R$ da seleção
- Grade mostra custo, adicional, margem e venda; scroll vertical nos itens
- Preço manual (inline, bulk, adicionar) **bloqueado**; editar abre modal de regra

**Cálculo desativado** (`fixed`):
- Mesmas colunas informativas + aviso “cálculo desativado”
- Preço manual liberado; aplicar regra / % seleção desabilitados; adicional R$ da seleção ok

Migration prepared: `20261006160000_list_extra_cost_percent_prepared.sql` (apply só com autorização).  
Assigned B2B: `migrations_hf/32_assigned_price_list_b2b.sql` (+ espelho dated `20261124120000_assigned_price_list_b2b.sql`).  
Condições por cliente: ver [HF_FINANCEIRO_BASE_PLANO.md](./HF_FINANCEIRO_BASE_PLANO.md) (`customer_payment_conditions` ≠ lista de preço).

## Rotas

| Rota | Papel |
|------|--------|
| `/admin/precos` | Hub AdaptiveWorkspace: KPIs, tabela, guia WorkSurface, criar/configurar |
| `/admin/precos/:id?tab=produtos` | Itens da lista |
| `/admin/precos/:id?tab=formacao` | Regra + aplicar margem + ajuste global |
| `/admin/precos/:id?tab=importacoes` | Histórico imports |
| `/admin/precos/:id?tab=config` | Escopo/prioridade/padrão/validade |
| `/admin/clientes` | Guia **Comercial**: Lista B2B (assigned) + condições de pagamento |

## Smoke checklist (manual)

Sessão operador 2026-11-24: [HF_SMOKE_GUIAS_PRECOS_2026-11-24.md](./HF_SMOKE_GUIAS_PRECOS_2026-11-24.md) — **PASS** guias Adaptive (RPC formação mitigada por fallback).

- [x] Abrir guia da lista → consulta/ajuste embutido + faixa cálculo
- [x] Abrir lista completa → colunas custo/adic/margem/venda + lock com cálculo ativo
- [x] Modal precificação (adicional + bloqueio manual se ativo)
- [ ] Criar lista rascunho (guia Nova lista)
- [ ] Aplicar margem → atualizar venda (após apply RPC F8.1-E ou via fallback)
- [ ] Configurar lista `scope=assigned` + status ativa
- [ ] Em Clientes, atribuir essa lista a um cliente B2B
- [ ] (SQL/staff) `select * from resolve_product_price('<product>', '<customer>')` — deve preferir assigned quando houver item

## Componentes HF (padrão FAL, tokens hf-*)

- `AdaptiveWorkspace` + `PriceListWorkSurface`
- `PriceListFormacaoTab` / `PriceListConfigTab` / `PriceListImportsTab` / `PricingRuleFields`
