# migrations/ — LEGADO FAL (não aplicar no HF)

Esta pasta veio da cópia FAL e contém pedidos, pagamentos MP, frete, estoque, etc.

**Fonte de verdade do projeto HF:** `supabase/migrations_hf/`

Não rode `supabase db push` apontando para `migrations/` neste app.
Aplicar apenas os SQL de `migrations_hf/` (via MCP `apply_migration` ou processo documentado).
