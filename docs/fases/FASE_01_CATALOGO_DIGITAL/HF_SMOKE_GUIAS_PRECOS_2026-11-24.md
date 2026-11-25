# Smoke operador — guias Listas de preço (padrão Adaptive)

**Data:** 2026-11-24 (~21:10 BRT)  
**Ambiente:** Vite `http://127.0.0.1:5175` + Supabase HF  
**Operador:** `efe.comercioltda@gmail.com` (role `administrador`)  
**Escopo:** hub `/admin/precos` + ficha `/admin/precos/:id` — lista → guia → ficha  
**Padrão:** [HF_PADRAO_TELAS_UX_OPERACIONAL.md](../../entrada/HF_PADRAO_TELAS_UX_OPERACIONAL.md)  
**Sem alterar FAL.**

## Checklist padrão Adaptive

| # | Caso | Resultado | Nota |
|---|------|-----------|------|
| G01 | Hub carrega KPIs + tabela | **PASS** | Ativas 2 · Preço Base / Promocional |
| G02 | Guia abre (botão Guia / nome) | **PASS** | WorkSurface + Fechar guia / Fechar painel |
| G03 | Primary permanece usável com guia aberta | **PASS** | “Gerenciar listas” ainda no DOM |
| G04 | Faixa formação na guia | **PASS** | Cálculo ativo/desativado |
| G05 | Colunas guia: custo / venda (+ margem) | **PASS** | Scroll `max-h` nos itens |
| G06 | Ficha completa via Abrir lista | **PASS** | Após fix fallback `list_extra_cost_percent` |
| G07 | Abas Produtos / Formação / Importações / Config | **PASS** | |
| G08 | Colunas ficha: Custo, Adic., Markup, Margem, Venda | **PASS** | |
| G09 | Cálculo desativado (Fixo): add manual liberado | **PASS** | Banner âmbar |
| G10 | Cálculo ativo (Margem 30%): add rápida bloqueada; manual por item liberado | **PASS** | Banner verde · Editar → Fixar Manual (opt-out) |
| G11 | Modal precificação com adicional + lock manual | **PASS** | Regra disponível; manual bloqueado |
| G12 | Salvar margem via RPC | **FAIL → MITIGADO** | RPC `set_price_list_pricing_rule` **ausente** no remoto (PGRST202); fallback update direto staff |

## Ajustes feitos nesta marcha (código HF)

1. Fallback SELECT `list_extra_cost_percent` mais tolerante (ficha “Lista não encontrada”).
2. Reload da ficha: lista primeiro; auxiliares soft-fail; erro visível no empty state.
3. `adminSetPriceListPricingRule`: se RPC não existir no schema cache → update direto em `price_lists` (+ recalc se disponível).
4. Mensagem de erro de save de regra aceita PostgrestError sem `instanceof Error`.
5. Controles globais editáveis (regra + adicional % · Salvar / Aplicar → venda) na guia e aba Produtos.
6. Controles por seleção na ficha: % margem/markup da seleção · adicional R$ · calcular pela regra.
7. Opt-out por item: com cálculo global ativo, Editar → Fixar preço manual (origem Manual fora do recálculo); seleção também pode definir manual.

## Pendência ops

- [ ] Aplicar migration `20261005150000_fase81e_pricing_formation.sql` (RPC formação) no projeto Supabase HF  
- [ ] Aplicar `20261124120000_assigned_price_list_b2b.sql` quando for smoke B2B assigned  
- [ ] Aplicar prepared `list_extra_cost_percent` com autorização explícita  

## Estado DB após smoke

Preço Base revertido para `pricing_method=fixed` / `pricing_percent=0` ao final do smoke (teste usou margem 30% temporariamente).

## Veredito

**Guias funcionais no padrão Adaptive: PASS** (operador real).  
Bloqueio de formação via RPC remoto mitigado no client; apply da migration F8.1-E fecha o gap de forma canônica.
