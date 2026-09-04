import { speakNavigationInstruction } from '@/lib/navigation-voice'

class Utterance {
  text: string
  lang = ''
  rate = 1
  voice: SpeechSynthesisVoice | null = null
  constructor(text: string) { this.text = text }
}

const indonesian = { name: 'Google Bahasa Indonesia', lang: 'id-ID', default: false, localService: true, voiceURI: 'id' } as SpeechSynthesisVoice
const english = { name: 'Google US English', lang: 'en-US', default: true, localService: true, voiceURI: 'en' } as SpeechSynthesisVoice

describe('navigation voice', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance })
  })

  it('selects an Indonesian voice explicitly', () => {
    const speak = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [english, indonesian], speak, cancel: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn() } })

    speakNavigationInstruction('Belok kiri', 80)

    expect(speak.mock.calls[0][0]).toMatchObject({ lang: 'id-ID', voice: indonesian, text: 'Dalam 80 meter, Belok kiri' })
  })

  it('does not fall back to an English voice when Indonesian is unavailable', () => {
    const speak = jest.fn()
    const synth = { getVoices: () => [english], speak, cancel: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn() }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth })

    speakNavigationInstruction('Belok kiri')

    expect(speak).not.toHaveBeenCalled()
    expect(synth.addEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function))
  })

  it('waits for voiceschanged before speaking when voices are not loaded', () => {
    const speak = jest.fn()
    let listener: (() => void) | undefined
    const synth = { getVoices: jest.fn().mockReturnValueOnce([]).mockReturnValue([indonesian]), speak, cancel: jest.fn(), addEventListener: jest.fn((_event, callback) => { listener = callback }), removeEventListener: jest.fn() }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth })

    speakNavigationInstruction('Lanjut lurus')
    expect(speak).not.toHaveBeenCalled()
    listener?.()

    expect(speak.mock.calls[0][0]).toMatchObject({ voice: indonesian, lang: 'id-ID' })
    expect(synth.removeEventListener).toHaveBeenCalledWith('voiceschanged', listener)
  })
})
