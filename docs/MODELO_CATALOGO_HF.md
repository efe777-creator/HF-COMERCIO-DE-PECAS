# Modelo de catálogo HF

## Conceitos independentes

| Conceito | Campo | MVP |
|----------|-------|-----|
| **catalog_visibility** | `products.status` = draft \| published \| archived | Ativo |
| **commercial_availability** | futuro | Off |
| **physical_inventory** | futuro | Off |
| **price** | futuro (não exibir no público) | Off |

```text
Produto
├── status                  → visibilidade no catálogo
├── commercial_availability → futuro
├── inventory_quantity      → futuro
└── price                   → futuro
```

**Proibido:** usar `is_available` como proxy de estoque + preço + comercialização.

## Produto (cadastro mestre)

- Código / SKU (identidade)
- Nome, descrição
- Marca (`product_brands`) ≠ Fornecedor (`suppliers`)
- Categoria / subcategoria
- Imagens
- Referências / OEM (`product_references`)
- Aplicações (`product_vehicle_compatibility` + year_start/year_end)
- Códigos de fornecedor (`supplier_products`)
- Status, slug, SEO

## Publicação

Somente `published` aparece no catálogo público.  
Importação cria em `draft` por padrão.
