(function () {
  // Sidebar routing: navigate to Complaint Status when clicked
  const nav = document.querySelector('.nav');
  if (!nav) return;
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
    if (target === '#submit-complaint') {
      window.location.href = './create-complaint.html';
      return;
    }
  });
})();

(function () {
  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
  const panels = {
    personal: document.getElementById('tab-personal'),
    marital: document.getElementById('tab-marital'),
    children: document.getElementById('tab-children')
  };

  const activate = (key) => {
    // Buttons
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === key;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      // Manage tabindex for accessibility
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    // Panels
    Object.entries(panels).forEach(([k, el]) => {
      if (!el) return;
      if (k === key) {
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => activate(btn.dataset.tab));
    // Keyboard support: Left/Right arrows
    btn.addEventListener('keydown', (e) => {
      const idx = tabButtons.indexOf(btn);
      if (e.key === 'ArrowRight') {
        const next = tabButtons[(idx + 1) % tabButtons.length];
        next.focus();
        activate(next.dataset.tab);
      } else if (e.key === 'ArrowLeft') {
        const prev = tabButtons[(idx - 1 + tabButtons.length) % tabButtons.length];
        prev.focus();
        activate(prev.dataset.tab);
      }
    });
  });

  // Initialize default tab
  activate('personal');
})();

// Edit Profile logic for Personal Information
(function () {
  const personalPanel = document.getElementById('tab-personal');
  if (!personalPanel) return;

  const grid = personalPanel.querySelector('.info-grid');
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  if (!grid || !editBtn || !saveBtn || !cancelBtn) return;

  let original = null; // store original values during edit
  let editing = false;

  const typeFor = (label) => {
    const k = (label || '').toLowerCase();
    if (k.includes('phone')) return 'tel';
    if (k.includes('date')) return 'text'; // keep as text to avoid parsing format
    if (k.includes('family')) return 'number';
    return 'text';
  };

  const enterEdit = () => {
    if (editing) return;
    editing = true;
    original = {};

    const rows = grid.querySelectorAll('.info-row');
    rows.forEach((row) => {
      const keyEl = row.querySelector('.info-key');
      const valEl = row.querySelector('.info-val');
      if (!keyEl || !valEl) return;
      const label = (keyEl.textContent || '').trim();
      const value = (valEl.textContent || '').trim();
      original[label] = value;

      const input = document.createElement('input');
      input.className = 'info-input';
      input.type = typeFor(label);
      input.value = value;
      if (input.type === 'number') input.min = '0';

      // Replace value span with input
      valEl.replaceWith(input);
    });

    // Toggle buttons
    editBtn.hidden = true;
    saveBtn.hidden = false;
    cancelBtn.hidden = false;
  };

  const exitEdit = (applyChanges) => {
    if (!editing) return;
    const rows = grid.querySelectorAll('.info-row');
    rows.forEach((row) => {
      const keyEl = row.querySelector('.info-key');
      if (!keyEl) return;
      const label = (keyEl.textContent || '').trim();
      const currentField = row.querySelector('input.info-input');

      const span = document.createElement('span');
      span.className = 'info-val';
      if (applyChanges && currentField) {
        span.textContent = currentField.value.trim();
      } else {
        span.textContent = original && original[label] != null ? original[label] : '';
      }
      if (currentField) currentField.replaceWith(span);
    });

    // Toggle buttons back
    editBtn.hidden = false;
    saveBtn.hidden = true;
    cancelBtn.hidden = true;
    editing = false;
    original = null;
  };

  editBtn.addEventListener('click', enterEdit);
  saveBtn.addEventListener('click', () => exitEdit(true));
  cancelBtn.addEventListener('click', () => exitEdit(false));
})();
