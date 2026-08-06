/**
 * event-form.js — Sub-formulario de anotaciones (script clásico).
 */
(function () {
  'use strict';

/**
 * event-form.js — Sub-formulario para registrar una anotación (evento)
 * de un partido en curso. Emite un evento DOM 'event-add' con
 * { teamId, playerId, minute } en el detalle.
 */

class EventForm extends HTMLElement {
  set data({ homeTeam, awayTeam, homePlayers, awayPlayers, sport } = {}) {
    this._homeTeam = homeTeam;
    this._awayTeam = awayTeam;
    this._homePlayers = homePlayers || [];
    this._awayPlayers = awayPlayers || [];
    this._sport = sport;
    this.render();
  }

  render() {
    const terms = window.Statium.SportsTerms.getSportTerms(this._sport);
    this.innerHTML = `
      <form class="form-grid" data-role="event-form">
        <div class="form-row two-col">
          <div class="form-row">
            <label>Equipo</label>
            <select name="teamId" required>
              <option value="${this._homeTeam.id}">${this._homeTeam.name} (Local)</option>
              <option value="${this._awayTeam.id}">${this._awayTeam.name} (Visitante)</option>
            </select>
          </div>
          <div class="form-row">
            <label>Minuto (opcional)</label>
            <input type="number" name="minute" min="0" placeholder="Ej: 34">
          </div>
        </div>
        <div class="form-row">
          <label>${terms.playerLabel}</label>
          <select name="playerId" required></select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${terms.addEventLabel}</button>
        </div>
      </form>
    `;

    const form = this.querySelector('form');
    const teamSelect = form.querySelector('[name="teamId"]');
    const playerSelect = form.querySelector('[name="playerId"]');

    const fillPlayers = () => {
      const players = teamSelect.value === this._homeTeam.id ? this._homePlayers : this._awayPlayers;
      playerSelect.innerHTML = players.length
        ? players.map((p) => `<option value="${p.id}">${p.name} (#${p.number})</option>`).join('')
        : `<option value="">Sin jugadores en plantilla</option>`;
    };
    teamSelect.addEventListener('change', fillPlayers);
    fillPlayers();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const playerId = fd.get('playerId');
      if (!playerId) return;
      this.dispatchEvent(
        new CustomEvent('event-add', {
          bubbles: true,
          detail: {
            teamId: fd.get('teamId'),
            playerId,
            minute: fd.get('minute') ? Number(fd.get('minute')) : null,
          },
        })
      );
      form.reset();
      fillPlayers();
    });
  }
}
customElements.define('event-form', EventForm);

})();
