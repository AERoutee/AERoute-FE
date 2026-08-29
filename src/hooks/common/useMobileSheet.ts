import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const snapPoints = [28, 55, 78] as const
const dismissThreshold = 18
const dismissDistance = 120

function closestSnapPoint(value: number) {
  return snapPoints.reduce((closest, point) => Math.abs(point - value) < Math.abs(closest - value) ? point : closest)
}

export function useMobileSheet() {
  const [height, setHeightState] = useState<number>(55)
  const heightRef = useRef(55)
  const drag = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null)
  const didDrag = useRef(false)

  function setHeight(value: number) {
    heightRef.current = value
    setHeightState(value)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    drag.current = { pointerId: event.pointerId, startY: event.clientY, startHeight: heightRef.current }
    didDrag.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    if (Math.abs(event.clientY - drag.current.startY) > 4) didDrag.current = true
    const viewportHeight = window.innerHeight || 1
    const nextHeight = drag.current.startHeight + (drag.current.startY - event.clientY) / viewportHeight * 100
    setHeight(Math.min(78, Math.max(6, nextHeight)))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>, onDismiss?: () => void) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const downwardDistance = event.clientY - drag.current.startY
    const shouldDismiss = heightRef.current <= dismissThreshold || downwardDistance >= dismissDistance
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (shouldDismiss) {
      setHeight(6)
      window.setTimeout(() => onDismiss?.(), 140)
      return
    }
    setHeight(closestSnapPoint(heightRef.current))
  }

  function handleClick() {
    if (didDrag.current) { didDrag.current = false; return }
    setHeight(heightRef.current < 42 ? 55 : heightRef.current < 67 ? 78 : 28)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = snapPoints.findIndex((point) => point === closestSnapPoint(heightRef.current))
    if (event.key === 'ArrowUp') { event.preventDefault(); setHeight(snapPoints[Math.min(snapPoints.length - 1, currentIndex + 1)]) }
    if (event.key === 'ArrowDown') { event.preventDefault(); setHeight(snapPoints[Math.max(0, currentIndex - 1)]) }
    if (event.key === 'Home') { event.preventDefault(); setHeight(snapPoints[0]) }
    if (event.key === 'End') { event.preventDefault(); setHeight(snapPoints.at(-1)!) }
    if (event.key === 'Escape') { event.preventDefault(); setHeight(6) }
  }

  return { height, setHeight, handleClick, handlePointerDown, handlePointerMove, handlePointerUp, handleKeyDown }
}
