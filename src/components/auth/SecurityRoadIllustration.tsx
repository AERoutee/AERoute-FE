import { WildflowerCluster } from '@/components/common'

type Point = { x: number; y: number }
type CubicSegment = { start: Point; controlA: Point; controlB: Point; end: Point }

const roadSegments: CubicSegment[] = [
  { start: { x: 88, y: 724 }, controlA: { x: 245, y: 704 }, controlB: { x: 174, y: 512 }, end: { x: 338, y: 470 } },
  { start: { x: 338, y: 470 }, controlA: { x: 488, y: 432 }, controlB: { x: 478, y: 598 }, end: { x: 584, y: 520 } },
  { start: { x: 584, y: 520 }, controlA: { x: 658, y: 464 }, controlB: { x: 558, y: 286 }, end: { x: 620, y: 176 } },
]

const roadPath = `M ${roadSegments[0].start.x} ${roadSegments[0].start.y} ${roadSegments.map((segment) => `C ${segment.controlA.x} ${segment.controlA.y} ${segment.controlB.x} ${segment.controlB.y} ${segment.end.x} ${segment.end.y}`).join(' ')}`

function cubicPoint(segment: CubicSegment, progress: number): Point {
  const inverse = 1 - progress
  return {
    x: inverse ** 3 * segment.start.x + 3 * inverse ** 2 * progress * segment.controlA.x + 3 * inverse * progress ** 2 * segment.controlB.x + progress ** 3 * segment.end.x,
    y: inverse ** 3 * segment.start.y + 3 * inverse ** 2 * progress * segment.controlA.y + 3 * inverse * progress ** 2 * segment.controlB.y + progress ** 3 * segment.end.y,
  }
}

function cubicTangent(segment: CubicSegment, progress: number): Point {
  const inverse = 1 - progress
  return {
    x: 3 * inverse ** 2 * (segment.controlA.x - segment.start.x) + 6 * inverse * progress * (segment.controlB.x - segment.controlA.x) + 3 * progress ** 2 * (segment.end.x - segment.controlB.x),
    y: 3 * inverse ** 2 * (segment.controlA.y - segment.start.y) + 6 * inverse * progress * (segment.controlB.y - segment.controlA.y) + 3 * progress ** 2 * (segment.end.y - segment.controlB.y),
  }
}

function roadsidePlant(segmentIndex: number, progress: number, side: -1 | 1, width: number, colors: [string, string, string]) {
  const segment = roadSegments[segmentIndex]
  const point = cubicPoint(segment, progress)
  const tangent = cubicTangent(segment, progress)
  const magnitude = Math.hypot(tangent.x, tangent.y) || 1
  const offset = 55 + width / 2 + 12
  const centerX = point.x + (-tangent.y / magnitude) * offset * side
  const centerY = point.y + (tangent.x / magnitude) * offset * side
  return { x: centerX - width / 2, y: centerY - width * 48 / 110, width, colors }
}

const plants = [
  roadsidePlant(0, .52, -1, 58, ['#E987A1', '#F2A36F', '#8B9BE5']),
  roadsidePlant(1, .48, -1, 64, ['#F0A070', '#8C9DE8', '#E88BAC']),
  roadsidePlant(2, .72, -1, 54, ['#91A2EA', '#ED8CA5', '#F2A66E']),
]

export function SecurityRoadIllustration() {
  return <svg className="h-full w-full bg-white" viewBox="0 0 700 900" fill="none" role="img" aria-label="AERoute road with roadside wildflowers">
    <rect width="700" height="900" fill="#fff" />
    <path d={roadPath} stroke="#DCE7E1" strokeWidth="110" strokeLinecap="round" strokeLinejoin="round" />
    <path d={roadPath} stroke="#23312C" strokeWidth="84" strokeLinecap="round" strokeLinejoin="round" />
    <path d={roadPath} stroke="#FFFDF4" strokeWidth="2.5" strokeDasharray="12 16" strokeLinecap="round" />
    {plants.map((plant) => <WildflowerCluster key={`${plant.x}-${plant.y}`} {...plant} />)}
  </svg>
}
