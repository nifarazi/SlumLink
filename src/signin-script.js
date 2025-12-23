// Role configuration: EXACT screenshot wording
const roleConfig = {
  ngo: {
    label: "Email",
    placeholder: "e.g., org@mail.com",
    hint: "Use the official email you registered with SlumLink.",
    showSignup: true,
    signupLinkText: "Register your organization",
    signupHref: "/htmlcssslumlink/signup.html"
  },
  authority: {
    label: "Official email",
    placeholder: "e.g., officer@gov.bd",
    hint: "Use your verified government or city authority email.",
    showSignup: false
  },
  dweller: {
    label: "Family code",
    placeholder: "e.g., SLFKRAM001",
    hint: "Use family code given during registration.",
    showSignup: true,
    signupLinkText: "Sign up",
    signupHref: "/htmlcssslumlink/signup.html"
  },
  admin: {
    label: "Admin ID",
    placeholder: "e.g., admin@slumlink.org",
    hint: "Reserved for verified SlumLink administrators.",
    showSignup: false
  }
};

const roleSelect = document.getElementById("roleSelect");
const identifierInput = document.getElementById("identifier");
const identifierLabel = document.getElementById("identifierLabel");
const identifierHint = document.getElementById("identifierHint");
const roleSubtitle = document.getElementById("roleSubtitle");

const signupRow = document.querySelector(".below-text");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.querySelector(".toggle-password");

function setSignup(prefix, linkText, href) {
  if (!signupRow) return;

  let link = signupRow.querySelector("a.link-strong");
  if (!link) {
    signupRow.innerHTML = `${prefix} <a class="link-strong" href="${href}">${linkText}</a>`;
    return;
  }

  // clean prefix text
  const nodes = Array.from(signupRow.childNodes);
  const textNode = nodes.find(n => n.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.textContent = prefix + " ";
  else signupRow.insertBefore(document.createTextNode(prefix + " "), link);

  link.textContent = linkText;
  link.setAttribute("href", href);
}

function resetEyeClosed() {
  if (!passwordInput || !togglePasswordBtn) return;
  const icon = togglePasswordBtn.querySelector("i");

  passwordInput.type = "password";
  if (icon) {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  }
}

function applyRole(selectedRole) {
  const config = roleConfig[selectedRole];
  if (!config) return;

  if (identifierLabel) identifierLabel.textContent = config.label;
  if (identifierInput) identifierInput.placeholder = config.placeholder;
  if (identifierHint) identifierHint.textContent = config.hint;

  // not used in screenshots
  if (roleSubtitle) roleSubtitle.textContent = "";

  // clear values
  if (identifierInput) identifierInput.value = "";
  if (passwordInput) passwordInput.value = "";

  // signup line
  if (signupRow) {
    if (config.showSignup) {
      signupRow.style.display = "block";
      setSignup("Don't have an account?", config.signupLinkText, config.signupHref);
    } else {
      signupRow.style.display = "none";
    }
  }

  // reset eye CLOSED after role change
  resetEyeClosed();
}

if (roleSelect) {
  roleSelect.addEventListener("change", () => applyRole(roleSelect.value));
  applyRole(roleSelect.value);
}

// eye toggle (closed -> open)
togglePasswordBtn?.addEventListener("click", () => {
  if (!passwordInput) return;
  const icon = togglePasswordBtn.querySelector("i");
  if (!icon) return;

  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";

  if (hidden) {
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  } else {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  }
});
