import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

type Position = { x: number; y: number }

export function useDraggablePanel(initialPosition: Position, panelWidth: number) {
  const position = useRef(initialPosition)
  const panel = useRef<HTMLElement | null>(null)
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)

  function applyPosition(nextPosition: Position) {
    position.current = nextPosition
    panel.current?.style.setProperty('--panel-x', `${nextPosition.x}px`)
    panel.current?.style.setProperty('--panel-y', `${nextPosition.y}px`)
  }

  function clampPosition(nextPosition: Position) {
    const maxX = Math.max(20, window.innerWidth - panelWidth - 20)
    const maxY = Math.max(96, window.innerHeight - 430)
    return { x: Math.min(maxX, Math.max(20, nextPosition.x)), y: Math.min(maxY, Math.max(96, nextPosition.y)) }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    panel.current = event.currentTarget.closest<HTMLElement>('[data-draggable-panel]')
    if (!panel.current) return
    const rect = panel.current.getBoundingClientRect()
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    applyPosition(clampPosition({ x: event.clientX - drag.current.offsetX, y: event.clientY - drag.current.offsetY }))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 32 : 12
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    applyPosition(clampPosition({ x: position.current.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), y: position.current.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) }))
  }

  return { initialPosition, handlePointerDown, handlePointerMove, handlePointerUp, handleKeyDown }
}
