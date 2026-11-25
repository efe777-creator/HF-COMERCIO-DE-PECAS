# HF — Auditoria admin: hierarquia, telas e redundâncias

**Data:** 2026-11-24  
**Escopo:** só HF. FAL não alterado.  
**Foco:** Andar 1 (prédio sem duplicidade).

## Hierarquia operacional (SoT)

1. **Categorias** — Categoria → Grupo → Subgrupo  
2. **Veículos** — Montadora → Modelo (fab início/fim) → Config (motor / combustível / versão)  
3. **Produto** — cadastro + taxonomia + lado/posição + marca/fornecedor (**1×1** Andar 1)  
4. **Aplicações (PVC)** — período peça ↔ configuração; edição na **ficha do produto**  
5. **Fornecedores / import** — códigos e custo (imports só pelo hub)  
6. **Listas de preço** — custo → markup/margem → venda (1 preço por SKU na lista)  
7. **Listas B2B** — conjuntos de produtos para cliente (**não** é preço); nav sob **Clientes**

## Nav Andar 1 (prédio alvo)

```text
Catálogo: Produtos · Kits · Importações · Categorias · Veículos · Aplicações · Fornecedores · Listas de preço
Clientes: Clientes B2B · Grupos
Comercial / Sistema: inalterados
```

**Fora do sidebar (deep-link / aninhado):**

- Montadoras → só via Veículos (`/admin/montadoras`)  
- Marcas (peça) → só via Produtos (`/admin/produtos/marcas`; redirect de `/admin/fabricantes`)  
- Listas B2B → só via Clientes (`/admin/clientes/listas`; redirect de `/admin/listas`)

## Matriz tela × decisão

| Tela | Rota | Papel | Decisão Andar 1 |
|------|------|-------|-----------------|
| Produtos | `/admin/produtos` | Lista itens + ficha | Manter; botão Marcas |
| Marcas (peça) | `/admin/produtos/marcas` | CRUD `product_brands` | Nested em Produtos; **sem** menu |
| Kits | `/admin/kits` | Hub BOM | Manter (`HF_KITS_PLANO`) |
| Importações (hub) | `/admin/produtos/importacoes` | Entrada única | Manter; CTAs só aqui |
| Categorias | `/admin/categorias` | Árvore 3 níveis | Manter |
| Veículos | `/admin/veiculos` | Modelos + configs | Manter; entrada Montadoras |
| Montadoras | `/admin/montadoras` | Fabricante do veículo | Deep-link; **sem** menu |
| Aplicações PVC | `/admin/aplicacoes` | Índice RO | Manter; editar na ficha |
| Fornecedores | `/admin/fornecedores` | Cadastro | Manter; imports só hub |
| Listas de preço | `/admin/precos` | Formação staff | Manter em Catálogo |
| Listas B2B | `/admin/clientes/listas` | Visibilidade | Nested em Clientes; **sem** menu |
| Cotações / Leads | `/admin/cotacoes`, `/admin/leads` | Inbox | Só copy |

## Andar 2 (fora do código Andar 1)

| Tema | Nota |
|------|------|
| Produto × marca × qtd × lista | Mesmo item lógico, marcas distintas, preço na lista conforme entrada e saldo de cada marca |
| Schema | Ofertas (`product_offers` ou equivalente) — **não** no Andar 1 |

## Gaps (documentados)

| ID | Gap | Andar |
|----|-----|-------|
| G1 | 1 item × N marcas (código + valor + estoque/qtd) | **2** |
| G2 | Peças equivalentes | Futuro |
| G3 | Gerações de veículo | Futuro |
| G4 | Lista de preço por fornecedor | Futuro |
| G5 | `inventory_enabled` | Futuro |

## Correções Andar 1 (código)

- Sidebar sem Montadoras/Marcas soltas; Listas B2B em Clientes  
- Marcas nested em Produtos; Montadoras só via Veículos  
- Imports: um caminho (hub)  
- Preços overview = gestão; detalhe = itens/formação; glossário vs B2B  
- Kits hub vivo (sync PRD)  
