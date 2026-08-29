type WildflowerClusterProps = {
  className?: string
  colors: [string, string, string]
  x?: number
  y?: number
  width?: number
}

export function WildflowerCluster({ className, colors, x, y, width }: WildflowerClusterProps) {
  return (
    <svg className={className} x={x} y={y} width={width} height={width ? width * 96 / 110 : undefined} viewBox="0 0 110 96" fill="none" aria-hidden="true">
      <ellipse cx="55" cy="88" rx="43" ry="6" fill="#142922" fillOpacity=".1" />
      <g stroke="#397B57" strokeWidth="3" strokeLinecap="round"><path d="M54 88C53 66 42 43 31 24" /><path d="M56 88C58 61 69 39 79 18" /><path d="M55 88C55 66 55 49 56 31" /></g>
      <g fill="#6EAC7F"><ellipse cx="41" cy="62" rx="12" ry="5" transform="rotate(28 41 62)" /><ellipse cx="69" cy="58" rx="12" ry="5" transform="rotate(-31 69 58)" /><ellipse cx="35" cy="45" rx="10" ry="4" transform="rotate(34 35 45)" /><ellipse cx="77" cy="41" rx="10" ry="4" transform="rotate(-34 77 41)" /></g>
      <g transform="translate(29 22)"><ellipse rx="6" ry="13" fill={colors[0]} transform="rotate(-38) translate(0 -8)" /><ellipse rx="6" ry="13" fill={colors[0]} transform="rotate(38) translate(0 -8)" /><ellipse rx="6" ry="13" fill={colors[0]} transform="rotate(90) translate(0 -8)" /><circle r="5" fill="#F4C451" /></g>
      <g transform="translate(79 17)"><ellipse rx="6" ry="12" fill={colors[1]} transform="rotate(-42) translate(0 -7)" /><ellipse rx="6" ry="12" fill={colors[1]} transform="rotate(42) translate(0 -7)" /><ellipse rx="6" ry="12" fill={colors[1]} transform="rotate(92) translate(0 -7)" /><circle r="5" fill="#E7A832" /></g>
      <g transform="translate(56 31)"><ellipse rx="5" ry="11" fill={colors[2]} transform="rotate(-44) translate(0 -7)" /><ellipse rx="5" ry="11" fill={colors[2]} transform="rotate(44) translate(0 -7)" /><ellipse rx="5" ry="11" fill={colors[2]} transform="rotate(92) translate(0 -7)" /><circle r="4" fill="#F5CC58" /></g>
      <g fill="#86BA92"><path d="M18 85C25 70 38 72 44 86Z" /><path d="M63 87C70 68 88 72 95 88Z" /><path d="M39 88C44 72 61 72 68 88Z" /></g>
    </svg>
  )
}
