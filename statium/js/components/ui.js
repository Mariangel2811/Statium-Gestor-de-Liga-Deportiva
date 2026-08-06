
(function () {
  'use strict';

// -------------------- Toast --------------------

let toastOutlet = null;
function ensureToastOutlet() {
  if (!toastOutlet) {
    toastOutlet = document.getElementById('toast-outlet');
  }
  return toastOutlet;
}

function showToast(message, type = 'success', duration = 3200) {
  const outlet = ensureToastOutlet();
  if (!outlet) return;
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'toast--error' : ''}`;
  el.textContent = message;
  outlet.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s ease';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

// -------------------- ConfirmDialog --------------------

/**
 * Devuelve una Promise<boolean> que resuelve true si el usuario confirma.
 */
function confirmDialog({ title = '¿Confirmar?', message = '', confirmLabel = 'Confirmar', danger = true }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="form-actions">
          <button class="btn" data-action="cancel">Cancelar</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    function close(result) {
      backdrop.remove();
      resolve(result);
    }
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
    backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    backdrop.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
  });
}

// -------------------- LoadingState --------------------

class LoadingState extends HTMLElement {
  connectedCallback() {
    this.textContent = this.getAttribute('label') || 'Cargando…';
  }
}
customElements.define('loading-state', LoadingState);

function loadingHTML(label = 'Cargando…') {
  return `<loading-state label="${label}"></loading-state>`;
}

  window.Statium.UI = { showToast, confirmDialog, loadingHTML };
})();
