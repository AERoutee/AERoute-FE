export function restoreInfoWindowFocus(previouslyFocused: HTMLElement | null) {
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
}

export function closeInfoWindowAndRestoreFocus(infoWindow: { close: () => void }, previouslyFocused: HTMLElement | null) {
  infoWindow.close()
  restoreInfoWindowFocus(previouslyFocused)
}
