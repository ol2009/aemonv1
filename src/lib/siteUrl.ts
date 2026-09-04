export function publicSiteUrl() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  const browserOrigin = typeof window !== 'undefined' && window.location.protocol !== 'file:' ? window.location.origin : ''
  return (browserOrigin || configured || 'https://eamon.vercel.app').replace(/\/$/, '')
}

export function absoluteUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${publicSiteUrl()}${normalized}`
}
