# HF — Veículo, Produto e Aplicação (SoT operacional)

**Escopo:** admin Catálogo · Sem FAL  
**Padrão mental**

1. **Veículo** — entidade com cadastro próprio (todas as identificações).
2. **Produto** — entidade com cadastro próprio.
3. **Aplicação** — vínculo: em qual **versão · motor · período** o produto serve (escolhe do cadastro do veículo).

## Rotas

| Papel | Path |
|-------|------|
| Montadoras (do veículo) | `/admin/montadoras` (acesso via hub Veículos) |
| Cadastro do veículo | `/admin/veiculos` |
| Cadastro do produto | `/admin/produtos` |
| Aplicações (vínculo) | só na ficha `/admin/produtos/:id` (seção Aplicações) |

## Hierarquia no cadastro do veículo

`Montadora → Modelo → Versão → Motor → Período`  
(+ **Geração** / **Combustível** só se o modelo precisar)

| Campo | Papel | Quando preencher |
|-------|--------|------------------|
| Versão | Trim (1 nome por linha) | Sempre que existir |
| Motor | Identificação **curta** (`1.0`, `1.0 Turbo`, `1.6`) | Sempre que existir |
| Período (veículo) | Anos dessa combinação no mercado | Sempre (fim vazio = vigente) |
| Geração | Facelift / geração | Só se discriminar |
| Combustível | Flex / Diesel… | Só se o mesmo motor existir em combustíveis diferentes |

**1 config** = 1 Versão + 1 Motor + 1 Período (+ opcionais). Não juntar trims com `/`.

**Modelo ≠ versão:** `HB20`, `HB20X`, `HB20S` etc. são **modelos separados** na montadora. Não cadastrar HB20X como versão dentro do HB20.

## Dois períodos

| Período | Onde | Significado |
|---------|------|-------------|
| **A — veículo** | Config em Veículos (`year_start` / `year_end`) | Anos em que aquela versão+motor existiu |
| **B — aplicação** | Linha PVC na ficha do produto | Anos em que **a peça** serve naquele recorte |

Não misturar A e B na mesma frase de UI.

## Glossário

| Usar | Evitar |
|------|--------|
| Motor | Motorização (admin) |
| Aplicação (vínculo) | “PVC” na UI do operador |
| Config / identificação do veículo | Chamar de “aplicação” |
| Vincular aplicação | Vincular configuração |

## Jornada operador

1. Montadora → Modelo (fab) em **Veículos**
2. Cadastrar configs: Versão → Motor → Período (+ opcionais)
3. No **Produto**, abrir seção Aplicações e vincular: versão → motor → período da peça  
   (não há tela índice separada — `/admin/aplicacoes` redireciona para Produtos)

Copy canônica de cascata: `src/lib/pvcVehicleCascade.ts` (`PVC_CASCADE_HINT`, `formatVehicleIdentity`).
