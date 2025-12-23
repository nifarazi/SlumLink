(() => {
  const STORAGE_KEY = 'SLUMLINK_MARITAL';
  const SESSION_FLAG = 'SLUMLINK_SESSION_INIT';
  function initSession(){
    if (!sessionStorage.getItem(SESSION_FLAG)){
      ['SLUMLINK_SIGNUP','SLUMLINK_MARITAL','SLUMLINK_CHILDREN'].forEach(k => localStorage.removeItem(k));
      sessionStorage.setItem(SESSION_FLAG, '1');
    }
  }
  const form = document.getElementById('maritalForm');
  const maritalStatus = document.getElementById('maritalStatus');
  const spouseCountWrap = document.getElementById('spouseCountWrap');
  const spouseCountInput = document.getElementById('spouseCount');
  const segments = document.getElementById('spouseSegments');

  function safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
  function clearSegments(){ segments.innerHTML = ''; }

  function makeSpouseSegment(index){
    const wrap = document.createElement('div');
    wrap.className = 'spouse-segment';
    wrap.innerHTML = `
      <h3 class="segment-title">Spouse Information ${index}</h3>
      <div class="fields">
        <label class="field span-2">
          <span>Full Name</span>
          <input type="text" name="spouse_${index}_name" placeholder="e.g., Rahim Uddin" />
        </label>
        <label class="field">
          <span>Date of Birth</span>
          <input type="date" name="spouse_${index}_dob" />
        </label>
        <label class="field">
          <span>Gender</span>
          <select name="spouse_${index}_gender">
            <option value="" disabled selected>Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Others</option>
          </select>
        </label>
        <label class="field">
          <span>Education</span>
          <input type="text" name="spouse_${index}_education" placeholder="e.g., Secondary" />
        </label>
        <label class="field">
          <span>Job</span>
          <input type="text" name="spouse_${index}_job" placeholder="e.g., Day laborer" />
        </label>
        <label class="field span-2">
          <span>Income Range</span>
          <select name="spouse_${index}_income">
            <option value="" disabled selected>Select range</option>
            <option>No Income</option>
            <option>1-5000</option>
            <option>5000-15000</option>
            <option>15000-30000</option>
            <option>30000-50000</option>
            <option>50000 and above</option>
          </select>
        </label>
        <label class="field span-2">
          <span>Mobile Number</span>
          <input type="tel" name="spouse_${index}_mobile" placeholder="e.g., 017XXXXXXXX" />
        </label>
      </div>`;
    return wrap;
  }

  function renderSegments(n){
    clearSegments();
    const count = Math.max(1, Math.min(Number(n) || 0, 4));
    for(let i=1;i<=count;i++) segments.appendChild(makeSpouseSegment(i));
  }

  function collectFormData(frm){
    const data = {};
    frm.querySelectorAll('input, select, textarea').forEach(el => {
      if (!el.name) return;
      if (el.type === 'checkbox') data[el.name] = el.checked; else data[el.name] = el.value;
    });
    return data;
  }
  function fillForm(frm, data){
    if (!data) return;
    // Ensure UI matches stored selection
    if (data.maritalStatus === 'married') {
      spouseCountWrap.style.display = '';
      if (data.spouseCount) spouseCountInput.value = data.spouseCount;
      renderSegments(spouseCountInput.value || 1);
    } else {
      spouseCountWrap.style.display = 'none';
      clearSegments();
    }
    // Fill all fields
    Object.entries(data).forEach(([k, v]) => {
      const el = frm.querySelector(`[name="${CSS.escape(k)}"]`);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    });
  }
  function save(){ if (!form) return; localStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormData(form))); }
  function load(){ const raw = localStorage.getItem(STORAGE_KEY); return raw ? safeJsonParse(raw, {}) : {}; }

  function validateAllVisible(frm){
    let firstInvalid = null;
    const fields = frm.querySelectorAll('input, select, textarea');
    fields.forEach(el => {
      if (el.disabled || el.offsetParent === null) return; // skip hidden
      const val = (el.type === 'checkbox') ? (el.checked ? 'on' : '') : String(el.value || '').trim();
      if (!val) {
        if (!firstInvalid) firstInvalid = el;
        el.setCustomValidity('Please fill out this field');
      } else {
        el.setCustomValidity('');
      }
    });
    if (firstInvalid) { firstInvalid.reportValidity(); firstInvalid.focus(); return false; }
    return true;
  }

  // First-visit per tab clears stored data
  initSession();
  // Initial load
  if (form) fillForm(form, load());

  // React to status changes
  maritalStatus?.addEventListener('change', () => {
    const v = maritalStatus.value;
    if (v === 'married'){
      spouseCountWrap.style.display = '';
      if (!spouseCountInput.value) spouseCountInput.value = '1';
      renderSegments(spouseCountInput.value);
    } else {
      spouseCountWrap.style.display = 'none';
      clearSegments();
    }
    save();
  });

  spouseCountInput?.addEventListener('input', () => { renderSegments(spouseCountInput.value); save(); });

  // Autosave
  form?.addEventListener('input', save);
  form?.addEventListener('change', save);

  // Navigation
  document.querySelector('.nav-btn.left')?.addEventListener('click', () => {
    save();
    window.location.href = './signup.html';
  });
  document.querySelector('.nav-btn.right')?.addEventListener('click', () => {
    if (!form) return;
    if (!validateAllVisible(form)) return;
    save();
    window.location.href = './children.html';
  });
})();
