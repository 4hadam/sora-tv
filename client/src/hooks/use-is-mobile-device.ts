import { useState, useEffect } from 'react'

/**
 * ✅ Optimized hook to detect mobile device
 * Memoizes the result since user agent doesn't change during session
 */
export function useIsMobileDevice() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // SSR safe: check if window exists before accessing navigator
    if (typeof window === 'undefined') return false
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  })

  useEffect(() => {
    // Optional: detect mobile via media query for real-time updates
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
