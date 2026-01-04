// Placeholder for future dashboard interactions
(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;

    const target = btn.getAttribute('data-target');
    // Basic routing: navigate to dedicated pages
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
      window.location.href = './complaint-status.html';
      return;
    }
    if (target === '#aid-services') {
      window.location.href = './aid-services.html';
      return;
    }
    if (target === '#qr-code') {
      // Open QR modal and generate code
      if (window.__openQrModal) window.__openQrModal();
      return;
    }
    if (target === '#logout') {
      if (window.__openLogoutModal) window.__openLogoutModal();
      return;
    }
    // In a later step, we can route or scroll to sections for other targets
    console.log('Navigate to:', target);
  });
})();

// Persist Slum ID for use across pages (QR generation)
(function () {
  try {
    const idEl = document.querySelector('.slum-id');
    if (!idEl) return;
    const txt = (idEl.textContent || '').trim();
    const m = txt.match(/Slum ID:\s*(\S+)/i);
    if (m && m[1]) {
      localStorage.setItem('slumId', m[1]);
    }
  } catch {}
})();

// Complaint Modal interactions
(function () {
  const modal = document.getElementById('complaintModal');
  const titleEl = document.getElementById('modalTitle');
  const categoryEl = document.getElementById('modalCategory');
  const statusEl = document.getElementById('modalStatus');
  const descriptionEl = document.getElementById('modalDescription');
  const downloadComplaintBtn = document.getElementById('downloadComplaintBtn');
  const modalContent = modal ? modal.querySelector('.modal-content') : null;

  if (!modal) return;

  const statusClassFor = (statusText) => {
    if (!statusText) return '';
    const s = statusText.trim().toLowerCase();
    if (s.includes('progress')) return 'in-progress';
    if (s.includes('resolve')) return 'resolved';
    return 'pending';
  };

  const openModal = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };
  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  const sanitize = (s) => (s || '').toString();

  const populateModal = (data) => {
    const title = sanitize(data.title);
    const category = sanitize(data.category);
    // Area/location removed per requirements
    const status = sanitize(data.status);
    const description = sanitize(data.description);
    const attachment = sanitize(data.attachment);
    const attachmentName = sanitize(data.attachmentName);

    titleEl.textContent = title || 'Complaint';
    categoryEl.textContent = category || '';
    descriptionEl.textContent = description || '';

    statusEl.textContent = status || '';
    statusEl.className = 'status-badge ' + statusClassFor(status);

    // Attachment download removed; will embed image into PDF if available.

    // Bind complaint download action
    downloadComplaintBtn.onclick = async () => {
      try {
        let jspdfNS = window.jspdf || {};
        let jsPDF = jspdfNS.jsPDF;
        if (!jsPDF) {
          // Fallback loader from alternate CDN
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

        // Location omitted in PDF

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
          // Add spacing before image
          y += 18;
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 56;
          const maxW = pageWidth - margin * 2;
          // Load image to get dimensions
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = attachment;
          });
          const scale = Math.min(maxW / img.width, 300 / img.height); // cap height to ~300pt
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

  // Base dummy complaints (initial dashboard state before any submission)
  const staticComplaints = [
    {
      title: 'Water Supply Issue',
      category: 'Water Management',
      area: 'Hasan Nagar, Sector 3',
      status: 'Pending',
      description:
        'Water supply has been irregular for the past week with low pressure during peak hours. Residents are facing difficulties accessing clean water for daily needs.',
      attachment: ''
    },
    {
      title: 'Street Light Not Working',
      category: 'Electricity',
      area: 'Hasan Nagar, Sector 1',
      status: 'In Progress',
      description:
        'Multiple street lights have stopped working for 5 days, causing safety concerns at night. Local authority has acknowledged and initiated repairs.',
      attachment: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    }
  ];

  // Build the Recent Complaint list:
  // - If there are submissions, show newest on top and previous top second.
  // - If only one submission exists, second is the original static top.
  // - If none exist, show the original two static complaints.
  let complaints = [];
  try {
    const rawArr = localStorage.getItem('submittedComplaints');
    const arr = rawArr ? JSON.parse(rawArr) || [] : [];
    if (arr.length >= 2) {
      complaints = [arr[0], arr[1]];
    } else if (arr.length === 1) {
      complaints = [arr[0], staticComplaints[0]];
    } else {
      complaints = staticComplaints.slice(0, 2);
    }
  } catch (err) {
    console.warn('Failed to read submittedComplaints, falling back to static:', err);
    complaints = staticComplaints.slice(0, 2);
  }

  const listEl = document.querySelector('.complaint-list');
  if (listEl) {
    listEl.innerHTML = '';
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

  // Close when clicking outside the modal content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Prevent overlay close when clicking inside content
  if (modalContent) {
    modalContent.addEventListener('click', (e) => e.stopPropagation());
  }

  // Optional: ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
})();

// Wire "View Profile" quick action button to profile page
(function () {
  const cards = document.querySelectorAll('.action-card');
  cards.forEach((card) => {
    const titleEl = card.querySelector('.action-title');
    const btn = card.querySelector('.action-btn');
    if (!titleEl || !btn) return;
    const title = (titleEl.textContent || '').trim().toLowerCase();
    if (title.includes('my profile')) {
      btn.addEventListener('click', () => {
        window.location.href = './profile.html';
      });
    }
    if (title.includes('submit complaint')) {
      btn.addEventListener('click', () => {
        window.location.href = './create-complaint.html';
      });
    }
    if (title.includes('complaint status')) {
      btn.addEventListener('click', () => {
        window.location.href = './complaint-status.html';
      });
    }
    if (title.includes('aids and services')) {
      btn.addEventListener('click', () => {
        window.location.href = './aid-services.html';
      });
    }
    if (title.includes('qr code')) {
      btn.addEventListener('click', () => {
        if (window.__openQrModal) window.__openQrModal();
      });
    }
  });
})();

// QR code modal is provided by shared qr.js (window.__openQrModal)
