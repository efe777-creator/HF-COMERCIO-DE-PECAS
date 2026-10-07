# ROADMAP HF (PRD B2B 1.0)

## Status

| Fase | Nome | Status |
|------|------|--------|
| 1 | Foundation (GitHub, Supabase, Auth, Storage, RLS, flags) | **Schema + buckets + RLS OK** |
| 2 | Catálogo (CRUD produtos/taxonomia) | **UI admin OK** (publicação sem preço) |
| 3 | Admin (dashboard, permissões) | **Parcial+** operadores RPC + dashboard B2B |
| 4 | Clientes (cadastro, grupos, aprovação) | **UI admin OK** + vínculo `customer_users` |
| 5 | Catálogo personalizado (listas) | **UI listas + associação** |
| 6 | Importação homologada | Motor FAL adaptado; validar no HF |
| 7 | Experiência B2B (busca/WhatsApp) | **Gate login + search B2B** |
| 8–12 | Preços → Cotação → Pedidos → Estoque → Integrações | Flags off |

## GATE F1

- [x] Projeto Supabase HF com tabelas núcleo + B2B
- [x] RLS + `customer_can_see_product` + `search_products`
- [x] Buckets `product-images`, `logos`, `imports`
- [x] Feature flags PRD em `src/config/features.ts`
- [x] UI admin clientes/catálogos (Fase 4–5)
- [x] Vínculo login ↔ cliente (`customer_users`)
- [x] `search_products` B2B + gate catálogo autenticado
- [ ] Staff user seed operacional
