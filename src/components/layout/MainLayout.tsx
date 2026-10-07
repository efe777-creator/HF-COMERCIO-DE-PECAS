import { Footer } from '@/components/layout/Footer'
import { Topbar } from '@/components/layout/Topbar'
import { Header } from '@/components/navigation/Header'
import { MobileNav } from '@/components/navigation/MobileNav'
import { ScrollToTop } from '@/components/navigation/ScrollToTop'
import { Outlet } from 'react-router-dom'

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Topbar />
      <Header />
      <main className="flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
    </div>
  )
}
