import { useEffect, useState } from 'react'
import { db } from '../db'

export function youtubeId(url?: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/)
      if (m) return m[2]
    }
  } catch {
    /* URL inválida */
  }
  return null
}

export function hasVideo(ex: { videoUrl?: string; videoId?: string }) {
  return Boolean(ex.videoId || ex.videoUrl?.trim())
}

/** Mostra o vídeo do exercício: vídeo próprio salvo no aparelho, YouTube incorporado ou link externo */
export function Video({ videoUrl, videoId }: { videoUrl?: string; videoId?: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!videoId) return
    let url: string | null = null
    let alive = true
    db.videos.get(videoId).then((v) => {
      if (!alive || !v) return
      url = URL.createObjectURL(v.blob)
      setSrc(url)
    })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [videoId])

  if (videoId) {
    return src ? (
      <video className="video" src={src} controls playsInline loop muted />
    ) : (
      <div className="video video-empty">Carregando vídeo…</div>
    )
  }

  const yt = youtubeId(videoUrl)
  if (yt) {
    return (
      <div className="video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt}?playsinline=1&rel=0`}
          title="Vídeo do exercício"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (videoUrl?.trim()) {
    return (
      <a className="btn btn-ghost" href={videoUrl} target="_blank" rel="noreferrer">
        ▶ Abrir vídeo
      </a>
    )
  }
  return null
}
