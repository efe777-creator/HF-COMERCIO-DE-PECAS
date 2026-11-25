# Revisão técnica Andar 1 — 2026-11-24

**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md) v1.1  
**Matriz:** [RASTREABILIDADE.md](./RASTREABILIDADE.md)

## Achados confrontados com código

| Tema | Evidência | Ação feita / status |
|------|-----------|---------------------|
| P0 `customer_vehicles` | Só em `supabase/migrations/` legado; service + `/conta/veiculos` vivos | **Migration** `migrations_hf/12_customer_vehicles.sql` |
| Favorites | `favoriteService` → tabela inexistente; sem imports | **Removido** service |
| adminCustomerService / orders | Referência `orders`; sem imports | **Removido** service |
| AdminPlaceholderPage | Sem rota | **Removido** |
| AddressForm | Sem imports de página | Mantido arquivo; sem rota (adiar Andar 2+) |
| D1 / catálogo | flag false + mig 08 | **Fechada** — published aberto; sem preço público (2026-11-24) |
| Preço público | `price_enabled: false` | OK RF-036 |
| Posições RF-011 | `products.posicao` + `lado` (produto); PVC sem eixos 3D | **GAP** — posição na app ainda Proposto |
| Ano-modelo RF-012 | `vehicle_versions.year` simples | GAP/P1 |
| Validação apps RF-014 | PVC sem status validação | GAP |
| Leads RF-017 | Sem tabela/módulo | GAP (WA processo ops) |
| Campanhas RF-025 | Home destaques; sem CRUD campanha | GAP/P1 |
| Placa | `vehicle_plate_enabled: false` | Fora Andar 1 OK |
| P0 DB | MCP `apply_migration` customer_vehicles | **OK** — RLS + 4 policies + índices |

## Migration P0 — aplicada

Projeto `owllmfcpbodqmoerdfxx` (sa-east-1), 2026-11-24.  
Verify: `rls_on=true`; policies `cvehicles_select/insert/update/delete_own`.

## Decisões pós-revisão (2026-11-24)

- **D5** opcional/adiado — fora do Gate 01.  
- **D6** Andar 2 = pedidos oficiais digitais no HF (sem Sidicom agora).  
- **D7** aberta: estoque/NF Sidicom/manual vs HF.

## Smoke P0 (2026-11-24)

| Check | Resultado |
|-------|-----------|
| `customer_vehicles` + RLS + 4 policies | OK (MCP) |
| `npm test` (55) + `npm run build` | OK — chunk `AccountVehiclesPage` |
| `/conta/veiculos` sem sessão | Redirect `/login` (ProtectedRoute) |
| CRUD com customer logado | **Pendente** (precisa conta `customer_users`) |

## Gate 01 — fechamento técnico (mesma data)

- Auditoria: [AUDITORIA_GATE01_2026-11-24.md](./AUDITORIA_GATE01_2026-11-24.md)  
- Fix: `migrations_hf/13_fix_handle_new_user_hf_b2b.sql` aplicada no projeto HF  
- Smoke A04 CRUD veículos: **OK**  
- Homologação v1.4: checklist preenchido; §5 aguarda assinatura do dono  

## Próximo

1. Assinatura formal Gate 01 (dono)  
2. Alinhar D7 → PRD Andar 2  
3. GAPs pós-Gate (posição PVC / leads / campanhas)  
4. D5 só sob demanda de integração  
5. Rotacionar contas smoke `gate01.*`  
