import { useState, useEffect } from 'react'

/**
 * ✅ Optimized hook to detect mobile device
 * Memoizes the result since user agent doesn't change during session
 */
export function useIsMobileDevice() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // SSR safe: check if window exists before accessing navigator
    if (typeof window === 'undefined') return false
    // Prefer viewport width as primary signal and fall back to user-agent for older browsers
    const prefersSmall = window.matchMedia && window.matchMedia('(max-width: 768px)').matches
    if (prefersSmall) return true

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    // Treat classic mobile UAs as mobile, but do not classify tablets as mobile solely by UA
    return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  })

  useEffect(() => {
    // Optional: detect mobile via media query for real-time updates
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    // Ensure we update when viewport crosses the threshold
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
