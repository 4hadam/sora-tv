import { lazy, Suspense, ReactNode } from 'react'

// ✅ Lazy load heavy components
const LazyGlobeViewer = lazy(() => import('./globe-viewer'))
const LazySidebar = lazy(() => import('./country-sidebar'))
const LazyCountryDetail = lazy(() => import('./country-detail'))
const LazyCategorySidebar = lazy(() => import('./CategorySidebar'))

// ✅ Loading fallback component
function ComponentLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black/20">
      <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
    </div>
  )
}

interface LazyComponentProps {
  children: ReactNode
}

export function GlobeViewerWithFallback({ children }: LazyComponentProps) {
  return (
    <Suspense fallback={<ComponentLoader />}>
      {children}
    </Suspense>
  )
}

export function CountrySidebarWithFallback({ children }: LazyComponentProps) {
  return (
    <Suspense fallback={<ComponentLoader />}>
      {children}
    </Suspense>
  )
}

export function CountryDetailWithFallback({ children }: LazyComponentProps) {
  return (
    <Suspense fallback={<ComponentLoader />}>
      {children}
    </Suspense>
  )
}

export function CategorySidebarWithFallback({ children }: LazyComponentProps) {
  return (
    <Suspense fallback={<ComponentLoader />}>
      {children}
    </Suspense>
  )
}

export {
  LazyGlobeViewer,
  LazySidebar,
  LazyCountryDetail,
  LazyCategorySidebar,
}