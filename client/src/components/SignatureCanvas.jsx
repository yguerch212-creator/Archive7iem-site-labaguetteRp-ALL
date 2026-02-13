import { useRef, useState, useEffect } from 'react'

/**
 * SignatureCanvas — Paint-style drawing canvas for signatures
 * Props:
 *   onDone(dataUrl) — called with base64 PNG when user confirms
 *   onCancel() — called when user cancels
 *   width/height — canvas dimensions
 *   initialImage — optional base64 to pre-load
 */
export default function SignatureCanvas({ onDone, onCancel, width = 500, height = 200, initialImage = null }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [penSize, setPenSize] = useState(2)
  const [penColor, setPenColor] = useState('#1a1a2e')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    if (initialImage) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = initialImage
    }
  }, [])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.strokeStyle = penColor
    ctx.lineWidth = penSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const draw = (e) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const endDraw = () => setDrawing(false)

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
  }

  const confirm = () => {
    const canvas = canvasRef.current
    // Export with transparent background
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = width
    tmpCanvas.height = height
    const tmpCtx = tmpCanvas.getContext('2d')
    tmpCtx.drawImage(canvas, 0, 0)
    // Make white transparent
    const imageData = tmpCtx.getImageData(0, 0, width, height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
        data[i+3] = 0
      }
    }
    tmpCtx.putImageData(imageData, 0, 0)
    onDone(tmpCanvas.toDataURL('image/png'))
  }

  return (
    <div className="signature-canvas-wrapper">
      <div className="signature-tools">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem' }}>Épaisseur :</label>
          {[1, 2, 3, 5].map(s => (
            <button key={s} className={`sig-pen-btn ${penSize === s ? 'active' : ''}`} onClick={() => setPenSize(s)}
              style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: s * 2 + 2, height: s * 2 + 2, borderRadius: '50%', background: penColor, display: 'block' }} />
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem' }}>Couleur :</label>
          {['#1a1a2e', '#2c3e50', '#1a3c5e', '#4a1a2e'].map(c => (
            <button key={c} className={`sig-color-btn ${penColor === c ? 'active' : ''}`} onClick={() => setPenColor(c)}
              style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: penColor === c ? '2px solid var(--military-green)' : '2px solid transparent' }} />
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="signature-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="signature-actions">
        <button className="btn btn-secondary btn-small" onClick={clear}>🧹 Effacer</button>
        <button className="btn btn-secondary btn-small" onClick={onCancel}>✕ Annuler</button>
        <button className="btn btn-primary btn-small" onClick={confirm}>✓ Valider</button>
      </div>
    </div>
  )
}
