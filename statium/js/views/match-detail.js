
(function () {
  'use strict';

const outlet = () => document.getElementById('view-outlet');

// Eventos pendientes de un partido en curso (antes de finalizar), en memoria.
let pendingEvents = [];

async function renderMatchDetail({ id }) {
  const root = outlet();
  root.innerHTML = `<loading-state></loading-state>`;
  pendingEvents = [];

  const match = await window.Statium.DB.getById('matches', id);
  if (!match) {
    root.innerHTML = `<div class="empty-state"><p>Partido no encontrado.</p><a class="btn" href="#matches">← Volver</a></div>`;
    return;
  }
  const league = await window.Statium.DB.getById('leagues', match.leagueId);
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);
  const homeTeam = await window.Statium.DB.getById('teams', match.homeTeamId);
  const awayTeam = await window.Statium.DB.getById('teams', match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    root.innerHTML = `
      <a href="#matches" class="btn btn-sm mb-16">← Volver</a>
      <div class="empty-state"><p>Este partido todavía tiene equipos "Por definir" (bracket incompleto).</p></div>
    `;
    return;
  }

  const [homePlayers, awayPlayers, savedEvents] = await Promise.all([
    window.Statium.DB.getAllByIndex('players', 'teamId', homeTeam.id),
    window.Statium.DB.getAllByIndex('players', 'teamId', awayTeam.id),
    window.Statium.DB.getAllByIndex('events', 'matchId', match.id),
  ]);

  root.innerHTML = `
    <a href="#matches" class="btn btn-sm mb-16">← Volver</a>
    <div class="view-header">
      <div>
        <h1 style="font-size:20px">${league.mode === 'eliminacion' ? window.Statium.DB.roundNameFor(league.bracketSize, match.round) + ' — ' : ''}${terms.label} ${terms.matchLabel}</h1>
        <div class="view-subtitle">${window.Statium.Helpers.formatDate(match.date)}</div>
      </div>
      <span class="badge ${match.status === 'finalizado' ? 'badge--success' : ''}">${match.status === 'finalizado' ? 'Finalizado' : 'Programado'}</span>
    </div>

    <div class="card">
      <div class="flex-between">
        <div class="flex" style="gap:12px;flex:1">
          ${window.Statium.Components.crestHTML(homeTeam, 48)}
          <div><div style="font-weight:700">${homeTeam.name}</div><div class="text-dim" style="font-size:11px">Local</div></div>
        </div>
        <div class="mono" style="font-size:32px;font-weight:700;color:var(--accent);text-align:center;min-width:120px">
          ${match.status === 'finalizado' ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
        </div>
        <div class="flex" style="gap:12px;flex:1;justify-content:flex-end;text-align:right">
          <div><div style="font-weight:700">${awayTeam.name}</div><div class="text-dim" style="font-size:11px">Visitante</div></div>
          ${window.Statium.Components.crestHTML(awayTeam, 48)}
        </div>
      </div>
    </div>

    <div id="match-body"></div>
  `;

  const body = document.getElementById('match-body');

  if (match.status === 'finalizado') {
    renderFinalizedView(body, { match, league, terms, savedEvents, homeTeam, awayTeam, homePlayers, awayPlayers });
  } else {
    renderInProgressView(body, { match, league, terms, homeTeam, awayTeam, homePlayers, awayPlayers });
  }
}

function renderFinalizedView(body, { match, league, terms, savedEvents, homeTeam, awayTeam, homePlayers, awayPlayers }) {
  const playersById = Object.fromEntries([...homePlayers, ...awayPlayers].map((p) => [p.id, p]));
  body.innerHTML = `
    <div class="section-title">Anotaciones</div>
    <div class="events-columns">
      ${eventsColumnHTML('Local', savedEvents.filter((e) => e.teamId === homeTeam.id), playersById, terms)}
      ${eventsColumnHTML('Visitante', savedEvents.filter((e) => e.teamId === awayTeam.id), playersById, terms)}
    </div>
    <div class="form-actions" style="justify-content:flex-start;margin-top:20px">
      <button class="btn btn-danger" id="btn-undo">Deshacer partido</button>
    </div>
  `;
  document.getElementById('btn-undo').addEventListener('click', async () => {
    const ok = await window.Statium.UI.confirmDialog({
      title: 'Deshacer partido',
      message: 'El partido volverá a estado "Programado" y se revertirán las estadísticas de equipos y jugadores. Los eventos se conservan.',
      confirmLabel: 'Deshacer',
    });
    if (!ok) return;
    try {
      await window.Statium.DB.undoMatch(match.id);
      window.Statium.UI.showToast('Partido deshecho.');
      renderMatchDetail({ id: match.id });
    } catch (err) {
      window.Statium.UI.showToast(err.message, 'error');
    }
  });
}

function eventsColumnHTML(label, events, playersById, terms) {
  return `
    <div class="events-column">
      <h4>${label}</h4>
      ${events.length === 0 ? `<p class="text-dim" style="font-size:12px">Sin ${terms.scoreEventPlural.toLowerCase()}.</p>` : events.map((e) => `
        <div class="event-item">
          <span>${playersById[e.playerId]?.name || 'Jugador'}</span>
          <span class="text-dim mono">${e.minute != null ? e.minute + "'" : ''}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderInProgressView(body, { match, league, terms, homeTeam, awayTeam, homePlayers, awayPlayers }) {
  function draw() {
    const homeEvents = pendingEvents.filter((e) => e.teamId === homeTeam.id);
    const awayEvents = pendingEvents.filter((e) => e.teamId === awayTeam.id);
    const playersById = Object.fromEntries([...homePlayers, ...awayPlayers].map((p) => [p.id, p]));

    body.innerHTML = `
      <div class="section-title">Registrar ${terms.scoreEventSingular.toLowerCase()}</div>
      <div class="card"><event-form id="event-form"></event-form></div>

      <div class="section-title">Anotaciones registradas (marcador provisional: ${homeEvents.length} - ${awayEvents.length})</div>
      <div class="events-columns">
        <div class="events-column">
          <h4>Local — ${homeTeam.name}</h4>
          ${homeEvents.length === 0 ? `<p class="text-dim" style="font-size:12px">Sin anotaciones aún.</p>` : homeEvents.map((e, i) => eventRow(e, i, playersById, 'home')).join('')}
        </div>
        <div class="events-column">
          <h4>Visitante — ${awayTeam.name}</h4>
          ${awayEvents.length === 0 ? `<p class="text-dim" style="font-size:12px">Sin anotaciones aún.</p>` : awayEvents.map((e, i) => eventRow(e, i, playersById, 'away')).join('')}
        </div>
      </div>

      <div id="tie-breaker"></div>

      <div class="form-actions" style="justify-content:flex-start;margin-top:20px">
        <button class="btn btn-primary" id="btn-finish">Finalizar partido</button>
      </div>
    `;

    const eventForm = document.getElementById('event-form');
    eventForm.data = { homeTeam, awayTeam, homePlayers, awayPlayers, sport: league.sport };
    eventForm.addEventListener('event-add', (e) => {
      pendingEvents.push({ ...e.detail, _localId: crypto.randomUUID() });
      draw();
    });

    body.querySelectorAll('[data-remove-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [side, idxStr] = [btn.dataset.side, btn.dataset.removeIdx];
        const idx = Number(idxStr);
        const teamId = side === 'home' ? homeTeam.id : awayTeam.id;
        const teamEvents = pendingEvents.filter((e) => e.teamId === teamId);
        const target = teamEvents[idx];
        pendingEvents = pendingEvents.filter((e) => e !== target);
        draw();
      });
    });

    // En eliminación directa, si queda empatado, pedir desempate manual.
    const tieBreakerEl = document.getElementById('tie-breaker');
    const isTie = homeEvents.length === awayEvents.length;
    if (league.mode === 'eliminacion' && isTie) {
      tieBreakerEl.innerHTML = `
        <div class="card" style="border-color:var(--warn)">
          <div class="form-row">
            <label>Marcador empatado — declarar ganador (ej: por penales)</label>
            <select id="winner-select">
              <option value="">Seleccionar ganador…</option>
              <option value="${homeTeam.id}">${homeTeam.name}</option>
              <option value="${awayTeam.id}">${awayTeam.name}</option>
            </select>
          </div>
        </div>
      `;
    } else {
      tieBreakerEl.innerHTML = '';
    }

    document.getElementById('btn-finish').addEventListener('click', async () => {
      const winnerSelect = document.getElementById('winner-select');
      const winnerTeamIdIfTie = winnerSelect ? winnerSelect.value : null;
      if (league.mode === 'eliminacion' && isTie && !winnerTeamIdIfTie) {
        window.Statium.UI.showToast('Debés declarar un ganador: el marcador está empatado.', 'error');
        return;
      }
      try {
        await window.Statium.DB.finalizeMatch(match.id, pendingEvents, winnerTeamIdIfTie || null);
        window.Statium.UI.showToast('Partido finalizado y estadísticas actualizadas.');
        pendingEvents = [];
        renderMatchDetail({ id: match.id });
      } catch (err) {
        window.Statium.UI.showToast(err.message, 'error');
      }
    });
  }

  draw();

  function eventRow(e, idx, playersById, side) {
    return `
      <div class="event-item">
        <span>${playersById[e.playerId]?.name || 'Jugador'}${e.minute != null ? ` <span class="text-dim mono">(${e.minute}')</span>` : ''}</span>
        <button class="btn btn-sm btn-danger" data-remove-idx="${idx}" data-side="${side}">Quitar</button>
      </div>
    `;
  }
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderMatchDetail = renderMatchDetail;
})();
