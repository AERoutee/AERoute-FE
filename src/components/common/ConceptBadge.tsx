export function ConceptBadge({ src, alt = '', size = 'md' }: { src: string; alt?: string; size?: 'md' | 'lg' }) {
  return <img className={`shrink-0 object-contain ${size === 'lg' ? 'size-16' : 'size-14'}`} src={src} alt={alt} aria-hidden={alt ? undefined : true} />
}
