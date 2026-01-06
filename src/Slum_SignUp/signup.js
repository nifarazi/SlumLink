(() => {
  const STORAGE_KEY = 'SLUMLINK_SIGNUP';
  const SESSION_FLAG = 'SLUMLINK_SESSION_INIT';
  function initSession(){
    if (!sessionStorage.getItem(SESSION_FLAG)){
      ['SLUMLINK_SIGNUP','SLUMLINK_MARITAL','SLUMLINK_CHILDREN'].forEach(k => localStorage.removeItem(k));
      sessionStorage.setItem(SESSION_FLAG, '1');
    }
  }
  const form = document.getElementById('signupForm');
  const leftBtn = document.querySelector('.nav-btn.left');
  const rightBtn = document.querySelector('.nav-btn.right');

  // Progress (visual only on this page)
  const bars = Array.from(document.querySelectorAll('.progress .bar'));
  function setStepActive(idx) { bars.forEach((b, i) => b.classList.toggle('is-active', i <= idx)); }
  setStepActive(0);

  function safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
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
  // Load saved data on entry
  if (form) fillForm(form, load());

  // Autosave on change
  form?.addEventListener('input', save);
  form?.addEventListener('change', save);

  leftBtn?.addEventListener('click', () => {
    save();
    const ref = document.referrer || '';
    let cameFromIndex = false;
    try {
      const refUrl = new URL(ref, window.location.href);
      const p = refUrl.pathname || '';
      // Treat "/" or any path ending with "/index.html" as coming from index
      cameFromIndex = p === '/' || /(^|\/)index\.html(\?|#|$)/.test(p);
    } catch {
      cameFromIndex = ref.includes('index.html');
    }

    if (cameFromIndex) {
      window.location.href = '/index.html';
    } else {
      // Ensure signin preselects Slum Dweller
      window.location.href = '/src/signin.html?role=dweller';
    }
  });

  rightBtn?.addEventListener('click', () => {
    if (!form) { window.location.href = './marital.html'; return; }
    // Validate mobile number: must be exactly 11 digits
    const mobileEl = form.querySelector('[name="mobile"]');
    if (mobileEl) {
      const mobileVal = String(mobileEl.value || '').trim();
      const isValid = /^\d{11}$/.test(mobileVal);
      if (!isValid) {
        mobileEl.setCustomValidity('Invalid Mobile Number');
        mobileEl.reportValidity();
        mobileEl.focus();
        return;
      } else {
        mobileEl.setCustomValidity('');
      }
      // Clear the custom validity when user edits
      mobileEl.addEventListener('input', () => mobileEl.setCustomValidity(''), { once: true });
    }
    if (!validateAllVisible(form)) return;
    save();
    window.location.href = './marital.html';
  });
})();
