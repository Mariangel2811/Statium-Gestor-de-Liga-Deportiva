
(function () {
  'use strict';

const outlet = () => document.getElementById('view-outlet');
let debounceTimer = null;

async function renderPlayers() {
  const root = outlet();
  const league = window.Statium.Helpers.requireActiveLeague();
  if (!league) {
    root.innerHTML = `<div class="view-header"><h1>Jugadores</h1></div>${window.Statium.Helpers.emptyLeagueStateHTML()}`;
    return;
  }
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);
  const teams = await window.Statium.Helpers.getTeamsForLeague(league.id);
  const players = await window.Statium.Helpers.getPlayersForLeague(league.id);
  const positions = [...new Set(players.map((p) => p.position).filter(Boolean))];

  root.innerHTML = `
    <div class="view-header">
      <h1>${terms.playersLabel}</h1>
      <button class="btn btn-primary" id="btn-new-player" ${teams.length === 0 ? 'disabled title="Creá primero un equipo"' : ''}>Nuevo ${terms.playerLabel.toLowerCase()}</button>
    </div>
    <div class="card mb-16">
      <div class="form-row two-col" style="grid-template-columns: 2fr 1fr 1fr auto">
        <div class="form-row">
          <label>Buscar por nombre</label>
          <input id="search-input" placeholder="Ej: Sofía…">
        </div>
        <div class="form-row">
          <label>Equipo</label>
          <select id="filter-team"><option value="">Todos</option>${teams.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
        </div>
        <div class="form-row">
          <label>Posición</label>
          <select id="filter-position"><option value="">Todas</option>${positions.map((p) => `<option value="${p}">${p}</option>`).join('')}</select>
        </div>
        <div class="form-row" style="justify-content:flex-end">
          <label>&nbsp;</label>
          <button class="btn" id="btn-clear-filters">Limpiar filtros</button>
        </div>
      </div>
    </div>
    <div id="players-grid" class="grid"></div>
  `;

  const teamsById = window.Statium.Helpers.indexById(teams);

  document.getElementById('btn-new-player').addEventListener('click', () => openPlayerForm(league, teams));
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 350);
  });
  document.getElementById('filter-team').addEventListener('change', applyFilters);
  document.getElementById('filter-position').addEventListener('change', applyFilters);
  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-team').value = '';
    document.getElementById('filter-position').value = '';
    applyFilters();
  });

  function applyFilters() {
    const q = document.getElementById('search-input').value.trim().toLowerCase();
    const teamFilter = document.getElementById('filter-team').value;
    const posFilter = document.getElementById('filter-position').value;
    const filtered = players.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (teamFilter && p.teamId !== teamFilter) return false;
      if (posFilter && p.position !== posFilter) return false;
      return true;
    });
    renderGrid(filtered, teamsById);
  }

  renderGrid(players, teamsById);

  async function renderGrid(list, teamsMap) {
    const grid = document.getElementById('players-grid');
    if (list.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No hay ${terms.playersLabel.toLowerCase()} que coincidan.</p></div>`;
      return;
    }
    grid.innerHTML = '';
    list.forEach((p) => {
      const wrapper = document.createElement('div');
      const card = document.createElement('player-card');
      card.data = { player: p, team: teamsMap[p.teamId] };
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-role="player-actions"]')) return;
        window.Statium.Router.navigate(`#player/${p.id}`);
      });
      wrapper.appendChild(card);

      const actions = document.createElement('div');
      actions.dataset.role = 'player-actions';
      actions.className = 'flex';
      actions.style.cssText = 'margin-top:10px;gap:6px';
      actions.innerHTML = `<button class="btn btn-sm" data-act="edit">Editar</button><button class="btn btn-sm btn-danger" data-act="delete">Eliminar</button>`;
      actions.querySelector('[data-act="edit"]').addEventListener('click', () => openPlayerForm(league, teams, p));
      actions.querySelector('[data-act="delete"]').addEventListener('click', () => handleDelete(p));
      wrapper.appendChild(actions);
      grid.appendChild(wrapper);
    });
  }

  async function handleDelete(player) {
    const ok = await window.Statium.UI.confirmDialog({ title: `Eliminar "${player.name}"`, message: 'Esta acción no se puede deshacer.' });
    if (!ok) return;
    try {
      await window.Statium.DB.deletePlayer(player.id);
      window.Statium.UI.showToast('Jugador eliminado.');
      renderPlayers();
    } catch (err) {
      window.Statium.UI.showToast(err.message, 'error');
    }
  }
}

function openPlayerForm(league, teams, player = null) {
  const isEdit = !!player;
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-box">
      <h3>${isEdit ? 'Editar' : 'Nuevo'} ${terms.playerLabel.toLowerCase()}</h3>
      <form class="form-grid" id="player-form">
        <div class="form-row">
          <label>Nombre</label>
          <input name="name" required value="${player?.name || ''}">
        </div>
        <div class="form-row">
          <label>Equipo</label>
          <select name="teamId" required>${teams.map((t) => `<option value="${t.id}" ${player?.teamId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
        </div>
        <div class="form-row two-col">
          <div class="form-row">
            <label>Posición <span class="text-dim">(${terms.positionsHint})</span></label>
            <input name="position" value="${player?.position || ''}">
          </div>
          <div class="form-row">
            <label>Número</label>
            <input type="number" name="number" min="0" required value="${player?.number ?? ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Foto (URL, opcional)</label>
          <input name="photoUrl" value="${player?.photoUrl || ''}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => backdrop.remove());

  backdrop.querySelector('#player-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      teamId: fd.get('teamId'),
      name: fd.get('name').trim(),
      position: fd.get('position').trim(),
      number: fd.get('number'),
      photoUrl: fd.get('photoUrl').trim(),
    };
    try {
      const teammates = await window.Statium.DB.getAllByIndex('players', 'teamId', data.teamId);
      const numberTaken = teammates.some((p) => p.number === Number(data.number) && p.id !== player?.id);
      if (numberTaken) throw new Error('Ese número ya está en uso en este equipo.');

      if (isEdit) await window.Statium.DB.updatePlayer(player.id, data);
      else await window.Statium.DB.createPlayer(data);
      window.Statium.UI.showToast(isEdit ? 'Jugador actualizado.' : 'Jugador creado.');
      backdrop.remove();
      renderPlayers();
    } catch (err) {
      window.Statium.UI.showToast(err.message, 'error');
    }
  });
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderPlayers = renderPlayers;
})();
