import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const publicFile = (name: string) => join(root, 'public', name)

function pngDimensions(path: string) {
  const png = readFileSync(path)
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

describe('PWA static assets', () => {
  it('defines an installable manifest with both required icons', () => {
    const manifest = JSON.parse(readFileSync(publicFile('manifest.webmanifest'), 'utf8'))
    expect(manifest).toMatchObject({ name: 'AERoute', short_name: 'AERoute', start_url: '/', scope: '/', display: 'standalone' })
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icons/aeroute-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: '/icons/aeroute-512.png', sizes: '512x512', type: 'image/png' }),
    ]))
  })

  it.each([[192, 'aeroute-192.png'], [512, 'aeroute-512.png']] as const)('has a valid %i pixel PNG icon', (size, name) => {
    const path = publicFile(join('icons', name))
    expect(readFileSync(path).subarray(1, 4).toString()).toBe('PNG')
    expect(pngDimensions(path)).toEqual({ width: size, height: size })
  })

  it('uses network-first handling only for navigation requests', () => {
    const worker = readFileSync(publicFile('sw.js'), 'utf8')
    expect(worker).toContain("request.mode !== 'navigate'")
    expect(worker).toContain('fetch(request)')
    expect(worker).toContain("caches.match('/offline.html')")
    expect(worker).not.toContain('request.destination')
  })

  it('renders the saved summary with textContent only', () => {
    const offline = readFileSync(publicFile('offline.html'), 'utf8')
    expect(offline).toContain('aeroute:last-route-summary:v2')
    expect(offline).toContain('textContent')
    expect(offline).toContain("summary.modeLabel")
    expect(offline).toContain("'Unavailable'")
    expect(offline).not.toContain('modeNames')
    expect(offline).toContain('Date.parse(summary.expiresAt) <= Date.now()')
    expect(offline).not.toContain('summary.origin')
    expect(offline).not.toContain('summary.destination')
    expect(offline).not.toContain('innerHTML')
  })

  it('links the manifest and Apple touch icon from the app shell', () => {
    const index = readFileSync(join(root, 'index.html'), 'utf8')
    expect(index).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(index).toContain('rel="apple-touch-icon" href="/icons/aeroute-192.png"')
  })

  it('registers the service worker behind the production flag', () => {
    const main = readFileSync(join(root, 'src', 'main.tsx'), 'utf8')
    expect(main).toContain("if (import.meta.env.PROD && 'serviceWorker' in navigator)")
    expect(main).toContain("navigator.serviceWorker.register('/sw.js')")
  })

  it('sets explicit cache controls for mutable PWA files', () => {
    const config = JSON.parse(readFileSync(publicFile('serve.json'), 'utf8'))
    const sources = config.headers.map((entry: { source: string }) => entry.source)
    expect(sources).toEqual(expect.arrayContaining(['sw.js', 'manifest.webmanifest', 'offline.html']))
  })
})
