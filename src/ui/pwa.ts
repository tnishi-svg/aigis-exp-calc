import { useEffect, useState } from 'react'

// 新しい Service Worker が待機に入ったら waiting を返す。reload() で切り替えて再読み込みする
export function useServiceWorkerUpdate(): { waiting: ServiceWorker | null; reload: () => void } {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting)
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker)
          })
        })
      })
      .catch(() => {
        // 登録できなくてもアプリ自体は動く
      })
  }, [])

  return { waiting, reload: () => waiting?.postMessage('SKIP_WAITING') }
}
