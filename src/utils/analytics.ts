type GoatCounter = {
  count: (vars?: { path?: string; title?: string; event?: boolean; referrer?: string }) => void
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

function getPagePath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

/** Record a page view (needed for React Router navigations). */
export function trackPageview(path = getPagePath()): void {
  try {
    window.goatcounter?.count({ path })
  } catch {
    // Analytics should never break the app.
  }
}
