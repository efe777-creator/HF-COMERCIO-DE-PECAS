# Aceite UX B2B (§95–98)

## Smoke manual

1. **Login** → redireciona ao catálogo; header mostra empresa quando ACTIVE.
2. **Busca / filtros / sidebar** → `/busca`, `/categoria/:slug`, `/marca/:slug` sem preço.
3. **PDP** → “Consultar esta peça” (WhatsApp) + tabelas de aplicações/referências.
4. **Visitante** → `/catalogo` redireciona login; pending/suspended → mensagem + WA + Sair.

## Seed B2B (§99)

Bloqueado se não houver 2 clientes/catálogos distintos. Com seed: validar RLS (cliente A não vê lista B).

Produto demo: `HF-DEMO-001` (published).

## Automático

- `npm test`
- `npm run build`
