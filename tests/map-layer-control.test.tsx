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
    await userEvent.click(screen.getByRole('button', { name: 'Lapisan peta' }))

    for (const name of ['Cuaca sepanjang rute', 'Laporan komunitas', 'Tempat istirahat dengan informasi aksesibilitas', 'Kandidat tempat istirahat dekat rute']) {
      expect(screen.getByRole('checkbox', { name })).toBeEnabled()
    }
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument()
    expect(screen.queryByText('Ditampilkan saat data rute tersedia')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Cuaca sepanjang rute' }))
    expect(onChange).toHaveBeenCalledWith({ ...layers, weather: true })
  })

  it('uses existing assets and a standard icon for map layers', async () => {
    render(<MapLayerControl layers={layers} weatherUnavailable accessiblePlacesUnavailable restStopsUnavailable onChange={jest.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Lapisan peta' }))

    expect(screen.getByText('Cuaca sepanjang rute').closest('label')?.querySelector('img')).toHaveAttribute('src', 'weather.png')
    expect(screen.getByText('Tempat istirahat dengan informasi aksesibilitas').closest('label')?.querySelector('img')).toHaveAttribute('src', 'wheelchair.png')
    expect(screen.getByText('Kandidat tempat istirahat dekat rute').closest('label')?.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Kandidat tempat istirahat dekat rute').closest('label')?.querySelector('img')).not.toBeInTheDocument()
  })
})
