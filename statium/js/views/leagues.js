/**
 * leagues.js — vista de Statium (script clásico).
 */
(function () {
  'use strict';


const outlet = () => document.getElementById('view-outlet');

async function renderLeagues() {
  const root = outlet();
  root.innerHTML = `<loading-state label="Cargando ligas…"></loading-state>`;

  const leagues = await window.Statium.DB.getAll('leagues');

  root.innerHTML = `
    <div class="view-header">
      <h1>Ligas</h1>
      <div class="flex" style="gap:8px;flex-wrap:wrap">
        <button class="btn" id="btn-seed-futbol">+ Liga de ejemplo (Fútbol)</button>
        <button class="btn" id="btn-seed-basquet">+ Liga de ejemplo (Básquet)</button>
        <button class="btn" id="btn-import">Importar JSON</button>
        <button class="btn btn-primary" id="btn-new-league">Nueva liga</button>
      </div>
    </div>
    <div id="leagues-grid" class="grid"></div>
    <input type="file" id="import-input" accept=".json" style="display:none">
  `;

  document.getElementById('btn-new-league').addEventListener('click', () => openLeagueForm());
  document.getElementById('btn-seed-futbol').addEventListener('click', async () => {
    await window.Statium.Seed.seedFutbolLeague();
    window.Statium.UI.showToast('Liga de fútbol de ejemplo creada.');
    renderLeagues();
  });
  document.getElementById('btn-seed-basquet').addEventListener('click', async () => {
    await window.Statium.Seed.seedBasquetLeague();
    window.Statium.UI.showToast('Liga de básquet de ejemplo creada.');
    renderLeagues();
  });
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-input').click());
  document.getElementById('import-input').addEventListener('change', handleImportFile);

  await renderGrid(leagues);
}

async function renderGrid(leagues) {
  const grid = document.getElementById('leagues-grid');
  if (leagues.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <p>Todavía no creaste ninguna liga.</p>
        <button class="btn btn-primary" id="btn-empty-new">Crear primera liga</button>
      </div>`;
    document.getElementById('btn-empty-new').addEventListener('click', () => openLeagueForm());
    return;
  }

  grid.innerHTML = '';
  for (const league of leagues) {
    const [teams, matches] = await Promise.all([window.Statium.Helpers.getTeamsForLeague(league.id), window.Statium.Helpers.getMatchesForLeague(league.id)]);
    const card = document.createElement('league-card');
    league._teamCount = teams.length;
    league._matchCount = matches.length;
    card.data = league;
    grid.appendChild(card);

    const counts = card.querySelector('[data-role="counts"]');
    counts.innerHTML = `<span>${teams.length} equipos</span><span>${matches.length} partidos</span>`;

    const actions = card.querySelector('[data-role="actions"]');
    actions.innerHTML = `
      ${!league.isActive ? `<button class="btn btn-sm" data-act="activate">Activar</button>` : ''}
      <button class="btn btn-sm" data-act="edit">Editar</button>
      <button class="btn btn-sm" data-act="export">Exportar</button>
      <button class="btn btn-sm btn-danger" data-act="delete">Eliminar</button>
    `;
    actions.querySelector('[data-act="activate"]')?.addEventListener('click', async () => {
      await window.Statium.DB.activateLeague(league.id);
      await window.Statium.State.loadActiveLeague();
      window.Statium.UI.showToast(`"${league.name}" es ahora la liga activa.`);
      window.Statium.Router.navigate('#dashboard');
    });
    actions.querySelector('[data-act="edit"]').addEventListener('click', () => openLeagueForm(league));
    actions.querySelector('[data-act="export"]').addEventListener('click', () => handleExport(league));
    actions.querySelector('[data-act="delete"]').addEventListener('click', () => handleDelete(league));

    // Botón generar fixture/bracket cuando corresponde.
    if (!league.fixtureGenerated) {
      const genBtn = document.createElement('button');
      genBtn.className = 'btn btn-sm btn-primary';
      const readyForGeneration = league.mode === 'liga'
        ? teams.length >= 2
        : teams.length === league.bracketSize;
      genBtn.textContent = league.mode === 'liga' ? 'Generar fixture' : 'Generar bracket';
      genBtn.disabled = !readyForGeneration;
      if (!readyForGeneration) {
        genBtn.title = league.mode === 'liga'
          ? 'Se necesitan al menos 2 equipos.'
          : `Se necesitan exactamente ${league.bracketSize} equipos (hay ${teams.length}).`;
      }
      genBtn.addEventListener('click', async () => {
        try {
          if (league.mode === 'liga') await window.Statium.DB.generateFixture(league.id);
          else await window.Statium.DB.generateBracket(league.id);
          window.Statium.UI.showToast('Partidos generados correctamente.');
          renderLeagues();
        } catch (err) {
          window.Statium.UI.showToast(err.message, 'error');
        }
      });
      actions.appendChild(genBtn);
      if (!readyForGeneration) {
        const hint = document.createElement('div');
        hint.className = 'text-dim';
        hint.style.cssText = 'font-size:11px;width:100%';
        hint.textContent = genBtn.title;
        actions.appendChild(hint);
      }
    }
  }
}

function openLeagueForm(league = null) {
  const isEdit = !!league;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:520px">
      <h3>${isEdit ? 'Editar liga' : 'Nueva liga'}</h3>
      <form class="form-grid" id="league-form">
        <div class="form-row">
          <label>Nombre</label>
          <input name="name" required value="${league?.name || ''}">
        </div>
        <div class="form-row two-col">
          <div class="form-row">
            <label>Deporte</label>
            <select name="sport" ${isEdit ? 'disabled' : ''}>
              ${window.Statium.SportsTerms.listSports().map((s) => `<option value="${s.id}" ${league?.sport === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Temporada</label>
            <input name="season" required value="${league?.season || ''}" placeholder="2026-II">
          </div>
        </div>
        <div class="form-row">
          <label>Modalidad</label>
          <select name="mode" id="mode-select" ${isEdit ? 'disabled' : ''}>
            <option value="liga" ${league?.mode === 'liga' ? 'selected' : ''}>Liga (todos contra todos)</option>
            <option value="eliminacion" ${league?.mode === 'eliminacion' ? 'selected' : ''}>Eliminación directa</option>
          </select>
        </div>
        <div id="mode-options"></div>
        <div class="form-row">
          <label>Descripción (opcional)</label>
          <textarea name="description" rows="2">${league?.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar cambios' : 'Crear liga'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);

  const modeSelect = backdrop.querySelector('#mode-select');
  const modeOptions = backdrop.querySelector('#mode-options');
  function renderModeOptions() {
    if (modeSelect.value === 'liga') {
      modeOptions.innerHTML = `
        <div class="form-row">
          <label>Formato</label>
          <select name="roundTrip" ${isEdit ? 'disabled' : ''}>
            <option value="false" ${league && !league.roundTrip ? 'selected' : ''}>Una vuelta</option>
            <option value="true" ${league?.roundTrip ? 'selected' : ''}>Ida y vuelta</option>
          </select>
        </div>`;
    } else {
      modeOptions.innerHTML = `
        <div class="form-row">
          <label>Número de equipos</label>
          <select name="bracketSize" ${isEdit ? 'disabled' : ''}>
            ${[4, 8, 16].map((n) => `<option value="${n}" ${league?.bracketSize === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>`;
    }
  }
  renderModeOptions();
  modeSelect.addEventListener('change', renderModeOptions);

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => backdrop.remove());

  backdrop.querySelector('#league-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name').trim(),
      sport: fd.get('sport'),
      mode: fd.get('mode'),
      roundTrip: fd.get('roundTrip') === 'true',
      bracketSize: fd.get('bracketSize'),
      season: fd.get('season').trim(),
      description: fd.get('description').trim(),
    };
    try {
      const existing = await window.Statium.DB.getAll('leagues');
      const nameTaken = existing.some((l) => l.name.toLowerCase() === data.name.toLowerCase() && l.id !== league?.id);
      if (nameTaken) throw new Error('Ya existe una liga con ese nombre.');

      if (isEdit) {
        await window.Statium.DB.updateLeague(league.id, { name: data.name, season: data.season, description: data.description });
        window.Statium.UI.showToast('Liga actualizada.');
      } else {
        const created = await window.Statium.DB.createLeague(data);
        window.Statium.UI.showToast('Liga creada.');
        const activeExists = existing.length > 0;
        if (!activeExists) {
          await window.Statium.DB.activateLeague(created.id);
          await window.Statium.State.loadActiveLeague();
        }
      }
      backdrop.remove();
      renderLeagues();
    } catch (err) {
      window.Statium.UI.showToast(err.message, 'error');
    }
  });
}

async function handleExport(league) {
  const data = await window.Statium.DB.exportLeague(league.id);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${league.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  window.Statium.UI.showToast('Liga exportada.');
}

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    try {
      await window.Statium.DB.importLeague(data);
      window.Statium.UI.showToast('Liga importada correctamente.');
      renderLeagues();
    } catch (err) {
      if (err.code === 'DUPLICATE_NAME') {
        const newName = prompt(`Ya existe una liga llamada "${data.league.name}". Ingresá un nuevo nombre para continuar (o cancelá):`);
        if (!newName) return;
        await window.Statium.DB.importLeague(data, newName.trim());
        window.Statium.UI.showToast('Liga importada correctamente.');
        renderLeagues();
      } else {
        throw err;
      }
    }
  } catch (err) {
    window.Statium.UI.showToast(err.message || 'No se pudo importar el archivo.', 'error');
  }
}

async function handleDelete(league) {
  const ok = await window.Statium.UI.confirmDialog({
    title: `Eliminar "${league.name}"`,
    message: 'Se eliminarán también todos sus equipos, jugadores, partidos y eventos. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar todo',
  });
  if (!ok) return;
  await window.Statium.DB.deleteLeagueCascade(league.id);
  await window.Statium.State.loadActiveLeague();
  window.Statium.UI.showToast('Liga eliminada.');
  renderLeagues();
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderLeagues = renderLeagues;
})();
