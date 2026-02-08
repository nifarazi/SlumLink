(() => {
  const STORAGE_KEY = 'SLUMLINK_MARITAL';
  const SESSION_FLAG = 'SLUMLINK_SESSION_INIT';
  function initSession(){
    if (!sessionStorage.getItem(SESSION_FLAG)){
      ['SLUMLINK_SIGNUP','SLUMLINK_MARITAL','SLUMLINK_CHILDREN'].forEach(k => sessionStorage.removeItem(k));
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
          <input type="text" name="spouse_${index}_name" placeholder="e.g., Jamila Begum" />
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
        <label class="field span-2">
          <span>NID Number</span>
          <input type="text" name="spouse_${index}_nid" inputmode="numeric" placeholder="Enter National ID" />
        </label>
        <label class="field">
          <span>Education</span>
          <select name="spouse_${index}_education">
            <option value="" disabled selected>Select education</option>
            <option value="none">None</option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="hsc">HSC</option>
            <option value="diploma">Diploma</option>
            <option value="graduate">Graduate</option>
          </select>
        </label>
        <label class="field">
          <span>Job</span>
          <input type="text" name="spouse_${index}_job" placeholder="e.g., Day laborer" />
        </label>
        <label class="field">
          <span>Skill 1</span>
          <select name="spouse_${index}_skills_1" class="spouse-skill-1">
            <option value="" disabled selected>Select skill</option>
            <option value="None">None</option>
            <option value="tailoring">Tailoring</option>
            <option value="embroidery">Embroidery</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="cooking">Cooking</option>
            <option value="caregiving">Caregiving</option>
            <option value="delivery">Delivery</option>
            <option value="driver">Driver</option>
            <option value="rickshaw">Rickshaw</option>
            <option value="electric helper">Electric Helper</option>
            <option value="electrician">Electrician</option>
            <option value="plumbing helper">Plumbing Helper</option>
            <option value="plumber">Plumber</option>
            <option value="masonry helper">Masonry Helper</option>
            <option value="welding helper">Welding Helper</option>
            <option value="welding">Welding</option>
            <option value="carpentry">Carpentry</option>
            <option value="barbering">Barbering</option>
            <option value="beauty parlor">Beauty Parlor</option>
            <option value="mobile servicing">Mobile Servicing</option>
            <option value="electronics repair">Electronics Repair</option>
            <option value="sales">Sales</option>
            <option value="typing">Typing</option>
            <option value="ms office">MS Office</option>
            <option value="data entry">Data Entry</option>
            <option value="tutoring">Tutoring</option>
            <option value="security guard">Security Guard</option>
          </select>
        </label>
        <label class="field">
          <span>Skill 2</span>
          <select name="spouse_${index}_skills_2" class="spouse-skill-2">
            <option value="" disabled selected>Select skill</option>
            <option value="None">None</option>
            <option value="tailoring">Tailoring</option>
            <option value="embroidery">Embroidery</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="cooking">Cooking</option>
            <option value="caregiving">Caregiving</option>
            <option value="delivery">Delivery</option>
            <option value="driver">Driver</option>
            <option value="rickshaw">Rickshaw</option>
            <option value="electric helper">Electric Helper</option>
            <option value="electrician">Electrician</option>
            <option value="plumbing helper">Plumbing Helper</option>
            <option value="plumber">Plumber</option>
            <option value="masonry helper">Masonry Helper</option>
            <option value="welding helper">Welding Helper</option>
            <option value="welding">Welding</option>
            <option value="carpentry">Carpentry</option>
            <option value="barbering">Barbering</option>
            <option value="beauty parlor">Beauty Parlor</option>
            <option value="mobile servicing">Mobile Servicing</option>
            <option value="electronics repair">Electronics Repair</option>
            <option value="sales">Sales</option>
            <option value="typing">Typing</option>
            <option value="ms office">MS Office</option>
            <option value="data entry">Data Entry</option>
            <option value="tutoring">Tutoring</option>
            <option value="security guard">Security Guard</option>
          </select>
        </label>
        <label class="field span-2">
          <span>Income Range</span>
          <select name="spouse_${index}_income">
            <option value="" disabled selected>Select range</option>
            <option value="No Income">No Income</option>
            <option value="Less than &#2547;3,000">Less than &#2547;3,000</option>
            <option value="&#2547;3,000 &ndash; &#2547;5,000">&#2547;3,000 &ndash; &#2547;5,000</option>
            <option value="&#2547;5,001 &ndash; &#2547;9,999">&#2547;5,001 &ndash; &#2547;9,999</option>
            <option value="&#2547;10,000 and above">&#2547;10,000 and above</option>
          </select>
        </label>
        <label class="field span-2">
          <span>Mobile Number</span>
          <input type="tel" name="spouse_${index}_mobile" placeholder="e.g., 017XXXXXXXX" inputmode="numeric" pattern="[0-9]{11}" maxlength="11" />
        </label>
        <label class="field span-2">
          <span>Marriage Certificate (Upload)</span>
          <input type="file" name="spouse_${index}_marriage_certificate" accept=".pdf,image/*" />
        </label>
      </div>`;
    return wrap;
  }

  function renderSegments(n){
    clearSegments();
    const count = Math.max(1, Math.min(Number(n) || 0, 10));
    for(let i=1;i<=count;i++) segments.appendChild(makeSpouseSegment(i));
    
    // Setup mobile input constraints for all newly created mobile fields
    setupMobileInputConstraints();
    // Setup skill validation for newly created skill fields
    setupSkillValidation();
    // Setup NID constraints for newly created NID fields
    setupNidConstraints();
  }

  function setupSkillValidation() {
    const skillSegments = segments.querySelectorAll('.spouse-segment');
    skillSegments.forEach(segment => {
      const skill1 = segment.querySelector('.spouse-skill-1');
      const skill2 = segment.querySelector('.spouse-skill-2');
      
      if (skill1 && skill2) {
        const validateSkills = () => {
          const val1 = skill1.value;
          const val2 = skill2.value;
          if (val1 && val2 && val1 === val2 && val1 !== 'None') {
            skill2.setCustomValidity('Skill 1 and Skill 2 cannot be the same');
          } else {
            skill1.setCustomValidity('');
            skill2.setCustomValidity('');
          }
        };
        
        skill1.addEventListener('change', validateSkills);
        skill2.addEventListener('change', validateSkills);
      }
    });
  }

  function setupMobileInputConstraints() {
    const mobileInputs = segments.querySelectorAll('input[name*="_mobile"]');
    mobileInputs.forEach(mobileEl => {
      // Remove existing listeners to avoid duplicates
      mobileEl.removeEventListener('input', handleMobileInput);
      mobileEl.removeEventListener('keypress', handleMobileKeypress);
      
      // Add new listeners
      mobileEl.addEventListener('input', handleMobileInput);
      mobileEl.addEventListener('keypress', handleMobileKeypress);
    });
  }

  function handleMobileInput(e) {
    // Remove any non-digit characters
    let value = e.target.value.replace(/\D/g, '');
    // Limit to 11 digits
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    e.target.value = value;
  }

  function handleMobileKeypress(e) {
    // Prevent non-numeric input
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleNidInput(e) {
    // Remove any non-digit characters
    let value = e.target.value.replace(/\D/g, '');
    
    // Limit to 17 digits maximum
    if (value.length > 17) {
      value = value.substring(0, 17);
    }
    
    // Format with spaces every 4 digits for display
    let formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    e.target.value = formatted;
    
    // Custom validation for min/max length
    const digitCount = value.length;
    if (digitCount > 0 && digitCount < 10) {
      e.target.setCustomValidity(`NID number must be at least 10 digits (currently ${digitCount})`);
    } else if (digitCount > 17) {
      e.target.setCustomValidity('NID number cannot exceed 17 digits');
    } else {
      e.target.setCustomValidity('');
    }

    // Clear previous debounce timer
    if (e.target.debounceTimer) {
      clearTimeout(e.target.debounceTimer);
    }
    
    // Debounce API call for duplicate check (only if valid length)
    if (digitCount >= 10 && digitCount <= 17) {
      e.target.debounceTimer = setTimeout(() => {
        checkSpouseNidDuplicate(value, e.target);
      }, 500); // Wait 500ms after user stops typing
    }
  }

  function handleNidKeypress(e) {
    // Prevent non-numeric input
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleNidBlur(e) {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 10) {
      e.target.setCustomValidity(`NID number must be at least 10 digits (currently ${digits.length})`);
      e.target.reportValidity();
    } else if (digits.length >= 10 && digits.length <= 17) {
      // Final check on blur
      checkSpouseNidDuplicate(digits, e.target);
    }
  }

  async function checkSpouseNidDuplicate(nidDigits, nidEl) {
    if (!nidEl || !nidDigits) return;

    try {
      const response = await fetch('/api/slum-dweller/check-nid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nid: nidDigits })
      });

      if (!response.ok) {
        console.log('NID check API not available, skipping duplicate check');
        return; // Gracefully handle API unavailability
      }

      const result = await response.json();

      if (result.status === 'success') {
        if (result.isDuplicate) {
          nidEl.setCustomValidity('Duplicate NID - This NID number already exists in the system');
        } else {
          // Clear any duplicate error, but preserve other validation errors
          const currentError = nidEl.validationMessage;
          if (currentError.includes('Duplicate NID')) {
            nidEl.setCustomValidity('');
          }
        }
      }
    } catch (error) {
      console.log('NID check service unavailable, proceeding without duplicate check');
      // Clear any existing duplicate validation errors when service is unavailable
      const currentError = nidEl.validationMessage;
      if (currentError && currentError.includes('Duplicate NID')) {
        nidEl.setCustomValidity('');
      }
    }
  }

  function setupNidConstraints() {
    const nidInputs = segments.querySelectorAll('input[name*="_nid"]');
    nidInputs.forEach(nidEl => {
      // Remove existing listeners to avoid duplicates
      nidEl.removeEventListener('input', handleNidInput);
      nidEl.removeEventListener('keypress', handleNidKeypress);
      nidEl.removeEventListener('blur', handleNidBlur);
      
      // Add new listeners
      nidEl.addEventListener('input', handleNidInput);
      nidEl.addEventListener('keypress', handleNidKeypress);
      nidEl.addEventListener('blur', handleNidBlur);
      
      // Set max length attribute for the input
      nidEl.setAttribute('maxlength', '20'); // Allow for spaces in formatting
    });
  }

  function sanitizeSpouseCount(){
    if (!spouseCountInput) return 1;
    const raw = Number(spouseCountInput.value);
    const sanitized = Number.isFinite(raw) ? Math.min(10, Math.max(1, raw)) : 1;
    if (String(sanitized) !== String(spouseCountInput.value)) spouseCountInput.value = String(sanitized);
    return sanitized;
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
        let value = el.value;
        // Special handling for NID fields - remove spaces before storing
        if (el.name.includes('_nid')) {
          value = value.replace(/\s+/g, '');
        }
        data[el.name] = value;
      }
    });
    return data;
  }
  function fillForm(frm, data){
    if (!data) return;
    // Ensure UI matches stored selection
    if (data.maritalStatus === 'married') {
      spouseCountWrap.style.display = '';
      if (data.spouseCount) spouseCountInput.value = data.spouseCount;
      const n = sanitizeSpouseCount();
      renderSegments(n || 1);
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
  function save(){ if (!form) return; sessionStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormData(form))); }
  function load(){ const raw = sessionStorage.getItem(STORAGE_KEY); return raw ? safeJsonParse(raw, {}) : {}; }

  function validateAllVisible(frm){
    let firstInvalid = null;
    const fields = frm.querySelectorAll('input, select, textarea');
    fields.forEach(el => {
      if (el.disabled || el.offsetParent === null) return; // skip hidden
      const val = (el.type === 'checkbox') ? (el.checked ? 'on' : '') : String(el.value || '').trim();
      // Requiredness
      if (!val) {
        if (!firstInvalid) firstInvalid = el;
        el.setCustomValidity('Please fill out this field');
      } else {
        el.setCustomValidity('');
      }
      // Mobile validation for spouse entries: exactly 11 digits
      const name = String(el.name || '');
      if (name && /^(spouse_\d+_mobile)$/i.test(name)) {
        const ok = /^\d{11}$/.test(val);
        if (!ok) {
          if (!firstInvalid) firstInvalid = el;
          el.setCustomValidity('Invalid Mobile Number');
        } else {
          el.setCustomValidity('');
        }
      }
    });
    if (firstInvalid) { firstInvalid.reportValidity(); firstInvalid.focus(); return false; }
    return true;
  }

  // First-visit per tab clears stored data
  initSession();
  // Initial load
  if (form) fillForm(form, load());
  // Setup mobile input constraints for any existing mobile fields
  setupMobileInputConstraints();

  // React to status changes
  maritalStatus?.addEventListener('change', () => {
    const v = maritalStatus.value;
    if (v === 'married'){
      spouseCountWrap.style.display = '';
      if (!spouseCountInput.value) spouseCountInput.value = '1';
      const n = sanitizeSpouseCount();
      renderSegments(n);
    } else {
      spouseCountWrap.style.display = 'none';
      clearSegments();
    }
    save();
  });

  spouseCountInput?.addEventListener('input', () => {
    const n = sanitizeSpouseCount();
    renderSegments(n);
    save();
  });

  // Autosave
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

  // Navigation
  document.querySelector('.nav-btn.left')?.addEventListener('click', () => {
    save();
    window.location.href = './signup.html';
  });
  document.querySelector('.nav-btn.right')?.addEventListener('click', () => {
    if (!form) return;
    // Ensure spouse count obeys minimum when married
    if (maritalStatus?.value === 'married') {
      const n = sanitizeSpouseCount();
      if (n < 1 || n > 10) {
        spouseCountInput.setCustomValidity('Spouse count must be between 1 and 10');
        spouseCountInput.reportValidity();
        spouseCountInput.focus();
        return;
      }
      spouseCountInput.setCustomValidity('');
    }
    if (!validateAllVisible(form)) return;
    save();
    window.location.href = './children.html';
  });
})();
