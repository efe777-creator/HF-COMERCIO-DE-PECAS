# HF — Índice de runbooks

**Versão:** 1.0  
**Data:** 2026-11-23  
**Status:** CANÔNICO (índice)

Procedimentos operacionais vivos. Detalhe permanece nos documentos linkados (evitar duplicar passos).

---

| Runbook | Documento | Quando usar |
|---------|-----------|-------------|
| Deploy Hostinger / domínio | [DEPLOY_HOSTINGER.md](../DEPLOY_HOSTINGER.md) | Publicar ou atualizar site |
| Bootstrap primeiro staff | [STAFF_BOOTSTRAP.md](../STAFF_BOOTSTRAP.md) | Criar administrador inicial |
| Regras de importação | [REGRAS_IMPORTACAO_HF.md](../REGRAS_IMPORTACAO_HF.md) | Import CSV/XLSX |
| Moldes de importação | [MOLDES_IMPORTACAO_HF.md](../MOLDES_IMPORTACAO_HF.md) | Baixar/validar templates |
| Aceite UX B2B (smoke) | [ACEITE_UX_B2B.md](../ACEITE_UX_B2B.md) | Homologar experiência |
| Homologação gate | [HOMOLOGACAO_HF.md](../HOMOLOGACAO_HF.md) | Checklist infra/catálogo (atualizar C1/C2) |
| Migrations SoT | [HF_DADOS_FONTES_VERDADE.md](../arquitetura/HF_DADOS_FONTES_VERDADE.md) | Banco novo / SQL |
| Env / secrets | `.env.example` + README | Setup local |
| Sidicom / transição | [HF_SIDICOM_E_TRANSICAO.md](./HF_SIDICOM_E_TRANSICAO.md) | Integração ERP / questionário fornecedor |
| Frete grátis | [HF_LOGISTICA_FRETE_GRATIS.md](./HF_LOGISTICA_FRETE_GRATIS.md) | Premissa logística |
| Portar algo da referência | [HF_REF_APROVEITAMENTO_DETALHADO.md](../auditoria/fonte/HF_REF_APROVEITAMENTO_DETALHADO.md) | Antes de qualquer cópia de módulo |
| Prep IA / 99 / Uber | [HF_INTEGRACOES_E_AGENTES_PREP.md](../arquitetura/HF_INTEGRACOES_E_AGENTES_PREP.md) | Contratos antes dos andares 6 e 8 |
| Onda PRDs | [HF_PRD_MESTRE_2036.md](../entrada/HF_PRD_MESTRE_2036.md) v1.0 · [PRD_FASE_01.md](../fases/FASE_01_CATALOGO_DIGITAL/PRD_FASE_01.md) | Prédio → Fase 1 → Gate → próximo |
| Cruzamento GPT | [HF_CRUZAMENTO_PRD_GPT.md](../auditoria/HF_CRUZAMENTO_PRD_GPT.md) | Rastreio do que entrou no Mestre |
| Site vivo | https://hfcomerciodepecas.com | Copy/contato vs Visão/Identidade |

---

## Avisos

- Nunca versionar `.env.local`.  
- Nunca usar projeto/credenciais de terceiros.  
- SQL SoT = `supabase/migrations_hf/` apenas.
