(function () {
  // Inject QR modal if missing
  function injectQrModal() {
    if (document.getElementById('qrModal')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="complaint-modal" id="qrModal" aria-hidden="true">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="qrModalTitle">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-title" id="qrModalTitle">Your QR Code</div>
              <div class="modal-category" id="qrModalSubtitle">Scan to share your Slum ID</div>
            </div>
          </div>
          <div class="modal-body">
            <div class="modal-description-card" style="display:flex; align-items:center; justify-content:center;">
              <div id="qrContainer" aria-label="Generated QR Code"></div>
            </div>
          </div>
          <div class="modal-actions">
            <button id="downloadQrBtn" class="btn primary" type="button">Download QR</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper.firstElementChild);
  }

  async function ensureQRCodeLib() {
    if (window.QRCode) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    }).catch(async () => {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    });
    if (!window.QRCode) throw new Error('QRCode library unavailable');
  }

  function getSlumId() {
    // Prefer stored ID, then DOM, then default
    try {
      const stored = sessionStorage.getItem('slumId');
      if (stored) return stored;
    } catch {}
    const idEl = document.querySelector('.slum-id');
    let slumId = 'HSN01348';
    if (idEl) {
      const txt = (idEl.textContent || '').trim();
      const m = txt.match(/Slum ID:\s*(\S+)/i);
      if (m && m[1]) slumId = m[1];
    }
    return slumId;
  }

  function openModal() {
    const modal = document.getElementById('qrModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    const modal = document.getElementById('qrModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function generateQr() {
    await ensureQRCodeLib();
    const container = document.getElementById('qrContainer');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    const slumId = getSlumId();
    const text = `SLUMLINK-ID:${slumId}`;
    // eslint-disable-next-line no-undef
    new QRCode(container, {
      text,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  function wireCloseAndDownload() {
    const modal = document.getElementById('qrModal');
    const modalContent = modal ? modal.querySelector('.modal-content') : null;
    const downloadBtn = document.getElementById('downloadQrBtn');

    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    if (modalContent) modalContent.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('keydown', (e) => {
      const m = document.getElementById('qrModal');
      if (e.key === 'Escape' && m && m.classList.contains('open')) closeModal();
    });

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        try {
          const container = document.getElementById('qrContainer');
          if (!container) return;
          const canvas = container.querySelector('canvas');
          let dataUrl = '';
          if (canvas && canvas.toDataURL) {
            dataUrl = canvas.toDataURL('image/png');
          } else {
            const img = container.querySelector('img');
            if (img && img.src) dataUrl = img.src;
          }
          if (!dataUrl) {
            alert('QR image not available for download.');
            return;
          }
          const a = document.createElement('a');
          a.href = dataUrl;
          const slumId = getSlumId();
          a.download = slumId !== 'UNKNOWN' ? `SlumLink_QR_${slumId}.png` : 'SlumLink_QR.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (err) {
          console.error('Failed to download QR:', err);
          alert('Failed to download QR code.');
        }
      });
    }
  }

  // Public API
  window.__openQrModal = async function () {
    try {
      injectQrModal();
      await generateQr();
      wireCloseAndDownload();
      openModal();
    } catch (err) {
      console.error('QR modal open failed:', err);
      alert('Failed to generate QR code.');
    }
  };
})();
