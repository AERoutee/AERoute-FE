import { LoaderCircle, MapPin, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { loadGooglePlaces } from '@/config'
import type { Place } from '@/types'

type LocationInputProps = {
  id: string
  label: string
  value: Place | null
  onChange: (place: Place | null) => void
  error?: string
}

type Suggestion = {
  id: string
  label: string
  detail: string
  place: google.maps.places.Place
}

export function LocationInput({ id, label, value, onChange, error }: LocationInputProps) {
  const listId = useId()
  const errorId = `${id}-error`
  const statusId = `${id}-status`
  const [query, setQuery] = useState(value?.label ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable' | 'error'>('idle')
  const containerRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const valueId = useRef(value?.id)

  if (value?.id !== valueId.current) {
    valueId.current = value?.id
    if (value) setQuery(value.label)
  }

  useEffect(() => {
    let active = true
    void loadGooglePlaces().then((library) => {
      if (!active) return
      if (!library) { setStatus('unavailable'); return }
      sessionToken.current = new google.maps.places.AutocompleteSessionToken()
      setStatus('ready')
    }).catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  useEffect(() => {
    const input = query.trim()
    if (!sessionToken.current || input.length < 2 || input === value?.label) { requestId.current += 1; return }
    const currentRequest = ++requestId.current
    const timer = window.setTimeout(() => {
      setStatus('loading')
      void google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionToken.current ?? undefined,
        language: 'en',
        origin: { lat: -6.2088, lng: 106.8456 },
      }).then(({ suggestions: nextSuggestions }) => {
        if (currentRequest !== requestId.current) return
        setSuggestions(nextSuggestions.flatMap((suggestion) => {
          const prediction = suggestion.placePrediction
          if (!prediction) return []
          return [{ id: prediction.placeId, label: prediction.mainText?.toString() ?? prediction.text.toString(), detail: prediction.secondaryText?.toString() ?? 'Location', place: prediction.toPlace() }]
        }).slice(0, 6))
        setStatus('ready')
      }).catch(() => {
        if (currentRequest === requestId.current) { setSuggestions([]); setStatus('error') }
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query, value?.label])

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery)
    setOpen(true)
    setActiveIndex(-1)
    if (nextQuery !== value?.label) onChange(null)
    if (nextQuery.trim().length < 2) { requestId.current += 1; setSuggestions([]); setStatus('ready') }
    else setStatus('loading')
  }

  async function selectSuggestion(index: number) {
    const suggestion = suggestions[index]
    if (!suggestion) return
    try {
      await suggestion.place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
      const location = suggestion.place.location
      if (!location) throw new Error('Location unavailable')
      const selected: Place = {
        id: suggestion.id,
        label: suggestion.place.displayName ?? suggestion.label,
        detail: suggestion.place.formattedAddress ?? suggestion.detail,
        latitude: location.lat(),
        longitude: location.lng(),
      }
      requestId.current += 1
      onChange(selected)
      setQuery(selected.label)
      setOpen(false)
      setActiveIndex(-1)
      setSuggestions([])
      sessionToken.current = new google.maps.places.AutocompleteSessionToken()
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { setOpen(false); setActiveIndex(-1); return }
    if (!suggestions.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => (index + 1) % suggestions.length) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => index <= 0 ? suggestions.length - 1 : index - 1) }
    if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); void selectSuggestion(activeIndex) }
  }

  const describedBy = [error ? errorId : '', status === 'unavailable' || status === 'error' ? statusId : ''].filter(Boolean).join(' ') || undefined

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-2 block text-[13px] font-extrabold lg:text-sm [@media(min-width:1024px)_and_(max-height:900px)]:mb-1 [@media(min-width:1024px)_and_(max-height:760px)]:text-xs text-ae-ink" htmlFor={id}>{label}</label>
      <div className={`flex min-h-14 items-center gap-3 rounded-xl border bg-white px-4 transition [@media(min-width:1024px)_and_(max-height:900px)]:min-h-12 [@media(min-width:1024px)_and_(max-height:900px)]:gap-2 ${error ? 'border-ae-fastest' : 'border-ae-line focus-within:border-ae-brand focus-within:ring-4 focus-within:ring-ae-brand/10'}`}>
        {status === 'loading' ? <LoaderCircle className="size-5 shrink-0 animate-spin text-ae-brand" aria-hidden="true" /> : <Search className="size-5 shrink-0 text-ae-brand" aria-hidden="true" />}
        <input className="min-w-0 flex-1 border-0 bg-transparent py-3 text-base font-bold text-ae-ink outline-none placeholder:text-ae-muted/75 [@media(min-width:1024px)_and_(max-height:900px)]:py-2 [@media(min-width:1024px)_and_(max-height:760px)]:text-sm" id={id} role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded={open && suggestions.length > 0} aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined} aria-invalid={Boolean(error)} aria-describedby={describedBy} value={query} onChange={(event) => updateQuery(event.target.value)} onKeyDown={handleKeyDown} onFocus={() => setOpen(true)} placeholder="Search an address or place" autoComplete="off" />
        {query && <button className="grid size-11 shrink-0 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft" type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { requestId.current += 1; setQuery(''); setSuggestions([]); setStatus('ready'); onChange(null); setOpen(false) }}><X className="size-4" aria-hidden="true" /></button>}
      </div>
      {error && <p className="mt-2 text-xs font-bold lg:text-sm text-ae-fastest" id={errorId} role="alert">{error}</p>}
      {(status === 'unavailable' || status === 'error') && <p className="mt-2 text-xs font-semibold text-ae-fastest lg:text-sm" id={statusId} role="status">Location search is unavailable.</p>}
      {open && suggestions.length > 0 && <ul className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-ae-line bg-white p-1 shadow-[0_16px_40px_rgba(20,41,34,.14)]" id={listId} role="listbox">
        {suggestions.map((suggestion, index) => <li className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 text-left ${activeIndex === index ? 'bg-ae-soft' : 'hover:bg-ae-soft'}`} key={suggestion.id} id={`${listId}-${index}`} role="option" aria-selected={activeIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => void selectSuggestion(index)}><MapPin className="mt-0.5 size-5 shrink-0 text-ae-brand" aria-hidden="true" /><span className="min-w-0"><strong className="block truncate text-sm font-extrabold text-ae-ink">{suggestion.label}</strong><small className="mt-1 block truncate text-xs font-semibold text-ae-muted">{suggestion.detail}</small></span></li>)}
      </ul>}
      {open && status === 'ready' && query.trim().length >= 2 && suggestions.length === 0 && <p className="absolute z-40 mt-2 w-full rounded-xl border border-ae-line bg-white p-4 text-sm font-semibold text-ae-muted shadow-lg">No matching places found.</p>}
    </div>
  )
}
