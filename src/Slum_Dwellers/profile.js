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

// Show success toast for application submitted
function showApplicationSubmittedToast() {
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
      '<div class="subtitle">Your application has been submitted successfully</div>',
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

  const appsRaw = sessionStorage.getItem('SLUMLINK_APPLICATIONS');
  const apps = appsRaw ? safeJsonParse(appsRaw, []) : [];
  const appIndex = apps.findIndex(a => String(a.id || '') === String(current.id || ''));
  const app = appIndex >= 0 ? apps[appIndex] : null;
  
  return { current, app, apps, appIndex };
}

// Save updated application back to localStorage
function saveApplication(apps) {
  sessionStorage.setItem('SLUMLINK_APPLICATIONS', JSON.stringify(apps));
}

// Format date to readable format
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return '—';
  }
}

// Populate profile data from database for the signed-in user
(function(){
  const { current } = getCurrentUserApp();
  if (!current || !current.id) {
    window.location.href = '/src/signin.html?role=dweller';
    return;
  }

  const personalPanel = document.getElementById('tab-personal');
  const maritalPanel = document.getElementById('tab-marital');
  const childrenPanel = document.getElementById('tab-children');
  const personalGrid = personalPanel?.querySelector('.info-grid');
  const spouseList = maritalPanel?.querySelector('.spouse-list');
  const childrenList = childrenPanel?.querySelector('.children-list');

  // Fetch data from backend
  fetch(`/api/slum-dweller/${current.id}`)
    .then(async (r) => {
      if (!r.ok) {
        throw new Error('Failed to fetch profile data');
      }
      const response = await r.json();
      if (response.status === 'success' && response.data) {
        return response.data;
      }
      throw new Error('Invalid response format');
    })
    .then((data) => {
      const resident = data.resident || {};
      const spouses = data.spouses || [];
      const children = data.children || [];

      // Render Personal Information
      if (personalGrid) {
        const rows = [
          { key: 'Full Name', val: resident.full_name || '', editable: false },
          { key: 'Phone Number', val: resident.mobile || '', editable: true, field: 'mobile' },
          { key: 'Gender', val: resident.gender || '', editable: false },
          { key: 'Date of Birth', val: formatDate(resident.dob), editable: false },
          { key: 'NID', val: resident.nid || '', editable: false },
          { key: 'Occupation', val: resident.occupation || '', editable: true, field: 'occupation' },
          { key: 'Education', val: resident.education || '', editable: true, field: 'education' },
          { key: 'Skills 1', val: resident.skills_1 || 'None', editable: true, field: 'skills_1' },
          { key: 'Skills 2', val: resident.skills_2 || 'None', editable: true, field: 'skills_2' },
          { key: 'Income Range', val: resident.income || '', editable: true, field: 'income', type: 'select' },
          { key: 'Area', val: resident.area || '', editable: true, field: 'area' },
          { key: 'District', val: resident.district || '', editable: true, field: 'district' },
          { key: 'Division', val: resident.division || '', editable: true, field: 'division' },
          { key: 'Family Members', val: resident.family_members || '', editable: false },
        ];
        personalGrid.innerHTML = rows.map(r => `
          <div class="info-row" data-field="${r.field || ''}" data-editable="${r.editable}" data-type="${r.type || 'text'}">
            <span class="info-key">${r.key}</span>
            <span class="info-val">${r.val || '—'}</span>
          </div>
        `).join('');
      }

      // Render Marital Information (spouses)
      if (spouseList) {
        if (!spouses.length) {
          spouseList.innerHTML = '<div class="empty">No spouse information available.</div>';
        } else {
          spouseList.innerHTML = spouses.map((s, idx) => `
            <div class="spouse-card" data-spouse-index="${idx}" data-spouse-id="${s.id}">
              <div class="spouse-header">
                <div class="spouse-name">${s.name || 'Spouse ' + (idx + 1)}</div>
                <div class="card-actions">
                  <button class="btn primary edit-spouse-btn" type="button">Edit Profile</button>
                  <button class="btn primary save-spouse-btn" type="button" hidden>Save</button>
                  <button class="btn outlined cancel-spouse-btn" type="button" hidden>Cancel</button>
                </div>
              </div>
              <div class="info-grid">
                <div class="info-row" data-field="name" data-editable="false"><span class="info-key">Name</span><span class="info-val">${s.name || '—'}</span></div>
                <div class="info-row" data-field="dob" data-editable="false"><span class="info-key">Date of Birth</span><span class="info-val">${formatDate(s.dob)}</span></div>
                <div class="info-row" data-field="gender" data-editable="false"><span class="info-key">Gender</span><span class="info-val">${s.gender || '—'}</span></div>
                <div class="info-row" data-field="nid" data-editable="false"><span class="info-key">NID</span><span class="info-val">${s.nid || '—'}</span></div>
                <div class="info-row" data-field="mobile" data-editable="true"><span class="info-key">Phone Number</span><span class="info-val">${s.mobile || '—'}</span></div>
                <div class="info-row" data-field="education" data-editable="true"><span class="info-key">Education</span><span class="info-val">${s.education || '—'}</span></div>
                <div class="info-row" data-field="job" data-editable="true"><span class="info-key">Occupation</span><span class="info-val">${s.job || '—'}</span></div>
                <div class="info-row" data-field="skills_1" data-editable="true"><span class="info-key">Skills 1</span><span class="info-val">${s.skills_1 || 'None'}</span></div>
                <div class="info-row" data-field="skills_2" data-editable="true"><span class="info-key">Skills 2</span><span class="info-val">${s.skills_2 || 'None'}</span></div>
                <div class="info-row" data-field="income" data-editable="true" data-type="select"><span class="info-key">Income Range</span><span class="info-val">${s.income || '—'}</span></div>
              </div>
            </div>
          `).join('');
        }
      }

      // Render Children Information
      if (childrenList) {
        if (!children.length) {
          childrenList.innerHTML = '<div class="empty">No children information available.</div>';
        } else {
          childrenList.innerHTML = children.map((c, idx) => `
            <div class="child-card" data-child-index="${idx}" data-child-id="${c.id}">
              <div class="child-header">
                <div class="child-name">${c.name || 'Child ' + (idx + 1)}</div>
                <div class="card-actions">
                  <button class="btn primary edit-child-btn" type="button">Edit Profile</button>
                  <button class="btn primary save-child-btn" type="button" hidden>Save</button>
                  <button class="btn outlined cancel-child-btn" type="button" hidden>Cancel</button>
                </div>
              </div>
              <div class="info-grid">
                <div class="info-row" data-field="name" data-editable="false"><span class="info-key">Name</span><span class="info-val">${c.name || '—'}</span></div>
                <div class="info-row" data-field="dob" data-editable="false"><span class="info-key">Date of Birth</span><span class="info-val">${formatDate(c.dob)}</span></div>
                <div class="info-row" data-field="gender" data-editable="false"><span class="info-key">Gender</span><span class="info-val">${c.gender || '—'}</span></div>
                <div class="info-row" data-field="education" data-editable="true"><span class="info-key">Education</span><span class="info-val">${c.education || '—'}</span></div>
                <div class="info-row" data-field="job" data-editable="true"><span class="info-key">Occupation</span><span class="info-val">${c.job || '—'}</span></div>
                <div class="info-row" data-field="skills_1" data-editable="true"><span class="info-key">Skills 1</span><span class="info-val">${c.skills_1 || 'None'}</span></div>
                <div class="info-row" data-field="skills_2" data-editable="true"><span class="info-key">Skills 2</span><span class="info-val">${c.skills_2 || 'None'}</span></div>
                <div class="info-row" data-field="income" data-editable="true" data-type="select"><span class="info-key">Income Range</span><span class="info-val">${c.income || '—'}</span></div>
                <div class="info-row" data-field="preferred_job" data-editable="true"><span class="info-key">Preferred Job</span><span class="info-val">${c.preferred_job || '—'}</span></div>
              </div>
            </div>
          `).join('');
        }
      }

      // Store fetched data for edit functionality
      window.__profileData = {
        resident,
        spouses,
        children
      };
    })
    .catch((err) => {
      console.error('Failed to load profile data:', err);
      
      // Show error message to user
      if (personalGrid) {
        personalGrid.innerHTML = '<div class="empty" style="color: #d32f2f;">Failed to load profile data. Please try again later.</div>';
      }
      if (spouseList) {
        spouseList.innerHTML = '<div class="empty" style="color: #d32f2f;">Failed to load spouse data.</div>';
      }
      if (childrenList) {
        childrenList.innerHTML = '<div class="empty" style="color: #d32f2f;">Failed to load children data.</div>';
      }
    });
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

// Edit Member Modal Logic
(function () {
  const modal = document.getElementById('editMemberModal');
  const openBtn = document.getElementById('editMemberBtn');
  const closeBtn = document.getElementById('closeEditMemberModal');
  const cancelBtn = document.getElementById('cancelEditMemberBtn');
  const form = document.getElementById('editMemberForm');
  const errorEl = document.getElementById('memberError');
  
  const memberActionSelect = document.getElementById('memberAction');
  const removeMembersSection = document.getElementById('removeMembersSection');
  const addMembersSection = document.getElementById('addMembersSection');
  const spouseRemoveCount = document.getElementById('spouseRemoveCount');
  const childrenRemoveCount = document.getElementById('childrenRemoveCount');
  const spouseRemovalForms = document.getElementById('spouseRemovalForms');
  const childrenRemovalForms = document.getElementById('childrenRemovalForms');
  
  // Add members elements
  const spouseAddCount = document.getElementById('spouseAddCount');
  const childrenAddCount = document.getElementById('childrenAddCount');
  const spouseAddForms = document.getElementById('spouseAddForms');
  const childrenAddForms = document.getElementById('childrenAddForms');

  if (!modal || !openBtn || !form) return;

  // Check if user has pending edit member submission
  function hasPendingEditMemberSubmission() {
    const { app } = getCurrentUserApp();
    return app?.data?.pendingEditMember === true;
  }

  // Disable/Enable Edit Member button based on pending status
  function updateEditMemberButtonState() {
    if (hasPendingEditMemberSubmission()) {
      openBtn.disabled = true;
      openBtn.classList.add('btn-disabled');
      openBtn.title = 'You have a pending edit member request';
    } else {
      openBtn.disabled = false;
      openBtn.classList.remove('btn-disabled');
      openBtn.title = '';
    }
  }

  // Initial check on page load
  updateEditMemberButtonState();

  // Get current user's spouse and children count
  function getMemberCounts() {
    const { app } = getCurrentUserApp();
    const spouseCount = app?.data?.marital?.spouses?.length || 0;
    const childrenCount = app?.data?.children?.children?.length || 0;
    return { spouseCount, childrenCount };
  }

  // Populate spouse count dropdown
  function populateSpouseCountDropdown() {
    const { spouseCount } = getMemberCounts();
    spouseRemoveCount.innerHTML = '';
    for (let i = 0; i <= spouseCount; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i;
      if (i === 0) opt.selected = true;
      spouseRemoveCount.appendChild(opt);
    }
  }

  // Populate children count dropdown
  function populateChildrenCountDropdown() {
    const { childrenCount } = getMemberCounts();
    childrenRemoveCount.innerHTML = '';
    for (let i = 0; i <= childrenCount; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i;
      if (i === 0) opt.selected = true;
      childrenRemoveCount.appendChild(opt);
    }
  }

  // Create spouse removal form
  function createSpouseRemovalForm(index) {
    const card = document.createElement('div');
    card.className = 'removal-card';
    card.innerHTML = `
      <p class="removal-card-title">Spouse ${index} Details</p>
      <div class="modal-field">
        <label><span>Name</span></label>
        <input type="text" name="spouse_remove_${index}_name" class="modal-input" placeholder="Enter spouse name" />
      </div>
      <div class="modal-field">
        <label><span>Divorce Certificate</span></label>
        <div class="file-input-wrapper">
          <input type="file" name="spouse_remove_${index}_certificate" accept=".pdf,image/*" />
        </div>
      </div>
    `;
    return card;
  }

  // Create children removal form
  function createChildrenRemovalForm(index) {
    const card = document.createElement('div');
    card.className = 'removal-card';
    card.innerHTML = `
      <p class="removal-card-title">Child ${index} Details</p>
      <div class="modal-field">
        <label><span>Name</span></label>
        <input type="text" name="child_remove_${index}_name" class="modal-input" placeholder="Enter child name" />
      </div>
      <div class="modal-field">
        <label><span>Death Certificate</span></label>
        <div class="file-input-wrapper">
          <input type="file" name="child_remove_${index}_certificate" accept=".pdf,image/*" />
        </div>
      </div>
    `;
    return card;
  }

  // Render spouse removal forms
  function renderSpouseRemovalForms(count) {
    spouseRemovalForms.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      spouseRemovalForms.appendChild(createSpouseRemovalForm(i));
    }
  }

  // Render children removal forms
  function renderChildrenRemovalForms(count) {
    childrenRemovalForms.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      childrenRemovalForms.appendChild(createChildrenRemovalForm(i));
    }
  }

  // =====================
  // ADD MEMBERS FUNCTIONS
  // =====================

  // Create spouse add form
  function createSpouseAddForm(index) {
    const card = document.createElement('div');
    card.className = 'add-card';
    card.innerHTML = `
      <h4>Spouse ${index}</h4>
      <div class="modal-field">
        <label><span>Full Name</span></label>
        <input type="text" name="spouse_add_${index}_name" placeholder="Enter full name" />
      </div>
      <div class="modal-field">
        <label><span>Date of Birth</span></label>
        <input type="date" name="spouse_add_${index}_dob" />
      </div>
      <div class="modal-field">
        <label><span>Gender</span></label>
        <select name="spouse_add_${index}_gender">
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>NID</span></label>
        <input type="text" name="spouse_add_${index}_nid" placeholder="Enter NID number" />
      </div>
      <div class="modal-field">
        <label><span>Education</span></label>
        <select name="spouse_add_${index}_education">
          <option value="">Select education</option>
          <option value="No Formal Education">No Formal Education</option>
          <option value="Primary (Class 1-5)">Primary (Class 1-5)</option>
          <option value="Secondary (Class 6-10)">Secondary (Class 6-10)</option>
          <option value="Higher Secondary (Class 11-12)">Higher Secondary (Class 11-12)</option>
          <option value="Graduate">Graduate</option>
          <option value="Post Graduate">Post Graduate</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Occupation</span></label>
        <select name="spouse_add_${index}_occupation">
          <option value="">Select occupation</option>
          <option value="Unemployed">Unemployed</option>
          <option value="Day Laborer">Day Laborer</option>
          <option value="Rickshaw/Van Puller">Rickshaw/Van Puller</option>
          <option value="Domestic Worker">Domestic Worker</option>
          <option value="Factory Worker">Factory Worker</option>
          <option value="Small Business">Small Business</option>
          <option value="Driver">Driver</option>
          <option value="Security Guard">Security Guard</option>
          <option value="Construction Worker">Construction Worker</option>
          <option value="Street Vendor">Street Vendor</option>
          <option value="Tailor">Tailor</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Skills 1</span></label>
        <input type="text" name="spouse_add_${index}_skills_1" placeholder="Enter first skill" />
      </div>
      <div class="modal-field">
        <label><span>Skills 2</span></label>
        <input type="text" name="spouse_add_${index}_skills_2" placeholder="Enter second skill" />
      </div>
      <div class="modal-field">
        <label><span>Income Range</span></label>
        <select name="spouse_add_${index}_income">
          <option value="">Select income range</option>
          <option value="No Income">No Income</option>
          <option value="Less than 5,000 BDT">Less than 5,000 BDT</option>
          <option value="5,000 - 10,000 BDT">5,000 - 10,000 BDT</option>
          <option value="10,001 - 15,000 BDT">10,001 - 15,000 BDT</option>
          <option value="15,001 - 20,000 BDT">15,001 - 20,000 BDT</option>
          <option value="Above 20,000 BDT">Above 20,000 BDT</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Mobile Number</span></label>
        <input type="tel" name="spouse_add_${index}_mobile" placeholder="Enter mobile number" />
      </div>
      <div class="modal-field">
        <label><span>Marriage Certificate</span></label>
        <div class="file-input-wrapper">
          <input type="file" name="spouse_add_${index}_certificate" accept=".pdf,image/*" />
        </div>
      </div>
    `;
    return card;
  }

  // Create child add form
  function createChildAddForm(index) {
    const card = document.createElement('div');
    card.className = 'add-card';
    card.innerHTML = `
      <h4>Child ${index}</h4>
      <div class="modal-field">
        <label><span>Full Name</span></label>
        <input type="text" name="child_add_${index}_name" placeholder="Enter full name" />
      </div>
      <div class="modal-field">
        <label><span>Date of Birth</span></label>
        <input type="date" name="child_add_${index}_dob" />
      </div>
      <div class="modal-field">
        <label><span>Gender</span></label>
        <select name="child_add_${index}_gender">
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Education</span></label>
        <select name="child_add_${index}_education">
          <option value="">Select education</option>
          <option value="Not Applicable (Too Young)">Not Applicable (Too Young)</option>
          <option value="No Formal Education">No Formal Education</option>
          <option value="Primary (Class 1-5)">Primary (Class 1-5)</option>
          <option value="Secondary (Class 6-10)">Secondary (Class 6-10)</option>
          <option value="Higher Secondary (Class 11-12)">Higher Secondary (Class 11-12)</option>
          <option value="Graduate">Graduate</option>
          <option value="Post Graduate">Post Graduate</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Occupation</span></label>
        <select name="child_add_${index}_occupation">
          <option value="">Select occupation</option>
          <option value="Not Applicable (Too Young)">Not Applicable (Too Young)</option>
          <option value="Student">Student</option>
          <option value="Unemployed">Unemployed</option>
          <option value="Day Laborer">Day Laborer</option>
          <option value="Domestic Worker">Domestic Worker</option>
          <option value="Factory Worker">Factory Worker</option>
          <option value="Small Business">Small Business</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Skills 1</span></label>
        <input type="text" name="child_add_${index}_skills_1" placeholder="Enter first skill" />
      </div>
      <div class="modal-field">
        <label><span>Skills 2</span></label>
        <input type="text" name="child_add_${index}_skills_2" placeholder="Enter second skill" />
      </div>
      <div class="modal-field">
        <label><span>Income Range</span></label>
        <select name="child_add_${index}_income">
          <option value="">Select income range</option>
          <option value="No Income">No Income</option>
          <option value="Less than 5,000 BDT">Less than 5,000 BDT</option>
          <option value="5,000 - 10,000 BDT">5,000 - 10,000 BDT</option>
          <option value="10,001 - 15,000 BDT">10,001 - 15,000 BDT</option>
          <option value="15,001 - 20,000 BDT">15,001 - 20,000 BDT</option>
          <option value="Above 20,000 BDT">Above 20,000 BDT</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Preferred Job</span></label>
        <select name="child_add_${index}_preferred_job">
          <option value="">Select preferred job</option>
          <option value="Not Applicable (Too Young)">Not Applicable (Too Young)</option>
          <option value="Any Available Work">Any Available Work</option>
          <option value="Skilled Labor">Skilled Labor</option>
          <option value="Factory Work">Factory Work</option>
          <option value="Driving">Driving</option>
          <option value="Tailoring">Tailoring</option>
          <option value="Domestic Work">Domestic Work</option>
          <option value="Small Business">Small Business</option>
          <option value="Office/Clerical">Office/Clerical</option>
          <option value="Teaching/Tutoring">Teaching/Tutoring</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Birth Certificate</span></label>
        <div class="file-input-wrapper">
          <input type="file" name="child_add_${index}_certificate" accept=".pdf,image/*" />
        </div>
      </div>
    `;
    return card;
  }

  // Render spouse add forms
  function renderSpouseAddForms(count) {
    if (!spouseAddForms) return;
    spouseAddForms.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      spouseAddForms.appendChild(createSpouseAddForm(i));
    }
  }

  // Render children add forms
  function renderChildrenAddForms(count) {
    if (!childrenAddForms) return;
    childrenAddForms.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      childrenAddForms.appendChild(createChildAddForm(i));
    }
  }

  const openModal = () => {
    // Prevent opening if user has pending edit member submission
    if (hasPendingEditMemberSubmission()) {
      return;
    }
    modal.hidden = false;
    form.reset();
    errorEl.hidden = true;
    removeMembersSection.hidden = true;
    addMembersSection.hidden = true;
    spouseRemovalForms.innerHTML = '';
    childrenRemovalForms.innerHTML = '';
    if (spouseAddForms) spouseAddForms.innerHTML = '';
    if (childrenAddForms) childrenAddForms.innerHTML = '';
    populateSpouseCountDropdown();
    populateChildrenCountDropdown();
  };

  const closeModal = () => {
    modal.hidden = true;
    form.reset();
    errorEl.hidden = true;
    removeMembersSection.hidden = true;
    addMembersSection.hidden = true;
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

  // Handle action dropdown change
  memberActionSelect?.addEventListener('change', () => {
    const action = memberActionSelect.value;
    if (action === 'remove') {
      removeMembersSection.hidden = false;
      addMembersSection.hidden = true;
    } else if (action === 'add') {
      removeMembersSection.hidden = true;
      addMembersSection.hidden = false;
    } else {
      removeMembersSection.hidden = true;
      addMembersSection.hidden = true;
    }
  });

  // Handle spouse count change
  spouseRemoveCount?.addEventListener('change', () => {
    const count = parseInt(spouseRemoveCount.value, 10) || 0;
    renderSpouseRemovalForms(count);
  });

  // Handle children count change
  childrenRemoveCount?.addEventListener('change', () => {
    const count = parseInt(childrenRemoveCount.value, 10) || 0;
    renderChildrenRemovalForms(count);
  });

  // Handle spouse add count change
  spouseAddCount?.addEventListener('input', () => {
    let count = parseInt(spouseAddCount.value, 10) || 0;
    if (count < 0) count = 0;
    if (count > 10) count = 10;
    renderSpouseAddForms(count);
  });

  // Handle children add count change
  childrenAddCount?.addEventListener('input', () => {
    let count = parseInt(childrenAddCount.value, 10) || 0;
    if (count < 0) count = 0;
    renderChildrenAddForms(count);
  });

  // Form submission with validation
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    // Clear previous error states
    form.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
    form.querySelectorAll('.field-error-text').forEach(el => el.remove());

    const action = memberActionSelect.value;

    if (!action) {
      errorEl.textContent = 'Please select an action.';
      errorEl.hidden = false;
      return;
    }

    if (action === 'remove') {
      const spouseCount = parseInt(spouseRemoveCount.value, 10) || 0;
      const childCount = parseInt(childrenRemoveCount.value, 10) || 0;

      if (spouseCount === 0 && childCount === 0) {
        errorEl.textContent = 'Please select at least one spouse or child to remove.';
        errorEl.hidden = false;
        return;
      }

      // Get actual spouse and children names from user data
      const { app } = getCurrentUserApp();
      const actualSpouseNames = (app?.data?.marital?.spouses || []).map(s => (s.name || '').toLowerCase().trim());
      const actualChildrenNames = (app?.data?.children?.children || []).map(c => (c.name || '').toLowerCase().trim());

      let hasError = false;
      let firstErrorField = null;

      // Validate spouse removal forms
      for (let i = 1; i <= spouseCount; i++) {
        const nameInput = form.querySelector(`[name="spouse_remove_${i}_name"]`);
        const certInput = form.querySelector(`[name="spouse_remove_${i}_certificate"]`);

        if (nameInput && !nameInput.value.trim()) {
          nameInput.classList.add('field-error');
          const errorText = document.createElement('div');
          errorText.className = 'field-error-text';
          errorText.textContent = 'This field is required';
          nameInput.parentNode.appendChild(errorText);
          if (!firstErrorField) firstErrorField = nameInput;
          hasError = true;
        } else if (nameInput && nameInput.value.trim()) {
          // Validate that the name exists in actual spouse names
          const enteredName = nameInput.value.trim().toLowerCase();
          if (!actualSpouseNames.includes(enteredName)) {
            nameInput.classList.add('field-error');
            const errorText = document.createElement('div');
            errorText.className = 'field-error-text';
            errorText.textContent = 'Invalid name';
            nameInput.parentNode.appendChild(errorText);
            if (!firstErrorField) firstErrorField = nameInput;
            hasError = true;
          }
        }

        if (certInput && (!certInput.files || certInput.files.length === 0)) {
          certInput.classList.add('field-error');
          const errorText = document.createElement('div');
          errorText.className = 'field-error-text';
          errorText.textContent = 'This field is required';
          certInput.parentNode.appendChild(errorText);
          if (!firstErrorField) firstErrorField = certInput;
          hasError = true;
        }
      }

      // Validate children removal forms
      for (let i = 1; i <= childCount; i++) {
        const nameInput = form.querySelector(`[name="child_remove_${i}_name"]`);
        const certInput = form.querySelector(`[name="child_remove_${i}_certificate"]`);

        if (nameInput && !nameInput.value.trim()) {
          nameInput.classList.add('field-error');
          const errorText = document.createElement('div');
          errorText.className = 'field-error-text';
          errorText.textContent = 'This field is required';
          nameInput.parentNode.appendChild(errorText);
          if (!firstErrorField) firstErrorField = nameInput;
          hasError = true;
        } else if (nameInput && nameInput.value.trim()) {
          // Validate that the name exists in actual children names
          const enteredName = nameInput.value.trim().toLowerCase();
          if (!actualChildrenNames.includes(enteredName)) {
            nameInput.classList.add('field-error');
            const errorText = document.createElement('div');
            errorText.className = 'field-error-text';
            errorText.textContent = 'Invalid name';
            nameInput.parentNode.appendChild(errorText);
            if (!firstErrorField) firstErrorField = nameInput;
            hasError = true;
          }
        }

        if (certInput && (!certInput.files || certInput.files.length === 0)) {
          certInput.classList.add('field-error');
          const errorText = document.createElement('div');
          errorText.className = 'field-error-text';
          errorText.textContent = 'This field is required';
          certInput.parentNode.appendChild(errorText);
          if (!firstErrorField) firstErrorField = certInput;
          hasError = true;
        }
      }

      if (hasError) {
        errorEl.textContent = 'Please fill in all required fields correctly.';
        errorEl.hidden = false;
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      // All validations passed - show confirmation modal
      showConfirmationModal('remove');
    }

    if (action === 'add') {
      const spouseCount = parseInt(spouseAddCount?.value, 10) || 0;
      const childCount = parseInt(childrenAddCount?.value, 10) || 0;

      if (spouseCount === 0 && childCount === 0) {
        errorEl.textContent = 'Please add at least one spouse or child.';
        errorEl.hidden = false;
        return;
      }

      let hasError = false;
      let firstErrorField = null;

      // Helper function to add error to a field
      function addFieldError(input, message) {
        if (!input) return;
        input.classList.add('field-error');
        // Remove any existing error text
        const existingError = input.parentNode.querySelector('.field-error-text');
        if (existingError) existingError.remove();
        const errorText = document.createElement('div');
        errorText.className = 'field-error-text';
        errorText.textContent = message;
        input.parentNode.appendChild(errorText);
        if (!firstErrorField) firstErrorField = input;
        hasError = true;
      }

      // Validate spouse add forms
      for (let i = 1; i <= spouseCount; i++) {
        const nameInput = form.querySelector(`[name="spouse_add_${i}_name"]`);
        const dobInput = form.querySelector(`[name="spouse_add_${i}_dob"]`);
        const genderInput = form.querySelector(`[name="spouse_add_${i}_gender"]`);
        const nidInput = form.querySelector(`[name="spouse_add_${i}_nid"]`);
        const educationInput = form.querySelector(`[name="spouse_add_${i}_education"]`);
        const occupationInput = form.querySelector(`[name="spouse_add_${i}_occupation"]`);
        const incomeInput = form.querySelector(`[name="spouse_add_${i}_income"]`);
        const mobileInput = form.querySelector(`[name="spouse_add_${i}_mobile"]`);
        const certInput = form.querySelector(`[name="spouse_add_${i}_certificate"]`);

        if (nameInput && !nameInput.value.trim()) {
          addFieldError(nameInput, 'This field is required');
        }
        if (dobInput && !dobInput.value) {
          addFieldError(dobInput, 'This field is required');
        }
        if (genderInput && !genderInput.value) {
          addFieldError(genderInput, 'This field is required');
        }
        if (nidInput && !nidInput.value.trim()) {
          addFieldError(nidInput, 'This field is required');
        }
        if (educationInput && !educationInput.value) {
          addFieldError(educationInput, 'This field is required');
        }
        if (occupationInput && !occupationInput.value) {
          addFieldError(occupationInput, 'This field is required');
        }
        if (incomeInput && !incomeInput.value) {
          addFieldError(incomeInput, 'This field is required');
        }
        if (mobileInput && !mobileInput.value.trim()) {
          addFieldError(mobileInput, 'This field is required');
        }
        if (certInput && (!certInput.files || certInput.files.length === 0)) {
          addFieldError(certInput, 'This field is required');
        }
      }

      // Validate children add forms
      for (let i = 1; i <= childCount; i++) {
        const nameInput = form.querySelector(`[name="child_add_${i}_name"]`);
        const dobInput = form.querySelector(`[name="child_add_${i}_dob"]`);
        const genderInput = form.querySelector(`[name="child_add_${i}_gender"]`);
        const educationInput = form.querySelector(`[name="child_add_${i}_education"]`);
        const occupationInput = form.querySelector(`[name="child_add_${i}_occupation"]`);
        const incomeInput = form.querySelector(`[name="child_add_${i}_income"]`);
        const preferredJobInput = form.querySelector(`[name="child_add_${i}_preferred_job"]`);
        const certInput = form.querySelector(`[name="child_add_${i}_certificate"]`);

        if (nameInput && !nameInput.value.trim()) {
          addFieldError(nameInput, 'This field is required');
        }
        if (dobInput && !dobInput.value) {
          addFieldError(dobInput, 'This field is required');
        }
        if (genderInput && !genderInput.value) {
          addFieldError(genderInput, 'This field is required');
        }
        if (educationInput && !educationInput.value) {
          addFieldError(educationInput, 'This field is required');
        }
        if (occupationInput && !occupationInput.value) {
          addFieldError(occupationInput, 'This field is required');
        }
        if (incomeInput && !incomeInput.value) {
          addFieldError(incomeInput, 'This field is required');
        }
        if (preferredJobInput && !preferredJobInput.value) {
          addFieldError(preferredJobInput, 'This field is required');
        }
        if (certInput && (!certInput.files || certInput.files.length === 0)) {
          addFieldError(certInput, 'This field is required');
        }
      }

      if (hasError) {
        errorEl.textContent = 'Please fill in all required fields.';
        errorEl.hidden = false;
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      // All validations passed - show confirmation modal
      showConfirmationModal('add');
    }
  });

  // Confirmation Modal Logic
  const confirmationModal = document.getElementById('confirmationModal');
  const closeConfirmationBtn = document.getElementById('closeConfirmationModal');
  const cancelConfirmationBtn = document.getElementById('cancelConfirmationBtn');
  const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
  let pendingAction = null;

  function showConfirmationModal(action) {
    pendingAction = action;
    confirmationModal.hidden = false;
  }

  function hideConfirmationModal() {
    confirmationModal.hidden = true;
    pendingAction = null;
  }

  closeConfirmationBtn?.addEventListener('click', hideConfirmationModal);
  cancelConfirmationBtn?.addEventListener('click', hideConfirmationModal);

  confirmationModal?.addEventListener('click', (e) => {
    if (e.target === confirmationModal) hideConfirmationModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && confirmationModal && !confirmationModal.hidden) {
      hideConfirmationModal();
    }
  });

  confirmSubmitBtn?.addEventListener('click', () => {
    // Save pending edit member flag to user's application
    const { app, idx } = getCurrentUserApp();
    if (app && idx !== -1) {
      if (!app.data) app.data = {};
      app.data.pendingEditMember = true;
      const apps = safeJsonParse(sessionStorage.getItem('SLUMLINK_APPLICATIONS'), []);
      apps[idx] = app;
      sessionStorage.setItem('SLUMLINK_APPLICATIONS', JSON.stringify(apps));
    }

    hideConfirmationModal();
    closeModal();
    showApplicationSubmittedToast();
    updateEditMemberButtonState();
  });
})();
