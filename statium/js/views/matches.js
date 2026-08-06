/**
 * matches.js — vista de Statium (script clásico).
 */
(function () {
  'use strict';

/**
 * matches.js — V-07 Partidos (#matches)
 */

const outlet = () => document.getElementById('view-outlet');

async function renderMatches() {
  const root = outlet();
  const league = window.Statium.Helpers.requireActiveLeague();
  if (!league) {
    root.innerHTML = `<div class="view-header"><h1>Partidos</h1></div>${window.Statium.Helpers.emptyLeagueStateHTML()}`;
    return;
  }
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);
  const teams = await window.Statium.Helpers.getTeamsForLeague(league.id);
  const matches = await window.Statium.Helpers.getMatchesForLeague(league.id);
  const teamsById = window.Statium.Helpers.indexById(teams);

  const rounds = league.mode === 'eliminacion' ? [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b) : [];

  root.innerHTML = `
    <div class="view-header">
      <h1>${terms.matchesLabel}</h1>
      ${league.mode === 'liga' ? `<button class="btn btn-primary" id="btn-new-match" ${teams.length < 2 ? 'disabled' : ''}>Programar ${terms.matchLabel.toLowerCase()}</button>` : ''}
    </div>
    <div class="card mb-16">
      <div class="form-row two-col" style="grid-template-columns: repeat(${league.mode === 'eliminacion' ? 4 : 3}, 1fr)">
        <div class="form-row">
          <label>Estado</label>
          <select id="filter-status"><option value="">Todos</option><option value="programado">Programados</option><option value="finalizado">Finalizados</option></select>
        </div>
        <div class="form-row">
          <label>Equipo</label>
          <select id="filter-team"><option value="">Todos</option>${teams.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
        </div>
        <div class="form-row">
          <label>Desde</label>
          <input type="date" id="filter-date">
        </div>
        ${league.mode === 'eliminacion' ? `
          <div class="form-row">
            <label>Ronda</label>
            <select id="filter-round"><option value="">Todas</option>${rounds.map((r) => `<option value="${r}">${window.Statium.DB.roundNameFor(league.bracketSize, r)}</option>`).join('')}</select>
          </div>` : ''}
      </div>
    </div>
    <div id="matches-list" class="grid"></div>
  `;

  if (league.mode === 'liga') {
    document.getElementById('btn-new-match')?.addEventListener('click', () => openMatchForm(league, teams));
  }

  ['filter-status', 'filter-team', 'filter-date'].forEach((id) => document.getElementById(id)?.addEventListener('change', apply));
  document.getElementById('filter-round')?.addEventListener('change', apply);

  function apply() {
    const status = document.getElementById('filter-status').value;
    const team = document.getElementById('filter-team').value;
    const date = document.getElementById('filter-date').value;
    const round = document.getElementById('filter-round')?.value;
    let filtered = matches.filter((m) => {
      if (status && m.status !== status) return false;
      if (team && m.homeTeamId !== team && m.awayTeamId !== team) return false;
      if (date && (!m.date || new Date(m.date) < new Date(date))) return false;
      if (round !== undefined && round !== '' && String(m.round) !== round) return false;
      return true;
    });
    renderList(filtered);
  }

  function renderList(list) {
    const sorted = [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const container = document.getElementById('matches-list');
    if (sorted.length === 0) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No hay ${terms.matchesLabel.toLowerCase()} que coincidan.</p></div>`;
      return;
    }
    container.innerHTML = '';
    sorted.forEach((m) => {
      const card = document.createElement('match-card');
      card.data = {
        match: m, homeTeam: teamsById[m.homeTeamId], awayTeam: teamsById[m.awayTeamId], sport: league.sport,
        roundLabel: league.mode === 'eliminacion' ? window.Statium.DB.roundNameFor(league.bracketSize, m.round) : '',
      };
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-role="match-actions"]')) return;
        window.Statium.Router.navigate(`#match/${m.id}`);
      });

      if (league.mode === 'liga' && m.status === 'programado') {
        const actions = document.createElement('div');
        actions.dataset.role = 'match-actions';
        actions.className = 'flex';
        actions.style.cssText = 'margin-top:8px';
        actions.innerHTML = `<button class="btn btn-sm btn-danger" data-act="delete">Eliminar</button>`;
        actions.querySelector('[data-act="delete"]').addEventListener('click', (e) => { e.stopPropagation(); handleDelete(m); });
        card.appendChild(actions);
      }
      container.appendChild(card);
    });
  }

  async function handleDelete(match) {
    const ok = await window.Statium.UI.confirmDialog({ title: 'Eliminar partido', message: 'Esta acción no se puede deshacer.' });
    if (!ok) return;
    try {
      await window.Statium.DB.deleteMatch(match.id);
      window.Statium.UI.showToast('Partido eliminado.');
      renderMatches();
    } catch (err) {
      window.Statium.UI.showToast(err.message, 'error');
    }
  }

  renderList(matches);
}

function openMatchForm(league, teams) {
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-box">
      <h3>Programar ${terms.matchLabel.toLowerCase()}</h3>
      <form class="form-grid" id="match-form">
        <div class="form-row two-col">
          <div class="form-row">
            <label>Local</label>
            <select name="homeTeamId" required>${teams.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
          </div>
          <div class="form-row">
            <label>Visitante</label>
            <select name="awayTeamId" required>${teams.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-row">
          <label>Fecha y hora</label>
          <input type="datetime-local" name="date" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Programar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => backdrop.remove());

  backdrop.querySelector('#match-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const homeTeamId = fd.get('homeTeamId');
    const awayTeamId = fd.get('awayTeamId');
    const date = fd.get('date');
    try {
      if (homeTeamId === awayTeamId) throw new Error('Un equipo no puede enfrentarse a sí mismo.');
      const existing = await window.Statium.Helpers.getMatchesForLeague(league.id);
      const dup = existing.some((m) => m.homeTeamId === homeTeamId && m.awayTeamId === awayTeamId && m.date === new Date(date).toISOString());
      if (dup) throw new Error('Ya existe un partido con esos equipos en esa fecha exacta.');

      await window.Statium.DB.createMatch({ leagueId: league.id, homeTeamId, awayTeamId, date: new Date(date).toISOString() });
      window.Statium.UI.showToast('Partido programado.');
      backdrop.remove();
      renderMatches();
    } catch (err) {
      window.Statium.UI.showToast(err.message, 'error');
    }
  });
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderMatches = renderMatches;
})();
