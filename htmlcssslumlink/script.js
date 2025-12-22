// Role configuration: placeholder + hint per stakeholder
const roleConfig = {
  ngo: {
    label: "Organization email",
    placeholder: "e.g., contact@ngo.org",
    hint: "Use the official email you registered with SlumLink.",
    subtitle: "NGOs can view events, beneficiaries, and aid history."
  },
  authority: {
    label: "Official email",
    placeholder: "e.g., officer@gov.bd",
    hint: "Use your verified government or city authority email.",
    subtitle: "Local authorities can review complaints and service status."
  },
  dweller: {
    label: "Phone number or family code",
    placeholder: "e.g., 01XXXXXXXXX or SL-FAM-001",
    hint: "Use the phone or family code given during registration.",
    subtitle: "Slum families can track aid, complaints, and profile details."
  },
  admin: {
    label: "Admin ID or email",
    placeholder: "e.g., admin@slumlink.org",
    hint: "Reserved for verified SlumLink administrators.",
    subtitle: "Admins manage users, data quality, and analytics."
  }
};

const roleButtons = document.querySelectorAll(".role-btn");
const roleSelect = document.getElementById("roleSelect");
const identifierInput = document.getElementById("identifier");
const identifierLabel = document.getElementById("identifierLabel");
const identifierHint = document.getElementById("identifierHint");
const roleSubtitle = document.getElementById("roleSubtitle");

function applyRole(selectedRole) {
  const config = roleConfig[selectedRole];
  if (!config) return;
  if (!identifierInput || !identifierLabel || !identifierHint || !roleSubtitle) return;

  identifierLabel.textContent = config.label;
  identifierInput.placeholder = config.placeholder;
  identifierHint.textContent = config.hint;
  roleSubtitle.textContent = config.subtitle;

  // clear previous value to avoid wrong logins
  identifierInput.value = "";
  const passwordEl = document.getElementById("password");
  if (passwordEl) passwordEl.value = "";
}

// Handle role switching (dropdown preferred)
if (roleSelect) {
  roleSelect.addEventListener("change", () => {
    applyRole(roleSelect.value);
  });

  // Ensure initial UI matches the default option
  applyRole(roleSelect.value);
} else if (roleButtons.length) {
  roleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedRole = btn.dataset.role;

      // active state
      roleButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      applyRole(selectedRole);
    });
  });
}

// Password eye toggle
const togglePasswordBtn = document.querySelector(".toggle-password");
const passwordInput = document.getElementById("password");

togglePasswordBtn?.addEventListener("click", () => {
  if (!passwordInput) return;

  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";

  const icon = togglePasswordBtn.querySelector("i");
  icon?.classList.toggle("fa-eye");
  icon?.classList.toggle("fa-eye-slash");
});
