(function () {
  // Sidebar routing: enable navigation to Complaint Status and Dashboard
  const nav = document.querySelector('.nav');
  if (nav) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const target = btn.getAttribute('data-target');
      if (target === '#complaint-status') {
        window.location.href = './complaint-status.html';
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
      if (target === '#dashboard') {
        window.location.href = './dashboard.html';
        return;
      }
    });
  }

  const form = document.getElementById('complaintForm');
  const modal = document.getElementById('confirmModal');
  const confirmBtn = document.getElementById('confirmSubmitBtn');
  const cancelBtn = document.getElementById('cancelSubmitBtn');
  if (!form || !modal || !confirmBtn || !cancelBtn) return;

  let pendingSubmission = null;
  let pendingFile = null;

  const openModal = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = (form.title.value || '').trim();
    const category = (form.category.value || '').trim();
    const description = (form.description.value || '').trim();
    const evidenceFile = form.evidence && form.evidence.files ? form.evidence.files[0] : null;

    if (!title || !category || !description) {
      alert('Please fill out all required fields (Title, Category, Description).');
      return;
    }

    // Cache submission for confirm
    pendingSubmission = {
      title,
      category,
      area: '',
      status: 'Pending',
      description,
      attachmentName: evidenceFile ? (evidenceFile.name || 'evidence') : ''
    };
    pendingFile = evidenceFile || null;
    openModal();
  });

  confirmBtn.addEventListener('click', () => {
    if (!pendingSubmission) { closeModal(); return; }

    const persistAndNavigate = (submission) => {
      try {
        // Append to submittedComplaints array
        const rawArr = localStorage.getItem('submittedComplaints');
        const arr = rawArr ? JSON.parse(rawArr) || [] : [];
        const entry = {
          title: submission.title || 'Complaint',
          category: submission.category || 'General',
          status: submission.status || 'Pending',
          description: submission.description || '—',
          attachment: submission.attachmentDataUrl || '',
          attachmentName: submission.attachmentName || '',
          createdAt: new Date().toISOString()
        };
        // Put newest complaint at the top
        arr.unshift(entry);
        localStorage.setItem('submittedComplaints', JSON.stringify(arr));

        // Maintain lastSubmittedComplaint for dashboard ordering behavior
        localStorage.setItem('lastSubmittedComplaint', JSON.stringify(submission));

        alert('Complaint submitted successfully.');
        form.reset();
        closeModal();
        window.location.href = './dashboard.html';
      } catch (err) {
        console.error('Failed to store complaint:', err);
        alert('Failed to submit complaint.');
        closeModal();
      }
    };

    // If there is an evidence file, read it as a Data URL for download later
    if (pendingFile) {
      const reader = new FileReader();
      reader.onload = () => {
        pendingSubmission.attachmentDataUrl = reader.result;
        persistAndNavigate(pendingSubmission);
      };
      reader.onerror = () => {
        console.warn('Failed to read attachment, submitting without file.');
        persistAndNavigate(pendingSubmission);
      };
      reader.readAsDataURL(pendingFile);
    } else {
      persistAndNavigate(pendingSubmission);
    }
  });

  cancelBtn.addEventListener('click', () => {
    closeModal();
  });

  // Close when clicking outside content
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
})();
