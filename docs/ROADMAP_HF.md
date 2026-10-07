# ROADMAP HF (PRD B2B 1.0)

## Status

| Fase | Nome | Status |
|------|------|--------|
| 1 | Foundation (GitHub, Supabase, Auth, Storage, RLS, flags) | **Schema + buckets + RLS OK** |
| 2 | Catálogo (CRUD produtos/taxonomia) | Próxima (UI sobre schema) |
| 3 | Admin (dashboard, permissões, auditoria) | Parcial |
| 4 | Clientes (cadastro, login, grupos, aprovação) | Schema pronto; UI pendente |
| 5 | Catálogo personalizado (UI + regras) | Engine SQL pronta |
| 6 | Importação homologada | Motor FAL adaptado; validar no HF |
| 7 | Experiência B2B (busca/WhatsApp) | Parcial |
| 8–12 | Preços → Cotação → Pedidos → Estoque → Integrações | Flags off |

## GATE F1

- [x] Projeto Supabase HF com tabelas núcleo + B2B
- [x] RLS + `customer_can_see_product` + `search_products`
- [x] Buckets `product-images`, `logos`, `imports`
- [x] Feature flags PRD em `src/config/features.ts`
- [ ] UI admin clientes/catálogos (Fase 4–5)
- [ ] Staff user seed operacional
