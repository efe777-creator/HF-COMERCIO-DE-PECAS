# PRD — Plataforma B2B HF Comércio de Peças (v1.0)

Documento mestre de produto. A plataforma é um ecossistema B2B proprietário (não marketplace, não só site institucional).

## MVP B2B (ligado)

Login, usuários, clientes, grupos, catálogo, produtos, categorias, marcas, aplicações, referências, imagens, busca, admin, importação, catálogo por cliente, publicação (`status`), controle de acesso, WhatsApp, auditoria, RLS.

## Desligado até fase própria

Preço público, estoque, carrinho, checkout, pagamento, frete, pedido, cotação automatizada, API de placa.

## Separação obrigatória

```text
IDENTIDADE ≠ CATÁLOGO ≠ ACESSO ≠ DISPONIBILIDADE COMERCIAL ≠ PREÇO ≠ ESTOQUE ≠ PEDIDO
```

Visibilidade: `products.status` + vínculo a `catalogs` (cliente/grupo). Não usar `is_available` como proxy triplo.

## Roadmap (fases)

1 Foundation — **em andamento / schema aplicado**  
2 Catálogo · 3 Admin · 4 Clientes · 5 Catálogo personalizado UI · 6 Importação · 7 Experiência B2B · 8 Preços · 9 Cotação · 10 Pedidos · 11 Estoque · 12 Integrações  

Ver também: `MODELO_B2B_HF.md`, `MODELO_CATALOGO_HF.md`, `ROADMAP_HF.md`.
