/**
 * footer.js — Footer global (script clásico).
 */
(function () {
  'use strict';

/**
 * footer.js — Footer global con créditos e indicador de estado de IndexedDB.
 */

class AppFooter extends HTMLElement {
  connectedCallback() {
    this.className = 'footer';
    this.innerHTML = `
      <span>Statium — Mariangel Campos &amp; Adrian Monroy · ${new Date().getFullYear()}</span>
      <span class="footer__db-status">
        <span class="footer__db-dot" data-role="dot"></span>
        <span data-role="text">Verificando base de datos…</span>
      </span>
    `;
    this.checkDb();
  }

  async checkDb() {
    const dot = this.querySelector('[data-role="dot"]');
    const text = this.querySelector('[data-role="text"]');
    try {
      await window.Statium.DB.openDatabase();
      dot.classList.remove('is-error');
      text.textContent = 'Base de datos conectada';
    } catch (err) {
      dot.classList.add('is-error');
      text.textContent = 'Error al conectar con la base de datos';
    }
  }
}
customElements.define('app-footer', AppFooter);

})();
