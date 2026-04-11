import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'Shampoo', 'Tinturas', 'Desodorantes', 'Pastas de dientes', 'Jabones',
  'Head & Shoulders', 'Pantene', 'Elvive', 'Dove', 'Fructis', 'Sedal', 'Familand',
  'Ilicit', 'Nutrisse', 'Excellence', 'Issue',
  'Axe', 'Lady Speed Stick', 'Speed Stick', 'Nivea', 'Rexona', 'Old Spice',
  'Colgate', 'Pepsodent', 'Aquafresh',
  'Simonds', 'Protex',
]

export default function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [barcodeText, setBarcodeText] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const scanIntervalRef = useRef(null)

  function handleChange(e) {
    const v = e.target.value
    setValue(v)
    if (v.length > 0) {
      const filtered = SUGGESTIONS.filter(s => s.toLowerCase().includes(v.toLowerCase()))
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (value.trim()) { setShowSuggestions(false); onSearch(value) }
  }

  function handleSuggestionClick(s) {
    setValue(s); setShowSuggestions(false); onSearch(s)
  }

  async function lookupBarcode(code) {
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`)
      const data = await res.json()
      const name = data.name || code
      setValue(name)
      setShowBarcodeModal(false)
      setBarcodeText('')
      onSearch(name)
    } catch {
      setValue(code)
      setShowBarcodeModal(false)
      onSearch(code)
    }
  }

  async function startCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraActive(true)

      if (!('BarcodeDetector' in window)) {
        setCameraError('Tu navegador no soporta detección automática. Ingresa el código manualmente.')
        stopCamera(); return
      }
      const detector = new BarcodeDetector()
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return
        const barcodes = await detector.detect(videoRef.current).catch(() => [])
        if (barcodes.length > 0) {
          clearInterval(scanIntervalRef.current)
          stopCamera()
          lookupBarcode(barcodes[0].rawValue)
        }
      }, 500)
    } catch {
      setCameraError('No se pudo acceder a la cámara')
    }
  }

  function stopCamera() {
    clearInterval(scanIntervalRef.current)
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    }
    setCameraActive(false)
  }

  async function handleImageFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    if ('BarcodeDetector' in window) {
      const img = document.createElement('img')
      img.src = URL.createObjectURL(file)
      await new Promise(r => { img.onload = r })
      const detector = new BarcodeDetector()
      const barcodes = await detector.detect(img).catch(() => [])
      if (barcodes.length > 0) { lookupBarcode(barcodes[0].rawValue); return }
    }
    // Sin barcode: abrir Google Lens
    window.open('https://lens.google.com/', '_blank')
  }

  function closeModal() {
    stopCamera(); setShowBarcodeModal(false); setBarcodeText(''); setCameraError('')
  }

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="flex shadow-lg rounded-xl overflow-visible">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder='Busca por producto, marca o categoría...'
            className="w-full border-2 border-blue-200 rounded-l-xl px-5 py-4 text-base focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          {showSuggestions && (
            <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {suggestions.map(s => (
                <li key={s} onMouseDown={() => handleSuggestionClick(s)}
                  className="px-5 py-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Código de barra */}
        <button type="button" onClick={() => setShowBarcodeModal(true)} title="Buscar por código de barra"
          className="bg-white border-y-2 border-blue-200 px-4 hover:bg-blue-50 transition text-gray-500 hover:text-blue-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h1v12H4zm3 0h1v12H7zm3 0h2v12h-2zm4 0h1v12h-1zm3 0h2v12h-2z" />
          </svg>
        </button>

        {/* Búsqueda por imagen */}
        <label title="Buscar por imagen o código de barra en foto"
          className="bg-white border-y-2 border-r-2 border-blue-200 px-4 hover:bg-blue-50 transition text-gray-500 hover:text-blue-700 flex items-center cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        </label>

        <button type="submit" disabled={loading || !value.trim()}
          className="bg-blue-800 text-white px-8 py-4 rounded-r-xl text-base font-semibold hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap">
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Modal código de barra */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Código de barra</h3>
            <video ref={videoRef} className={`w-full rounded-lg mb-3 ${cameraActive ? '' : 'hidden'}`} playsInline muted />
            {cameraError && <p className="text-red-500 text-sm mb-3">{cameraError}</p>}
            {!cameraActive && (
              <>
                <button onClick={startCamera}
                  className="w-full py-3 mb-3 bg-blue-800 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                  Escanear con cámara
                </button>
                <div className="relative flex items-center my-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="px-3 text-xs text-gray-400">o ingresa el código</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
                <div className="flex gap-2">
                  <input type="text" value={barcodeText} onChange={e => setBarcodeText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && barcodeText && lookupBarcode(barcodeText)}
                    placeholder="Ej: 7501234567890"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={() => barcodeText && lookupBarcode(barcodeText)}
                    className="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm hover:bg-blue-700">
                    Buscar
                  </button>
                </div>
              </>
            )}
            {cameraActive && (
              <button onClick={stopCamera} className="w-full py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">
                Detener cámara
              </button>
            )}
            <button onClick={closeModal} className="mt-3 w-full py-2 text-gray-400 text-sm hover:text-gray-600">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
