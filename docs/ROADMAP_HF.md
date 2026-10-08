# ROADMAP HF (plano oficial + PRD B2B 1.0)

## Blocos do plano de conversão

| Bloco | Etapas | Status |
|-------|--------|--------|
| 1 | Auditoria + cópia limpa | **Feito** |
| 2 | Supabase HF + Auth + Storage + RLS + RPCs | **Feito** (`owllmfcpbodqmoerdfxx`, `migrations_hf`) |
| 3 | Identidade + flags + WhatsApp env | **Feito** |
| 4 | Motor catálogo (status ≠ preço/estoque) | **Feito** |
| 5 | Admin + produto manual perfeito | **Feito** (`HF-DEMO-001`) |
| 6 | Import CSV/XLSX | **Feito** |
| 7 | Catálogo + busca + aplicações (sem placa) | **Feito** (B2B autenticado, sem preço) |
| 8 | Homologação | **Feito** — ver `HOMOLOGACAO_HF.md` |

## Fases PRD B2B

| Fase | Nome | Status |
|------|------|--------|
| 1 | Foundation | OK |
| 2 | Catálogo CRUD | OK |
| 3 | Admin / operadores | OK |
| 4–5 | Clientes / listas | OK |
| 6 | Importação | OK |
| 7 | Experiência B2B | OK |
| 8–12 | Preços públicos → pedidos → estoque | Flags **off** |

## GATE final

- [x] App independente; banco/auth/storage próprios
- [x] Migrations só do necessário (`migrations_hf`)
- [x] Catálogo + admin + import + RLS
- [x] Sem runtime comercial FAL (MP/checkout/pedidos)
- [x] FAL original intacto (somente leitura)
