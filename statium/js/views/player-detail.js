
(function () {
  'use strict';

const outlet = () => document.getElementById('view-outlet');

async function renderPlayerDetail({ id }) {
  const root = outlet();
  root.innerHTML = `<loading-state></loading-state>`;

  const player = await window.Statium.DB.getById('players', id);
  if (!player) {
    root.innerHTML = `<div class="empty-state"><p>Jugador no encontrado.</p><a class="btn" href="#players">← Volver</a></div>`;
    return;
  }
  const team = await window.Statium.DB.getById('teams', player.teamId);
  const league = await window.Statium.DB.getById('leagues', team.leagueId);
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);

  const events = await window.Statium.DB.getAllByIndex('events', 'playerId', player.id);
  const matchIds = [...new Set(events.map((e) => e.matchId))];
  const matches = await Promise.all(matchIds.map((mid) => window.Statium.DB.getById('matches', mid)));
  const finishedMatches = matches.filter((m) => m && m.status === 'finalizado').sort((a, b) => new Date(a.date) - new Date(b.date));

  const allTeams = await window.Statium.DB.getAllByIndex('teams', 'leagueId', league.id);
  const teamsById = Object.fromEntries(allTeams.map((t) => [t.id, t]));

  const avg = player.stats.pj > 0 ? (player.stats.scored / player.stats.pj).toFixed(2) : '0.00';

  root.innerHTML = `
    <a href="#players" class="btn btn-sm mb-16">← Volver</a>
    <div class="view-header">
      <div class="flex" style="gap:16px">
        ${player.photoUrl
          ? `<img class="crest" style="width:64px;height:64px" src="${player.photoUrl}" alt="${player.name}" onerror="this.style.display='none'">`
          : `<div class="crest" style="width:64px;height:64px;font-size:22px;background:var(--accent);color:var(--accent-ink)">${player.number}</div>`}
        <div>
          <h1 style="margin-bottom:2px">${player.name}</h1>
          <div class="view-subtitle">${player.position || 'Sin posición'} · #${player.number} · ${team ? team.name : ''}</div>
        </div>
      </div>
    </div>

    <div class="stat-strip">
      ${statBox('PJ', player.stats.pj)}
      ${statBox(terms.scoreEventPlural, player.stats.scored)}
      ${statBox('Promedio', avg)}
    </div>

    <div class="section-title">Historial de partidos</div>
    ${finishedMatches.length === 0 ? `<p class="text-dim">Todavía no registró ${terms.scoreEventPlural.toLowerCase()}.</p>` : `
      <table>
        <thead><tr><th>Rival</th><th>Fecha</th><th class="num">${terms.scoreEventPlural}</th><th>Resultado</th></tr></thead>
        <tbody>
          ${finishedMatches.map((m) => {
            const isHome = m.homeTeamId === team.id;
            const rival = teamsById[isHome ? m.awayTeamId : m.homeTeamId];
            const myEvents = events.filter((e) => e.matchId === m.id).length;
            return `<tr><td>${rival ? rival.name : '—'}</td><td class="text-dim">${window.Statium.Helpers.formatDate(m.date)}</td><td class="num" style="color:var(--accent);font-weight:700">${myEvents}</td><td class="mono">${m.homeScore}-${m.awayScore}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    `}

    <div class="section-title">${terms.scoreEventPlural} por partido</div>
    <chart-container id="chart-player"></chart-container>
  `;

  document.getElementById('chart-player').config = {
    title: `${terms.scoreEventPlural} a lo largo de la liga`,
    type: 'bar',
    data: {
      labels: finishedMatches.map((m) => new Date(m.date).toLocaleDateString('es-CR')),
      datasets: [{
        label: terms.scoreEventPlural,
        data: finishedMatches.map((m) => events.filter((e) => e.matchId === m.id).length),
        backgroundColor: '#2f6d3b',
      }],
    },
    empty: finishedMatches.length === 0,
  };
}

function statBox(label, value) {
  return `<div class="scoreboard-stat"><div class="value">${value}</div><div class="label">${label}</div></div>`;
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderPlayerDetail = renderPlayerDetail;
})();
