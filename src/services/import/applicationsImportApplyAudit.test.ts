import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = join(
  process.cwd(),
  'supabase/migrations_hf/23_apps_import_autocreate_product.sql',
)

describe('apply_catalog_applications_import — auditoria (migrations_hf)', () => {
  const sql = readFileSync(migration, 'utf8')

  it('define RPC com staff_can_import_catalog + grant authenticated', () => {
    expect(sql).toMatch(/create or replace function public\.apply_catalog_applications_import/)
    expect(sql).toMatch(/staff_can_import_catalog\(\)/)
    expect(sql).toMatch(
      /grant execute on function public\.apply_catalog_applications_import\(uuid\) to authenticated/i,
    )
    expect(sql).toMatch(/revoke all on function public\.apply_catalog_applications_import/i)
  })

  it('rejeita reapply do mesmo import_id (nivel A)', () => {
    expect(sql).toMatch(/status in \('done', 'importing', 'failed'\)/)
    expect(sql).toMatch(/ja foi processada/)
  })

  it('pode criar produto rascunho e grava engine da motorizacao', () => {
    expect(sql).toMatch(/insert into public\.products/i)
    expect(sql).toMatch(/create_product/)
    expect(sql).toMatch(/v_motorizacao/)
    expect(sql).toMatch(/v_created_products/)
  })

  it('kind catalog_applications + soft-fail por linha', () => {
    expect(sql).toMatch(/catalog_applications/)
    expect(sql).toMatch(/exception\s+when\s+others/i)
  })
})
