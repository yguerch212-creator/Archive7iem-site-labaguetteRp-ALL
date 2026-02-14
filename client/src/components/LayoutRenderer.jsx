import DOMPurify from 'dompurify'

const sanitize = (html) => DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b','i','u','em','strong','br','p','div','span','h1','h2','h3','h4','ul','ol','li','a','table','tr','td','th','thead','tbody','hr','img','blockquote','pre','code','sup','sub','s','mark'], ALLOWED_ATTR: ['href','src','alt','style','class','colspan','rowspan','width','height','target'] })

/**
 * LayoutRenderer — renders saved layout HTML or blocks.
 * If `html` is provided, renders it directly. Otherwise renders blocks as positioned elements.
 */
export default function LayoutRenderer({ html, blocks = [], width = 800, minHeight = 600 }) {
  // If raw HTML is provided (from publish), render it directly
  if (html) {
    return (
      <div
        className="layout-canvas"
        style={{
          width, minHeight, margin: '0 auto', position: 'relative',
          background: '#f5f2e8', border: '1px solid #c4b99a', borderRadius: 4,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
        dangerouslySetInnerHTML={{ __html: sanitize(html) }}
      />
    )
  }

  if (!blocks || blocks.length === 0) return null

  // Auto-calculate height from blocks
  const autoHeight = Math.max(minHeight, ...blocks.map(b => (b.y || 0) + (b.h || 0) + 40))

  return (
    <div style={{
      position: 'relative', width, minHeight: autoHeight, margin: '0 auto',
      background: 'var(--paper-bg, #faf6ef)',
      fontFamily: "'IBM Plex Mono', monospace",
      backgroundImage: 'repeating-linear-gradient(transparent, transparent 28px, rgba(180,170,140,0.1) 28px, rgba(180,170,140,0.1) 29px)',
    }}>
      {blocks.map(block => (
        <div
          key={block.id}
          style={{
            position: 'absolute',
            left: block.x,
            top: block.y,
            width: block.w,
            minHeight: block.h,
            overflow: 'visible',
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
          dangerouslySetInnerHTML={{ __html: sanitize(block.content || '') }}
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
      return <div dangerouslySetInnerHTML={{ __html: sanitize(block.content || '') }} />
  }
}
