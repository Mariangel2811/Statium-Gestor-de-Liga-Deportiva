/**
 * navbar.js — Barra de navegación global (script clásico).
 */
(function () {
  'use strict';

/**
 * navbar.js — Barra de navegación global (siempre visible).
 */

const NAV_LINKS = [
  { hash: '#leagues', label: 'Ligas' },
  { hash: '#dashboard', label: 'Dashboard' },
  { hash: '#teams', label: 'Equipos' },
  { hash: '#players', label: 'Jugadores' },
  { hash: '#matches', label: 'Partidos' },
  { hash: '#stats', label: 'Estadísticas' },
];

class NavBar extends HTMLElement {
  connectedCallback() {
    this.render();
    window.Statium.State.onActiveLeagueChange(() => this.render());
  }

  render() {
    const league = window.Statium.State.getCachedActiveLeague();
    const terms = league ? window.Statium.SportsTerms.getSportTerms(league.sport) : null;

    this.className = 'navbar';
    this.innerHTML = `
      <a href="#about" class="navbar__brand"><span class="navbar__star">★</span>Statium</a>
      <nav class="navbar__links">
        ${NAV_LINKS.map((l) => `<a class="navbar__link" href="${l.hash}">${l.label}</a>`).join('')}
      </nav>
      <div class="navbar__active-league">
        ${league ? `<span>${terms.icon}</span><span>${league.name}</span>` : '<span>Sin liga activa</span>'}
      </div>
    `;
  }
}
customElements.define('nav-bar', NavBar);

})();
