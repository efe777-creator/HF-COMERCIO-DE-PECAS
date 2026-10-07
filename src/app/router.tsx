import { MainLayout } from '@/components/layout/MainLayout'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { StaffRoute } from '@/app/StaffRoute'
import { features } from '@/config/features'
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Loading } from '@/components/common/Loading'

const HomePage = lazy(() =>
  import('@/pages/Home/HomePage').then((m) => ({ default: m.HomePage })),
)
const CatalogPage = lazy(() =>
  import('@/pages/Catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })),
)
const ProductPage = lazy(() =>
  import('@/pages/Product/ProductPage').then((m) => ({ default: m.ProductPage })),
)
const VehiclePage = lazy(() =>
  import('@/pages/Vehicle/VehiclePage').then((m) => ({ default: m.VehiclePage })),
)
const AccountLayout = lazy(() =>
  import('@/components/account/AccountLayout').then((m) => ({ default: m.AccountLayout })),
)
const AccountHomePage = lazy(() =>
  import('@/pages/Account/AccountHomePage').then((m) => ({ default: m.AccountHomePage })),
)
const AccountProfilePage = lazy(() =>
  import('@/pages/Account/AccountProfilePage').then((m) => ({ default: m.AccountProfilePage })),
)
const AccountVehiclesPage = lazy(() =>
  import('@/pages/Account/AccountVehiclesPage').then((m) => ({ default: m.AccountVehiclesPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/Login/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/Register/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPassword/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
)

const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminCategoriesPage = lazy(() =>
  import('@/pages/admin/categories/AdminCategoriesPage').then((m) => ({
    default: m.AdminCategoriesPage,
  })),
)
const AdminManufacturersPage = lazy(() =>
  import('@/pages/admin/manufacturers/AdminManufacturersPage').then((m) => ({
    default: m.AdminManufacturersPage,
  })),
)
const AdminVehiclesPage = lazy(() =>
  import('@/pages/admin/vehicles/AdminVehiclesPage').then((m) => ({
    default: m.AdminVehiclesPage,
  })),
)
const AdminBrandsPage = lazy(() =>
  import('@/pages/admin/brands/AdminBrandsPage').then((m) => ({ default: m.AdminBrandsPage })),
)
const AdminSuppliersPage = lazy(() =>
  import('@/pages/admin/suppliers/AdminSuppliersPage').then((m) => ({
    default: m.AdminSuppliersPage,
  })),
)
const AdminProductsPage = lazy(() =>
  import('@/pages/admin/products/AdminProductsPage').then((m) => ({
    default: m.AdminProductsPage,
  })),
)
const AdminProductFormPage = lazy(() =>
  import('@/pages/admin/products/AdminProductFormPage').then((m) => ({
    default: m.AdminProductFormPage,
  })),
)
const AdminProductImportPage = lazy(() =>
  import('@/pages/admin/products/AdminProductImportPage').then((m) => ({
    default: m.AdminProductImportPage,
  })),
)
const AdminApplicationsImportPage = lazy(() =>
  import('@/pages/admin/products/AdminApplicationsImportPage').then((m) => ({
    default: m.AdminApplicationsImportPage,
  })),
)
const AdminHfBundleImportPage = lazy(() =>
  import('@/pages/admin/products/AdminHfBundleImportPage').then((m) => ({
    default: m.AdminHfBundleImportPage,
  })),
)
const AdminOperatorsPage = lazy(() =>
  import('@/pages/admin/operators/AdminOperatorsPage').then((m) => ({
    default: m.AdminOperatorsPage,
  })),
)

function Suspend({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

function AdminSuspend({ children }: { children: ReactNode }) {
  return (
    <StaffRoute>
      <Suspend>{children}</Suspend>
    </StaffRoute>
  )
}

const adminChildren = [
  { index: true, element: <AdminDashboardPage /> },
  { path: 'produtos', element: <AdminProductsPage /> },
  { path: 'produtos/importar', element: <AdminProductImportPage /> },
  { path: 'produtos/importar-aplicacoes', element: <AdminApplicationsImportPage /> },
  { path: 'produtos/importar-hf', element: <AdminHfBundleImportPage /> },
  { path: 'produtos/novo', element: <AdminProductFormPage /> },
  { path: 'produtos/:id', element: <AdminProductFormPage /> },
  { path: 'categorias', element: <AdminCategoriesPage /> },
  { path: 'montadoras', element: <AdminManufacturersPage /> },
  { path: 'veiculos', element: <AdminVehiclesPage /> },
  { path: 'fabricantes', element: <AdminBrandsPage /> },
  { path: 'fornecedores', element: <AdminSuppliersPage /> },
  { path: 'operadores', element: <AdminOperatorsPage /> },
]

const publicChildren = [
  {
    index: true,
    element: (
      <Suspend>
        <HomePage />
      </Suspend>
    ),
  },
  {
    path: 'catalogo',
    element: (
      <Suspend>
        <CatalogPage />
      </Suspend>
    ),
  },
  {
    path: 'produto/:id',
    element: (
      <Suspend>
        <ProductPage />
      </Suspend>
    ),
  },
  {
    path: 'veiculo',
    element: (
      <Suspend>
        <VehiclePage />
      </Suspend>
    ),
  },
  {
    path: 'conta',
    element: (
      <Suspend>
        <ProtectedRoute>
          <AccountLayout />
        </ProtectedRoute>
      </Suspend>
    ),
    children: [
      { index: true, element: <AccountHomePage /> },
      { path: 'perfil', element: <AccountProfilePage /> },
      { path: 'veiculos', element: <AccountVehiclesPage /> },
    ],
  },
  {
    path: 'login',
    element: (
      <Suspend>
        <LoginPage />
      </Suspend>
    ),
  },
  {
    path: 'cadastro',
    element: (
      <Suspend>
        <RegisterPage />
      </Suspend>
    ),
  },
  {
    path: 'recuperar-senha',
    element: (
      <Suspend>
        <ForgotPasswordPage />
      </Suspend>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

// Rotas comerciais só entram no router se a flag estiver ligada (MVP = off).
void features

export const router = createBrowserRouter([
  {
    path: '/admin',
    element: (
      <AdminSuspend>
        <AdminLayout />
      </AdminSuspend>
    ),
    children: adminChildren,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: publicChildren,
  },
])
