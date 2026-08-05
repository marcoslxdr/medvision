"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Video,
} from "lucide-react"
import type { LiveEvent } from "@/lib/dashboard/events"
import { formatEventLabel } from "@/lib/dashboard/events"
import { normalizeVideoUrl, isVideoFile } from "@/lib/video/normalize"
import { useIsClient } from "@/lib/hooks/use-mobile"

interface LivePlayerProps {
  live: LiveEvent
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (remainder > 0) parts.push(`${remainder}m`)
  return parts.join(" ") || `${minutes}min`
}

export function LivePlayer({ live }: LivePlayerProps) {
  const isClient = useIsClient()
  
  const normalizedVideoUrl = normalizeVideoUrl(live.liveUrl)
  
  const withBunnyParams = (u?: string | null) => {
    if (!u) return u ?? null
    try {
      const url = new URL(u)
      if (url.hostname === "iframe.mediadelivery.net") {
        url.hostname = "player.mediadelivery.net"
      }
      url.searchParams.set("responsive", "true")
      url.searchParams.set("preload", "true")
      url.searchParams.set("autoplay", "false")
      url.searchParams.set("muted", "false")
      url.searchParams.set("loop", "false")
      return url.toString()
    } catch {
      return u
    }
  }

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsInstanceRef = useRef<any>(null)
  const isHlsStream = useMemo(() => {
    const u = normalizedVideoUrl ?? ""
    return u.toLowerCase().includes(".m3u8")
  }, [normalizedVideoUrl])

  useEffect(() => {
    if (!isHlsStream) {
      if (hlsInstanceRef.current) {
        try { hlsInstanceRef.current.destroy() } catch { }
        hlsInstanceRef.current = null
      }
      return
    }

    const video = videoRef.current
    if (!video || !normalizedVideoUrl) return

    const canNativePlay = video.canPlayType("application/vnd.apple.mpegurl")
    if (canNativePlay) {
      video.src = normalizedVideoUrl
      return
    }

    let cancelled = false
    const loadHls = async () => {
      if (typeof window === "undefined") return
      const existing = (window as any).Hls
      const bootstrap = async () => {
        if (existing) return existing
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("failed to load hls.js"))
          document.head.appendChild(script)
        })
        return (window as any).Hls
      }

      try {
        const HlsCtor = await bootstrap()
        if (cancelled || !HlsCtor) return
        const hls = new HlsCtor({ enableWorker: true })
        hls.attachMedia(video)
        hls.loadSource(normalizedVideoUrl)
        hlsInstanceRef.current = hls
      } catch { }
    }

    loadHls()

    return () => {
      cancelled = true
      if (hlsInstanceRef.current) {
        try { hlsInstanceRef.current.destroy() } catch { }
        hlsInstanceRef.current = null
      }
    }
  }, [isHlsStream, normalizedVideoUrl])

  return (
    <div className="flex min-h-full flex-col bg-[#0f172a]">
      {/* Header with back button */}
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-[#0f172a]/95 px-4 py-3 backdrop-blur lg:px-6">
        <Link
          href="/dashboard/cursos"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Meus Cursos
        </Link>
      </div>

      <div className="mx-auto w-full max-w-screen-xl p-4 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
          {/* Main Content Area */}
          <div className="flex flex-col gap-6">
            {/* Player */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black shadow-2xl">
              {normalizedVideoUrl ? (
                isVideoFile(normalizedVideoUrl) ? (
                  isHlsStream ? (
                    <video
                      ref={videoRef}
                      className="absolute inset-0 h-full w-full"
                      controls
                      controlsList="nodownload"
                      poster={live.thumbnail || undefined}
                    />
                  ) : (
                    <video
                      src={normalizedVideoUrl}
                      className="absolute inset-0 h-full w-full"
                      controls
                      controlsList="nodownload"
                      poster={live.thumbnail || undefined}
                    />
                  )
                ) : (
                  (() => {
                    const isBunny = (normalizedVideoUrl ?? "").includes("mediadelivery.net")
                    const src = isBunny ? withBunnyParams(normalizedVideoUrl) ?? normalizedVideoUrl : normalizedVideoUrl
                    return (
                      <iframe
                        src={src ?? ""}
                        loading="lazy"
                        title={live.title}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        style={{ border: 0 }}
                      />
                    )
                  })()
                )
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-900 text-slate-400">
                  {live.thumbnail ? (
                    <>
                      <Image
                        src={live.thumbnail}
                        alt={live.title}
                        fill
                        className="object-cover opacity-50"
                        unoptimized
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                         <div className="rounded-full bg-black/50 p-4 backdrop-blur-sm">
                            <Video className="h-8 w-8 text-white/70" />
                         </div>
                      </div>
                    </>
                  ) : (
                    <Video className="h-12 w-12 opacity-20" />
                  )}
                  <p className="relative z-10 font-medium text-white shadow-black drop-shadow-md">
                    Vídeo não disponível
                  </p>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">{live.title}</h1>
                <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{isClient ? formatEventLabel(live.startAt) : "..."}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(live.durationMinutes)}</span>
                  </div>
                </div>
              </div>
              
              {live.description && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Sobre a aula
                  </h3>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-300">
                    {live.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="flex flex-col gap-6">
            <Card className="border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Detalhes</h3>
              <div className="space-y-4">
                {live.instructorName && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Instrutor</p>
                      <p className="text-base text-white">{live.instructorName}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                   <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <Clock className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="text-sm font-medium text-slate-500">Duração</p>
                      <p className="text-base text-white">{formatDuration(live.durationMinutes)}</p>
                   </div>
                </div>
              </div>
            </Card>

            {/* Additional info or CTA could go here */}
          </div>
        </div>
      </div>
    </div>
  )
}







