# Modelo B2B HF

## Separação obrigatória

```text
IDENTIDADE ≠ CATÁLOGO ≠ ACESSO ≠ DISPONIBILIDADE COMERCIAL ≠ PREÇO ≠ ESTOQUE ≠ PEDIDO
```

Visibilidade no MVP: `products.status` (draft|published|archived) + vínculo a catálogo do cliente/grupo.

## Entidades

```text
CUSTOMER_GROUPS
CUSTOMERS (pending|active|suspended|inactive)
CUSTOMER_USERS (profile ↔ customer)

CATALOGS
CATALOG_PRODUCTS (produto único, N listas)
CUSTOMER_CATALOGS
CUSTOMER_GROUP_CATALOGS
```

## Motor de visibilidade

```text
published?
  → customer ACTIVE?
  → produto em catálogo do cliente OU do grupo?
  → EXIBIR
```

Implementado em `customer_can_see_product` + RLS + `search_products`.

Staff (`is_staff`) vê tudo no admin.

## Flags

Ver `src/config/features.ts` — preço/estoque/cotação/pedidos desligados.
