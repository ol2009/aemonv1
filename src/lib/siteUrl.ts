export function publicSiteUrl() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  const fallback = typeof window === 'undefined' ? 'https://eamon-edu.pages.dev' : window.location.origin
  return (configured || fallback).replace(/\/$/, '')
}

export function absoluteUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${publicSiteUrl()}${normalized}`
}
