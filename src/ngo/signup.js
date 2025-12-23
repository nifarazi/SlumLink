const pw = document.getElementById("password");
const cpw = document.getElementById("confirmPassword");
const pwStatus = document.getElementById("pwStatus");
const matchStatus = document.getElementById("matchStatus");

const toggle = (input, btn) => {
  const isPw = input.type === "password";
  input.type = isPw ? "text" : "password";
  btn.textContent = isPw ? "Hide" : "Show";
};

document.getElementById("togglePw").addEventListener("click", (e) => toggle(pw, e.target));
document.getElementById("toggleCpw").addEventListener("click", (e) => toggle(cpw, e.target));

function scorePassword(v){
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[a-z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}

function updatePwUI(){
  const v = pw.value;
  const s = scorePassword(v);

  if (!v){
    pwStatus.textContent = "8+ characters recommended.";
    pwStatus.className = "status";
    return;
  }

  if (s <= 2){
    pwStatus.textContent = "Weak password.";
    pwStatus.className = "status bad";
  } else if (s === 3){
    pwStatus.textContent = "Good password.";
    pwStatus.className = "status";
  } else {
    pwStatus.textContent = "Strong password.";
    pwStatus.className = "status good";
  }
}

function updateMatchUI(){
  if (!pw.value && !cpw.value){
    matchStatus.textContent = "Not checked yet.";
    matchStatus.className = "status";
    return;
  }
  if (pw.value === cpw.value && pw.value.length >= 8){
    matchStatus.textContent = "Passwords match.";
    matchStatus.className = "status good";
  } else {
    matchStatus.textContent = "Passwords do not match.";
    matchStatus.className = "status bad";
  }
}

pw.addEventListener("input", () => { updatePwUI(); updateMatchUI(); });
cpw.addEventListener("input", updateMatchUI);

document.getElementById("orgForm").addEventListener("submit", (e) => {
  updatePwUI();
  updateMatchUI();

  const form = e.target;
  const isValid = form.checkValidity();
  const pwOk = pw.value.length >= 8 && (pw.value === cpw.value);

  if (!isValid || !pwOk){
    e.preventDefault();
    form.reportValidity();
  }
});
