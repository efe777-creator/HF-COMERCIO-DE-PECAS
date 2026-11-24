# HF — Sync catálogo a partir de fonte externa

**Script:** `scripts/sync-catalog-source-to-hf.mjs`  
**Regra:** leitura na fonte; escrita exclusiva no projeto HF. Sem preço público / checkout / orders.

A HF é produto independente. Este script só importa dados técnicos (veículos, produtos, apps, fotos) para validação/carga — não implica marca, regras comerciais nem identidade de terceiros.

## Env local (não versionar)

`.env.sync.local`:

```text
SOURCE_SUPABASE_URL=...
SOURCE_SERVICE_ROLE_KEY=...
HF_SUPABASE_URL=https://owllmfcpbodqmoerdfxx.supabase.co
HF_SERVICE_ROLE_KEY=...
```

Dry-run de inventário também funciona com chaves de leitura (RLS).

## Comandos

```bash
npm run sync:source:dry
npm run sync:source:apply
```

## Dry-run — 2026-11-24

| Tabela | Fonte | HF |
|--------|-------|-----|
| manufacturers | 26 | 9 |
| models | 128 | 76 |
| vehicle_versions | 326 | 186 |
| products | 101 | 49 (published; total MCP=52) |
| product_references | 13 | 0 |
| pvc | 732 | 383 |
| product_images | 101 | 0 |

Previsão: 49 SKU merge · 52 SKU novos.

### Apply

**Pendente** — exige service role em `.env.sync.local`.

## Fallback

1. Hub `/admin/produtos/importacoes`  
2. Fotos: `/admin/produtos/importar-imagens` (`SKU.jpg`)  
3. Vitrine lê `product_images` (placeholder se vazio)
