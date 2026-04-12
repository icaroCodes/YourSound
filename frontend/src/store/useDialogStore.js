import { create } from 'zustand'

/**
 * Dialog store — substitui alert() e confirm() do browser.
 *
 * Uso:
 *   const { showAlert, showConfirm } = useDialogStore()
 *
 *   await showAlert('Mensagem de erro')
 *   const ok = await showConfirm('Deseja excluir?', { title: 'Excluir', confirmText: 'Excluir', destructive: true })
 *
 * Ou de fora de componentes (ex: stores):
 *   useDialogStore.getState().showAlert('...')
 */
export const useDialogStore = create((set) => ({
  dialog: null,

  showAlert: (message, { title = null, icon = 'info' } = {}) =>
    new Promise((resolve) => {
      set({ dialog: { type: 'alert', title, message, icon, resolve } })
    }),

  showConfirm: (message, { title = null, confirmText = 'Confirmar', cancelText = 'Cancelar', destructive = false } = {}) =>
    new Promise((resolve) => {
      set({ dialog: { type: 'confirm', title, message, confirmText, cancelText, destructive, resolve } })
    }),

  close: (result = false) => {
    set((state) => {
      state.dialog?.resolve(result)
      return { dialog: null }
    })
  },
}))
