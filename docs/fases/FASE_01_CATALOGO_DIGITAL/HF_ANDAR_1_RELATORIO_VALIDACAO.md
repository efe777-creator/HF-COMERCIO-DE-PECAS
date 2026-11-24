# HF Andar 1 — Relatório de validação (vivo)

Ciclo: Implantação → Validação → Ajuste → Teste smoke → Ajuste → Validação  
**Data consolidada:** 2026-11-24

## E1 — Docs

| Campo | Valor |
|-------|-------|
| VALID-E1 | 8 arquivos do pacote + DIAGNOSTICO/PLANO |
| Resultado | PASS |
| Aceite | SIM |

## E2 — Identidade / presença

| Campo | Valor |
|-------|-------|
| Arquivos | PrivacidadePage, Home CTAs, Footer links, router |
| VALID | privacidade rota; CTAs cotação/parceiro/catálogo/veículo; copy D1 |
| npm test | 85 passed (pós-vitrine imagens) |
| Aceite | SIM |

## E3 — Catálogo 8 grupos

| Campo | Valor |
|-------|-------|
| Arquivos | AdminProductFormPage âncoras + releaseChecklist; ProductMediaFrame; productImages |
| VALID | grupos identificação…internos; checklist sem preço; card/PDP leem Storage |
| Aceite | SIM |

## E4 — Veículos / aplicações

| Campo | Valor |
|-------|-------|
| SQL | 14_pvc_position_validation, 15_model_production_years (aplicadas Supabase) |
| Libs ano/cascata | vehicleAppYear, pvcVehicleCascade |
| UI | hub `/admin/aplicacoes`; PVC anos/posição/status no form; fab years modelo |
| Aceite | SIM |

## E5 — Pesquisa / PDP / compat

| Campo | Valor |
|-------|-------|
| SQL | 16_search_products_pvc_years aplicada |
| Ports | compatibilityEngine, loadPvcEvidence, compatibilitySummary years |
| UI | selos Catalog/ProductCard; CompatibilityAppsBlock PDP; ProductGallery + imageUrl |
| Aceite | SIM |

## E6 — Campanhas

| Campo | Valor |
|-------|-------|
| SQL | 17_campaigns aplicada |
| UI | `/admin/campanhas`; home prioriza campanhas ativas |
| Aceite | SIM |

## E7 — Cotação / leads / parceiro

| Campo | Valor |
|-------|-------|
| SQL | 18_leads aplicada |
| UI | `/cotacao`, `/seja-parceiro`, `/admin/leads`, `/admin/cotacoes` |
| Flag | quotation_enabled true |
| Aceite | SIM |

## E8 — Admin / import / kits

| Campo | Valor |
|-------|-------|
| SQL | 19_product_kits aplicada |
| UI | menu comercial; dashboard contagens; import histórico; BOM kit |
| Aceite | SIM |

## E9 — Segurança / a11y

| Campo | Valor |
|-------|-------|
| VALID | RLS leads/campanhas nas migs; StaffRoute; build OK; tokens `--hf-*` |
| Aceite | SIM |

## E10 — Regressão

| Campo | Valor |
|-------|-------|
| npm test | 85 passed |
| npm run build | OK |
| Smoke sessão | [HF_ANDAR_1_SMOKE_SESSAO_2026-11-24.md](./HF_ANDAR_1_SMOKE_SESSAO_2026-11-24.md) |
| Sync doc | [HF_SYNC_CATALOGO_FONTE.md](./HF_SYNC_CATALOGO_FONTE.md) (apply pendente service role) |
| Aceite | SIM |

## E11 — Homologação

| Campo | Valor |
|-------|-------|
| Doc | HF_ANDAR_1_HOMOLOGACAO.md preenchido tecnicamente |
| Assinatura dono | PENDENTE (humano) |
| Deploy produção rotas novas | PENDENTE |
| Aceite técnico local+DB | SIM |

## Sessão IVTSAV final (2026-11-24 10:41–10:45)

1. Validação auto: test/build/schema/RPC year=2012 → 36  
2. Ajuste: nenhum P0/P1; gap só deploy prod  
3. Teste: re-run 78 tests + build  
4. Validação: schema + lead insert + dashboard  
5. Smoke completo local L01–L10 PASS; prod Gate PASS; prod rotas novas FAIL deploy  
6. **Validação última:** Andar 1 tecnicamente OK para deploy
