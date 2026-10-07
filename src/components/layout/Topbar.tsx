import { businessConfig } from '@/config/business'
import { Container } from './Container'

export function Topbar() {
  return (
    <div className="hidden bg-hf-bg text-[12px] text-hf-muted sm:block">
      <Container className="flex justify-between gap-3 border-b border-hf-line py-2">
        <span className="font-semibold text-hf-ink">{businessConfig.companyName}</span>
        <span>
          {businessConfig.eyebrow} · {businessConfig.hoursWeek}
        </span>
      </Container>
    </div>
  )
}
