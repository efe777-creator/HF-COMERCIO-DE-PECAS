# Regras de importação HF

## Fluxo

```text
Arquivo CSV/XLSX → Upload → Mapeamento → Preview → Validação
→ Relatório de erros → Confirmação → Aplicação → Histórico
```

## Formato BR

- UTF-8
- Separador comum `;`

## Regras obrigatórias

1. Produto novo → `status = draft` (nunca publicar automaticamente)
2. SKU existente → **update parcial** (campos vazios não apagam dados)
3. SKU duplicado no arquivo → erro de validação
4. Marca ou categoria inexistente → **erro** (não auto-criar)
5. Não inventar aplicações, preços ou estoque

## Contratos existentes (adaptar)

- Import produtos: `apply_catalog_products_import`
- Import aplicações: `apply_catalog_applications_import`
- Bundle (legado “importar-hf”): transformar em import nativo do catálogo HF

## Fora do MVP

Import de custos, conversões comerciais, listas de preço e estoque.
