'use client'

import { useSyncExternalStore } from 'react'

function subscribeResize(callback: () => void) {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function subscribeNoop(_callback: () => void) {
  return () => {}
}

/**
 * Hook seguro para detectar se estamos em mobile
 * Evita hydration mismatch retornando false no SSR
 */
export function useIsMobile(breakpoint = 768): boolean {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth < breakpoint,
    () => false
  )
}

/**
 * Hook para detectar se estamos no cliente (após hidratação)
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )
}
