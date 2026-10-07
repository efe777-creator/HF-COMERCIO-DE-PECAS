import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = join(
  process.cwd(),
  'supabase/migrations/20261007150000_apply_catalog_products_import.sql',
)
const withPosLado = join(
  process.cwd(),
  'supabase/migrations/20261007171000_products_import_posicao_lado.sql',
)
const schemaPosLado = join(
  process.cwd(),
  'supabase/migrations/20261007170000_products_posicao_lado.sql',
)

describe('apply_catalog_products_import — auditoria', () => {
  const sql = readFileSync(migration, 'utf8')
  const evolved = readFileSync(withPosLado, 'utf8')
  const schema = readFileSync(schemaPosLado, 'utf8')

  it('RPC + staff_can + grant', () => {
    expect(sql).toMatch(/apply_catalog_products_import/)
    expect(sql).toMatch(/staff_can_import_catalog/)
    expect(sql).toMatch(/grant execute on function public\.apply_catalog_products_import/i)
  })

  it('rejeita reapply e sem exception when others', () => {
    expect(sql).toMatch(/ja foi processada/)
    const loop = sql.slice(sql.indexOf('for r in'))
    expect(loop).not.toMatch(/exception\s+when\s+others/i)
  })

  it('cria hierarquia categoria/grupo/subgrupo e descricoes', () => {
    expect(sql).toMatch(/short_description/)
    expect(sql).toMatch(/product_categories/)
    expect(sql).toMatch(/parent_id/)
  })

  it('schema e RPC gravam posicao/lado', () => {
    expect(schema).toMatch(/posicao/)
    expect(schema).toMatch(/lado/)
    expect(evolved).toMatch(/posicao = v_posicao/)
    expect(evolved).toMatch(/lado = v_lado/)
  })
})
