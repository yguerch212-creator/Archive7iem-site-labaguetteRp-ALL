import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Export a DOM element as a styled PDF (A4, parchment background preserved)
 * @param {string} elementId - ID of the DOM element to capture
 * @param {string} filename - Output filename (without .pdf)
 */
export async function exportToPdf(elementId, filename = 'document') {
  const element = document.getElementById(elementId)
  if (!element) return alert('Élément introuvable')

  // Temporarily expand element for clean capture
  const origMaxWidth = element.style.maxWidth
  element.style.maxWidth = 'none'

  const canvas = await html2canvas(element, {
    scale: 2, // High quality
    useCORS: true,
    backgroundColor: '#f5f0e1', // Parchment background
    logging: false,
    windowWidth: 900, // Force desktop width for consistent rendering
  })

  element.style.maxWidth = origMaxWidth

  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF('p', 'mm', 'a4')
  
  const pageWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm
  const margin = 8
  const contentWidth = pageWidth - (margin * 2)
  
  const imgWidth = contentWidth
  const imgHeight = (canvas.height * contentWidth) / canvas.width
  
  let heightLeft = imgHeight
  let position = margin

  // First page
  pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
  heightLeft -= (pageHeight - margin * 2)

  // Additional pages if content overflows
  while (heightLeft > 0) {
    position = -(pageHeight - margin * 2) * (Math.ceil((imgHeight - heightLeft) / (pageHeight - margin * 2))) + margin
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
    heightLeft -= (pageHeight - margin * 2)
  }

  pdf.save(`${filename}.pdf`)
}

/**
 * Export a DOM element as a PNG image
 * @param {string} elementId - ID of the DOM element to capture
 * @param {string} filename - Output filename (without .png)
 */
export async function exportToImage(elementId, filename = 'document') {
  const element = document.getElementById(elementId)
  if (!element) return alert('Élément introuvable')

  // Save and remove ALL size/overflow constraints on element + ancestors up to popup
  const saved = []
  let el = element
  while (el && !el.classList?.contains('popup-overlay')) {
    const s = el.style
    saved.push({
      el,
      maxWidth: s.maxWidth,
      maxHeight: s.maxHeight,
      overflow: s.overflow,
      overflowY: s.overflowY,
      height: s.height,
    })
    s.maxWidth = 'none'
    s.maxHeight = 'none'
    s.overflow = 'visible'
    s.overflowY = 'visible'
    s.height = 'auto'
    el = el.parentElement
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#f5f0e1',
    logging: false,
    windowWidth: 900,
    scrollY: -window.scrollY,
  })

  // Restore all saved styles
  for (const s of saved) {
    s.el.style.maxWidth = s.maxWidth
    s.el.style.maxHeight = s.maxHeight
    s.el.style.overflow = s.overflow
    s.el.style.overflowY = s.overflowY
    s.el.style.height = s.height
  }

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
