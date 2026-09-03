import { renderHook } from '@testing-library/react'
import { useDraggablePanel } from '@/hooks/common/useDraggablePanel'

function pointer(button: HTMLButtonElement, values: Record<string, unknown>) {
  return { currentTarget: button, ...values } as never
}

function setup() {
  const panel = document.createElement('aside')
  panel.dataset.draggablePanel = ''
  const button = document.createElement('button')
  panel.append(button)
  document.body.append(panel)
  Object.defineProperty(panel, 'getBoundingClientRect', { value: () => ({ left: 100, top: 120, width: 300, height: 200, right: 400, bottom: 320, x: 100, y: 120, toJSON: () => ({}) }) })
  Object.defineProperty(button, 'setPointerCapture', { value: jest.fn() })
  Object.defineProperty(button, 'hasPointerCapture', { value: jest.fn(() => true) })
  Object.defineProperty(button, 'releasePointerCapture', { value: jest.fn() })
  return { panel, button }
}

afterEach(() => document.body.replaceChildren())

describe('useDraggablePanel', () => {
  it('measures the actual panel for viewport clamping and releases capture safely', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    const { panel, button } = setup()
    const { result } = renderHook(() => useDraggablePanel({ x: 100, y: 120 }))

    result.current.handlePointerDown(pointer(button, { pointerId: 4, isPrimary: true, button: 0, clientX: 110, clientY: 130 }))
    result.current.handlePointerMove(pointer(button, { pointerId: 4, isPrimary: true, clientX: 999, clientY: 799 }))
    result.current.handlePointerUp(pointer(button, { pointerId: 4, isPrimary: true }))

    expect(panel.style.getPropertyValue('--panel-x')).toBe('680px')
    expect(panel.style.getPropertyValue('--panel-y')).toBe('580px')
    expect(button.setPointerCapture).toHaveBeenCalledWith(4)
    expect(button.releasePointerCapture).toHaveBeenCalledWith(4)
    expect(result.current.initialPosition).toEqual({ x: 100, y: 120 })
  })

  it('ignores non-primary, right-button, and detached drag targets', () => {
    const { button } = setup()
    const { result } = renderHook(() => useDraggablePanel({ x: 100, y: 120 }))
    result.current.handlePointerDown(pointer(button, { pointerId: 1, isPrimary: false, button: 0, clientX: 110, clientY: 130 }))
    result.current.handlePointerDown(pointer(button, { pointerId: 2, isPrimary: true, button: 2, clientX: 110, clientY: 130 }))
    button.remove()
    document.body.append(button)
    result.current.handlePointerDown(pointer(button, { pointerId: 3, isPrimary: true, button: 0, clientX: 110, clientY: 130 }))
    expect(button.setPointerCapture).not.toHaveBeenCalled()
  })
})
