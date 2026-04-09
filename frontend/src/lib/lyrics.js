const LRCLIB_BASE = 'https://lrclib.net/api'

/**
 * Fetch synced (or plain) lyrics from lrclib.net.
 * Uses duration to pick the best version match.
 * Returns { synced: [{time, text}], plain, lrcDuration }
 */
export async function fetchLyrics(artist, title, duration) {
  if (!artist || !title) return { synced: null, plain: null, lrcDuration: 0 }

  try {
    let data = null

    // 1. Try exact match with duration (best precision)
    const getParams = new URLSearchParams({ artist_name: artist, track_name: title })
    if (duration) getParams.set('duration', String(Math.round(duration)))

    const getRes = await fetch(`${LRCLIB_BASE}/get?${getParams}`, {
      headers: { 'User-Agent': 'YourSound v1.0' }
    })
    if (getRes.ok) {
      data = await getRes.json()
    }

    // 2. Fallback: search and pick closest duration with synced lyrics
    if (!data || !data.syncedLyrics) {
      const searchRes = await fetch(
        `${LRCLIB_BASE}/search?${new URLSearchParams({ artist_name: artist, track_name: title })}`,
        { headers: { 'User-Agent': 'YourSound v1.0' } }
      )
      if (searchRes.ok) {
        const results = await searchRes.json()
        if (results.length > 0) {
          // Prefer results with syncedLyrics, sorted by closest duration
          const withSync = results.filter(r => r.syncedLyrics)
          const pool = withSync.length > 0 ? withSync : results

          if (duration && pool.length > 1) {
            pool.sort((a, b) => Math.abs((a.duration || 0) - duration) - Math.abs((b.duration || 0) - duration))
          }
          data = pool[0]
        }
      }
    }

    if (!data) return { synced: null, plain: null, lrcDuration: 0 }

    return {
      synced: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
      plain: data.plainLyrics || null,
      lrcDuration: data.duration || 0,
    }
  } catch (err) {
    console.error('Lyrics fetch error:', err)
    return { synced: null, plain: null, lrcDuration: 0 }
  }
}

/**
 * Parse LRC string → [{ time (seconds), text }]
 */
function parseLRC(lrc) {
  const lines = lrc.split('\n')
  const result = []

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s?(.*)$/)
    if (match) {
      const mins = parseInt(match[1], 10)
      const secs = parseInt(match[2], 10)
      const ms = parseInt(match[3].padEnd(3, '0'), 10)
      const time = mins * 60 + secs + ms / 1000
      const text = match[4].trim()
      result.push({ time, text })
    }
  }

  return result.length > 0 ? result : null
}
