const form = document.getElementById("orgForm");

const modal = document.getElementById("successModal");
const goHomeBtn = document.getElementById("goHomeBtn");
const modalOverlay = document.getElementById("modalOverlay");

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

let submitAttempted = false;

const fieldIds = [
  "orgName",
  "email",
  "phone",
  "license",
  "orgAge",
  "password",
  "confirmPassword",
];

function getInput(id) {
  return document.getElementById(id);
}
function getErrorBox(id) {
  return document.getElementById(`err-${id}`);
}

function setFieldError(input, message) {
  const wrap = input.closest(".field");
  const box = getErrorBox(input.id);
  if (!box) return;

  if (!submitAttempted) {
    box.textContent = "";
    wrap?.classList.remove("is-error");
    input.removeAttribute("aria-invalid");
    return;
  }

  if (message) {
    box.textContent = message;
    wrap?.classList.add("is-error");
    input.setAttribute("aria-invalid", "true");
  } else {
    box.textContent = "";
    wrap?.classList.remove("is-error");
    input.removeAttribute("aria-invalid");
  }
}

function normalizePhone(v) {
  return String(v || "").trim().replace(/[\s-]/g, "");
}
function isValidBDPhone(v) {
  const s = normalizePhone(v);
  return /^(?:\+?88)?01[3-9][0-9]{8}$/.test(s);
}

function messageFor(input) {
  const v = (input.value || "").trim();

  if (input.type === "file") {
    if (!input.files || input.files.length === 0) return "";
    return "";
  }

  if (input.id === "phone") {
    if (!v) return "";
    if (!isValidBDPhone(v)) return "Enter a valid BD number (01XXXXXXXXX / 8801XXXXXXXXX / +8801XXXXXXXXX)";
    return "";
  }

  if (input.id === "password") {
    if (!v) return "";
    if (v.length < 8) return "Password must be at least 8 characters.";
    return "";
  }

  if (input.id === "confirmPassword") {
    if (!v) return "";
    if (v.length < 8) return "Password must be at least 8 characters.";
    if (password.value !== confirmPassword.value) return "Passwords do not match.";
    return "";
  }

  if (!v) return "";

  if (input.type === "email") {
    if (input.validity.typeMismatch) return "Enter a valid email address.";
  }

  if (input.type === "number") {
    const num = Number(input.value);
    if (Number.isNaN(num)) return "";
    if (input.min !== "" && num < Number(input.min)) return `Value must be ${input.min} or more.`;
    if (input.max !== "" && num > Number(input.max)) return `Value must be ${input.max} or less.`;
  }

  return "";
}

function validateField(input) {
  const msg = messageFor(input);
  setFieldError(input, msg);
  return !msg;
}

function validateAll() {
  let ok = true;
  let firstBad = null;

  for (const id of fieldIds) {
    const input = getInput(id);
    if (!input) continue;

    const valid = validateField(input);
    if (!valid) {
      ok = false;
      if (!firstBad) firstBad = input;
    }
  }

  if (!ok && firstBad) {
    firstBad.focus({ preventScroll: true });
    firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return ok;
}

/* Modal */
function openModal() {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  goHomeBtn.focus();
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}
function goHome() {
  window.location.href = "../../index.html";
}

goHomeBtn.addEventListener("click", () => { closeModal(); goHome(); });
modalOverlay.addEventListener("click", () => { closeModal(); goHome(); });
document.addEventListener("keydown", (e) => {
  if (!modal.hidden && e.key === "Escape") { closeModal(); goHome(); }
});

/* Only validate after clicking Register once */
form.addEventListener("input", (e) => {
  if (!submitAttempted) return;
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;

  validateField(t);
  
  // Clear custom validity as user corrects the field
  const msg = messageFor(t);
  if (!msg) {
    t.setCustomValidity("");
  }
  
  if (t.id === "password" || t.id === "confirmPassword") {
    validateField(confirmPassword);
    const pwMsg = messageFor(confirmPassword);
    if (!pwMsg) {
      confirmPassword.setCustomValidity("");
    }
  }
});
form.addEventListener("change", (e) => {
  if (!submitAttempted) return;
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  validateField(t);
  
  // Clear custom validity as user corrects the field
  const msg = messageFor(t);
  if (!msg) {
    t.setCustomValidity("");
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  submitAttempted = true;
  const ok = validateAll();
  
  // Set custom validation messages for HTML5 validation
  for (const id of fieldIds) {
    const input = getInput(id);
    if (!input) continue;
    
    const msg = messageFor(input);
    if (msg) {
      input.setCustomValidity(msg);
    } else {
      input.setCustomValidity("");
    }
  }
  
  // Report validity to show native browser messages
  if (!form.reportValidity()) {
    return;
  }
  
  if (!ok) return;

  openModal();
});

/* ✅ Eye toggle: default slashed (hidden), click -> visible + normal eye */
document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;

    const toShow = input.type === "password"; // currently hidden
    input.type = toShow ? "text" : "password";

    const icon = btn.querySelector("i");
    if (icon) {
      // When showing text -> normal eye
      icon.className = toShow ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
    }

    btn.setAttribute("aria-pressed", toShow ? "true" : "false");
    btn.setAttribute("aria-label", toShow ? "Hide password" : "Show password");
    btn.setAttribute("title", toShow ? "Hide password" : "Show password");
  });
});
