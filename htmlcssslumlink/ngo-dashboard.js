function onClick(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", handler);
}

// Campaign Creation
onClick("createEvent", () => {
  window.location.href = "create-entry.html";
});

onClick("createEventTop", () => {
  window.location.href = "create-entry.html";
});

// QR Code Scanner
onClick("scanQr", () => {
  alert("Opening QR Code Scanner...");
});

// View Ongoing Events
onClick("ongoingEvents", () => {
  window.location.href = "campaigns.html";
});

// Analytics Dashboard
onClick("analyticsDashboard", () => {
  window.location.href = "ngodashsum.html";
});

// Profile Navigation
onClick("profileBtn", () => {
  alert("Navigate to NGO Profile & Settings");
});
