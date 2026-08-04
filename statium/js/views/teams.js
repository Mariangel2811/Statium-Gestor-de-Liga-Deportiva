
(function () {
  'use strict';


const outlet = () => document.getElementById('view-outlet');

async function renderTeams() {
  const root = outlet();
  const league = window.Statium.Helpers.requireActiveLeague();
  if (!league) {
    root.innerHTML = `<div class="view-header"><h1>Equipos</h1></div>${window.Statium.Helpers.emptyLeagueStateHTML()}`;
    return;
  }
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);

  root.innerHTML = `
    <div class="view-header">
      <h1>${terms.teamsLabel}</h1>
      <button class="btn btn-primary" id="btn-new-team">Nuevo equipo</button>
    </div>
    <div id="teams-grid" class="grid"><loading-state></loading-state></div>
  `;
  document.getElementById('btn-new-team').addEventListener('click', () => openTeamForm(league));

  await renderGrid(league);
}

async function renderGrid(league) {
  const teams = await window.Statium.Helpers.getTeamsForLeague(league.id);
  const sorted = [...teams].sort((a, b) => window.Statium.DB.computeTeamPoints(b.stats) - window.Statium.DB.computeTeamPoints(a.stats));
  const grid = document.getElementById('teams-grid');

  if (teams.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Todavía no hay equipos en esta liga.</p></div>`;
    return;
  }

  grid.innerHTML = '';
  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    const players = await window.Statium.DB.getAllByIndex('players', 'teamId', team.id);
    team._playerCount = players.length;
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    const card = document.createElement('team-card');
    card.data = { team, position: league.mode === 'liga' ? i + 1 : null };
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-role="team-actions"]')) return;
      window.Statium.Router.navigate(`#team/${team.id}`);
    });
    wrapper.appendChild(card);

    const actions = document.createElement('div');
    actions.dataset.role = 'team-actions';
    actions.className = 'flex';
    actions.style.cssText = 'margin-top:10px;gap:6px';
    actions.innerHTML = `
      <button class="btn btn-sm" data-act="edit">Editar</button>
      <button class="btn btn-sm btn-danger" data-act="delete">Eliminar</button>
    `;
    actions.querySelector('[data-act="edit"]').addEventListener('click', () => openTeamForm(league, team));
    actions.querySelector('[data-act="delete"]').addEventListener('click', () => handleDelete(league, team));
    wrapper.appendChild(actions);

    grid.appendChild(wrapper);
  }
}

function openTeamForm(league, team = null) {
  const isEdit = !!team;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-box">
      <h3>${isEdit ? 'Editar equipo' : 'Nuevo equipo'}</h3>
      <form class="form-grid" id="team-form">
        <div class="form-row">
          <label>Nombre</label>
          <input name="name" required value="${team?.name || ''}">
        </div>
        <div class="form-row">
          <label>Escudo (URL, opcional)</label>
          <input name="crestUrl" value="${team?.crestUrl || ''}" placeholder="https://…">
        </div>
        <div class="form-row two-col">
          <div class="form-row">
            <label>Color principal</label>
            <input type="color" name="colorPrimary" value="${team?.colorPrimary || '#2F6D3B'}">
          </div>
          <div class="form-row">
            <label>Color secundario</label>
            <input type="color" name="colorSecondary" value="${team?.colorSecondary || '#F2F1EC'}">
          </div>
        </div>
        <div class="form-row">
          <label>Ciudad / Sede (opcional)</label>
          <input name="city" value="${team?.city || ''}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar' : 'Crear equipo'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => backdrop.remove());

  backdrop.querySelector('#team-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      leagueId: league.id,
      name: fd.get('name').trim(),
      crestUrl: fd.get('crestUrl').trim(),
      colorPrimary: fd.get('colorPrimary'),
      colorSecondary: fd.get('colorSecondary'),
      city: fd.get('city').trim(),
    };
    try {
      const siblings = await window.Statium.Helpers.getTeamsForLeague(league.id);
      const nameTaken = siblings.some((t) => t.name.toLowerCase() === data.name.toLowerCase() && t.id !== team?.id);
      if (nameTaken) throw new Error('Ya existe un equipo con ese nombre en esta liga.');

      if (isEdit) await window.Statium.DB.updateTeam(team.id, data);
      else await window.Statium.DB.createTeam(data);
      window.Statium.UI.showToast(isEdit ? 'Equipo actualizado.' : 'Equipo creado.');
      backdrop.remove();
      renderGrid(league);
    } catch (err) {
      window.Statium.UI.showToast(err.message, 'error');
    }
  });
}

async function handleDelete(league, team) {
  const ok = await window.Statium.UI.confirmDialog({
    title: `Eliminar "${team.name}"`,
    message: 'Si el equipo tiene jugadores, también se eliminarán. Esta acción no se puede deshacer.',
  });
  if (!ok) return;
  try {
    await window.Statium.DB.deleteTeam(team.id);
    window.Statium.UI.showToast('Equipo eliminado.');
    renderGrid(league);
  } catch (err) {
    window.Statium.UI.showToast(err.message, 'error');
  }
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderTeams = renderTeams;
})();
