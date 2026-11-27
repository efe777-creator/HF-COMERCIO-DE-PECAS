# Spec B1 — Central de Pedidos · Visão geral

**Rota:** `/admin/pedidos`  
**Estado:** Vivo KPI-lite — evoluir contagens  
**Hierarquia:** cards (não Adaptive split); menu lateral do layout  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md)

## Objetivo

At-a-glance do que precisa atenção. Indicadores = registros reais; **sem** misturar pedido oficial.

## Menu do layout (alvo)

Visão geral · **Solicitações** · Cotações · Pedidos (em breve) · Logística (em breve)

## KPIs

| Indicador | Fonte |
|-----------|--------|
| Solicitações novas | `leads` partner/contact `status=new` |
| Em análise | partner/contact `in_progress` |
| Clientes pending / incompletos | `customers` pending sem lista ou sem vendedor ou sem endereço |
| Cotações novas | quote `new` |
| Em atendimento | quote `in_progress` |
| Encerradas (período) | quote `won`/`lost` |

Filtros leves: período (quando implementado).

## Atalhos

Cards clicáveis → Solicitações / Cotações / Clientes filtrado.

## Não-fazer

KPI de pedido Andar 2 · cards decorativos sem número real

## Smoke

Contagens batem com listas; menu Solicitações presente após implementação.
