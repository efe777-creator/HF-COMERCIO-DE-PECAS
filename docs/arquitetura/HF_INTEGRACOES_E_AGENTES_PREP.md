# HF — Preparação de integrações e agentes de IA

**Versão:** 1.0  
**Data:** 2026-11-23  
**Status:** CANÔNICO (prep de fundação — **não** implementar agentes/entregas na Fase 1)  
**Visão:** [HF_VISAO_2036.md](../entrada/HF_VISAO_2036.md)  
**PRD-Mestre:** [HF_PRD_MESTRE_2036.md](../entrada/HF_PRD_MESTRE_2036.md)  
**Sidicom:** [HF_SIDICOM_E_TRANSICAO.md](../operacao/HF_SIDICOM_E_TRANSICAO.md)  
**Frete:** [HF_LOGISTICA_FRETE_GRATIS.md](../operacao/HF_LOGISTICA_FRETE_GRATIS.md)

---

## 1. Objetivo

Preparar o **HF CORE** e os canais para, nos andares corretos:

1. **Agentes de IA** — tirar pedidos (assistidos), apoiar gestão de estoque/consulta, sem substituir SoT nem humano sem supervisão.  
2. **Apps de entrega** — 99 Entrega e Uber Direct (APIs públicas) com **custo interno** e frete grátis ao cliente.  
3. **Sidicom** — estudar e mapear integração (e-commerce/API/export) antes de pedidos/estoque digitais.

Fase 1 **não** liga agentes nem 99/Uber em produção. Fase 1 **deixa** contratos, eventos e flags prontos para não refazer o prédio.

---

## 2. Princípios

| Princípio | Regra |
|-----------|-------|
| Um contrato por capacidade | Ex.: `place_order`, `get_stock`, `quote_delivery_cost`, `dispatch_delivery` |
| Agente ≠ SoT | IA propõe/executa via ferramentas; escrita oficial segue Sidicom ou CORE |
| Humano no loop | Pedidos e ajustes de estoque sensíveis exigem confirmação/auditoria |
| Secrets | Nunca no front; env/projeto HF |
| Feature flags | `ai_agents_*`, `delivery_99_*`, `delivery_uber_*` — off até gate do andar |
| Frete | Cliente = grátis; API devolve **fee** → gravar como custo interno |

---

## 3. Agentes de IA (alvo Andar 8; prep desde Fundação/2/3)

### 3.1 Papéis previstos

| Agente | Função | Andares de dados |
|--------|--------|------------------|
| Comercial / pedidos | Cotar, montar pedido, confirmar com cliente (WA/portal) | 1 (catálogo) + 2 (pedido) + Sidicom |
| Estoque | Consultar saldo, alertar ruptura, sugerir reposição | 3 + Sidicom |
| Logístico | Escolher modalidade, disparar 99/Uber, rastrear | 6 |
| Administrativo | Relatórios, triagem | 9 |

### 3.2 Ferramentas (tooling) — contratos a reservar

| Tool | Entrada | Saída | SoT escrita |
|------|---------|-------|-------------|
| `search_catalog` | q, veículo, filtros | SKUs | Leitura HF |
| `get_product` | id/sku | ficha | Leitura |
| `draft_order` | itens, cliente | rascunho | CORE; oficial Sidicom até corte |
| `confirm_order` | draft_id | pedido | Sidicom/CORE |
| `get_stock` | sku | saldo | Sidicom hoje |
| `quote_delivery_cost` | origem, destino, peso | fee interno | Ledger HF |
| `dispatch_delivery` | pedido, modality | tracking | 99/Uber |

### 3.3 Prep na Fase 1 (obrigatório conceitual)

- Catálogo estável + IDs/SKU estáveis (agente precisa de verdade de produto).  
- Eventos candidatos documentados: `product.published`, futuro `order.drafted`.  
- **Não** expor service role / RPCs sensíveis a LLM sem gateway.  
- UX: atendimento WA humano continua o canal oficial de pedido na Fase 1.

---

## 4. 99 Entrega e Uber Direct (alvo Andar 6)

### 4.1 Evidência pública (estudo 2026-11-23)

| Provedor | O que existe | Docs |
|----------|--------------|------|
| **99 Entrega** | API OAuth2 `client_credentials`, escopo `entrega.order`: estimar, criar, consultar, cancelar; moto/carro; fee em centavos | https://entrega-api.99app.com/doc/ |
| **Uber Direct** | API Create Delivery (white-label); sandbox → piloto → produção | https://developer.uber.com/docs/deliveries/overview · merchants Uber BR |

### 4.2 Como encaixa na HF

```text
Pedido (CORE/Sidicom)
  → quote_delivery_cost (99 e/ou Uber e/ou frota)
  → escolher menor custo / SLA (regra ops)
  → dispatch_delivery
  → gravar fee como Frete_custo_interno
  → cliente vê frete grátis
```

| RF prep | Descrição |
|---------|-----------|
| INT-D01 | Adapter por provedor (99 \| uber \| manual \| frota) |
| INT-D02 | `external_order_id` = id pedido HF/Sidicom |
| INT-D03 | Webhook/status → atualizar remessa |
| INT-D04 | Fee API nunca vira cobrança ao cliente na política atual |

### 4.3 Fora de escopo até PRD Andar 6

Credenciais produção, despacho automático sem pedido digital homologado, Melhor Envio como frete cobrado (referência).

---

## 5. Sidicom (estudo contínuo — D5)

Ver [HF_SIDICOM_E_TRANSICAO.md](../operacao/HF_SIDICOM_E_TRANSICAO.md) v1.1+.

Resumo público: ERP para distribuidoras/autopeças (estoque, vendas, fiscal, e-commerce via time Sidicom). **API aberta documentada para o ERP completo: não confirmada publicamente** — integração e-commerce tipicamente com painel/configuração Sidicom. Questionário ao fornecedor permanece obrigatório.

Agentes de pedido/estoque **dependem** do mapa Sidicom (leitura estoque / gravação pedido) antes de automação.

---

## 6. Onda dos 10 andares — onde cada integração entra

| Andar | Prep / entrega de integração |
|-------|------------------------------|
| F | Flags, SoT, este doc, sem secrets no front |
| 1 | Catálogo estável (insumo IA); WA humano |
| 2 | Pedido digital + contratos `draft_order` / sync Sidicom |
| 3 | `get_stock` + alertas (IA estoque) |
| 4 | Fiscal — agentes não emitem NF sozinhos |
| 5 | Portal: cliente confirma pedidos sugeridos por IA |
| 6 | Adapters 99/Uber + ledger frete |
| 7 | — |
| 8 | Agentes com tools + supervisão |
| 9 | KPIs margem com frete + uso de agentes |
| 10 | Novos canais |

---

## 7. Checklist de fundação (antes de qualquer piloto IA/entrega)

- [ ] Questionário Sidicom respondido (D5)  
- [ ] Gate Fase 1 OK  
- [ ] Contratos tool listados neste doc revisados no PRD do andar  
- [ ] Flags off em prod  
- [ ] Auditoria: quem aprovou ação do agente  
- [ ] Contas sandbox 99 / Uber Direct quando Andar 6 iniciar  
