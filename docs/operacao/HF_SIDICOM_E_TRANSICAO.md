# HF — Sidicom e transição para o CORE

**Versão:** 1.2  
**Data:** 2026-11-24  
**Status:** CANÔNICO (estudo + ritmo atualizado)  
**Visão:** [HF_VISAO_2036.md](../entrada/HF_VISAO_2036.md)  
**Integrações:** [HF_INTEGRACOES_E_AGENTES_PREP.md](../arquitetura/HF_INTEGRACOES_E_AGENTES_PREP.md)

---

## 0. Ritmo alinhado (2026-11-24) — ler primeiro

| Decisão | Conteúdo |
|---------|----------|
| Andar 1 | Catálogo HF — **sem** integração Sidicom |
| Andar 2 | **Pedidos oficiais da operação digital no HF** (após Gate 01) |
| Sidicom agora | **Não implantar** integração; continua na ops legada onde a HF já usa |
| D5 | Questionário **adiado / opcional** — **não** bloqueia Gate 01 nem PRD Andar 2 |
| Longo prazo | CORE substitui Sidicom (meta 2036) |

Estoque físico / NF: **D7 ainda aberta** (confirmar com o dono se ficam no Sidicom/manual enquanto o pedido digital é oficial no HF).

---

## 1. Papel atual do Sidicom (ops legada)

Ainda presente na operação HF (conforme uso real da empresa):

- Cadastro de clientes  
- Cadastro e consulta de produtos  
- Controle de estoque  
- Registro de pedidos e vendas (legado)  
- Condições de pagamento  
- Emissão de notas fiscais  
- Controles administrativos e operacionais  

**Não inventamos** capacidades de API. Quando for integrar, usar o pacote D5 — **sem urgência de Gate**.

---

## 2. Estudo público Sidicom (2026-11-23)

Fontes: [sidicom.com.br](https://www.sidicom.com.br/) — segmento [distribuidora autopeças](https://www.sidicom.com.br/segmentos/distribuidora/sistema-erp-para-distribuidoras-de-autopecas/), [módulos](https://www.sidicom.com.br/modulos-e-funcionalidades/), [e-commerce](https://www.sidicom.com.br/gestao-de-e-commerce/).

| Área Sidicom (marketing) | Relevância HF |
|--------------------------|---------------|
| Estoque (entradas/saídas, reposição, endereçamento) | SoT estoque hoje; alvo sync Andar 3 |
| Vendas (orçamentos, pedidos, margens, comissões) | SoT pedido; agentes pedem via contrato + sync |
| Finanças / boletos (há menção a API de boleto) | Andar 4; não confundir com API ERP completa |
| Fiscal NF-e / SPED | Andar 4; corte só com paralelo |
| E-commerce / marketplaces | Painel de integração configurado pelo **time técnico Sidicom** — pedidos da loja → ERP → faturamento |
| App vendas externas | Canal Sidicom; HF CORE não substitui sem decisão |
| Logística expedição Sidicom | Convivência com Andar 6 (99/Uber/frota) |

### O que **não** está confirmado publicamente

- Documentação aberta de endpoints REST do ERP Sidicom (estoque/pedido/cliente) para terceiros.  
- Se a HF já possui o módulo e-commerce Sidicom ativo.  
- Formato exato de export (CSV/XML/EDI) disponível no contrato da HF.

→ **D5** = caminho oficial **quando** formos integrar — não é pré-requisito do Andar 1/2 agora.

---

## 3. SoT por domínio (atualizado)

| Domínio | SoT agora / Andar 1–2 | Futuro (pós-corte CORE) |
|---------|----------------------|-------------------------|
| Catálogo digital / fitment / busca | **HF app** | HF CORE |
| Pedido digital (operação digital) | **HF Andar 2** (oficial digital) | HF CORE |
| Cliente / limite / condição | Sidicom e/ou HF (definir no PRD Andar 2) | HF CORE |
| Estoque físico | Sidicom/manual até **D7** | HF CORE |
| NF / fiscal | Sidicom/manual até decisão fiscal | HF CORE |
| Pagamento / títulos | Sidicom/manual / futuro Andar 4 | HF CORE |
| Atendimento WA / catálogo | HF app | HF CORE + canais |
| Despacho 99/Uber | Ops manual | HF Andar 6 + ledger |

---

## 4. Estratégia de transição (alinha aos 10 andares)

| Passo | Andar | Ação |
|-------|-------|------|
| 1 | 1 | Catálogo HF estável — **Gate 01 sem Sidicom** |
| 2 | 2 | **Pedido digital oficial no HF** (sem sync Sidicom obrigatório) |
| 3 | depois | Fechar D7 (estoque/NF) + D5 se/quando integrar |
| 4 | 3+ | Estoque no CORE / sync Sidicom sob decisão |
| 5 | 4 | Fiscal paralelo / regras NF |
| 6 | 2–6 | Paralelo operacional se Sidicom ainda ativo |
| 7 | pós-gates | Corte: CORE vira SoT total |

Sistema próprio ≠ copiar telas do ERP. Inclui fiscal, auditoria, segurança.

---

## 5. Questionário Sidicom (D5) — **opcional / adiado**

Pacote pronto: `docs/fases/FASE_01_CATALOGO_DIGITAL/D5_SIDICOM_QUESTIONARIO_ENVIO.md`.

**Não** é checklist do Gate 01 nem pré-requisito do PRD Andar 2. Enviar quando a HF decidir sincronizar.

| # | Pergunta |
|---|----------|
| 1 | Existe API documentada do ERP (REST/SOAP/outro)? Quais módulos? |
| 2 | Consulta externa de estoque e preços? |
| 3 | Inclusão/atualização de pedidos por integração? |
| 4 | Consulta clientes, condições de pagamento e limites de crédito? |
| 5 | Mecanismo: API, banco, arquivo, middleware, painel e-commerce Sidicom? |
| 6 | A HF já tem módulo e-commerce/marketplace Sidicom? Quais plataformas? |
| 7 | Homologação, rate limit, autenticação, ambiente teste? |
| 8 | Quem é dono do SKU canônico na sincronização? |
| 9 | Webhooks ou só polling para status de pedido/estoque? |
| 10 | Integração com agentes/terceiros é permitida contratualmente? |

Respostas → atualizar este doc + PRDs dos andares afetados.

---

## 6. Relação com agentes de IA

- Pedido digital oficial = **HF Andar 2** (não depende de D5).  
- Agente **consulta** catálogo/estoque via contratos HF.  
- Agente **propõe** `draft_order`; gravação oficial no HF conforme regras do Andar 2.  
- Sync Sidicom (se existir) é camada à parte, pós-D5.

---

## 7. Anti-padrões

- Dois SoT de estoque/pedido sem regra de escrita.  
- Pedido só no app HF sem espelho Sidicom (enquanto oficial).  
- Aplicar schema fonte de referência orders/inventory no HF sem estratégia Sidicom.  
- Desligar Sidicom sem paralelo + aceite fiscal/ops.  
- Assumir “Sidicom tem API” sem evidência do fornecedor.

---

## 8. Relação com fonte

Padrões `place_order`, resolve preço, RLS: ver `auditoria/fonte/`.  
Pay MP/Asaas e checkout B2C fonte: não são o caminho curto enquanto Sidicom operar comercial/fiscal.
