import { render, screen } from '@testing-library/react'
import { ConceptBadge } from '@/components/common/ConceptBadge'

describe('ConceptBadge', () => {
  it('renders a decorative image without an accessible name by default', () => {
    render(<ConceptBadge src="test.png" />)
    expect(screen.getByRole('presentation', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders an informative alt text when provided', () => {
    render(<ConceptBadge src="test.png" alt="Route context" size="lg" />)
    expect(screen.getByRole('img', { name: 'Route context' })).toBeInTheDocument()
  })
})
