# HF Visão 2036 — identidade e estratégia

**Versão:** 1.0  
**Data:** 2026-11-23  
**Status:** CANÔNICO (sujeito a validação residual do dono em D1–D5)  
**Índice:** [HF_INDICE_CANONICO.md](./HF_INDICE_CANONICO.md)  
**PRD-Mestre (documento central):** [HF_PRD_MESTRE_2036.md](./HF_PRD_MESTRE_2036.md) v1.0  
**Identidade / site:** [HF_IDENTIDADE_VISUAL.md](./HF_IDENTIDADE_VISUAL.md)  
**Fase 1:** [PRD_FASE_01.md](../fases/FASE_01_CATALOGO_DIGITAL/PRD_FASE_01.md)  
**Integrações:** [HF_INTEGRACOES_E_AGENTES_PREP.md](../arquitetura/HF_INTEGRACOES_E_AGENTES_PREP.md)  
**Site vivo:** [hfcomerciodepecas.com](https://hfcomerciodepecas.com)

---

## 1. Quem somos (essência inegociável)

A **HF Comércio de Peças** é uma **distribuidora de autopeças** sediada em Guarulhos/SP, especializada em **suspensão, direção e freios**, com operação de **delivery** e ambição de **expansão nacional**.

Essa essência **não se troca** por virar marketplace genérico, marketplace de terceiros ou “só um site institucional”.

| Campo | Valor | Fonte |
|-------|-------|-------|
| Nome | HF Comércio de Peças | site + `business.ts` |
| Tagline | Distribuidora automotiva especializada em suspensão, direção e freios | `business.ts` |
| Hero (site) | Encontre a peça certa para o seu negócio | hfcomerciodepecas.com |
| Posicionamento digital | Catálogo B2B autorizado — sem preço público; consulte disponibilidade com a HF | site |
| Base | Av. Rosa Molina Pannochia, 424 — Guarulhos/SP | site |
| E-mail | marketing@hfcomerciodepecas.com | site |
| Horário | Seg–Sex 08h–18h · Sáb 09h–14h | site /Sobre |
| Público | Lojas de autopeças, oficinas mecânicas e profissionais B2B | /Sobre |
| Instagram | @hfsuspensao | `business.ts` |

Copy operacional do app: `src/config/business.ts`. Detalhe do prédio: PRD-Mestre v1.0.

### Pilares de relacionamento (site /Sobre)

1. Competitividade comercial  
2. Suporte na identificação de peças e aplicações  
3. Variedade de produtos  
4. Atendimento próximo e parceria de longo prazo  

---

## 2. Ambição estratégica — modelo híbrido

Até **2036**, a HF evolui de distribuidora tradicional para um **ecossistema híbrido**:

- **Núcleo:** distribuição física + estoque + delivery.  
- **Camada tecnológica:** HF CORE, catálogo inteligente, portal B2B, canais digitais.  
- **Camada de serviços:** atendimento, relacionamento, WhatsApp, IA assistida.  
- **Expansão:** presença nacional sem abandonar a identidade de distribuidora.

Premissa: **não desenvolver funcionalidade isolada** sem encaixe na empresa que queremos ter (ver Mestre).

### 2.1 Sidicom e HF CORE (decisão travada + ritmo 2026-11-24)

| Horizonte | Sistema | Papel |
|-----------|---------|-------|
| **Hoje (ops legada)** | **Sidicom** | Ainda usado na empresa (estoque/NF/cadastros conforme operação atual) |
| **Andar 1** | HF catálogo | Sem integração Sidicom |
| **Andar 2** | **HF pedidos digitais** | Pedido **oficial da operação digital** nasce no HF (após Gate 01). **Sem implantar integração Sidicom neste momento** |
| **Depois (quando alinhar)** | Estudo D5 / sync | Integração Sidicom sob demanda — **não bloqueia** Gate 01 nem PRD Andar 2 |
| **Longo prazo** | **HF CORE** | Substitui completamente o Sidicom |

Detalhe: [HF_SIDICOM_E_TRANSICAO.md](../operacao/HF_SIDICOM_E_TRANSICAO.md).

### 2.2 Frete grátis (decisão travada)

| Item | Regra atual |
|------|-------------|
| Frete para o cliente | **Gratuito em todos os pedidos** |
| 99 / Uber / motoboy / transportadora / frota | HF assume o custo (fee = custo interno) |
| Futuro | Política **configurável** sem reconstruir o módulo |

Detalhe: [HF_LOGISTICA_FRETE_GRATIS.md](../operacao/HF_LOGISTICA_FRETE_GRATIS.md).

---

## 3. Escopo do projeto

O **PRD-Mestre v1.0** é o documento central (empresa + tecnologia + 10 andares + integrações).  
Fase 1 = Catálogo Digital. Stack: **React + Vite + Supabase**.  
Referência técnica auxiliar — pacote `docs/auditoria/referencia_tecnica/` (não define marca nem regras HF).

Taxonomia do Mestre: **Definido / Proposto / Pendente**.

---

## 4. Não-objetivos

| Não | Motivo |
|-----|--------|
| Marketplace multi-vendedor | Essência de distribuidora |
| Copiar PRD/visual de terceiros | Linhagem ≠ negócio |
| Checkout/estoque/IA/99 em prod sem Gate | Ordem do prédio |
| Desligar Sidicom sem paralelo | Risco fiscal/ops |

---

## 5. Horizontes

| Horizonte | Intenção |
|-----------|----------|
| **12 meses** | Fase 1 homologada (D1); Andar 2 pedidos oficiais no HF; Sidicom **sem** integração obrigatória; **sem** agentes/99 em prod |
| **36 meses** | Portal B2B; estoque/NF conforme decisão; possível sync Sidicom; **99/Uber** + frete ledger; agentes assistidos |
| **120 meses (2036)** | CORE como ERP próprio; expansão nacional; IA + canais sob supervisão |

Metas numéricas de faturamento/filiais: **Pendente — validar com o dono**.

---

## 6. Estado atual vs visão

| Dimensão | Hoje | 2036 |
|----------|------|------|
| Site / catálogo | hfcomerciodepecas.com vivo (B2B, sem preço público) | Portal + CORE |
| Software | MVP catálogo + admin + import + WA | HF CORE completo |
| ERP | Sidicom | CORE (após corte) |
| Frete | Grátis (ops) | Grátis + ledger + 99/Uber |
| Org / CD | Pouco documentado | Planta e RACI claros |

---

## 7. Decisões

### Travadas

| ID | Decisão |
|----|---------|
| — | Sidicom → CORE (longo prazo); frete grátis universal (config futura); HF independente |
| **D1** | **Catálogo `published` aberto**; **sem preço público**. Fechada 2026-11-24. |
| **D6** | **Pedido digital oficial no HF no Andar 2** (após Gate 01). Sem implantação Sidicom agora. Fechada 2026-11-24. |
| **D5** | Questionário Sidicom = **opcional / adiado** — **não** bloqueia Gate 01 nem início do PRD Andar 2. Pacote permanece em `FASE_01/.../D5_SIDICOM_QUESTIONARIO_ENVIO.md` para quando formos integrar. |

### Abertas (perguntar ao dono antes de decidir)

| ID | Pergunta | Impacto |
|----|----------|---------|
| D2 | Linhas além de suspensão/direção/freios em 36m? | Catálogo/compras |
| D3 | Delivery: frota / terceiros / híbrido? | Andar 6 |
| D4 | Unidades/CDs no plano de expansão? | Andar 10 |
| D7 | No Andar 2, estoque/NF continuam só no Sidicom/manual enquanto o pedido é oficial no HF? | SoT estoque/fiscal |

---

## 8. Próximo preenchimento

1. **Gate 01** tecnicamente fechado (2026-11-24) — aguarda **assinatura do dono** em `FASE_01/.../HOMOLOGACAO.md`.  
2. Alinhar **D7** (estoque/NF) e só então PRD Andar 2 (pedidos oficiais HF).  
3. Completar RACI em `HF_MODELO_OPERACIONAL.md`.  
4. Mestre estável; detalhe nos PRDs de andar.  
5. Reuso técnico só via `HF_REF_APROVEITAMENTO_DETALHADO.md` (sempre adaptado à HF).
