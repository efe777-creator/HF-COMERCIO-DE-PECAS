# HF — Índice canônico de documentos

**Versão:** 2.0  
**Data:** 2026-11-23  
**Status:** CANÔNICO (mapa de autoridade)

Em caso de conflito: **documento proprietário da regra vence**. Auditorias e docs históricos são evidência, não autoridade — salvo quando este índice os marca como canônicos de evidência.

A HF é produto **independente** (marca, regras, stack e dados próprios).

**Documento central do projeto:** [HF_PRD_MESTRE_2036.md](./HF_PRD_MESTRE_2036.md) **v1.0**  
**Site vivo:** [hfcomerciodepecas.com](https://hfcomerciodepecas.com)

---

## Como usar (ordem assertiva)

| Se você quer… | Abra |
|---------------|------|
| **PRD-Mestre do prédio completo** | [HF_PRD_MESTRE_2036.md](./HF_PRD_MESTRE_2036.md) |
| Norte 2036 / essência | [HF_VISAO_2036.md](./HF_VISAO_2036.md) |
| Identidade visual / voz / tokens | [HF_IDENTIDADE_VISUAL.md](./HF_IDENTIDADE_VISUAL.md) |
| Cruzamento GPT × HF | [HF_CRUZAMENTO_PRD_GPT.md](../auditoria/HF_CRUZAMENTO_PRD_GPT.md) |
| **PRD Andar 1 completo** (Catálogo) | [PRD_FASE_01.md](../fases/FASE_01_CATALOGO_DIGITAL/PRD_FASE_01.md) **v1.1** + satélites + [RASTREABILIDADE](../fases/FASE_01_CATALOGO_DIGITAL/RASTREABILIDADE.md) |
| Padrão telas / usabilidade ops | [HF_PADRAO_TELAS_UX_OPERACIONAL.md](./HF_PADRAO_TELAS_UX_OPERACIONAL.md) |
| Prep IA + 99/Uber + Sidicom | [HF_INTEGRACOES_E_AGENTES_PREP.md](../arquitetura/HF_INTEGRACOES_E_AGENTES_PREP.md) |
| Arquitetura / SoT | [HF_ARQUITETURA_PADRAO.md](../arquitetura/HF_ARQUITETURA_PADRAO.md) · [HF_DADOS_FONTES_VERDADE.md](../arquitetura/HF_DADOS_FONTES_VERDADE.md) |
| Sidicom / frete / org / runbooks | [HF_SIDICOM_E_TRANSICAO.md](../operacao/HF_SIDICOM_E_TRANSICAO.md) · [HF_LOGISTICA_FRETE_GRATIS.md](../operacao/HF_LOGISTICA_FRETE_GRATIS.md) · [HF_MODELO_OPERACIONAL.md](../operacao/HF_MODELO_OPERACIONAL.md) · [HF_RUNBOOKS.md](../operacao/HF_RUNBOOKS.md) |
| Aproveitamento técnico (referência) | [HF_REF_APROVEITAMENTO_DETALHADO.md](../auditoria/referencia_tecnica/HF_REF_APROVEITAMENTO_DETALHADO.md) |
| Runtime telas×tabelas | [HF_AUDITORIA_RUNTIME_PROFUNDA.md](../auditoria/runtime/HF_AUDITORIA_RUNTIME_PROFUNDA.md) |
| MVP B2B / UX / roadmap | [PRD_HF_B2B_1.0.md](../PRD_HF_B2B_1.0.md) · [PRD_UX_B2B_1.0.md](../PRD_UX_B2B_1.0.md) · [ROADMAP_HF.md](../ROADMAP_HF.md) |

---

## Ordem de autoridade

1. [HF_VISAO_2036.md](./HF_VISAO_2036.md) — essência, Sidicom, frete  
2. [HF_PRD_MESTRE_2036.md](./HF_PRD_MESTRE_2036.md) — **prédio completo** (andares, módulos, integrações)  
3. PRD da fase ativa — [PRD_FASE_01.md](../fases/FASE_01_CATALOGO_DIGITAL/PRD_FASE_01.md)  
4. Arquitetura + Fontes de verdade  
5. Identidade visual  
6. Operação (modelo, Sidicom, frete, runbooks)  
7. Anexos MVP / ROADMAP / HOMOLOGACAO  
8. Evidência: `docs/auditoria/` (+ cruzamento GPT, referência técnica)  
9. Referências externas: `docs/entrada/referencias/` (não canônicas)

---

## Documentos canônicos vivos

| Documento | Papel | Status |
|-----------|-------|--------|
| Este índice | Mapa de autoridade | CANÔNICO v2.0 |
| HF_PRD_MESTRE_2036 | Documento central do ecossistema | **CANÔNICO v1.0** |
| HF_VISAO_2036 | Visão / essência | CANÔNICO v1.0 |
| HF_IDENTIDADE_VISUAL | Marca / tokens / voz | CANÔNICO v1.0 |
| PRD_FASE_01 + satélites | Andar 1 (spec GPT×HF) | CANÔNICO v1.1 |
| HF_PADRAO_TELAS_UX_OPERACIONAL | UX ops | CANÔNICO |
| Arquitetura / SoT / Integrações | Tech | CANÔNICO |
| Sidicom / Frete / Modelo ops / Runbooks | Operação | CANÔNICO |
| HF_CRUZAMENTO_PRD_GPT | Evidência fusão GPT×HF | CANÔNICO evidência |
| Pacote auditoria HF + referência técnica | Evidência | CANÔNICO evidência |

---

## Próximo passo oficial (onda)

1. Andar 1: P0+D1 feitos; **enviar D5** + smoke `/conta/veiculos` → fechar **Gate 01**.  
2. Mestre permanece como orientação do prédio.  
3. Após Gate 01 → PRD do próximo andar (antes de codar pedidos).  
4. IA / 99 / Uber: prep só; produção no andar certo.  
5. Pacote D5: `fases/FASE_01_CATALOGO_DIGITAL/D5_SIDICOM_QUESTIONARIO_ENVIO.md`.
