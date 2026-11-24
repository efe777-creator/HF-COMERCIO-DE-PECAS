# Inventário de documentos HF

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**Raiz do app:** `hf-comercio-de-pecas/`

Legenda de status: `complete` | `stub` | `outdated` | `conflicts`  
Papel 2036: `manter` | `fundir` | `arquivar` | `substituir`

---

## Tier 1 — Produto, UX e planejamento

| Arquivo | ~Linhas | Status | Papel 2036 | Notas |
|---------|---------|--------|------------|-------|
| `docs/PRD_HF_B2B_1.0.md` | ~15 | stub | fundir → anexo do PRD-Mestre | Sumário MVP; Foundation “em andamento” desatualizado |
| `docs/PRD_UX_B2B_1.0.md` | ~36 | complete | manter | Aceite UI B2B + tokens |
| `docs/ROADMAP_HF.md` | ~28 | complete | manter | Snapshot fases 1–7 OK; 8–12 off |
| `docs/ACEITE_UX_B2B.md` | ~12 | complete | manter | Smoke + seed RLS |
| `docs/HOMOLOGACAO_HF.md` | ~26 | conflicts | manter (corrigir C1/C2) | Gate login vs runtime público |

## Tier 2 — Domínio e arquitetura

| Arquivo | ~Linhas | Status | Papel 2036 | Notas |
|---------|---------|--------|------------|-------|
| `docs/MODELO_B2B_HF.md` | ~27 | complete | manter | Customers/groups/catalogs + RLS |
| `docs/MODELO_CATALOGO_HF.md` | ~29 | conflicts | manter (corrigir “público”) | Separação status≠preço≠estoque OK |
| `docs/ARQUITETURA_HF.md` | ~34 | complete | fundir → `arquitetura/HF_ARQUITETURA_PADRAO` | Stack + schema MVP + política migrations |
| `docs/MAPA_REFERENCIA_TECNICA.md` | ~55 | complete | manter | GATE 01 corte referência→HF |

## Tier 3 — Dados, import, ops

| Arquivo | ~Linhas | Status | Papel 2036 | Notas |
|---------|---------|--------|------------|-------|
| `docs/REGRAS_IMPORTACAO_HF.md` | ~31 | complete | manter | Draft, RPCs, regras |
| `docs/MOLDES_IMPORTACAO_HF.md` | ~20 | complete | manter | 6 CSVs em `public/moldes-importacao/` |
| `docs/DEPLOY_HOSTINGER.md` | ~37 | complete | manter → link em runbooks | Site + branch static |
| `docs/STAFF_BOOTSTRAP.md` | ~19 | complete | manter → link em runbooks | Primeiro admin SQL |
| `README.md` | ~45 | outdated | atualizar | MVP “público”; índice incompleto |

## Tier 4 — Ponteiros e notas

| Arquivo | ~Linhas | Status | Papel 2036 | Notas |
|---------|---------|--------|------------|-------|
| `docs/architecture.md` | 4 | stub | substituir | Linkia `docs/entrada/ARCHITECTURE.md` **inexistente** |
| `docs/data-model-future.md` | 4 | stub | substituir | Linkia `docs/entrada/DATABASE.md` **inexistente** |
| `docs/logo-validation.md` | ~8 | complete | fundir → identidade | Pipeline logo transparente |
| `supabase/migrations/README_LEGACY.md` | ~19 | complete | manter | SoT = `migrations_hf/` |

## Fora do app (pendrive HF)

| Arquivo | Status | Papel 2036 |
|---------|--------|------------|
| `SITE HF HTML/.../hf_catalogo/README.md` | complete (protótipo) | arquivar / referência de identidade |
| `SITE HF HTML/Novo Documento de Texto.txt` | informal | arquivar |

## Links markdown quebrados (antes da Fase B)

| De | Para |
|----|------|
| `docs/architecture.md` | `docs/entrada/ARCHITECTURE.md` |
| `docs/data-model-future.md` | `docs/entrada/DATABASE.md` |

## Pasta `docs/entrada/` (antes desta marcha)

**Não existia.** Criada na Fase B com índice, visão, PRD-Mestre e identidade.

## Documentos de auditoria (esta marcha)

| Arquivo | Papel |
|---------|-------|
| `docs/auditoria/HF_AUDITORIA_CONSOLIDADA_2036.md` | Mestre evidência |
| `docs/auditoria/HF_INVENTARIO_DOCUMENTOS.md` | Este arquivo |
| `docs/auditoria/HF_INVENTARIO_CODIGO_RUNTIME.md` | Runtime |
| `docs/auditoria/HF_LINHAGEM_METODOLOGIA.md` | método de referência |
| `docs/auditoria/HF_GAPS_VS_PRD_MESTRE_20.md` | Gaps 01–20 |
