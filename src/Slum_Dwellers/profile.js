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

// Helper functions
function safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }

// Show success toast for profile updates
function showProfileUpdateToast() {
  // Remove any existing toast
  const existing = document.querySelector('.profile-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'profile-toast';
  toast.innerHTML = [
    '<span class="icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
        '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
      '</svg>',
    '</span>',
    '<div class="toast-content">',
      '<strong>Success</strong>',
      '<div class="subtitle">Profile Updated Successfully</div>',
    '</div>'
  ].join('');
  document.body.appendChild(toast);

  // Auto-dismiss after 2.5s
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => { try { toast.remove(); } catch {} }, 350);
  }, 2500);
}

// Resolve slum name from area for SLUMLINK_APPLICATIONS
function resolveSlumFromArea(area){
  const a = String(area || '').toLowerCase().trim();
  const clean = a.replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');
  const map = new Map([
    ['korail','Korail'],
    ['begun bari','Begun Bari'],
    ['begunbari','Begun Bari'],
    ['molla','Molla'],
    ['duaripara','DuariPara'],
    ['duari para','DuariPara'],
    ['kallyanpur','Kallyanpur'],
    ['pora basti','Pora Basti'],
    ['porabasti','Pora Basti'],
    ['pura','Pura'],
    ['nubur','Nubur'],
    ['mannan','Mannan'],
    ['basbari','Basbari'],
    ['chalantika','Chalantika'],
    ['nama para','Nama Para'],
    ['namapara','Nama Para'],
  ]);
  if (map.has(clean)) return map.get(clean);
  for (const [key, val] of map.entries()) { if (clean.includes(key)) return val; }
  return '';
}

// Income range options for dropdown
const incomeRangeOptions = [
  { value: 'No Income', label: 'No Income' },
  { value: 'Less than ৳3,000', label: 'Less than ৳3,000' },
  { value: '৳3,000 – ৳5,000', label: '৳3,000 – ৳5,000' },
  { value: '৳5,001 – ৳9,999', label: '৳5,001 – ৳9,999' },
  { value: '৳10,000 and above', label: '৳10,000 and above' },
];

// Get current user and application data
function getCurrentUserApp() {
  const currentRaw = localStorage.getItem('SLUMLINK_CURRENT_USER');
  const current = currentRaw ? safeJsonParse(currentRaw, null) : null;
  if (!current) return { current: null, app: null, apps: [], appIndex: -1 };

  const appsRaw = localStorage.getItem('SLUMLINK_APPLICATIONS');
  const apps = appsRaw ? safeJsonParse(appsRaw, []) : [];
  const appIndex = apps.findIndex(a => String(a.id || '') === String(current.id || ''));
  const app = appIndex >= 0 ? apps[appIndex] : null;
  
  return { current, app, apps, appIndex };
}

// Save updated application back to localStorage
function saveApplication(apps) {
  localStorage.setItem('SLUMLINK_APPLICATIONS', JSON.stringify(apps));
}

// Populate profile data from localStorage for the signed-in user
(function(){
  const { current, app } = getCurrentUserApp();
  if (!current) return;

  const personalPanel = document.getElementById('tab-personal');
  const maritalPanel = document.getElementById('tab-marital');
  const childrenPanel = document.getElementById('tab-children');
  const personalGrid = personalPanel?.querySelector('.info-grid');
  const spouseList = maritalPanel?.querySelector('.spouse-list');
  const childrenList = childrenPanel?.querySelector('.children-list');

  const personal = app?.data?.personal || {};
  const marital = app?.data?.marital || {};
  const kids = app?.data?.children || {};

  // Render Personal Information
  if (personalGrid){
    const rows = [
      { key: 'Full Name', val: personal.fullName || current.name || '', editable: false },
      { key: 'Phone Number', val: personal.mobile || current.mobile || '', editable: true, field: 'mobile' },
      { key: 'Gender', val: personal.gender || '', editable: false },
      { key: 'Date of Birth', val: personal.dob || '', editable: false },
      { key: 'Occupation', val: personal.occupation || '', editable: true, field: 'occupation' },
      { key: 'Education', val: personal.education || '', editable: true, field: 'education' },
      { key: 'Income Range', val: personal.income || '', editable: true, field: 'income', type: 'select' },
      { key: 'Area', val: personal.area || '', editable: true, field: 'area' },
      { key: 'District', val: personal.district || '', editable: true, field: 'district' },
      { key: 'Division', val: personal.division || '', editable: true, field: 'division' },
      { key: 'Family Members', val: personal.members || '', editable: false },
    ];
    personalGrid.innerHTML = rows.map(r => `
      <div class="info-row" data-field="${r.field || ''}" data-editable="${r.editable}" data-type="${r.type || 'text'}">
        <span class="info-key">${r.key}</span>
        <span class="info-val">${r.val || '—'}</span>
      </div>
    `).join('');
  }

  // Render Marital Information (spouses)
  if (spouseList){
    const spouses = Array.isArray(marital.spouses) ? marital.spouses : [];
    if (!spouses.length){
      spouseList.innerHTML = '<div class="empty">No spouse information available.</div>';
    } else {
      spouseList.innerHTML = spouses.map((s, idx) => `
        <div class="spouse-card" data-spouse-index="${idx}">
          <div class="spouse-header">
            <div class="spouse-name">${s.name || 'Spouse ' + (idx+1)}</div>
            <div class="card-actions">
              <button class="btn primary edit-spouse-btn" type="button">Edit Profile</button>
              <button class="btn primary save-spouse-btn" type="button" hidden>Save</button>
              <button class="btn outlined cancel-spouse-btn" type="button" hidden>Cancel</button>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-row" data-field="name" data-editable="false"><span class="info-key">Name</span><span class="info-val">${s.name || '—'}</span></div>
            <div class="info-row" data-field="dob" data-editable="false"><span class="info-key">Date of Birth</span><span class="info-val">${s.dob || '—'}</span></div>
            <div class="info-row" data-field="gender" data-editable="false"><span class="info-key">Gender</span><span class="info-val">${s.gender || '—'}</span></div>
            <div class="info-row" data-field="mobile" data-editable="true"><span class="info-key">Phone Number</span><span class="info-val">${s.mobile || '—'}</span></div>
            <div class="info-row" data-field="education" data-editable="true"><span class="info-key">Education</span><span class="info-val">${s.education || '—'}</span></div>
            <div class="info-row" data-field="job" data-editable="true"><span class="info-key">Occupation</span><span class="info-val">${s.job || '—'}</span></div>
            <div class="info-row" data-field="income" data-editable="true" data-type="select"><span class="info-key">Income Range</span><span class="info-val">${s.income || '—'}</span></div>
          </div>
        </div>
      `).join('');
    }
  }

  // Render Children Information
  if (childrenList){
    const children = Array.isArray(kids.children) ? kids.children : [];
    if (!children.length){
      childrenList.innerHTML = '<div class="empty">No children information available.</div>';
    } else {
      childrenList.innerHTML = children.map((c, idx) => `
        <div class="child-card" data-child-index="${idx}">
          <div class="child-header">
            <div class="child-name">${c.name || 'Child ' + (idx+1)}</div>
            <div class="card-actions">
              <button class="btn primary edit-child-btn" type="button">Edit Profile</button>
              <button class="btn primary save-child-btn" type="button" hidden>Save</button>
              <button class="btn outlined cancel-child-btn" type="button" hidden>Cancel</button>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-row" data-field="name" data-editable="false"><span class="info-key">Name</span><span class="info-val">${c.name || '—'}</span></div>
            <div class="info-row" data-field="dob" data-editable="false"><span class="info-key">Date of Birth</span><span class="info-val">${c.dob || '—'}</span></div>
            <div class="info-row" data-field="education" data-editable="true"><span class="info-key">Education</span><span class="info-val">${c.education || '—'}</span></div>
            <div class="info-row" data-field="job" data-editable="true"><span class="info-key">Occupation</span><span class="info-val">${c.job || '—'}</span></div>
            <div class="info-row" data-field="income" data-editable="true" data-type="select"><span class="info-key">Income Range</span><span class="info-val">${c.income || '—'}</span></div>
            <div class="info-row" data-field="preferredJob" data-editable="true"><span class="info-key">Preferred Job</span><span class="info-val">${c.preferredJob || '—'}</span></div>
          </div>
        </div>
      `).join('');
    }
  }
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

  let original = {}; // store original values during edit
  let editing = false;

  const enterEdit = () => {
    if (editing) return;
    editing = true;
    original = {};

    const rows = grid.querySelectorAll('.info-row');
    rows.forEach((row) => {
      const valEl = row.querySelector('.info-val');
      if (!valEl) return;
      const field = row.dataset.field || '';
      const isEditable = row.dataset.editable === 'true';
      const type = row.dataset.type || 'text';
      const value = (valEl.textContent || '').trim();
      original[field] = value === '—' ? '' : value;

      if (isEditable) {
        let inputEl;
        if (type === 'select') {
          inputEl = document.createElement('select');
          inputEl.className = 'info-input';
          inputEl.innerHTML = incomeRangeOptions.map(opt => 
            `<option value="${opt.value}" ${(original[field] === opt.value || original[field] === opt.label) ? 'selected' : ''}>${opt.label}</option>`
          ).join('');
        } else {
          inputEl = document.createElement('input');
          inputEl.className = 'info-input';
          inputEl.type = field === 'mobile' ? 'tel' : 'text';
          inputEl.value = original[field];
        }
        valEl.replaceWith(inputEl);
      }
    });

    // Toggle buttons
    editBtn.hidden = true;
    saveBtn.hidden = false;
    cancelBtn.hidden = false;
  };

  const exitEdit = (applyChanges) => {
    if (!editing) return;
    
    const rows = grid.querySelectorAll('.info-row');
    const newValues = {};
    
    rows.forEach((row) => {
      const field = row.dataset.field || '';
      const isEditable = row.dataset.editable === 'true';
      const currentField = row.querySelector('.info-input');

      const span = document.createElement('span');
      span.className = 'info-val';
      
      if (applyChanges && currentField && isEditable) {
        const newVal = currentField.value.trim();
        newValues[field] = newVal;
        span.textContent = newVal || '—';
      } else {
        span.textContent = original[field] || '—';
      }
      
      if (currentField) currentField.replaceWith(span);
    });

    // Save to localStorage if applying changes
    if (applyChanges && Object.keys(newValues).length > 0) {
      const { apps, appIndex } = getCurrentUserApp();
      if (appIndex >= 0) {
        const app = apps[appIndex];
        const oldArea = app.data?.personal?.area || '';
        
        // Update personal data
        if (!app.data) app.data = {};
        if (!app.data.personal) app.data.personal = {};
        
        Object.keys(newValues).forEach(field => {
          app.data.personal[field] = newValues[field];
        });
        
        // If area changed, update slum name
        const newArea = newValues.area || app.data.personal.area || '';
        if (newArea && newArea !== oldArea) {
          const newSlum = resolveSlumFromArea(newArea) || newArea;
          app.slum = newSlum;
        }
        
        saveApplication(apps);
        showProfileUpdateToast();
      }
    }

    // Toggle buttons back
    editBtn.hidden = false;
    saveBtn.hidden = true;
    cancelBtn.hidden = true;
    editing = false;
    original = {};
  };

  editBtn.addEventListener('click', enterEdit);
  saveBtn.addEventListener('click', () => exitEdit(true));
  cancelBtn.addEventListener('click', () => exitEdit(false));
})();

// Edit Profile logic for Spouse Information
(function () {
  const maritalPanel = document.getElementById('tab-marital');
  if (!maritalPanel) return;

  const spouseList = maritalPanel.querySelector('.spouse-list');
  if (!spouseList) return;

  spouseList.addEventListener('click', (e) => {
    const card = e.target.closest('.spouse-card');
    if (!card) return;
    const spouseIndex = parseInt(card.dataset.spouseIndex, 10);
    
    const editBtn = card.querySelector('.edit-spouse-btn');
    const saveBtn = card.querySelector('.save-spouse-btn');
    const cancelBtn = card.querySelector('.cancel-spouse-btn');
    const grid = card.querySelector('.info-grid');

    if (e.target.closest('.edit-spouse-btn')) {
      // Enter edit mode
      const original = {};
      const rows = grid.querySelectorAll('.info-row');
      
      rows.forEach((row) => {
        const valEl = row.querySelector('.info-val');
        if (!valEl) return;
        const field = row.dataset.field || '';
        const isEditable = row.dataset.editable === 'true';
        const type = row.dataset.type || 'text';
        const value = (valEl.textContent || '').trim();
        original[field] = value === '—' ? '' : value;

        if (isEditable) {
          let inputEl;
          if (type === 'select') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input';
            inputEl.innerHTML = incomeRangeOptions.map(opt => 
              `<option value="${opt.value}" ${(original[field] === opt.value || original[field] === opt.label) ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
          } else {
            inputEl = document.createElement('input');
            inputEl.className = 'info-input';
            inputEl.type = field === 'mobile' ? 'tel' : 'text';
            inputEl.value = original[field];
          }
          valEl.replaceWith(inputEl);
        }
      });

      card._original = original;
      editBtn.hidden = true;
      saveBtn.hidden = false;
      cancelBtn.hidden = false;
    }

    if (e.target.closest('.save-spouse-btn')) {
      // Save changes
      const rows = grid.querySelectorAll('.info-row');
      const newValues = {};
      
      rows.forEach((row) => {
        const field = row.dataset.field || '';
        const isEditable = row.dataset.editable === 'true';
        const currentField = row.querySelector('.info-input');

        const span = document.createElement('span');
        span.className = 'info-val';
        
        if (currentField && isEditable) {
          const newVal = currentField.value.trim();
          newValues[field] = newVal;
          span.textContent = newVal || '—';
        } else {
          span.textContent = (card._original && card._original[field]) || '—';
        }
        
        if (currentField) currentField.replaceWith(span);
      });

      // Save to localStorage
      if (Object.keys(newValues).length > 0) {
        const { apps, appIndex } = getCurrentUserApp();
        if (appIndex >= 0) {
          const app = apps[appIndex];
          if (!app.data) app.data = {};
          if (!app.data.marital) app.data.marital = {};
          if (!app.data.marital.spouses) app.data.marital.spouses = [];
          
          if (app.data.marital.spouses[spouseIndex]) {
            Object.keys(newValues).forEach(field => {
              app.data.marital.spouses[spouseIndex][field] = newValues[field];
            });
          }
          
          saveApplication(apps);
          showProfileUpdateToast();
        }
      }

      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
      delete card._original;
    }

    if (e.target.closest('.cancel-spouse-btn')) {
      // Cancel - restore original values
      const rows = grid.querySelectorAll('.info-row');
      
      rows.forEach((row) => {
        const field = row.dataset.field || '';
        const currentField = row.querySelector('.info-input');

        if (currentField) {
          const span = document.createElement('span');
          span.className = 'info-val';
          span.textContent = (card._original && card._original[field]) || '—';
          currentField.replaceWith(span);
        }
      });

      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
      delete card._original;
    }
  });
})();

// Edit Profile logic for Children Information
(function () {
  const childrenPanel = document.getElementById('tab-children');
  if (!childrenPanel) return;

  const childrenList = childrenPanel.querySelector('.children-list');
  if (!childrenList) return;

  childrenList.addEventListener('click', (e) => {
    const card = e.target.closest('.child-card');
    if (!card) return;
    const childIndex = parseInt(card.dataset.childIndex, 10);
    
    const editBtn = card.querySelector('.edit-child-btn');
    const saveBtn = card.querySelector('.save-child-btn');
    const cancelBtn = card.querySelector('.cancel-child-btn');
    const grid = card.querySelector('.info-grid');

    if (e.target.closest('.edit-child-btn')) {
      // Enter edit mode
      const original = {};
      const rows = grid.querySelectorAll('.info-row');
      
      rows.forEach((row) => {
        const valEl = row.querySelector('.info-val');
        if (!valEl) return;
        const field = row.dataset.field || '';
        const isEditable = row.dataset.editable === 'true';
        const type = row.dataset.type || 'text';
        const value = (valEl.textContent || '').trim();
        original[field] = value === '—' ? '' : value;

        if (isEditable) {
          let inputEl;
          if (type === 'select') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input';
            inputEl.innerHTML = incomeRangeOptions.map(opt => 
              `<option value="${opt.value}" ${(original[field] === opt.value || original[field] === opt.label) ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
          } else {
            inputEl = document.createElement('input');
            inputEl.className = 'info-input';
            inputEl.type = 'text';
            inputEl.value = original[field];
          }
          valEl.replaceWith(inputEl);
        }
      });

      card._original = original;
      editBtn.hidden = true;
      saveBtn.hidden = false;
      cancelBtn.hidden = false;
    }

    if (e.target.closest('.save-child-btn')) {
      // Save changes
      const rows = grid.querySelectorAll('.info-row');
      const newValues = {};
      
      rows.forEach((row) => {
        const field = row.dataset.field || '';
        const isEditable = row.dataset.editable === 'true';
        const currentField = row.querySelector('.info-input');

        const span = document.createElement('span');
        span.className = 'info-val';
        
        if (currentField && isEditable) {
          const newVal = currentField.value.trim();
          newValues[field] = newVal;
          span.textContent = newVal || '—';
        } else {
          span.textContent = (card._original && card._original[field]) || '—';
        }
        
        if (currentField) currentField.replaceWith(span);
      });

      // Save to localStorage
      if (Object.keys(newValues).length > 0) {
        const { apps, appIndex } = getCurrentUserApp();
        if (appIndex >= 0) {
          const app = apps[appIndex];
          if (!app.data) app.data = {};
          if (!app.data.children) app.data.children = {};
          if (!app.data.children.children) app.data.children.children = [];
          
          if (app.data.children.children[childIndex]) {
            Object.keys(newValues).forEach(field => {
              app.data.children.children[childIndex][field] = newValues[field];
            });
          }
          
          saveApplication(apps);
          showProfileUpdateToast();
        }
      }

      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
      delete card._original;
    }

    if (e.target.closest('.cancel-child-btn')) {
      // Cancel - restore original values
      const rows = grid.querySelectorAll('.info-row');
      
      rows.forEach((row) => {
        const field = row.dataset.field || '';
        const currentField = row.querySelector('.info-input');

        if (currentField) {
          const span = document.createElement('span');
          span.className = 'info-val';
          span.textContent = (card._original && card._original[field]) || '—';
          currentField.replaceWith(span);
        }
      });

      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
      delete card._original;
    }
  });
})();

// Change Password Modal Logic
(function () {
  const modal = document.getElementById('changePasswordModal');
  const openBtn = document.getElementById('changePasswordBtn');
  const closeBtn = document.getElementById('closePasswordModal');
  const cancelBtn = document.getElementById('cancelPasswordBtn');
  const form = document.getElementById('changePasswordForm');
  const errorEl = document.getElementById('passwordError');
  const successEl = document.getElementById('passwordSuccess');

  if (!modal || !openBtn || !form) return;

  const openModal = () => {
    modal.hidden = false;
    form.reset();
    errorEl.hidden = true;
    successEl.hidden = true;
    document.getElementById('currentPassword')?.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    form.reset();
    errorEl.hidden = true;
    successEl.hidden = true;
  };

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Toggle password visibility with checkboxes
  modal.querySelectorAll('.view-pwd-checkbox').forEach(checkbox => {
    const targetId = checkbox.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (!input) return;

    checkbox.addEventListener('change', () => {
      input.type = checkbox.checked ? 'text' : 'password';
    });
  });

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    successEl.hidden = true;

    const currentPassword = form.currentPassword.value.trim();
    const newPassword = form.newPassword.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      errorEl.textContent = 'Please fill in all fields.';
      errorEl.hidden = false;
      return;
    }

    if (newPassword.length < 6) {
      errorEl.textContent = 'New password must be at least 6 characters.';
      errorEl.hidden = false;
      return;
    }

    if (newPassword !== confirmPassword) {
      errorEl.textContent = 'New password and confirmation do not match.';
      errorEl.hidden = false;
      return;
    }

    // Get current user and verify current password
    const { apps, appIndex } = getCurrentUserApp();
    if (appIndex < 0) {
      errorEl.textContent = 'User not found. Please sign in again.';
      errorEl.hidden = false;
      return;
    }

    const app = apps[appIndex];
    const storedPassword = app.account?.password || '';

    if (currentPassword !== storedPassword) {
      errorEl.textContent = 'Current password is incorrect.';
      errorEl.hidden = false;
      return;
    }

    if (newPassword === currentPassword) {
      errorEl.textContent = 'New password must be different from current password.';
      errorEl.hidden = false;
      return;
    }

    // Update password
    app.account.password = newPassword;
    saveApplication(apps);

    form.reset();
    closeModal();
    showPasswordChangeToast();
  });
})();

// Show success toast for password change
function showPasswordChangeToast() {
  // Remove any existing toast
  const existing = document.querySelector('.profile-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'profile-toast';
  toast.innerHTML = [
    '<span class="icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
        '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
      '</svg>',
    '</span>',
    '<div class="toast-content">',
      '<strong>Success</strong>',
      '<div class="subtitle">Password Changed Successfully</div>',
    '</div>'
  ].join('');
  document.body.appendChild(toast);

  // Auto-dismiss after 2.5s
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => { try { toast.remove(); } catch {} }, 350);
  }, 2500);
}
