/**
 * LayoutRenderer — renders saved layout blocks (from LayoutEditor) as positioned elements.
 * Used by Soldbuch, RapportView, AffaireView to display custom layouts.
 * Blocks have: { id, type, content, x, y, w, h, docRef?, style? }
 */
export default function LayoutRenderer({ blocks = [], width = 800, minHeight = 1100 }) {
  if (!blocks || blocks.length === 0) return null

  return (
    <div style={{ position: 'relative', width, minHeight, margin: '0 auto' }}>
      {blocks.map(block => (
        <div
          key={block.id}
          style={{
            position: 'absolute',
            left: block.x,
            top: block.y,
            width: block.w,
            height: block.h,
            overflow: 'hidden',
            ...(block.style || {}),
          }}
        >
          <BlockContent block={block} />
        </div>
      ))}
    </div>
  )
}

function BlockContent({ block }) {
  switch (block.type) {
    case 'title':
    case 'text':
      return (
        <div
          style={{ fontSize: block.type === 'title' ? '1.1rem' : '0.85rem', lineHeight: 1.5, fontFamily: 'inherit' }}
          dangerouslySetInnerHTML={{ __html: block.content || '' }}
        />
      )

    case 'image':
    case 'stamp':
      if (!block.content) return null
      return (
        <img
          src={block.content}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: block.type === 'stamp' ? 'contain' : 'cover',
            opacity: block.type === 'stamp' ? 0.7 : 1,
            borderRadius: block.type === 'image' ? 6 : 0,
            border: block.type === 'image' ? '2px solid var(--border-color)' : 'none',
          }}
        />
      )

    case 'signature':
      // content can be base64 image or text
      if (block.content && block.content.startsWith('data:image')) {
        return <img src={block.content} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
      }
      return (
        <div style={{ fontSize: '0.85rem', textAlign: 'right', borderBottom: '1px solid #333', paddingBottom: 4, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          {block.content || ''}
        </div>
      )

    case 'separator':
      return <hr style={{ border: 'none', borderTop: '2px solid #333', margin: 0, width: '100%' }} />

    case 'document':
      if (!block.docRef) return <div style={{ fontSize: '0.8rem', color: '#999' }}>📎 Document non défini</div>
      return (
        <a href={block.docRef.url || '#'} style={{ display: 'block', padding: 8, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.8rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontWeight: 600 }}>📎 {block.docRef.label || 'Document'}</div>
          {block.docRef.sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{block.docRef.sub}</div>}
        </a>
      )

    default:
      return <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
  }
}
