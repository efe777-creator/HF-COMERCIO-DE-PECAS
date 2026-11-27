# Modelo de dados — Andar 1 Catálogo Digital

**Versão:** 1.2  
**Data:** 2026-11-26  
**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md) v1.1  
**Jornada:** [HF_JORNADA_COMERCIAL_PLANO.md](./HF_JORNADA_COMERCIAL_PLANO.md)  
**SoT schema:** `supabase/migrations_hf/*.sql`  
**Auditoria:** [HF_AUDITORIA_TABELAS_RPCS.md](../../auditoria/runtime/HF_AUDITORIA_TABELAS_RPCS.md)

---

## 1. Princípios Andar 1

```text
status (visibilidade) ≠ preço ≠ estoque ≠ pedido
```

- Autoridade de schema = **migrations_hf** (não projeto de terceiros).  
- Import cria em **draft**.  
- IDs/SKU estáveis (prep IA e andares futuros).  
- Não criar orders/carts/inventory/deliveries neste andar.

---

## 2. Entidades em uso (subset)

### Identidade
`profiles` (+ roles staff)

### Produto
`products`, `product_categories`, `product_brands`, `product_images`, `product_references`

### Automotivo
`manufacturers`, `models`, `vehicle_versions`, `product_vehicle_compatibility`

### Fornecedor
`suppliers`, `supplier_products`

### Import
`imports`, `import_items`, `import_profiles` (+ RPCs `apply_*`)

### B2B (cadastro)
`customers` (+ `assigned_price_list_id`, endereço principal), `customer_addresses`, `customer_users`, `customer_groups`, `catalogs`, `catalog_products`, `customer_group_catalogs`, `customer_catalogs`, `customer_payment_conditions` (N:N; vazio = AVISTA hoje), `payment_conditions` (+ installments/methods)  
**Planejado (jornada):** `customers.default_seller_id` → `sellers` (FK); gate active multi-path — [HF_JORNADA_COMERCIAL_PLANO.md](./HF_JORNADA_COMERCIAL_PLANO.md) §12–§13

### Leads / cotação (em uso)
`leads` (`kind` quote\|partner\|contact; `status` new\|in_progress\|won\|lost\|spam), `lead_items`  
Migrations: `18_leads.sql` + políticas insert públicas (**preservar**)  
**Planejado:** `customer_id`, `recipient_seller_id`, `close_reason`, `closed_at`, `forwarded_at`, `rejected_*` (partner), `business_profile`, `interest`

### Comunicação (em uso)
`app_notifications`, `notification_deliveries`, catálogo de kinds (`access_*`, `quote_*`)  
**Planejado:** `request_*`, `access_rejected`, `quote_forwarded`, `quote_closed` + idempotência

### Vendedores (planejado — Andar 1 jornada)
`sellers` + view/RPC pública (`id`, `name`, `whatsapp`) — **≠** `profiles` operadores; soft-inactivate  

### Auditoria (planejado)
`commercial_events` leve — [HF_JORNADA_COMERCIAL_PLANO.md](./HF_JORNADA_COMERCIAL_PLANO.md) §16

### Preço (staff only)
`price_lists`, `price_list_items`, `price_change_history`

### Storage
Buckets: `product-images`, `logos`, `imports` (projeto HF)

---

## 3. RPCs relevantes

| RPC | Uso Andar 1 |
|-----|-------------|
| `search_products` | Busca vitrine |
| `apply_*` imports | Apply draft |
| `customer_can_see_product` / `current_customer_ids` | Prep B2B; loja gated = D1 |
| `resolve_product_price(s)` | PREP staff; vitrine off |

---

## 4. P0 — `customer_vehicles`

| Achado | UI `/conta/veiculos` + service referenciavam tabela ausente em migrations_hf |
|--------|-------------------------------------------------------------------------------|
| Correção | **`migrations_hf/12_customer_vehicles.sql`** (tabela + RLS + índice primary) |
| Aceite | Aplicar no Supabase HF + smoke `/conta/veiculos` |
| Status | Schema no repo **OK**; deploy DB = **APLICAR** |

**Não** trazer Garage rica / 3D da fonte de referência.

---

## 5. Correções de drift (dados/código)

| Item | Ação |
|------|------|
| `favorites` / favoriteService | Não criar tabela; remover serviço |
| `orders` via adminCustomerService | Não criar; isolar/remover |
| Address sem rota | Remover ou adiar |

---

## 6. Relação conceitual (catálogo)

```text
PRODUTO
  ├── categoria / marca peça / imagens / referências / fornecedores
  └── APLICAÇÕES → VEÍCULO (montadora/modelo/versão) + year_start/end
                 + posição (lateral/vertical/longitudinal) [Proposto]
                 + validação [Proposto]
```

### Evolução schema (Proposto — auditar PVC antes)

| Tema | Ação |
|------|------|
| Posições 3 eixos | Campos estruturados — não só texto livre |
| Validação de aplicação | status + fonte + responsável |
| Ano-modelo vs fabricação | Modelar sem quebrar busca |
| Leads | **Em uso** — ver §2; evoluir FKs jornada |
| Sellers | Nova entidade — ver jornada comercial |
| Campanhas | Entidade campanha↔produtos (P1) |

---

## 7. Fora do modelo Andar 1

Pedidos, itens, carrinhos, estoque/movimentos, entregas, ledger frete, agent_runs, favorites, composição de kits.
