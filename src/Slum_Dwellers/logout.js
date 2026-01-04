(function () {
  function injectLogoutModal() {
    if (document.getElementById('logoutModal')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="complaint-modal" id="logoutModal" aria-hidden="true">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="logoutTitle">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-title" id="logoutTitle">Confirm Logout</div>
              <div class="modal-category">Are you sure you want to logout?</div>
            </div>
          </div>
          <div class="modal-actions">
            <button id="logoutCancelBtn" class="btn outlined" type="button">Cancel</button>
            <button id="logoutConfirmBtn" class="btn primary" type="button">Logout</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper.firstElementChild);
  }

  function openModal() {
    const modal = document.getElementById('logoutModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    const modal = document.getElementById('logoutModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function wireButtons() {
    const modal = document.getElementById('logoutModal');
    const modalContent = modal ? modal.querySelector('.modal-content') : null;
    const cancelBtn = document.getElementById('logoutCancelBtn');
    const confirmBtn = document.getElementById('logoutConfirmBtn');
    if (!modal || !cancelBtn || !confirmBtn) return;

    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', () => {
      // Navigate to homepage (workspace root index.html)
      window.location.href = '../../index.html';
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    if (modalContent) modalContent.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', (e) => {
      const m = document.getElementById('logoutModal');
      if (e.key === 'Escape' && m && m.classList.contains('open')) closeModal();
    });
  }

  window.__openLogoutModal = function () {
    injectLogoutModal();
    openModal();
    wireButtons();
  };
})();
