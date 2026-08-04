
(function () {
  'use strict';


const outlet = () => document.getElementById('view-outlet');

async function renderTeamDetail({ id }) {
  const root = outlet();
  root.innerHTML = `<loading-state></loading-state>`;

  const team = await window.Statium.DB.getById('teams', id);
  if (!team) {
    root.innerHTML = `<div class="empty-state"><p>Equipo no encontrado.</p><a class="btn" href="#teams">← Volver</a></div>`;
    return;
  }
  const league = await window.Statium.DB.getById('leagues', team.leagueId);
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);

  const [players, homeMatches, awayMatches, allTeams] = await Promise.all([
    window.Statium.DB.getAllByIndex('players', 'teamId', team.id),
    window.Statium.DB.getAllByIndex('matches', 'homeTeamId', team.id),
    window.Statium.DB.getAllByIndex('matches', 'awayTeamId', team.id),
    window.Statium.Helpers.getTeamsForLeague(team.leagueId),
  ]);
  const teamsById = Object.fromEntries(allTeams.map((t) => [t.id, t]));
  const matches = [...homeMatches, ...awayMatches];
  const upcoming = matches.filter((m) => m.status === 'programado').sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const played = matches.filter((m) => m.status === 'finalizado').sort((a, b) => new Date(b.date) - new Date(a.date));

  const sortedByPoints = [...(await window.Statium.Helpers.getTeamsForLeague(team.leagueId))].sort((a, b) => window.Statium.DB.computeTeamPoints(b.stats) - window.Statium.DB.computeTeamPoints(a.stats));
  const position = sortedByPoints.findIndex((t) => t.id === team.id) + 1;

  root.innerHTML = `
    <a href="#teams" class="btn btn-sm mb-16">← Volver</a>
    <div class="view-header">
      <div class="flex" style="gap:16px">
        ${window.Statium.Components.crestHTML(team, 64)}
        <div>
          <h1 style="margin-bottom:2px">${team.name}</h1>
          <div class="view-subtitle">${team.city || 'Sin sede'} · ${terms.label}</div>
        </div>
      </div>
      ${league.mode === 'liga' ? `<div class="badge badge--active">Posición #${position}</div>` : ''}
    </div>

    <div class="stat-strip">
      ${statBox('PJ', team.stats.pj)}
      ${statBox('PG', team.stats.pg)}
      ${statBox('PE', team.stats.pe)}
      ${statBox('PP', team.stats.pp)}
      ${statBox(terms.forColumn, team.stats.pf)}
      ${statBox(terms.againstColumn, team.stats.pc)}
      ${statBox('DIF', team.stats.pf - team.stats.pc)}
      ${league.mode === 'liga' ? statBox('Pts', window.Statium.DB.computeTeamPoints(team.stats)) : ''}
    </div>

    <div class="section-title">Plantilla</div>
    <div class="flex-between mb-16">
      <span class="text-dim">${players.length} ${terms.playersLabel.toLowerCase()}</span>
      <a class="btn btn-sm" href="#players">+ Agregar ${terms.playerLabel.toLowerCase()}</a>
    </div>
    <div class="grid" id="players-grid"></div>

    <div class="section-title">Próximos ${terms.matchesLabel.toLowerCase()}</div>
    <div id="upcoming-list" class="grid"></div>

    <div class="section-title">${terms.matchesLabel} jugados</div>
    <div id="played-list"></div>

    <div class="section-title">Evolución de puntos</div>
    <chart-container id="chart-team-evolution"></chart-container>
  `;

  const playersGrid = document.getElementById('players-grid');
  if (players.length === 0) {
    playersGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Sin jugadores todavía.</p></div>`;
  } else {
    players.forEach((p) => {
      const card = document.createElement('player-card');
      card.data = { player: p, team };
      card.addEventListener('click', () => (window.location.hash = `#player/${p.id}`));
      playersGrid.appendChild(card);
    });
  }

  const upcomingList = document.getElementById('upcoming-list');
  if (upcoming.length === 0) {
    upcomingList.innerHTML = `<p class="text-dim">No hay ${terms.matchesLabel.toLowerCase()} programados.</p>`;
  } else {
    upcoming.forEach((m) => {
      const card = document.createElement('match-card');
      card.data = { match: m, homeTeam: teamsById[m.homeTeamId], awayTeam: teamsById[m.awayTeamId] };
      card.addEventListener('click', () => (window.location.hash = `#match/${m.id}`));
      upcomingList.appendChild(card);
    });
  }

  const playedList = document.getElementById('played-list');
  if (played.length === 0) {
    playedList.innerHTML = `<p class="text-dim">Sin ${terms.matchesLabel.toLowerCase()} jugados aún.</p>`;
  } else {
    playedList.innerHTML = `
      <table>
        <thead><tr><th>Rival</th><th>Fecha</th><th class="num">Marcador</th><th>Resultado</th></tr></thead>
        <tbody>
          ${played.map((m) => {
            const isHome = m.homeTeamId === team.id;
            const rival = teamsById[isHome ? m.awayTeamId : m.homeTeamId];
            const own = isHome ? m.homeScore : m.awayScore;
            const other = isHome ? m.awayScore : m.homeScore;
            const result = own > other ? 'V' : own === other ? 'E' : 'D';
            const color = result === 'V' ? 'var(--success)' : result === 'E' ? 'var(--ink-dim)' : 'var(--danger)';
            return `<tr class="row-link" data-id="${m.id}"><td>${rival ? rival.name : '—'}</td><td class="text-dim">${window.Statium.Helpers.formatDate(m.date)}</td><td class="num mono">${m.homeScore}-${m.awayScore}</td><td><span style="color:${color};font-weight:700">${result}</span></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
    playedList.querySelectorAll('.row-link').forEach((row) => {
      row.addEventListener('click', () => (window.location.hash = `#match/${row.dataset.id}`));
    });
  }

  const sortedPlayed = [...played].sort((a, b) => new Date(a.date) - new Date(b.date));
  let cumulative = 0;
  const evolutionData = sortedPlayed.map((m) => {
    const isHome = m.homeTeamId === team.id;
    cumulative += isHome ? m.homeScore : m.awayScore;
    return cumulative;
  });
  document.getElementById('chart-team-evolution').config = {
    title: `${terms.forColumn} acumulados por fecha`,
    type: 'line',
    data: {
      labels: sortedPlayed.map((m) => new Date(m.date).toLocaleDateString('es-CR')),
      datasets: [{ label: terms.forColumn, data: evolutionData, borderColor: '#2f6d3b', backgroundColor: 'rgba(47,109,59,0.2)', tension: 0.3, fill: true }],
    },
    empty: played.length === 0,
  };
}

function statBox(label, value) {
  return `<div class="scoreboard-stat"><div class="value">${value}</div><div class="label">${label}</div></div>`;
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderTeamDetail = renderTeamDetail;
})();
