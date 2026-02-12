// === DRAG + RESIZE CONFIG ===
interact('.bloc')
  .draggable({
    listeners: {
      move(event) {
        const t = event.target;
        const x = (parseFloat(t.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(t.getAttribute('data-y')) || 0) + event.dy;
        t.style.transform = `translate(${x}px,${y}px)`;
        t.setAttribute('data-x', x);
        t.setAttribute('data-y', y);
      }
    }
  })
  .resizable({
    edges: { left: true, right: true, bottom: true, top: true }
  })
  .on('resizemove', function (event) {
    let { x, y } = event.target.dataset;
    x = (parseFloat(x) || 0) + event.deltaRect.left;
    y = (parseFloat(y) || 0) + event.deltaRect.top;
    Object.assign(event.target.style, {
      width: `${event.rect.width}px`,
      height: `${event.rect.height}px`,
      transform: `translate(${x}px,${y}px)`
    });
    Object.assign(event.target.dataset, { x, y });
  });

function rebind() {
  interact('.bloc').unset();
  interact('.bloc').draggable({
    listeners: {
      move(e) {
        const t = e.target;
        const x = (parseFloat(t.getAttribute('data-x')) || 0) + e.dx;
        const y = (parseFloat(t.getAttribute('data-y')) || 0) + e.dy;
        t.style.transform = `translate(${x}px,${y}px)`;
        t.setAttribute('data-x', x);
        t.setAttribute('data-y', y);
      }
    }
  }).resizable({
    edges: { left: true, right: true, bottom: true, top: true }
  }).on('resizemove', function (e) {
    let { x, y } = e.target.dataset;
    x = (parseFloat(x) || 0) + e.deltaRect.left;
    y = (parseFloat(y) || 0) + e.deltaRect.top;
    Object.assign(e.target.style, {
      width: e.rect.width + 'px',
      height: e.rect.height + 'px',
      transform: `translate(${x}px,${y}px)`
    });
    Object.assign(e.target.dataset, { x, y });
  });
}

// === ADD BLOCKS ===
function shell(html, withShrink = false) {
  const d = document.createElement('div');
  d.className = 'bloc';
  d.setAttribute('data-type', 'text');
  const tools = withShrink
    ? '<button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button>'
    : '<button onclick="rm(this)">✖</button>';
  d.innerHTML = `<header><span class="title"></span><span class="tools">${tools}</span></header>${html}`;
  document.getElementById('editor').appendChild(d);
  rebind();
  return d;
}

function addTitle() {
  const d = shell('<div contenteditable="true"><b>Nouveau titre</b></div>', false);
  d.querySelector('.title').textContent = 'TITRE';
}
function addText() {
  const d = shell('<div contenteditable="true">Nouveau texte…</div>', false);
  d.querySelector('.title').textContent = 'TEXTE';
}
function addMedia() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*,video/*';
  inp.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    fetch('/Archives7e/includes/upload_media.php', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(res => {
        if (!res.ok) return alert('Upload échoué: ' + res.error);
        const url = res.url;
        const ext = url.split('.').pop().toLowerCase();
        const wrap = shell(
          `<div class="media">${
            ext.match(/mp4|webm/) ? `<video controls src="${url}"></video>` : `<img src="${url}">`
          }<div class="legend" contenteditable="true">Légende…</div></div>`,
          true
        );
        wrap.dataset.type = 'media';
        wrap.querySelector('.title').textContent = 'Média';
      })
      .catch(err => alert(err));
  };
  inp.click();
}


function addSignature() {
  const d = shell('<div style="text-align:right"><div contenteditable="true">Nom Prénom — Grade</div></div>');
  d.querySelector('.title').textContent = 'Signature';
}

function addStamp() {
  const d = shell('<div class="media" style="text-align:right"><img src="/Archives7e/assets/uploads/signatures/tempon916.png" style="max-width:180px"></div>');
  d.querySelector('.title').textContent = 'Tampon';
}

function rm(btn) {
  btn.closest('.bloc').remove();
}

function shrink(btn) {
  const b = btn.closest('.bloc');
  b.dataset.min = b.dataset.min === '1' ? '0' : '1';
  if (b.dataset.min === '1') {
    b.style.height = 'auto';
    b.style.width = '300px';
  }
}

function savePublish() {
  // Figer toutes les positions avant enregistrement
  document.querySelectorAll('.bloc').forEach(b => {
    const x = parseFloat(b.getAttribute('data-x') || '0');
    const y = parseFloat(b.getAttribute('data-y') || '0');
    const left = (parseFloat(b.style.left || '0') + x);
    const top = (parseFloat(b.style.top || '0') + y);
    b.style.left = left + 'px';
    b.style.top = top + 'px';
    b.style.transform = '';
    b.removeAttribute('data-x');
    b.removeAttribute('data-y');
  });

  // 🔥 Supprime les boutons d'édition avant sauvegarde
  document.querySelectorAll('.tools').forEach(t => t.remove());

  // 🔥 Supprime le contenteditable (sinon tout reste modifiable)
  document.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));

  const html = document.getElementById('editor').innerHTML;
  const fd = new FormData();
  fd.append('id', new URLSearchParams(location.search).get('id'));
  fd.append('contenu', html);
  fd.append('publish', '1');

  fetch('/Archives7e/includes/save_layout.php', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        alert('✅ Rapport mis en page et publié');
        location.href = '/Archives7e/rapport.php?id=' + new URLSearchParams(location.search).get('id');
      } else {
        alert('❌ Erreur : ' + res.error);
      }
    })
    .catch(e => alert('⚠️ ' + e));
}


