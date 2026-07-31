import * as React from "react"

const MOBILE_BREAKPOINT = 768

const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(query).matches
}

/** The server has no viewport, so it renders the desktop layout. */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Reads the viewport as an external store rather than mirroring it into state
 * from an effect: no cascading render on mount, and no hydration mismatch.
 */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
