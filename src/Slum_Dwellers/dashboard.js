// Placeholder for future dashboard interactions
(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;

    const target = btn.getAttribute('data-target');
    // In a later step, we can route or scroll to sections.
    console.log('Navigate to:', target);
  });
})();

// Complaint Modal interactions
(function () {
  const modal = document.getElementById('complaintModal');
  const titleEl = document.getElementById('modalTitle');
  const categoryEl = document.getElementById('modalCategory');
  const areaEl = document.getElementById('modalArea');
  const statusEl = document.getElementById('modalStatus');
  const descriptionEl = document.getElementById('modalDescription');
  const downloadAttachmentBtn = document.getElementById('downloadAttachmentBtn');
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
    const area = sanitize(data.area);
    const status = sanitize(data.status);
    const description = sanitize(data.description);
    const attachment = sanitize(data.attachment);

    titleEl.textContent = title || 'Complaint';
    categoryEl.textContent = category || '';
    areaEl.textContent = area || '';
    descriptionEl.textContent = description || '';

    statusEl.textContent = status || '';
    statusEl.className = 'status-badge ' + statusClassFor(status);

    if (attachment) {
      downloadAttachmentBtn.setAttribute('href', attachment);
      downloadAttachmentBtn.setAttribute('download', title ? `${title.replace(/[^a-z0-9\-_]+/gi, '_')}_evidence.pdf` : 'evidence.pdf');
      downloadAttachmentBtn.removeAttribute('aria-disabled');
      downloadAttachmentBtn.setAttribute('target', '_blank');
    } else {
      downloadAttachmentBtn.setAttribute('href', '#');
      downloadAttachmentBtn.setAttribute('aria-disabled', 'true');
      downloadAttachmentBtn.removeAttribute('target');
      downloadAttachmentBtn.removeAttribute('download');
    }

    // Bind complaint download action
    downloadComplaintBtn.onclick = () => {
      try {
        const jspdfNS = window.jspdf || {};
        const jsPDF = jspdfNS.jsPDF;
        if (!jsPDF) {
          alert('PDF generator not available. Please check your internet connection.');
          return;
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
        doc.text('Location:', 56, y);
        doc.setFont('helvetica', 'normal');
        doc.text(area || '-', 126, y);
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

        const fileName = `Complaint_${(title || 'details').replace(/[^a-z0-9\-_]+/gi, '_')}.pdf`;
        doc.save(fileName);
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        alert('Failed to generate PDF.');
      }
    };
  };

  // Render complaint cards with dummy data (replace this with DB data later)
  const complaints = [
    {
      title: 'Water Supply Issue',
      category: 'Water Management',
      area: 'Hasan Nagar, Sector 3',
      status: 'Pending',
      description:
        'Water supply has been irregular for the past week with low pressure during peak hours. Residents are facing difficulties accessing clean water for daily needs.',
      attachment: '' // Provide a PDF URL to enable attachment download
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
