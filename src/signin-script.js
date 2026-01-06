// Role configuration: EXACT screenshot wording
const roleConfig = {
  ngo: {
    label: "Email",
    placeholder: "e.g., org@mail.com",
    hint: "Use the official email you registered with SlumLink.",
    showSignup: true,
    signupLinkText: "Register your organization",
    signupHref: "/src/ngo/signup.html"
  },
  authority: {
    label: "Official email",
    placeholder: "e.g., officer@gov.bd",
    hint: "Use your verified government or city authority email.",
    showSignup: false
  },
  dweller: {
    label: "Username",
    placeholder: "e.g., hasan123",
    hint: "Enter your Slum Dweller username.",
    showSignup: true,
    signupLinkText: "Sign up",
    signupHref: "/src/Slum_SignUp/signup.html"
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
  // Pick up role from URL, e.g., /src/signin.html?role=dweller
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get("role");
  if (urlRole && roleConfig[urlRole]) {
    roleSelect.value = urlRole;
  }

  roleSelect.addEventListener("change", () => applyRole(roleSelect.value));
  applyRole(roleSelect.value);

  // Show one-time alert if redirected after signup with submitted flag
  const submitted = params.get("submitted");
  if (submitted === "1") {
    // Show success toast (for application submitted)
    try {
      const toast = document.createElement('div');
      toast.className = 'signin-toast';
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
    } catch (err) {}
    // Clean the URL to avoid repeat alerts on refresh
    params.delete("submitted");
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? ("?" + qs) : "");
    window.history.replaceState(null, '', newUrl);
  }
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

// Handle sign-in submit: redirect to appropriate dashboard
const signinForm = document.querySelector(".signin-form");
signinForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const role = roleSelect?.value;
  const identifier = identifierInput?.value?.trim();
  const password = passwordInput?.value?.trim();

  // Basic validation
  if (!identifier || !password) {
    alert("Please enter both " + (role === "dweller" ? "family code" : role === "authority" ? "official email" : role === "admin" ? "admin ID" : "email") + " and password");
    return;
  }

  // Route based on role
  if (role === "ngo") {
    // Show success toast then redirect to NGO Dashboard
    try {
      const toast = document.createElement('div');
      toast.className = 'signin-toast';
      toast.innerHTML = [
        '<span class="icon" aria-hidden="true">',
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
            '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
          '</svg>',
        '</span>',
        '<div class="toast-content">',
          '<strong>Success</strong>',
          '<div class="subtitle">You are signed in successfully</div>',
        '</div>'
      ].join('');
      document.body.appendChild(toast);
    } catch (err) {}

    setTimeout(() => {
      window.location.href = "/src/ngo/ngo-dashboard.html";
    }, 1500);
  } else if (role === "admin") {
    // Show success toast then redirect to Admin Dashboard
    try {
      const toast = document.createElement('div');
      toast.className = 'signin-toast';
      toast.innerHTML = [
        '<span class="icon" aria-hidden="true">',
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
            '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
          '</svg>',
        '</span>',
        '<div class="toast-content">',
          '<strong>Success</strong>',
          '<div class="subtitle">You are signed in successfully</div>',
        '</div>'
      ].join('');
      document.body.appendChild(toast);
    } catch (err) {}

    setTimeout(() => {
      window.location.href = "/src/admin/adminSlumAnalytics.html";
    }, 1500);
  } else if (role === "authority") {
    // Show success toast then redirect to Local Authority Dashboard
    try {
      const toast = document.createElement('div');
      toast.className = 'signin-toast';
      toast.innerHTML = [
        '<span class="icon" aria-hidden="true">',
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
            '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
          '</svg>',
        '</span>',
        '<div class="toast-content">',
          '<strong>Success</strong>',
          '<div class="subtitle">You are signed in successfully</div>',
        '</div>'
      ].join('');
      document.body.appendChild(toast);
    } catch (err) {}

    setTimeout(() => {
      window.location.href = "/src/localauthority/local-dashboard.html";
    }, 1500);
  } else if (role === "dweller") {
    // Validate Slum Dweller credentials against localStorage and hardcoded accounts
    const validUser = "hasan123";
    const validPass = "123456";
    
    // Check hardcoded account first
    let authenticated = (identifier === validUser && password === validPass);
    let loggedInApp = null;
    
    // If not authenticated, check approved accounts from localStorage
    if (!authenticated) {
      try {
        const LIST_KEY = 'SLUMLINK_APPLICATIONS';
        const stored = localStorage.getItem(LIST_KEY);
        if (stored) {
          const applications = JSON.parse(stored);
          const approvedApps = applications.filter(app => app.status === 'approved');
          
          // Check if credentials match any approved account using signup username/password
          loggedInApp = approvedApps.find(app => {
            const account = app.account;
            if (!account) return false;
            
            // Match username and password from signup
            return (
              account.username === identifier &&
              account.password === password
            );
          });
          
          authenticated = !!loggedInApp;
          
          // Store the logged-in user info for the dashboard
          if (authenticated && loggedInApp) {
            localStorage.setItem('SLUMLINK_CURRENT_USER', JSON.stringify({
              id: loggedInApp.id,
              name: loggedInApp.data.personal.fullName,
              mobile: loggedInApp.data.personal.mobile,
              nid: loggedInApp.data.personal.nidNumber,
              slum: loggedInApp.slum
            }));
          }
        }
      } catch (e) {
        console.error('Error checking approved accounts:', e);
      }
    } else {
      // Store hardcoded user info
      localStorage.setItem('SLUMLINK_CURRENT_USER', JSON.stringify({
        id: 'SR000',
        name: 'Hasan Ahmed',
        mobile: '01712345678',
        nid: 'hardcoded',
        slum: 'Korail'
      }));
    }
    
    if (!authenticated) {
      alert("Invalid username or password for Slum Dweller.\n\nPlease use the username and password you created during signup.");
      return;
    }
    
    // Show small popup and redirect to Slum Dweller Dashboard on success
    try {
      const toast = document.createElement('div');
      toast.className = 'signin-toast';
      toast.innerHTML = [
        '<span class="icon" aria-hidden="true">',
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
            '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
          '</svg>',
        '</span>',
        '<div class="toast-content">',
          '<strong>Success</strong>',
          '<div class="subtitle">You are signed in successfully</div>',
        '</div>'
      ].join('');
      document.body.appendChild(toast);
    } catch (err) {
      // Fallback: no-op if DOM not available
    }

    setTimeout(() => {
      window.location.href = "/src/Slum_Dwellers/dashboard.html";
    }, 1500);
  }
});
