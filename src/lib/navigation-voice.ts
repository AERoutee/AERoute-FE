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
    const utterance = new SpeechSynthesisUtterance(`${distance}${instruction}`)
    utterance.lang = 'id-ID'
    utterance.rate = 1
    utterance.voice = indonesianVoice(voices()) ?? null
    synth.cancel()
    synth.speak(utterance)
  }
  if (voices().length || typeof synth.addEventListener !== 'function') { speak(); return }
  const onVoicesChanged = () => { synth.removeEventListener('voiceschanged', onVoicesChanged); speak() }
  synth.addEventListener('voiceschanged', onVoicesChanged)
}
