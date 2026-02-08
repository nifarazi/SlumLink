(() => {
  const STORAGE_KEY = 'SLUMLINK_SIGNUP';
  const SESSION_FLAG = 'SLUMLINK_SESSION_INIT';
  
  // Area data for cascading dropdowns
  const AREA_DATA = {
    "Dhaka": {
      "Dhaka (North)": [
        "Korail",
        "Begun Bari",
        "Duaripara",
        "Kallyanpur",
        "Pora Basti",
        "Chalantika",
        "Agargaon",
        "Sattola (Mohakhali)",
        "Mohammadpur",
        "Basbari",
        "Molla"
      ],
      "Dhaka (South)": [
        "Nama Para",
        "Pura",
        "Nubur",
        "Mannan"
      ],
      "Narayanganj": [
        "Bhuigar",
        "Chashara",
        "Fatullah Cluster"
      ],
      "Gazipur": [
        "Tongi Cluster",
        "Board Bazar Cluster"
      ]
    },
    "Chattogram": {
      "Chattogram (City)": ["Halishahar", "Pahartali", "Agrabad Cluster"],
      "Cox's Bazar": ["Teknaf Cluster", "Kutupalong (Nearby)"]
    },
    "Khulna": { "Khulna": ["Rupsha Ghat Cluster", "Khalishpur Cluster"] },
    "Rajshahi": { "Rajshahi": ["Kazla Cluster", "Bornali Cluster"] },
    "Barishal": { "Barishal": ["Nathullabad Cluster", "Battala Cluster"] },
    "Sylhet": { "Sylhet": ["Ambarkhana Cluster", "Subidbazar Cluster"] },
    "Rangpur": { "Rangpur": ["Jahaj Company Cluster", "Modern Mor Cluster"] },
    "Mymensingh": { "Mymensingh": ["Town Hall Cluster", "Charpara Cluster"] }
  };

  function initSession(){
    if (!sessionStorage.getItem(SESSION_FLAG)){
      ['SLUMLINK_SIGNUP','SLUMLINK_MARITAL','SLUMLINK_CHILDREN'].forEach(k => sessionStorage.removeItem(k));
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
  function save(){ if (!form) return; sessionStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormData(form))); }
  function load(){ const raw = sessionStorage.getItem(STORAGE_KEY); return raw ? safeJsonParse(raw, {}) : {}; }

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

  // Utility functions for dropdowns
  function fillSelect(selectEl, items, placeholder = "Select") {
    selectEl.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.disabled = true;
    opt0.selected = true;
    opt0.textContent = placeholder;
    selectEl.appendChild(opt0);

    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      selectEl.appendChild(opt);
    });
  }

  function initDropdowns() {
    const divisionEl = document.getElementById('division');
    const districtEl = document.getElementById('district');
    const slumAreaEl = document.getElementById('slumArea');

    if (!divisionEl || !districtEl || !slumAreaEl) return;

    // Initialize divisions
    const divisions = Object.keys(AREA_DATA);
    fillSelect(divisionEl, divisions, "Select division");

    // Division change handler
    divisionEl.addEventListener('change', () => {
      const division = divisionEl.value;
      if (!division) {
        districtEl.disabled = true;
        slumAreaEl.disabled = true;
        fillSelect(districtEl, [], "Select district");
        fillSelect(slumAreaEl, [], "Select area");
        return;
      }

      const districts = Object.keys(AREA_DATA[division] || {});
      fillSelect(districtEl, districts, "Select district");
      districtEl.disabled = false;

      slumAreaEl.disabled = true;
      fillSelect(slumAreaEl, [], "Select area");
    });

    // District change handler
    districtEl.addEventListener('change', () => {
      const division = divisionEl.value;
      const district = districtEl.value;

      if (!division || !district) {
        slumAreaEl.disabled = true;
        fillSelect(slumAreaEl, [], "Select area");
        return;
      }

      const slums = (AREA_DATA[division]?.[district] || []);
      fillSelect(slumAreaEl, slums, "Select area");
      slumAreaEl.disabled = false;
    });
  }

  function restoreDropdownState() {
    const savedData = load();
    const divisionEl = document.getElementById('division');
    const districtEl = document.getElementById('district');
    const slumAreaEl = document.getElementById('slumArea');

    if (!savedData || !divisionEl || !districtEl || !slumAreaEl) return;

    // Restore division and populate districts if needed
    if (savedData.division) {
      divisionEl.value = savedData.division;
      const districts = Object.keys(AREA_DATA[savedData.division] || {});
      fillSelect(districtEl, districts, "Select district");
      districtEl.disabled = false;

      // Restore district and populate areas if needed
      if (savedData.district) {
        districtEl.value = savedData.district;
        const slums = (AREA_DATA[savedData.division]?.[savedData.district] || []);
        fillSelect(slumAreaEl, slums, "Select area");
        slumAreaEl.disabled = false;

        // Restore area
        if (savedData.area) {
          slumAreaEl.value = savedData.area;
        }
      }
    }
  }

  // First-visit per tab clears stored data
  initSession();
  // Initialize dropdowns
  initDropdowns();
  // Load saved data on entry
  if (form) fillForm(form, load());
  // Restore dropdown state after loading form data
  restoreDropdownState();

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
