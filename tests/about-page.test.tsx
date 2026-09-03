import { readFileSync } from 'node:fs'

describe('AboutPage attribution', () => {
  it('does not include icon attribution', () => {
    const source = readFileSync('src/pages/about/AboutPage.tsx', 'utf8')

    expect(source).not.toMatch(/icons8/i)
  })
})
