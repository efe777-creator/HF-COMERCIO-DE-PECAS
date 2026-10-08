# Regras de importação HF

## Fluxo

```text
Arquivo CSV/XLSX → Upload → Mapeamento → Preview → Validação
→ Relatório de erros → Confirmação → Aplicação → Histórico
```

## Formato BR

- UTF-8 (moldes com BOM)
- Separador `;`

## Regras obrigatórias

1. Produto novo → `status = draft` (nunca publicar automaticamente)
2. SKU existente → **update parcial** (campos vazios não apagam dados)
3. SKU duplicado no arquivo → consolidado / validado conforme frente
4. Categoria, grupo, subgrupo ou montadora inexistente → **erro** (não auto-criar). Hierarquia igual ao Admin: **Categoria → Grupo → Subgrupo**. Escopo HF L1: Suspensão, Direção, Freios, Transmissão.
5. Aplicações não criam produto — SKU precisa existir
6. Preços/custos importados são **admin internos**; vitrine B2B não exibe preço

## RPCs (Supabase HF)

| Frente | Kind | RPC |
|--------|------|-----|
| Produtos | `catalog` | `apply_catalog_products_import` |
| Aplicações | `catalog_applications` | `apply_catalog_applications_import` |
| Conversões | `supplier_conversion` | `apply_supplier_conversion_import` |
| Custos | `supplier_cost` | `apply_supplier_cost_import` |
| Listas de preço | `price_list` | `apply_price_list_import` |

Bundle HF: preview client-side → cria imports de produtos e aplicações e chama as RPCs acima.

Fornecedor principal seed: `HF-SUP-01`.

Moldes: ver `docs/MOLDES_IMPORTACAO_HF.md` e hub `/admin/produtos/importacoes`.

## Fora do escopo (loja)

- Preço / estoque / carrinho na vitrine pública
- Import de clientes B2B, imagens ou estoque físico
- Auto-criar categorias/marcas na importação
