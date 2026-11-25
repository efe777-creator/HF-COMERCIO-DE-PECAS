import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import {
  APLICACAO_SECTION_LABEL,
  APPS_EMPTY_LABEL,
  MAIS_APLICACOES_LABEL,
  MENOS_APLICACOES_LABEL,
} from '@/lib/productLabels'
import type { CompatibilityAppGroup } from '@/types'

export type CompatibilityAppsVariant = 'card' | 'pdp'

export const COMPAT_APPS_LINE_LIMIT: Record<CompatibilityAppsVariant, number> = {
  card: 2,
  pdp: 8,
}

export function countCompatibilityLines(groups: CompatibilityAppGroup[]): number {
  return groups.reduce((n, g) => n + g.lines.length, 0)
}

export function sliceCompatibilityGroups(
  groups: CompatibilityAppGroup[],
  limit: number,
): CompatibilityAppGroup[] {
  if (limit < 0) return []
  let remaining = limit
  const out: CompatibilityAppGroup[] = []
  for (const g of groups) {
    if (remaining <= 0) break
    const take = g.lines.slice(0, remaining)
    if (!take.length) continue
    out.push({ maker: g.maker, lines: take })
    remaining -= take.length
  }
  return out
}

export function prioritizeCompatibilityGroupsForVehicle(
  groups: CompatibilityAppGroup[],
  vehicle: { maker?: string | null; model?: string | null } | null | undefined,
): CompatibilityAppGroup[] {
  if (!groups.length) return groups
  const makerKey = normalizeEntityMatchKey(vehicle?.maker ?? '')
  const modelKey = normalizeEntityMatchKey(vehicle?.model ?? '')
  if (!makerKey && !modelKey) return groups

  const scored = groups.map((g, index) => {
    const gMaker = normalizeEntityMatchKey(g.maker)
    const makerMatch = Boolean(makerKey && gMaker === makerKey)
    let bestModel = false
    const lines = [...g.lines]
    if (modelKey) {
      lines.sort((a, b) => {
        const aHit = normalizeEntityMatchKey(a.model) === modelKey ? 0 : 1
        const bHit = normalizeEntityMatchKey(b.model) === modelKey ? 0 : 1
        return aHit - bHit
      })
      bestModel = lines.some((l) => normalizeEntityMatchKey(l.model) === modelKey)
    }
    const rank = makerMatch && bestModel ? 0 : makerMatch ? 1 : bestModel ? 2 : 3
    return { g: { maker: g.maker, lines }, rank, index }
  })

  scored.sort((a, b) => a.rank - b.rank || a.index - b.index)
  return scored.map((s) => s.g)
}

export function CompatibilityAppsBlock({
  groups,
  summary,
  className = '',
  variant = 'card',
  emptyLabel,
}: {
  groups?: CompatibilityAppGroup[] | null
  summary?: string | null
  className?: string
  variant?: CompatibilityAppsVariant
  emptyLabel?: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const limit = COMPAT_APPS_LINE_LIMIT[variant]
  const textSize = variant === 'card' ? 'text-xs' : 'text-sm'

  if (groups?.length) {
    const totalLines = countCompatibilityLines(groups)
    const hasMore = totalLines > limit
    const visible = expanded || !hasMore ? groups : sliceCompatibilityGroups(groups, limit)
    const hiddenCount = Math.max(0, totalLines - limit)

    return (
      <div className={`space-y-1 text-hf-ink ${textSize} ${className}`.trim()}>
        <p className="m-0 font-semibold text-hf-ink">{APLICACAO_SECTION_LABEL}</p>
        {visible.map((g, gi) => (
          <div key={`${gi}-${g.maker}`}>
            <p className="m-0 font-bold text-hf-ink">{g.maker}</p>
            <ul className="m-0 list-none space-y-0.5 p-0 text-hf-muted">
              {g.lines.map((line, li) => {
                const mid = [line.engine, line.version].filter(Boolean).join(' · ')
                return (
                  <li key={`${gi}-${li}`} className="grid grid-cols-[1fr_auto] gap-x-2">
                    <span className="min-w-0 truncate">
                      {line.model}
                      {mid ? ` ${mid}` : ''}
                    </span>
                    {line.yearLabel ? (
                      <span className="shrink-0 tabular-nums">{line.yearLabel}</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {hasMore ? (
          <Button
            type="button"
            variant={variant === 'card' ? 'light' : 'outline'}
            size="sm"
            className={[
              'mt-1 font-semibold',
              variant === 'card' ? 'w-full px-2 py-1 text-[11px]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-expanded={expanded}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
          >
            {expanded
              ? MENOS_APLICACOES_LABEL
              : variant === 'card'
                ? `${MAIS_APLICACOES_LABEL} (${hiddenCount})`
                : MAIS_APLICACOES_LABEL}
          </Button>
        ) : null}
      </div>
    )
  }

  if (summary) {
    const summaryLines = summary.split(' · ').filter(Boolean)
    const hasMore = variant === 'card' && summaryLines.length > COMPAT_APPS_LINE_LIMIT.card
    const shown =
      expanded || !hasMore
        ? summaryLines
        : summaryLines.slice(0, COMPAT_APPS_LINE_LIMIT.card)
    const hiddenCount = Math.max(0, summaryLines.length - COMPAT_APPS_LINE_LIMIT.card)
    return (
      <div className={`${textSize} ${className}`.trim()}>
        <p className="m-0 font-semibold text-hf-ink">{APLICACAO_SECTION_LABEL}</p>
        <ul className="mb-0 mt-1 list-none space-y-0.5 p-0 text-hf-ink">
          {shown.map((line, i) => (
            <li key={`${i}-${line}`} className="truncate">
              {line}
            </li>
          ))}
        </ul>
        {hasMore ? (
          <Button
            type="button"
            variant="light"
            size="sm"
            className="mt-1 w-full px-2 py-1 text-[11px] font-semibold"
            aria-expanded={expanded}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
          >
            {expanded
              ? MENOS_APLICACOES_LABEL
              : `${MAIS_APLICACOES_LABEL} (${hiddenCount})`}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <p className={`m-0 text-hf-muted ${textSize} ${className}`.trim()}>
      {emptyLabel?.trim() || APPS_EMPTY_LABEL}
    </p>
  )
}
