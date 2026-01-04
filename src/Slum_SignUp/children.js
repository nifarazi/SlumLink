(() => {
  const STORAGE_KEY = 'SLUMLINK_CHILDREN';
  const SESSION_FLAG = 'SLUMLINK_SESSION_INIT';
  function initSession(){
    if (!sessionStorage.getItem(SESSION_FLAG)){
      ['SLUMLINK_SIGNUP','SLUMLINK_MARITAL','SLUMLINK_CHILDREN'].forEach(k => localStorage.removeItem(k));
      sessionStorage.setItem(SESSION_FLAG, '1');
    }
  }
  const form = document.getElementById('childrenForm');
  const countInput = document.getElementById('childrenCount');
  const segments = document.getElementById('childrenSegments');
  const MARITAL_STORAGE_KEY = 'SLUMLINK_MARITAL';

  function safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
  function clearSegments(){ segments.innerHTML = ''; }

  function makeChildSegment(index){
    const wrap = document.createElement('div');
    wrap.className = 'child-segment';
    wrap.innerHTML = `
      <h3 class="segment-title">Children Information ${index}</h3>
      <div class="fields">
        <label class="field span-2">
          <span>Full Name</span>
          <input type="text" name="child_${index}_name" placeholder="e.g., Karim" />
        </label>
        <label class="field">
          <span>Date of Birth</span>
          <input type="date" name="child_${index}_dob" />
        </label>
        <label class="field">
          <span>Gender</span>
          <select name="child_${index}_gender">
            <option value="" disabled selected>Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Others</option>
          </select>
        </label>
        <label class="field">
          <span>Education</span>
          <input type="text" name="child_${index}_education" placeholder="e.g., Primary" />
        </label>
        <label class="field">
          <span>Job</span>
          <input type="text" name="child_${index}_job" placeholder="e.g., Apprentice" />
        </label>
        <label class="field span-2">
          <span>Income Range</span>
          <select name="child_${index}_income">
            <option value="" disabled selected>Select range</option>
            <option value="No Income">No Income</option>
            <option value="Less than &#2547;3,000">Less than &#2547;3,000</option>
            <option value="&#2547;3,000 &ndash; &#2547;5,000">&#2547;3,000 &ndash; &#2547;5,000</option>
            <option value="&#2547;5,001 &ndash; &#2547;9,999">&#2547;5,001 &ndash; &#2547;9,999</option>
            <option value="&#2547;10,000 and above">&#2547;10,000 and above</option>
          </select>
        </label>
        <label class="field span-2">
          <span>Preferred Job</span>
          <input type="text" name="child_${index}_preferred_job" placeholder="e.g., Electrician" />
        </label>
        <label class="field span-2">
          <span>Birth Certificate (Upload)</span>
          <input type="file" name="child_${index}_birth_certificate" accept=".pdf,image/*" />
        </label>
      </div>
    `;
    return wrap;
  }

  function renderSegments(n){
    clearSegments();
    const count = Math.max(0, Math.min(Number(n) || 0, 10));
    for(let i=1;i<=count;i++) segments.appendChild(makeChildSegment(i));
  }

  function collectFormData(frm){
    const data = {};
    frm.querySelectorAll('input, select, textarea').forEach(el => {
      if (!el.name) return;
      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.type === 'file') {
        const file = el.files && el.files[0];
        const stored = el.dataset.dataUrl || '';
        if (file && el.dataset.dataUrl) {
          data[el.name] = stored; // Data URL
          data[el.name + '_filename'] = file.name;
        } else if (stored) {
          data[el.name] = stored; // previously saved
        } else {
          data[el.name] = '';
        }
      } else {
        data[el.name] = el.value;
      }
    });
    return data;
  }
  function fillForm(frm, data){
    if (!data) return;
    // Render segments first based on stored count
    if (typeof data.childrenCount !== 'undefined') {
      countInput.value = data.childrenCount;
      renderSegments(countInput.value);
    } else {
      renderSegments(0);
    }
    // Fill fields
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
      // For children segments, optional fields are acceptable; only account info required
      const requiredNames = ['account_username','account_password','account_confirm'];
      const isRequired = requiredNames.includes(el.name) || el.closest('.child-segment') === null; // count input required?
      if (isRequired && !val) {
        if (!firstInvalid) firstInvalid = el;
        el.setCustomValidity('Please fill out this field');
      } else {
        el.setCustomValidity('');
      }
    });
    // Password match check
    const pwd = frm.querySelector('[name="account_password"]');
    const cfm = frm.querySelector('[name="account_confirm"]');
    if (pwd && cfm && pwd.value && cfm.value && pwd.value !== cfm.value) {
      cfm.setCustomValidity('Passwords do not match');
      firstInvalid = cfm;
    }
    if (firstInvalid) { firstInvalid.reportValidity(); firstInvalid.focus(); return false; }
    return true;
  }

  // First-visit per tab clears stored data
  initSession();
  // Initial load
  if (form) fillForm(form, load());

  // Apply rule: if marital status is 'unmarried', force children count to 0 and disable editing
  function applyMaritalChildrenRule(){
    const raw = localStorage.getItem(MARITAL_STORAGE_KEY);
    const marital = raw ? safeJsonParse(raw, {}) : {};
    const status = (marital?.maritalStatus || '').toLowerCase();
    if (status === 'unmarried'){
      if (countInput){
        countInput.value = '0';
        countInput.disabled = true;
        renderSegments(0);
      }
      // Persist the enforced 0
      save();
    } else {
      if (countInput){
        countInput.disabled = false;
      }
    }
  }
  applyMaritalChildrenRule();

  // Events
  countInput?.addEventListener('input', () => { renderSegments(countInput.value); save(); });
  form?.addEventListener('input', save);
  // Read file inputs as Data URLs on change
  form?.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!(el instanceof HTMLElement)) { save(); return; }
    if (el.tagName.toLowerCase() === 'input' && (el.getAttribute('type') || '').toLowerCase() === 'file') {
      const input = el;
      const files = input.files;
      if (files && files[0]) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = () => {
          input.dataset.dataUrl = String(reader.result || '');
          save();
        };
        reader.readAsDataURL(file);
      } else {
        input.dataset.dataUrl = '';
        save();
      }
    } else {
      save();
    }
  });

  // Toggle password visibility
  function wirePwdToggles(){
    form?.querySelectorAll('.toggle-pwd').forEach(btn => {
      const targetName = btn.getAttribute('data-target');
      const input = form?.querySelector(`[name="${CSS.escape(targetName || '')}"]`);
      if (!input) return;
      const img = btn.querySelector('img');
      // Set initial icon based on current input type
      if (img) img.src = (input.type === 'password') ? 'images/hide.png' : 'images/view.png';
      btn.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        if (img) img.src = showing ? 'images/hide.png' : 'images/view.png';
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      });
    });
  }
  wirePwdToggles();

  // Navigation
  document.querySelector('.nav-btn.left')?.addEventListener('click', () => {
    save();
    window.location.href = './marital.html';
  });
  document.querySelector('.nav-btn.right')?.addEventListener('click', () => {
    if (!form) return;
    if (!validateAllVisible(form)) return;
    save();
    // Compile submission for admin approval
    try {
      const personal = safeJsonParse(localStorage.getItem('SLUMLINK_SIGNUP'), {});
      const marital = safeJsonParse(localStorage.getItem('SLUMLINK_MARITAL'), {});
      const children = safeJsonParse(localStorage.getItem('SLUMLINK_CHILDREN'), {});
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

      // Transform spouses
      const spouseCount = Number(marital.spouseCount || 0) || 0;
      const spouses = [];
      for (let i = 1; i <= spouseCount; i++) {
        const s = {
          name: marital[`spouse_${i}_name`] || '',
          dob: marital[`spouse_${i}_dob`] || '',
          gender: marital[`spouse_${i}_gender`] || '',
          nid: marital[`spouse_${i}_nid`] || '',
          education: marital[`spouse_${i}_education`] || '',
          job: marital[`spouse_${i}_job`] || '',
          income: marital[`spouse_${i}_income`] || '',
          mobile: marital[`spouse_${i}_mobile`] || '',
          marriageCertificate: marital[`spouse_${i}_marriage_certificate`] || '',
          marriageCertificateName: marital[`spouse_${i}_marriage_certificate_filename`] || '',
        };
        spouses.push(s);
      }

      // Transform children
      const childCount = Number(children.childrenCount || 0) || 0;
      const kids = [];
      for (let i = 1; i <= childCount; i++) {
        const c = {
          name: children[`child_${i}_name`] || '',
          dob: children[`child_${i}_dob`] || '',
          gender: children[`child_${i}_gender`] || '',
          education: children[`child_${i}_education`] || '',
          job: children[`child_${i}_job`] || '',
          income: children[`child_${i}_income`] || '',
          preferredJob: children[`child_${i}_preferred_job`] || '',
          birthCertificate: children[`child_${i}_birth_certificate`] || '',
          birthCertificateName: children[`child_${i}_birth_certificate_filename`] || '',
        };
        kids.push(c);
      }

      // Build submission (exclude account credentials from PDF payload)
      // Prefer mapped Area; if unknown, use the raw Area name
      const rawArea = String(personal.area || '').trim();
      const slumName = resolveSlumFromArea(personal.area) || rawArea || resolveSlumFromArea(personal.district) || resolveSlumFromArea(personal.division) || 'Unknown';
      const submission = {
        id: String(Date.now()),
        status: 'pending',
        createdAt: new Date().toISOString(),
        slum: slumName,
        account: {
          username: children.account_username || '',
          password: children.account_password || '',
        },
        data: {
          personal,
          marital: { maritalStatus: marital.maritalStatus || '', spouseCount: spouseCount, spouses },
          children: { childrenCount: childCount, children: kids },
        }
      };

      const LIST_KEY = 'SLUMLINK_APPLICATIONS';
      const listRaw = localStorage.getItem(LIST_KEY);
      const list = listRaw ? safeJsonParse(listRaw, []) : [];
      list.push(submission);
      localStorage.setItem(LIST_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to compile submission', e);
    }

    // Proceed to signin with role preselected to Slum Dweller and show success notice
    window.location.href = '/src/signin.html?role=dweller&submitted=1';
  });
})();
