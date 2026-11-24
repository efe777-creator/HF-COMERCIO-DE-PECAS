# Modelo de dados — Andar 1 Catálogo Digital

**Versão:** 1.1  
**Data:** 2026-11-24  
**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md) v1.1  
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
`customers`, `customer_users`, `customer_groups`, `catalogs`, `catalog_products`, `customer_group_catalogs`, `customer_catalogs`

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
| Leads | Tabela mínima ou processo ops até existir |
| Campanhas | Entidade campanha↔produtos (P1) |

---

## 7. Fora do modelo Andar 1

Pedidos, itens, carrinhos, estoque/movimentos, entregas, ledger frete, agent_runs, favorites, composição de kits.
