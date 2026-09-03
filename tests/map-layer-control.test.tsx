import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapLayerControl } from '@/pages/dashboard/components/MapLayerControl'

jest.mock('@/assets', () => ({
  colorLayersIcon: 'layers.png',
  colorReportIcon: 'report.png',
  colorWheelchairIcon: 'wheelchair.png',
  colorWindIcon: 'weather.png',
}))

const layers = { weather: false, reports: true, accessiblePlaces: false, restStops: false }

describe('MapLayerControl settings', () => {
  it('keeps route-dependent layers configurable before route data exists', async () => {
    const onChange = jest.fn()
    render(<MapLayerControl layers={layers} weatherUnavailable accessiblePlacesUnavailable restStopsUnavailable onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Map layers' }))

    for (const name of ['Weather along route', 'Community reports', 'Rest stops with accessibility information', 'Rest-stop candidates near recommended route']) {
      expect(screen.getByRole('checkbox', { name })).toBeEnabled()
    }
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument()
    expect(screen.getAllByText('Shown when route data is available')).toHaveLength(3)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Weather along route' }))
    expect(onChange).toHaveBeenCalledWith({ ...layers, weather: true })
  })

  it('uses existing assets and a standard icon for map layers', async () => {
    render(<MapLayerControl layers={layers} weatherUnavailable accessiblePlacesUnavailable restStopsUnavailable onChange={jest.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Map layers' }))

    expect(screen.getByText('Weather along route').closest('label')?.querySelector('img')).toHaveAttribute('src', 'weather.png')
    expect(screen.getByText('Rest stops with accessibility information').closest('label')?.querySelector('img')).toHaveAttribute('src', 'wheelchair.png')
    expect(screen.getByText('Rest-stop candidates near recommended route').closest('label')?.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Rest-stop candidates near recommended route').closest('label')?.querySelector('img')).not.toBeInTheDocument()
  })
})
