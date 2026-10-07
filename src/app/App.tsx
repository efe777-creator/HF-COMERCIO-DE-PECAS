import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastProvider } from '@/components/common/Toast'
import { router } from '@/app/router'
import { RouterProvider } from 'react-router-dom'

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
