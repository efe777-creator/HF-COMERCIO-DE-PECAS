# HF — Padrão de telas, UX e operacionalização

**Versão:** 0.1  
**Data:** 2026-11-23  
**Status:** CANÔNICO (padrão operacional — **não** identidade visual)  
**Identidade / tokens HF:** [HF_IDENTIDADE_VISUAL.md](./HF_IDENTIDADE_VISUAL.md)  
**UX loja B2B:** [PRD_UX_B2B_1.0.md](../PRD_UX_B2B_1.0.md)  
**Referência metodológica de referência (somente leitura):** `FAL_PADRAO_TELAS_LAYOUT_DESIGN_*`, `FAL_PADRAO_ADAPTIVE_*`, `docs/entrada/UX.md`  
**Reuso:** [HF_REF_APROVEITAMENTO_DETALHADO.md](../auditoria/fonte/HF_REF_APROVEITAMENTO_DETALHADO.md) §14

---

## 0. Premissa inegociável

| Trazer da referência | **Não** trazer da referência |
|---------------|------------------------|
| Hierarquia de tela (lista + guia + ficha) | tokens de terceiros, palette de terceiros |
| Guias / split / vocabulário operacional | Logos, tipografia e copy de marca de terceiros |
| Densidade, estados, antiregressão de UX | Fluxos B2C (carrinho como venda principal) |
| Um shell admin; abas por responsabilidade | Segundo design system genérico (purple/cream AI) |
| Facilidade, usabilidade, intuitividade | Glow, multi-shadow, pills decorativos |

A HF mantém **originalidade visual** (dark + vermelho `--hf-*`, voz B2B distribuidora).  
O que se importa é o **padrão de trabalho** do operador e a **clareza** do cliente B2B.

---

## 1. Pilares HF (operacionais)

1. **Identidade visual só HF** — qualquer UI nova usa `--hf-*` / classes HF.  
2. **Um shell de trabalho no admin** — não inventar segundo “modo de tela” paralelo por módulo.  
3. **Hierarquia clara:** lista (primary) → guia (contexto rápido) → ficha completa (cadastro longo).  
4. **Primary sempre usável** — com guia aberta, a lista continua clicável/filtrável.  
5. **Vocabulário único** — mesmos termos em todos os hubs (ver §4).  
6. **Layout ≠ domínio** — mudar UX não altera RPCs, Sidicom, preço, pedido.  
7. **Estados explícitos** — loading / vazio / erro / sucesso em toda ação assíncrona.  
8. **Mobile-first na loja; densidade controlada no admin.**  
9. **Evolução versionada** — mudança de padrão UX = bump + checklist; sem “melhorar no escuro”.

---

## 2. Anatomia alvo — Admin HF (inspirada no adaptive de referência, visual HF)

Padrão a adotar progressivamente nos hubs admin (produtos, veículos, preços, clientes…):

```text
┌─────────────────────────────────────────────────────────────┐
│ Shell admin HF (nav + header sticky) — tokens --hf-*        │
├────────────────────────────┬────────────────────────────────┤
│ PRIMARY (lista)            │ GUIA / contextual (docked)     │
│ Filtros · busca · linhas   │ Detalhe rápido · ações leves   │
│ SEMPRE clicável            │ Empilhar guias (+ Guia)        │
│ compact | full             │ Fechar · arrastar largura      │
└────────────────────────────┴────────────────────────────────┘

Ficha completa (rota dedicada): abas — uma responsabilidade por aba
```

| Peça | Contrato HF |
|------|-------------|
| Primary | Lista + filtros; densidade compacta; chips de filtro ativos |
| Guia | Painel lateral/inferior: ver/editar leve sem sair da lista |
| Ficha full | `/admin/.../:id` com abas (ex.: Geral \| Mídia \| Aplicações \| …) |
| Prefs de layout | Só layout (largura/modo) — **não** gravar ID selecionado |
| Desktop | Split lista\|guia |
| Mobile / estreito | Guia em tela cheia; primary recuperável ao fechar |

**Vivo — hub Produtos:** `/admin/produtos` = lista + guia **full** (`AdaptiveWorkspace` + `GuideStackPanels` + `ProductWorkSurface`; prefs `hf-admin-workspace-v1` / `products`). Edição na guia: identidade, categoria, preços, aplicações, mídia, referências, kits usados. Ficha `/admin/produtos/:id` permanece para Novo e cadastro longo.  
**Vivo — hub Kits:** shell Adaptive (`kits`).  
**Vivo — Central de Finanças:** `/admin/financeiro` = menu (Visão geral · Condições · Entradas/Saídas/Ajustes em breve); condições em `/admin/financeiro/condicoes` (Adaptive: Identidade · Agenda · Meios · Disponibilidade · Simular + Liberar); sem ficha full nesta base.  
**Vivo — Clientes B2B:** `/admin/clientes` Adaptive (`customers`); guia Identidade · Contato · Endereço · Comercial (lista assigned + condições) · Acesso · Crédito (placeholder); BrasilAPI CNPJ + ViaCEP; ver `HF_CLIENTES_CADASTRO_PLANO.md`.  
**Vivo — Central de Comunicação:** `/admin/comunicacao` Adaptive (`comunicacao`); avisos in-app de acesso B2B + cotação; conta `/conta/avisos`; ver `HF_COMUNICACAO_PLANO.md`. WhatsApp Cloud fora deste ciclo.  
**Vivo — Central de Pedidos:** `/admin/pedidos` (menu Visão · Cotações · Pedidos/Logística em breve); fila Adaptive de cotações (`moduleKey=pedidos`); redirect `/admin/cotacoes`. Pedidos/checkout depois.  
**Vivo — Cesta de cotação:** `/cotacao` multi-item (localStorage); card/ficha “Adicionar à cotação”; romaneio `wa.me` após envio; ver `HF_COTACAO_CESTA_PLANO.md`.  
**Vivo — Preços:** `/admin/precos` Adaptive (hub + ficha).  
**Ainda a portar:** Veículos, Listas B2B de catálogo (visibilidade — distinto de lista de preço). **Não** copiar CSS/classes de terceiros.

### Anti-padrões (proibidos)

- Form “no meio da lista” permanente (dois painéis sem hierarquia).  
- Overlay que **bloqueia** cliques da lista.  
- Dois vocabulários para a mesma ação (“Abrir” vs “Ver detalhe” vs “Editar” misturados sem regra).  
- Cards só decorativos no admin.  
- Copiar `AdaptiveWorkspace` fonte sem re-skin HF e sem locks de teste.

---

## 3. Hierarquia de informação (loja + admin)

| Nível | Loja B2B | Admin |
|-------|----------|-------|
| 1 — Orientação | Header: logo, busca, conta | Nav módulos |
| 2 — Descoberta | 3 caminhos: busca · categoria · veículo | Hub lista + filtros |
| 3 — Decisão | Card → PDP | Linha → Guia |
| 4 — Ação | CTA WhatsApp / conta | Mutação leve na guia ou ficha full |
| 5 — Confirmação | Toast / empty + WA | Toast / estado dirty ao trocar registro |

**Loja — três caminhos (manter):** busca textual · categoria/marca · aplicação por veículo.  
Termo UI: **Montadora** (nunca “marca do carro”). Marca = marca da **peça**.

---

## 4. Vocabulário operacional HF (travar)

Adaptado do vocabulário fonte (guia), com copy B2B HF:

| Termo | Significado |
|-------|-------------|
| Abrir guia | Abre painel contextual do registro |
| Na guia | Registro já está no stack da guia |
| + Guia | Empilha outro registro com a guia já aberta |
| Fechar guia | Recolhe o contextual |
| Abrir cadastro | Vai para ficha completa (abas) |
| Mais filtros / Recolher filtros | Expansão do bloco de filtros do hub |
| Consultar esta peça | CTA PDP → WhatsApp (Fase 1) |
| Listas de preço | Label nav admin (staff); não “preços” solto na vitrine |
| Catálogo / Listas B2B | Listas de visibilidade cliente/grupo (não confundir com preço) |
| Finanças / Financeiro | Hub admin de **condições de pagamento** (agenda + meios ±); não é títulos/A/R (Andar 4) nem pedidos |

---

## 5. Ficha completa — abas por responsabilidade

Modelo (ajustar ao domínio HF; não copiar abas de kit/pay de referência sem necessidade):

| Domínio | Abas sugeridas |
|---------|----------------|
| Produto | Geral \| Mídia \| Aplicações \| Referências \| (Precificação staff) \| Fornecedor |
| Lista de preço | Produtos \| Formação \| Importações \| Configuração |
| Finanças (condição) | Identidade \| Agenda \| Meios \| Disponibilidade \| Simular (+ Liberar) |
| Cliente B2B | Dados \| Usuários \| Listas de catálogo \| Notas |
| Veículo (mestre) | Modelo \| Versões \| (Integrações futuras) |

Persistência de aba: `?tab=` na URL quando fizer sentido — não inventar storage paralelo.

---

## 6. Densidade e responsivo

| Contexto | Regra |
|----------|-------|
| Lista hub | Linhas compactas; badges de status; hint “Na guia” |
| Guia | Chrome fino; ações no topo; scroll interno |
| Full | Formulários longos; mídia; apps |
| Primary estreito | Usar **@container** (ou equivalente) — não só breakpoints de viewport; evitar KPI smash |
| Loja mobile | Busca e navegação claras; CTA WA acessível; sem checkout |

---

## 7. Estados de UI (obrigatórios)

| Estado | Comportamento |
|--------|----------------|
| Loading | Placeholder / spinner consistente |
| Vazio | Mensagem + próximo passo (ex.: WhatsApp / limpar filtros) |
| Erro | Mensagem acionável; sem falha silenciosa |
| Sucesso curto | Toast |
| Pending / suspended (B2B) | Mensagem + WA + Sair (já no PRD UX) |

Autorização de catálogo: **só backend/RLS** — UI não “esconde” o catálogo inteiro no client como segurança.

---

## 8. Loja HF — o que já é padrão (manter)

Shell atual (identidade HF):

```text
[LOGO HF] [Busca global] [Empresa | Minha conta]
Catálogo · Categorias · Marcas · Aplicações · Atendimento
```

- Home: hero + busca + 3 caminhos + categorias + destaques **sem preço** + WA.  
- PDP: **CONSULTAR ESTA PEÇA** (WA) — sem comprar/carrinho na Fase 1.  
- Tokens e voz: só `HF_IDENTIDADE_VISUAL` / `PRD_UX_B2B_1.0`.

**Não** importar da loja de referência: nav carrinho/pedidos como eixo, CTA amarelo navy, MobileNav com carrinho como venda principal.

---

## 9. Mapa de adoção admin (fases)

| Fase | Módulos HF | Padrão |
|------|------------|--------|
| Agora | **Produtos** lista+guia full vivo; demais hubs ainda lista+form | Shell Adaptive HF em Produtos |
| Próxima (UX admin) | Veículos → Preços → Clientes/Listas | Mesmo shell lista+guia HF |
| Depois | Imports hub, fornecedores | Mesmo shell; import full page quando pesado |
| Com Sidicom/Andar 2+ | Pedidos/estoque | Shell + vocabulário; SoT Sidicom |

Cada módulo novo no shell: `moduleKey` próprio, WorkSurface HF, prefs isoladas.

---

## 10. Evolução do padrão (método de referência, nome HF)

```text
Proposta UX → Changelog bump → Checklist §11 → Smoke VAL → merge
```

| Bump | Quando |
|------|--------|
| PATCH | Copy, densidade, polish sem mudar contratos |
| MINOR | Novo hub no shell, novo invariante |
| MAJOR | Quebra de shell/vocabulário — exige gate explícito |

**Meta:** testes de antiregressão UX (inspirados nos locks de referência) com IDs **HF-*** e asserts em tokens `--hf-*`, não tokens externos.

---

## 11. Checklist de excelência (cada marcha de UI HF)

- [ ] Spec: o que muda no comportamento (não só “deixar bonito”)  
- [ ] Só tokens `--hf-*` / componentes HF  
- [ ] Vocabulário §4 respeitado  
- [ ] Primary clicável com guia aberta (se shell Adaptive HF)  
- [ ] Estados loading/vazio/erro  
- [ ] Domínio intacto (RPCs, flags, Sidicom)  
- [ ] Smoke: Abrir guia → ação → Fechar → lista full  
- [ ] Aceite loja: `ACEITE_UX_B2B` se afetar storefront  
- [ ] Sem commit de identidade de terceiros  

---

## 12. Matriz rápida — fonte padrão → HF

| Padrão de referência | Trazer? | Como na HF |
|------------|---------|------------|
| Adaptive lista + guia | **Sim (comportamento)** | Reimplementar/portar shell com skin HF |
| PanelChrome / prefs layout | **Sim (ideia)** | Prefs `hf-admin-workspace-v*` |
| Vocabulário Abrir guia / + Guia | **Sim** | §4 |
| Abas por responsabilidade | **Sim** | §5 |
| @container densidade | **Sim** | §6 |
| Antiregress FL* | **Sim (método)** | Testes HF-* |
| Tokens --fonte-*, navy/yellow | **Não** | `--hf-*` |
| OrderOps / ME / pay UI | **Não** cego | Andares com Sidicom/frete grátis |
| MobileNav com carrinho | **Não** | WA / conta B2B |
| Cards hero / glow AI | **Não** | Identidade HF |

---

## 13. Próximos preenchimentos

- [ ] Extrair tipografia HF do CSS e fechar hierarquia display/body/mono SKU  
- [x] Spec / hub Adaptive HF Produtos (lista+guia full) vivo  

- [ ] Suite `hfUiLayoutAntiregress` (espelho método de referência)  
- [ ] Wireframes loja (mobile) alinhados a este padrão + identidade  

**Regra de ouro:** usabilidade da referência, cara da HF.
