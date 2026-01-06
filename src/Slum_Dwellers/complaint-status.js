(function () {
  // Sidebar navigation routing
  const nav = document.querySelector('.nav');
  if (nav) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const target = btn.getAttribute('data-target');
      if (target === '#dashboard') {
        window.location.href = './dashboard.html';
        return;
      }
      if (target === '#profile') {
        window.location.href = './profile.html';
        return;
      }
      if (target === '#submit-complaint') {
        window.location.href = './create-complaint.html';
        return;
      }
      if (target === '#complaint-status') {
        // Already here
        return;
      }
      if (target === '#aid-services') {
        window.location.href = './aid-services.html';
        return;
      }
      if (target === '#qr-code') {
        if (window.__openQrModal) window.__openQrModal();
        return;
      }
      if (target === '#logout') {
        if (window.__openLogoutModal) window.__openLogoutModal();
        return;
      }
      console.log('Navigate to:', target);
    });
  }

  // Modal and PDF handling
  const modal = document.getElementById('complaintModal');
  const titleEl = document.getElementById('modalTitle');
  const categoryEl = document.getElementById('modalCategory');
  const statusEl = document.getElementById('modalStatus');
  const descriptionEl = document.getElementById('modalDescription');
  const downloadComplaintBtn = document.getElementById('downloadComplaintBtn');
  const modalContent = modal ? modal.querySelector('.modal-content') : null;

  const statusClassFor = (statusText) => {
    if (!statusText) return '';
    const s = statusText.trim().toLowerCase();
    if (s.includes('progress')) return 'in-progress';
    if (s.includes('resolve')) return 'resolved';
    return 'pending';
  };

  const openModal = () => {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  const sanitize = (s) => (s || '').toString();

  const populateModal = (data) => {
    const title = sanitize(data.title);
    const category = sanitize(data.category);
    const status = sanitize(data.status);
    const description = sanitize(data.description);
    const attachment = sanitize(data.attachment);

    titleEl.textContent = title || 'Complaint';
    categoryEl.textContent = category || '';
    descriptionEl.textContent = description || '';

    statusEl.textContent = status || '';
    statusEl.className = 'status-badge ' + statusClassFor(status);

    downloadComplaintBtn.onclick = async () => {
      try {
        let jspdfNS = window.jspdf || {};
        let jsPDF = jspdfNS.jsPDF;
        if (!jsPDF) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          jspdfNS = window.jspdf || {};
          jsPDF = jspdfNS.jsPDF;
          if (!jsPDF) {
            alert('PDF generator not available. Please check your internet connection.');
            return;
          }
        }
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        let y = 56;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Complaint Details', 56, y);
        y += 28;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Title:', 56, y);
        doc.setFont('helvetica', 'normal');
        doc.text(title || '-', 110, y);
        y += 22;

        doc.setFont('helvetica', 'bold');
        doc.text('Category:', 56, y);
        doc.setFont('helvetica', 'normal');
        doc.text(category || '-', 130, y);
        y += 22;

        doc.setFont('helvetica', 'bold');
        doc.text('Status:', 56, y);
        doc.setFont('helvetica', 'normal');
        doc.text(status || '-', 112, y);
        y += 30;

        doc.setFont('helvetica', 'bold');
        doc.text('Description:', 56, y);
        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const text = description || '-';
        const wrapped = doc.splitTextToSize(text, 480);
        doc.text(wrapped, 56, y);

        // Embed attachment image if provided and is an image data URL
        if (attachment && /^data:image\//i.test(attachment)) {
          y += 18;
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 56;
          const maxW = pageWidth - margin * 2;
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = attachment;
          });
          const scale = Math.min(maxW / img.width, 300 / img.height);
          const drawW = Math.max(1, img.width * scale);
          const drawH = Math.max(1, img.height * scale);
          const format = attachment.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(attachment, format, margin, y, drawW, drawH);
          y += drawH;
        }

        const fileName = `Complaint_${(title || 'details').replace(/[^a-z0-9\-_]+/gi, '_')}.pdf`;
        doc.save(fileName);
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        alert('Failed to generate PDF.');
      }
    };
  };

  // Load only the signed-in user's complaints from localStorage
  let complaints = [];
  try {
    const currentRaw = localStorage.getItem('SLUMLINK_CURRENT_USER');
    const current = currentRaw ? JSON.parse(currentRaw) : null;
    const userId = current && current.id ? String(current.id) : '';
    if (userId) {
      const byUserRaw = localStorage.getItem('submittedComplaintsByUser');
      const map = byUserRaw ? JSON.parse(byUserRaw) : {};
      complaints = Array.isArray(map[userId]) ? map[userId] : [];
    } else {
      complaints = [];
    }
  } catch (err) {
    console.warn('Failed to read per-user complaints:', err);
    complaints = [];
  }

  // Ensure newest complaints appear at the top
  try {
    complaints.sort((a, b) => {
      const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta; // descending by createdAt
    });
  } catch (err) {
    console.warn('Failed to sort complaints:', err);
  }

  // Render list
  const listEl = document.getElementById('statusComplaintList');
  if (listEl) {
    listEl.innerHTML = '';
    if (!complaints.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No complaints submitted yet.';
      empty.style.color = '#444';
      listEl.appendChild(empty);
    } else {
      complaints.forEach((c) => {
        const card = document.createElement('div');
        card.className = 'complaint-card';

        const title = document.createElement('div');
        title.className = 'complaint-title';
        title.textContent = c.title;

        const cat = document.createElement('div');
        cat.className = 'complaint-category';
        cat.textContent = c.category;

        const status = document.createElement('div');
        const sClass = 'status-badge ' + statusClassFor(c.status);
        status.className = sClass;
        status.textContent = c.status;

        card.appendChild(title);
        card.appendChild(cat);
        card.appendChild(status);

        card.addEventListener('click', () => {
          populateModal(c);
          openModal();
        });

        listEl.appendChild(card);
      });
    }
  }

  // Modal close interactions
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  if (modalContent) {
    modalContent.addEventListener('click', (e) => e.stopPropagation());
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeModal();
  });
})();
