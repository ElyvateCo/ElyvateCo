// Browser helper for calling our own API routes. It can never hang forever
// and never throws: you always get { ok, status, data } back, with a
// readable data.error when something went wrong (timeout, no connection, or
// a server crash that returned an HTML error page instead of JSON).
export async function fetchJson(
  url: string,
  init: RequestInit = {},
  timeoutMs = 25000,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    const text = await res.text()
    let data: Record<string, unknown>
    try { data = JSON.parse(text) } catch { data = { error: `Server error (HTTP ${res.status})` } }
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    return {
      ok: false,
      status: 0,
      data: { error: aborted ? 'The server took too long to answer. Please try again.' : 'Could not reach the server. Please check your internet connection.' },
    }
  } finally {
    clearTimeout(timer)
  }
}

// Gives up on a promise (e.g. a browser Supabase auth call) after a while
// instead of letting a spinner run forever.
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms)
    promise.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}
