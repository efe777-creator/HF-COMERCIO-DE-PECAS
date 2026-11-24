# HF Andar 1 — Plano de implantação (E1)

**Status:** RASCUNHO pós-E0 — aguarda aprovação para código (E2+)  
**Diagnóstico:** [HF_ANDAR_1_DIAGNOSTICO.md](./HF_ANDAR_1_DIAGNOSTICO.md)  
**Ciclo:** Implantação → Validação → Ajuste → Teste smoke → Ajuste → Validação  
**Fonte externa:** reutilizar/adaptar liberado → só dentro da HF

---

## Admin — telas (Definido)

Separação obrigatória:

| Tela | Rota | Papel |
|------|------|-------|
| Dashboard | `/admin` | Indicadores reais |
| **Produtos** | `/admin/produtos` (+ form) | Cadastro 8 grupos |
| **Aplicações** | `/admin/aplicacoes` **NOVA** | Hub PVC global |
| **Listas de preços** | `/admin/precos` | Staff (sem vitrine) |
| Categorias / Marcas / Montadoras / Veículos / Fornecedores | existentes | Mestres |
| Importações | hub existente | Endurecer |
| Campanhas / Cotações / Leads (/Parceiros) | **NOVAS** | Comercial Andar 1 |
| Clientes / Grupos / Listas B2B / Operadores | existentes | Manter |

---

## Ordem E2–E11

| Etapa | Módulos | Libs reutilizadas principais |
|-------|---------|----------------------|
| E2 | M01–M02 | — |
| E3 | M03 | Seções refs/imagens, form âncoras |
| E4 | M04–M05 | vehicleAppYear, pvcVehicleCascade, ProductApplicationsEditor, hub |
| E5 | M06–M07 | compatibilityEngine, loadPvcEvidence, search years SQL, badges |
| E6 | M08 | CONSTRUIR_HF campanhas |
| E7 | M09–M11 | CONSTRUIR_HF leads/cotações/parceiro |
| E8 | M12–M13 | Kit BOM ADAPTAR se no backlog |
| E9–E11 | M14 | Testes, regressão, homolog |

---

## Migrations previstas (após aprovação; com reversão)

1. PVC: posicao/lado + validation_status + CHECKs years  
2. models: production_year_* + quality  
3. search_products: year range PVC  
4. campaigns (+ items)  
5. leads (+ quote_items opcional)  
6. products.is_featured e/ou link campanha  
7. product_kind + product_kit_components  

Cada uma: diagnóstico → SQL → apply Supabase HF → smoke → doc.

---

## Aprovação

- [ ] E0 aceito  
- [ ] Este plano E1 aceito → liberar **E2 código**
