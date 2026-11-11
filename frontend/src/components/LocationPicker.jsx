import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useModal } from '../context/ModalContext.jsx'

// Custom SVG Pin Icon ที่คมชัด ไม่ต้องพึ่งพาไฟล์รูปภายนอก
const pinSvg = `
  <div style="transform: translate(-16px, -32px); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="#007BFF" stroke="#FFFFFF" stroke-width="1.5" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>
`

const customPinIcon = L.divIcon({
  className: 'custom-map-pin',
  html: pinSvg,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
})

/**
 * LocationPicker Component
 *
 * แผนที่ OpenStreetMap + Leaflet (ฟรี 100% ไม่ต้องผูกบัตรเครดิต)
 *
 * Props:
 *  - lat: ละติจูดเริ่มต้น (ถ้ามี)
 *  - lng: ลองจิจูดเริ่มต้น (ถ้ามี)
 *  - onChangeLocation: callback ({ lat, lng, address, province, district, displayName })
 *  - showRadiusCircle: boolean (แสดงวงกลมรัศมีให้บริการหรือไม่ - สำหรับพยาบาล)
 *  - radiusKm: number (รัศมีเป็นกิโลเมตร เช่น 10)
 *  - onRadiusChange: callback (เมื่อปรับรัศมี)
 *  - readOnly: boolean (โหมดดูอย่างเดียว ไม่ให้เลื่อนหมุด)
 *  - height: string ความสูงแผนที่ (default '280px')
 *  - label: string ข้อความหัวข้อ
 */
export default function LocationPicker({
  lat = null,
  lng = null,
  onChangeLocation,
  showRadiusCircle = false,
  radiusKm = 10,
  onRadiusChange,
  readOnly = false,
  height = '280px',
  label = 'ตำแหน่งที่ตั้งบนแผนที่',
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const { showAlert } = useModal()

  const [currentPos, setCurrentPos] = useState({
    lat: lat ? Number(lat) : 13.7563, // กรุงเทพฯ เป็นค่าเริ่มต้น
    lng: lng ? Number(lng) : 100.5018,
    hasLocation: Boolean(lat && lng),
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [locationName, setLocationName] = useState('')

  // Reverse Geocoding ด้วย Nominatim OpenStreetMap (แปลงพิกัดเป็นที่อยู่ภาษาไทย)
  const reverseGeocode = useCallback(async (latitude, longitude) => {
    setIsGeocoding(true)
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=th`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Geocoding failed')
      const data = await res.json()

      const addr = data.address || {}
      const province = addr.province || addr.state || addr.city || ''
      const district = addr.district || addr.city_district || addr.county || addr.suburb || ''
      const subdistrict = addr.subdistrict || addr.quarter || addr.neighbourhood || ''
      const road = addr.road || ''
      const houseNumber = addr.house_number || ''

      const cleanAddressParts = [houseNumber, road, subdistrict].filter(Boolean)
      const cleanAddress = cleanAddressParts.join(' ') || data.display_name?.split(',')[0] || ''

      const placeInfo = {
        lat: latitude,
        lng: longitude,
        address: cleanAddress,
        province: province.replace(/^จังหวัด/g, '').trim(),
        district: district.replace(/^(อำเภอ|เขต)/g, '').trim(),
        displayName: data.display_name || '',
      }

      setLocationName(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)

      if (onChangeLocation) {
        onChangeLocation(placeInfo)
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err)
      const fallbackInfo = {
        lat: latitude,
        lng: longitude,
        address: '',
        province: '',
        district: '',
        displayName: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      }
      setLocationName(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      if (onChangeLocation) {
        onChangeLocation(fallbackInfo)
      }
    } finally {
      setIsGeocoding(false)
    }
  }, [onChangeLocation])

  // อัปเดตตำแหน่งและวงกลมรัศมี
  const updatePosition = useCallback((newLat, newLng, triggerReverse = true) => {
    setCurrentPos({ lat: newLat, lng: newLng, hasLocation: true })

    if (mapInstanceRef.current) {
      // เลื่อนจุดศูนย์กลางแผนที่
      mapInstanceRef.current.panTo([newLat, newLng])

      // จัดการ Marker
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng])
      } else {
        markerRef.current = L.marker([newLat, newLng], {
          icon: customPinIcon,
          draggable: !readOnly,
        }).addTo(mapInstanceRef.current)

        if (!readOnly) {
          markerRef.current.on('dragend', (e) => {
            const pos = e.target.getLatLng()
            updatePosition(pos.lat, pos.lng, true)
          })
        }
      }

      // จัดการ Circle รัศมีให้บริการ
      if (showRadiusCircle) {
        const radiusMeters = (radiusKm || 10) * 1000
        if (circleRef.current) {
          circleRef.current.setLatLng([newLat, newLng])
          circleRef.current.setRadius(radiusMeters)
        } else {
          circleRef.current = L.circle([newLat, newLng], {
            radius: radiusMeters,
            color: '#007BFF',
            fillColor: '#007BFF',
            fillOpacity: 0.12,
            weight: 1.5,
          }).addTo(mapInstanceRef.current)
        }
      }
    }

    if (triggerReverse && !readOnly) {
      reverseGeocode(newLat, newLng)
    }
  }, [readOnly, showRadiusCircle, radiusKm, reverseGeocode])

  // เริ่มต้นสร้างแผนที่ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const initialLat = currentPos.lat
    const initialLng = currentPos.lng
    const initialZoom = currentPos.hasLocation ? 14 : 11

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: false,
    })

    // ใส่ OpenStreetMap Tile Layer (ฟรี 100%)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map

    // ถ้ามีพิกัดเดิม ให้ปักหมุดทันที
    if (currentPos.hasLocation) {
      markerRef.current = L.marker([initialLat, initialLng], {
        icon: customPinIcon,
        draggable: !readOnly,
      }).addTo(map)

      if (!readOnly) {
        markerRef.current.on('dragend', (e) => {
          const pos = e.target.getLatLng()
          updatePosition(pos.lat, pos.lng, true)
        })
      }

      if (showRadiusCircle) {
        circleRef.current = L.circle([initialLat, initialLng], {
          radius: (radiusKm || 10) * 1000,
          color: '#007BFF',
          fillColor: '#007BFF',
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(map)
      }
    }

    // คลิกบนแผนที่เพื่อปักหมุด
    if (!readOnly) {
      map.on('click', (e) => {
        updatePosition(e.latlng.lat, e.latlng.lng, true)
      })
    }

    // Invalidate size หลังจากเรนเดอร์เพื่อป้องกันขอบขาว
    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
  }, [])

  // เมื่อค่า props lat / lng เปลี่ยนจากภายนอก
  useEffect(() => {
    if (lat && lng && (Number(lat) !== currentPos.lat || Number(lng) !== currentPos.lng)) {
      updatePosition(Number(lat), Number(lng), false)
    }
  }, [lat, lng, updatePosition])

  // อัปเดตรัศมีวงกลมเมื่อ radiusKm เปลี่ยน
  useEffect(() => {
    if (circleRef.current && showRadiusCircle) {
      circleRef.current.setRadius((radiusKm || 10) * 1000)
    }
  }, [radiusKm, showRadiusCircle])

  // ฟังก์ชันค้นหาสถานที่ (Nominatim Search)
  const handleSearchLocation = async (e) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=th&limit=1&accept-language=th`
      const res = await fetch(url)
      const results = await res.json()
      if (results && results.length > 0) {
        const targetLat = parseFloat(results[0].lat)
        const targetLng = parseFloat(results[0].lon)
        updatePosition(targetLat, targetLng, true)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setZoom(15)
        }
      } else {
        showAlert({ type: 'warning', title: 'ไม่พบสถานที่', message: 'ไม่พบสถานที่ดังกล่าว กรุณาลองพิมพ์ชื่ออำเภอหรือจังหวัดอีกครั้ง' })
      }
    } catch (err) {
      console.warn('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // ฟังก์ชันดึงตำแหน่งปัจจุบันผ่าน GPS
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      showAlert({ type: 'warning', title: 'ไม่รองรับ GPS', message: 'เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        updatePosition(latitude, longitude, true)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setZoom(16)
        }
      },
      (error) => {
        showAlert({ type: 'error', title: 'เข้าถึงตำแหน่งไม่สำเร็จ', message: 'ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์' })
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <div className="space-y-2.5">
      {/* Label and Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-on-surface-variant headline-font flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#007BFF] text-base">pin_drop</span>
          {label}
        </label>

        {showRadiusCircle && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-tertiary">รัศมีให้บริการ:</span>
            {!readOnly && onRadiusChange ? (
              <select
                value={radiusKm}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="bg-white border border-[#ced4da] rounded-[4px] px-2 py-0.5 text-xs font-bold text-[#007BFF] focus:outline-none focus:ring-1 focus:ring-[#007BFF]"
              >
                <option value={5}>5 กิโลเมตร</option>
                <option value={10}>10 กิโลเมตร (มาตรฐาน)</option>
                <option value={15}>15 กิโลเมตร</option>
                <option value={20}>20 กิโลเมตร</option>
              </select>
            ) : (
              <span className="font-bold text-[#007BFF] bg-[#007BFF]/10 px-2 py-0.5 rounded-[4px] border border-[#007BFF]/20">
                {radiusKm} กม.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Search and Current Location Controls (โหมดแก้ไข) */}
      {!readOnly && (
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation(e)}
              placeholder="พิมพ์ชื่อสถานที่, ตำบล, อำเภอ หรือถนน..."
              className="w-full bg-white border border-[#ced4da] rounded-[4px] py-2 pl-9 pr-20 text-xs focus:outline-none focus:ring-2 focus:ring-[#007BFF] transition-all"
            />
            <button
              type="button"
              onClick={handleSearchLocation}
              disabled={isSearching}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#007BFF] hover:bg-[#0069d9] text-white px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-all disabled:opacity-50"
            >
              {isSearching ? 'ค้นหา...' : 'ค้นหา'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCurrentLocation}
            className="flex items-center gap-1 border border-[#007BFF] text-[#007BFF] hover:bg-[#F8F9FA] px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all shrink-0"
            title="ใช้พิกัดปัจจุบันจากอุปกรณ์"
          >
            <span className="material-symbols-outlined text-sm">my_location</span>
            ตำแหน่งปัจจุบัน
          </button>
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-[4px] overflow-hidden border border-[#ced4da] bg-gray-100 shadow-sm">
        <div
          ref={mapContainerRef}
          style={{ height, width: '100%' }}
          className="z-0"
        />

        {/* Loading overlay during geocoding */}
        {isGeocoding && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-[4px] text-[11px] font-semibold text-[#007BFF] border border-[#007BFF]/30 flex items-center gap-1 z-10 shadow-sm">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            กำลังดึงที่อยู่...
          </div>
        )}

        {/* Hint text at bottom of map */}
        {!readOnly && (
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-[4px] text-[10px] text-tertiary border border-black/10 z-10">
            💡 คลิกบนแผนที่หรือลากหมุดเพื่อระบุตำแหน่งบ้าน
          </div>
        )}
      </div>

      {/* แสดงพิกัดและที่อยู่ที่ปักหมุด */}
      {currentPos.hasLocation && (
        <div className="p-2.5 bg-[#F8F9FA] border border-[#ced4da] rounded-[4px] text-xs space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-on-surface">
              <span className="material-symbols-outlined text-sm text-[#28A745]">check_circle</span>
              <span>พิกัดที่ปักหมุด:</span>
              <span className="font-mono text-[#007BFF]">
                {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
              </span>
            </div>
            {showRadiusCircle && (
              <span className="text-[11px] text-[#007BFF] font-semibold bg-[#007BFF]/10 px-2 py-0.5 rounded-[4px]">
                รัศมีให้บริการ {radiusKm} กม.
              </span>
            )}
          </div>
          {locationName && (
            <p className="text-tertiary text-[11px] leading-relaxed truncate" title={locationName}>
              📍 {locationName}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
