import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = join(
  process.cwd(),
  'supabase/migrations_hf/06b_apply_catalog_products_import.sql',
)
const schema = join(process.cwd(), 'supabase/migrations_hf/02_catalog.sql')
const helpers = join(
  process.cwd(),
  'supabase/migrations_hf/06_import_pipeline_schema.sql',
)

describe('apply_catalog_products_import — auditoria (migrations_hf)', () => {
  const sql = readFileSync(migration, 'utf8')
  const catalog = readFileSync(schema, 'utf8')
  const pipe = readFileSync(helpers, 'utf8')

  it('RPC + staff_can + grant', () => {
    expect(sql).toMatch(/apply_catalog_products_import/)
    expect(sql).toMatch(/staff_can_import_catalog/)
    expect(sql).toMatch(/grant execute on function public\.apply_catalog_products_import/i)
    expect(pipe).toMatch(/staff_can_import_catalog/)
  })

  it('rejeita reapply e sem exception when others', () => {
    expect(sql).toMatch(/ja foi processada/)
    const loop = sql.slice(sql.indexOf('for r in'))
    expect(loop).not.toMatch(/exception\s+when\s+others/i)
  })

  it('não auto-cria categorias; resolve hierarquia existente e descricoes', () => {
    expect(sql).toMatch(/short_description/)
    expect(sql).toMatch(/product_categories/)
    expect(sql).toMatch(/parent_id/)
    expect(sql).toMatch(/nao cadastrada/)
    expect(sql).not.toMatch(/insert into public\.product_categories/i)
  })

  it('schema e RPC gravam posicao/lado', () => {
    expect(catalog).toMatch(/posicao/)
    expect(catalog).toMatch(/lado/)
    expect(sql).toMatch(/posicao = v_posicao/)
    expect(sql).toMatch(/lado = v_lado/)
  })
})
