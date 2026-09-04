export const NAVIGATION_VOICE_KEY = 'aeroute.navigationVoice'

export function isNavigationVoiceEnabled(storage: Pick<Storage, 'getItem'> = localStorage) {
  return storage.getItem(NAVIGATION_VOICE_KEY) !== 'false'
}

export function saveNavigationVoice(enabled: boolean, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(NAVIGATION_VOICE_KEY, String(enabled))
}

function indonesianVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find((voice) => voice.lang.toLowerCase() === 'id-id') ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('id')) ?? voices.find((voice) => /indonesia|bahasa/i.test(voice.name))
}

export function speakNavigationInstruction(instruction: string, distanceMeters?: number) {
  if (!isNavigationVoiceEnabled() || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
  const synth = window.speechSynthesis
  const voices = () => typeof synth.getVoices === 'function' ? synth.getVoices() : []
  const distance = distanceMeters === undefined ? '' : distanceMeters < 1000 ? `Dalam ${Math.max(10, Math.round(distanceMeters / 10) * 10)} meter, ` : `Dalam ${(distanceMeters / 1000).toFixed(1)} kilometer, `
  const speak = () => {
    const voice = indonesianVoice(voices())
    if (!voice) return false
    const utterance = new SpeechSynthesisUtterance(`${distance}${instruction}`)
    utterance.lang = 'id-ID'
    utterance.rate = 1
    utterance.voice = voice
    synth.cancel()
    synth.speak(utterance)
    return true
  }
  if (speak() || typeof synth.addEventListener !== 'function') return
  const onVoicesChanged = () => { if (speak()) synth.removeEventListener('voiceschanged', onVoicesChanged) }
  synth.addEventListener('voiceschanged', onVoicesChanged)
}
