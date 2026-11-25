# Auditoria fonte de referência consolidada para reuso HF

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência HF)  
**Restrição:** zero alteração na projeto de terceiros  
**Satélites:** estrutura, jornadas, dados, integrações  
**Mestre operacional:** `HF_REF_APROVEITAMENTO_DETALHADO.md`

---

## 1. Sumário executivo

a fonte de referência é um **commerce operacional amplo** (loja B2C + admin + pedidos + frete + pay híbrido + INV + import). A HF é uma **distribuidora B2B** com **Sidicom** como ERP oficial hoje e meta de **HF CORE** substituí-lo.

| Veredito | Conteúdo |
|----------|----------|
| **Aproveitar já** | Catálogo, PVC, import, auth/staff/RLS, busca, admin CRUD, contratos únicos, disciplina docs |
| **Adaptar com cuidado** | Preço, clientes (B2B), placa/NL, frete próprio como *custo interno*, padrões de pedido |
| **Não trazer agora** | Checkout B2C, MP/Asaas, ME cobrando cliente, branding fonte, Garage/Parceiros/Workshop |
| **Construir HF** | Sidicom bridge, frete grátis + ledger custo, CRM B2B, fiscal próprio no longo prazo, agentes IA HF |

Problema fonte de referência (governança/coerência) = **lição** para a HF: documentação canônica + gates antes de crescer módulos.

---

## 2. Baseline fonte (fatos)

| Item | Valor |
|------|--------|
| Stack | React 19 + Vite + TS + Tailwind + Supabase |
| Rotas | ~70 |
| Migrations | ~210 |
| Edges | 19 |
| Papel loja | B2C + staff |
| MVP aberto | G8 vendas controladas (na auditoria fonte de referência 2026-11-16) |

Baseline HF: ver `HF_AUDITORIA_CONSOLIDADA_2036.md` — catálogo B2B + admin + import + WA; comércio off.

---

## 3. Ordem de portabilidade por andar HF

| Andar | Nome | Prioridade reuso fonte |
|-------|------|----------------------|
| Fundação | CORE / dados / segurança | Método SoT + RLS + flags |
| 1 | Catálogo Digital | **Máximo** — já em grande parte feito |
| 2 | Operação comercial | Padrão `place_order` / CRM — **via Sidicom** primeiro |
| 3 | Estoque e compras | Schema fonte de referência como referência; SoT Sidicom |
| 4 | Financeiro e fiscal | Pouco reuso fonte; Sidicom → CORE |
| 5 | Portal B2B | HF já tem base; não loja B2C fonte |
| 6 | Logística | Aprender packing/own; **reverter** regra frete cliente |
| 7 | Marketing | Parcial (home/promo fonte) |
| 8 | Integrações e IA | NL/OTP como opção; agentes HF |
| 9 | BI | Relatórios fonte como referência UI |
| 10 | Expansão | Visão fonte 2040 **não** é regra HF |

---

## 4. Riscos

| Risco | Mitigação |
|-------|-----------|
| Copiar migrations de referência no Supabase HF | Proibido; só `migrations_hf` |
| Dois SoT de estoque/pedido | Documento Sidicom + sync explícito |
| Trazer MP “porque fonte tem” | Fora enquanto Sidicom + política HF |
| Frete ME cobrado do cliente | Política frete grátis |
| Identidade visual de terceiros | Tokens `--hf-*` apenas |
| Crescimento sem gate (lição fonte) | PRD-Mestre + Fase 1 + MARCHA |

---

## 5. Como usar este pacote

1. Dúvida “o que a fonte de referência tem?” → `HF_REF_ESTRUTURA_E_MODULOS.md`  
2. Dúvida jornada → `HF_REF_JORNADAS.md`  
3. Dúvida tabela/SoT → `HF_REF_DADOS_E_RELACOES.md`  
4. Dúvida API/IA → `HF_REF_INTELIGENCIA_E_INTEGRACOES.md`  
5. Inventário fino tela/tabela fonte de referência → `HF_REF_TELAS_TABELAS_PROFUNDAS.md`  
6. Decisão portar X → **`HF_REF_APROVEITAMENTO_DETALHADO.md`** (matriz Ação)  
7. Runtime HF cruzado → `../runtime/HF_AUDITORIA_RUNTIME_PROFUNDA.md`

Leitura fonte de referência original (somente leitura): índice → PRD 4.0 → consolidada PRD4 → arquitetura 360 → SoT dados.
