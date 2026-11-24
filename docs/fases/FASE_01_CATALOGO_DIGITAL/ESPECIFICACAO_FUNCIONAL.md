# Especificação funcional — Andar 1 Catálogo Digital

**Versão:** 1.1  
**Data:** 2026-11-24  
**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md) v1.1  
**Mapa:** [MAPA_DE_TELAS.md](./MAPA_DE_TELAS.md)

---

## 1. Jornada visitante / B2B

### 1.1 Home `/`

| Item | Comportamento |
|------|---------------|
| Objetivo | Apresentar HF e caminho rápido para peça |
| Conteúdo | Hero HF, busca, caminhos (catálogo/categorias/marcas/veículo), CTA WA |
| Preço | Não exibir |
| Pós-ação | Navegar ao catálogo ou WA |

### 1.2 Catálogo `/catalogo` · `/busca`

| Item | Comportamento |
|------|---------------|
| Listagem | Produtos `published` (política D1) |
| Busca | Texto → RPC `search_products` |
| Filtros | Categoria, marca, demais disponíveis |
| Card | Nome, código, marca, imagem; sem preço; link PDP |
| Vazio | Mensagem clara + sugestão WA |

### 1.3 Categoria / marca

`/categoria/:slug`, `/categorias`, `/marca/:slug`, `/marcas` — listagem filtrada; índice quando aplicável.

### 1.4 PDP `/produto/:id`

| Bloco | Comportamento |
|-------|---------------|
| Identidade | Nome, SKU/código HF, marca, categoria |
| Mídia | Imagens |
| Referências | Tabela por tipo |
| Aplicações | Veículos + período (+ posição se houver) |
| CTA | **CONSULTAR ESTA PEÇA** → WhatsApp (env) com contexto da peça |
| Proibido | Comprar, carrinho, preço público, estoque live |

### 1.5 Veículo `/veiculo`

Cascata montadora → modelo → versão → listagem de peças compatíveis. Sem placa obrigatória.

### 1.6 Sobre / Atendimento

Copy alinhada ao site: parceria, competitividade, identificação, variedade, horários, endereço, e-mail, WA.

### 1.7 Auth públicas

`/login`, `/cadastro`, `/recuperar-senha` — e-mail/senha; redirects Hostinger/projeto HF.

### 1.8 Conta

`/conta`, `/conta/perfil` — resumo e perfil.  
`/conta/veiculos` — **somente** se `customer_vehicles` existir com RLS; senão rota desligada ou mensagem de indisponível (P0).

---

## 2. Jornada staff (admin)

### 2.1 Acesso

StaffRoute: não-staff redireciona. Bootstrap operadores documentado.

### 2.2 Produtos

Lista → novo/editar: dados mestres, imagens, refs, PVC, status draft/published/archived. Publish consciente.

### 2.3 Taxonomia e veículos

Categorias (árvore), fabricantes (marca peça), montadoras, modelos/versões.

### 2.4 Importações

Hub → import produtos / aplicações / bundle HF / conversões / custos.  
Fluxo: upload → preview → validação → apply → erros → histórico. Default draft.

### 2.5 Fornecedores

CRUD + vínculo códigos/custos via import quando houver.

### 2.6 Preços (staff)

Listas e itens — **não** ligar na vitrine (`price_enabled=false`).

### 2.7 B2B cadastro

Clientes (CNPJ, status), grupos, listas/catálogos. Loja gated = D1.

### 2.8 Operadores

Roles staff; menor privilégio.

---

## 3. WhatsApp / leads

1. Número apenas de `VITE_WHATSAPP_NUMBER`.  
2. Do PDP: preferir mensagem com código/nome da peça.  
3. Atendimento/home: mensagem genérica institucional.  
4. Equipe HF atende fora do app (**humano / WhatsApp / ops**). Pedido oficial digital = Andar 2 (HF); Sidicom não é pré-requisito do Andar 1.  
5. Registro formal de lead no sistema = **Proposto** / **WAIVER_POS_GATE**. No Gate 01 o processo ops mínimo é: cotação/lead = WhatsApp + atendimento humano.

---

## 4. Estados e erros

| Situação | Comportamento |
|----------|---------------|
| Sem resultados busca | Empty state + WA |
| Produto draft | Não na vitrine |
| Sem WA env | Não inventar número; ocultar/desabilitar CTA com aviso staff |
| Falha import | Relatório de erros; não publish automático |
| Conta veículos sem tabela | Não 500 silencioso — corrigir P0 |

---

## 5. Aplicações e posições (Proposto)

Na admin e no PDP, preferir atributos estruturados (lateral / vertical / longitudinal) e combinar na UI (“dianteiro esquerdo”).  
Faixa `year_start`/`year_end` da aplicação é soberana.  
Vitrine: apenas aplicações com validação publicável (quando política RF-014 estiver ligada).

## 6. Leads (CRM lite)

Registrar origem, contato, produto/veículo de interesse quando houver, status e próximo passo.  
Não confundir lead com cliente aprovado nem com pedido confirmado.

## 7. Fora desta especificação

Carrinho, checkout, pagamento, estoque, frete API, NF, agentes, placa obrigatória, kits completos.
