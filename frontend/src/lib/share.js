// Compartilha um link usando a API nativa do dispositivo (Web Share API)
// com fallback para copiar na área de transferência.
// Retorna: 'shared' | 'copied' | 'cancelled' | 'failed'
export async function shareLink(url, { title, text } = {}) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
      // se share falhar por outro motivo, tenta copiar
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
