# HF Andar 1 — Matriz de requisitos

**Diagnóstico:** [HF_ANDAR_1_DIAGNOSTICO.md](./HF_ANDAR_1_DIAGNOSTICO.md)  
**Status inicial:** pós-E0 / em implantação

| ID | Módulo | Requisito | Tela | Tabela | Etapa | Status |
|----|--------|-----------|------|--------|-------|--------|
| RF-A01 | M01 | Tokens `--hf-*`, logo, tipografia | Global | — | E2 | PARCIAL |
| RF-A02 | M02 | Home CTAs catálogo/veículo/cotação/parceiro/contato | `/` | — | E2 | PARCIAL |
| RF-A03 | M02 | Sobre + Atendimento com dados business.ts | `/sobre`, `/atendimento` | — | E2 | OK |
| RF-A04 | M02 | Política de privacidade | `/privacidade` | — | E2 | OK |
| RF-A05 | M03 | Cadastro produto 8 grupos | `/admin/produtos/:id` | products | E3 | OK |
| RF-A06 | M03 | Referências N tipadas | form + PDP | product_references | E3 | OK |
| RF-A07 | M03 | Imagens Storage | form + PDP | product_images | E3 | OK |
| RF-A08 | M03 | Draft/publish respeitados | admin + vitrine | products.status | E3 | OK |
| RF-A09 | M04 | Montadora/modelo/versão/motor/ano | `/admin/veiculos` | manufacturers, models, vehicle_versions | E4 | OK |
| RF-A10 | M04 | Vida de linha modelo (production_year_*) | admin veículos | models | E4 | OK |
| RF-A11 | M05 | PVC período year_start/end na UI | form + hub | product_vehicle_compatibility | E4 | OK |
| RF-A12 | M05 | Posição 3 eixos na aplicação | form + hub | PVC | E4 | OK |
| RF-A13 | M05 | validation_status app | form + hub | PVC | E4 | OK |
| RF-A14 | M05 | Hub global aplicações | `/admin/aplicacoes` | PVC | E4 | OK |
| RF-A15 | M06 | Busca 7 caminhos | catálogo/busca | search_products | E5 | PARCIAL |
| RF-A16 | M06 | search_products honra faixa PVC | RPC | search_products | E5 | OK |
| RF-A17 | M06 | Selos compatibilidade honestos | cards | — | E5 | OK |
| RF-A18 | M07 | PDP apps estruturadas + CTA cotação | `/produto/:id` | — | E5/E7 | OK |
| RF-A19 | M08 | CRUD campanhas sem preço | `/admin/campanhas` | campaigns | E6 | OK |
| RF-A20 | M08 | Campanhas ativas na home | `/` | campaigns | E6 | PARCIAL |
| RF-A21 | M09 | Cotação persistente multi-item | `/cotacao` | leads, lead_items | E7 | OK |
| RF-A22 | M10 | Leads admin status/notas | `/admin/leads` | leads | E7 | OK |
| RF-A23 | M11 | Seja parceiro sem auto-aprovação | `/seja-parceiro` | leads | E7 | OK |
| RF-A24 | M12 | Menu admin completo + dashboard real | `/admin` | — | E8 | PARCIAL |
| RF-A25 | M13 | Import histórico + não sobrescrever vazio | import hub | imports | E8 | PARCIAL |
| RF-A26 | M03/12 | Kits BOM sem preço | form + PDP | product_kit_components | E8 | OK |
| RF-A27 | M14 | RLS leads/campanhas/kits | — | — | E9 | PARCIAL |
| RF-A28 | M14 | Homologação Andar 1.1 | docs | — | E11 | AUSENTE |

Atualização: 2026-11-24 — alinhado ao runtime + smoke; seletor público de anos usa faixa PVC.
