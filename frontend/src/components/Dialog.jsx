import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useDialogStore } from '../store/useDialogStore'

const icons = {
  error: { Icon: AlertTriangle, bg: 'bg-red-500/10', color: 'text-red-400' },
  warning: { Icon: AlertTriangle, bg: 'bg-amber-500/10', color: 'text-amber-400' },
  success: { Icon: CheckCircle, bg: 'bg-[#1ED45E]/10', color: 'text-[#1ED45E]' },
  info: { Icon: Info, bg: 'bg-white/5', color: 'text-zinc-400' },
}

export default function Dialog() {
  const { dialog, close } = useDialogStore()

  // Fechar com Escape
  useEffect(() => {
    if (!dialog) return
    const handler = (e) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dialog, close])

  // Bloquear scroll do body quando aberto
  useEffect(() => {
    if (dialog) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [dialog])

  const iconConfig = icons[dialog?.icon] || icons.info
  const { Icon } = iconConfig

  return createPortal(
    <AnimatePresence>
      {dialog && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm"
            onClick={() => dialog.type === 'alert' && close(false)}
          />

          {/* Card */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.8 }}
            className="fixed inset-0 z-[501] flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-zinc-900/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 w-full max-w-[340px] pointer-events-auto overflow-hidden">

              {/* Body */}
              <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center gap-3">

                {/* Ícone — só mostra se tiver título ou for destructive */}
                {(dialog.title || (dialog.type === 'confirm' && dialog.destructive)) && (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.06, type: 'spring', damping: 20, stiffness: 300 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
                      dialog.destructive ? 'bg-red-500/10' : iconConfig.bg
                    }`}
                  >
                    <Icon
                      size={22}
                      className={dialog.destructive ? 'text-red-400' : iconConfig.color}
                    />
                  </motion.div>
                )}

                {/* Título */}
                {dialog.title && (
                  <h2 className="text-white font-semibold text-[15px] leading-snug">
                    {dialog.title}
                  </h2>
                )}

                {/* Mensagem */}
                <p className={`text-sm leading-relaxed ${dialog.title ? 'text-zinc-400' : 'text-zinc-300'}`}>
                  {dialog.message}
                </p>
              </div>

              {/* Divisor */}
              <div className="h-px bg-white/[0.06]" />

              {/* Botões */}
              {dialog.type === 'alert' ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => close(true)}
                  className="w-full py-3.5 text-sm font-semibold text-[#1ED45E] hover:bg-white/[0.04] transition-colors rounded-b-2xl"
                >
                  OK
                </motion.button>
              ) : (
                <div className="flex">
                  {/* Cancelar */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => close(false)}
                    className="flex-1 py-3.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors rounded-bl-2xl border-r border-white/[0.06]"
                  >
                    {dialog.cancelText || 'Cancelar'}
                  </motion.button>

                  {/* Confirmar */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => close(true)}
                    className={`flex-1 py-3.5 text-sm font-semibold transition-colors rounded-br-2xl ${
                      dialog.destructive
                        ? 'text-red-400 hover:bg-red-500/[0.08]'
                        : 'text-[#1ED45E] hover:bg-white/[0.04]'
                    }`}
                  >
                    {dialog.confirmText || 'Confirmar'}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
