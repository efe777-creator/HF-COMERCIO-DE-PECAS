# Matriz de rastreabilidade — Andar 1

**Versão:** 1.3  
**Data:** 2026-11-24  
**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md) v1.1  
**Revisão técnica:** [REVISAO_TECNICA_2026-11-24.md](./REVISAO_TECNICA_2026-11-24.md)  
**Auditoria Gate:** [AUDITORIA_GATE01_2026-11-24.md](./AUDITORIA_GATE01_2026-11-24.md)  
**D5 (opcional):** [D5_SIDICOM_QUESTIONARIO_ENVIO.md](./D5_SIDICOM_QUESTIONARIO_ENVIO.md)

Legenda: **OK** · **PARCIAL** · **GAP** · **WAIVER_POS_GATE** · **OPCIONAL**

| RF | Requisito | Evidência | Estado | Aceite |
|----|-----------|-----------|--------|--------|
| RF-001 | Institucional | Home/Sobre/Atendimento + site | **OK** | Smoke S01/S06 |
| RF-002 | Catálogo D1 aberto | flag false + mig 08 + Visão D1 | **OK** | Published anon; sem preço |
| RF-003 | Busca nome | search_products | **OK** | Smoke S02 |
| RF-004 | Busca código HF | search | **OK** | Código exato |
| RF-005 | Busca refs | product_references | **PARCIAL** | Refs escassas na massa |
| RF-006 | PDP | ProductPage + WA | **OK** | Smoke S03 |
| RF-007 | Categorias | Category* | **OK** | Nav |
| RF-008 | Marcas | Brand* | **OK** | Nav |
| RF-009 | Apps por veículo | VehiclePage + PVC | **OK** | Cascata |
| RF-010 | Veículos por produto | PDP apps | **OK** | Inversa |
| RF-011 | Posições estruturadas | products.posicao/lado; PVC sem 3 eixos | **WAIVER_POS_GATE** | Pós-Gate |
| RF-012 | Fab ≠ ano-modelo | VV.year só | **WAIVER_POS_GATE** | Pós-Gate |
| RF-013 | Faixas aplicação | year_start/end | **OK** | Faixa |
| RF-014 | Apps validadas | Sem status PVC | **WAIVER_POS_GATE** | Pós-Gate |
| RF-015 | CTA WA | env | **OK** | Smoke S07 |
| RF-016 | Cotação/contato | WA + ops humano | **OK** | Processo Gate |
| RF-017 | Leads módulo | Sem tabela | **WAIVER_POS_GATE** | Ops WA fecha Gate |
| RF-018–022 | Admin catálogo | admin* | **OK** | Smoke D* |
| RF-023–024 | Import | apply_* + hub | **OK** | Hub acessível |
| RF-025–026 | Campanhas | Destaques home | **WAIVER_POS_GATE** | Pós-Gate |
| RF-027 | Permissões | StaffRoute | **OK** | A01/A02 |
| RF-028 | Histórico | imports | **PARCIAL** | History |
| RF-029 | Indicadores admin | Dashboard | **PARCIAL** | Contadores |
| RF-030 | Base expansão | migrations_hf | **OK** | Sem fonte lote |
| RF-031 | P0 vehicles | DB+RLS+CRUD logado | **OK** | Smoke A04 |
| RF-032 | Órfãos P1 | services removidos | **OK** | Grep limpo |
| RF-033 | D1 registrada | Visão + PRD | **OK** | Published aberto |
| RF-034 | D5 Sidicom | Pacote pronto | **OPCIONAL** | Fora do Gate |
| RF-035 | SKUs estáveis | products | **OK** | — |
| RF-036 | Sem preço público | price_enabled=false | **OK** | Vitrine |

**DB verify 2026-11-24:** `customer_vehicles` RLS; 49 published; 384 PVC; fix `handle_new_user` (mig 13).
