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
