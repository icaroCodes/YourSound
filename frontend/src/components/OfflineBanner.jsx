import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../lib/offline'

/**
 * Faixa fina no topo avisando que o app está offline.
 * O app continua funcionando com o catálogo e as músicas já baixadas.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 bg-amber-500/95 text-black text-xs font-semibold py-1.5 px-3 shadow-lg"
      style={{ paddingTop: 'calc(0.375rem + env(safe-area-inset-top, 0px))' }}
    >
      <WifiOff size={14} />
      <span>Você está offline — tocando apenas o que já foi baixado.</span>
    </div>
  )
}
