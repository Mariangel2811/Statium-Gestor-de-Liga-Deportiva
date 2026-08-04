
(function () {
  'use strict';


const outlet = () => document.getElementById('view-outlet');

async function renderDashboard() {
  const root = outlet();
  root.innerHTML = window.Statium.UI.loadingHTML('Preparando el dashboard…');

  const league = window.Statium.Helpers.requireActiveLeague();
  if (!league) {
    root.innerHTML = `
      <div class="view-header"><h1>Dashboard</h1></div>
      ${window.Statium.Helpers.emptyLeagueStateHTML('Todavía no hay ninguna liga creada.').replace('Ir a Ligas', 'Crear primera liga')}
    `;
    return;
  }

  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);
  document.body.dataset.sport = league.sport;

  const [teams, matches, players] = await Promise.all([
    window.Statium.Helpers.getTeamsForLeague(league.id),
    window.Statium.Helpers.getMatchesForLeague(league.id),
    window.Statium.Helpers.getPlayersForLeague(league.id),
  ]);
  const teamsById = window.Statium.Helpers.indexById(teams);

  const upcoming = matches
    .filter((m) => m.status === 'programado' && m.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const lastFinished = matches
    .filter((m) => m.status === 'finalizado')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h1>${terms.icon} ${league.name}</h1>
        <div class="view-subtitle">${terms.label} · ${league.season} · ${league.mode === 'liga' ? (league.roundTrip ? 'Liga (ida y vuelta)' : 'Liga (una vuelta)') : `Eliminación directa · ${league.bracketSize} equipos`}</div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: 1fr 1fr">
      <div class="card">
        <div class="section-title" style="margin-top:0">Próximo ${terms.matchLabel.toLowerCase()}</div>
        ${upcoming ? matchCardHTML(upcoming, teamsById) : `<p class="text-dim">No hay ${terms.matchesLabel.toLowerCase()} programados.</p>`}
      </div>
      <div class="card">
        <div class="section-title" style="margin-top:0">Último resultado</div>
        ${lastFinished ? matchCardHTML(lastFinished, teamsById, true) : `<p class="text-dim">Todavía no hay resultados.</p>`}
      </div>
    </div>

    <div class="section-title">Vista rápida del torneo</div>
    ${league.mode === 'liga' ? quickStandingsHTML(teams, terms) : quickBracketHTML(matches, teamsById, league)}

    <div class="section-title">Gráficos</div>
    <div class="charts-grid">
      <chart-container id="chart-top-pf"></chart-container>
      <chart-container id="chart-results"></chart-container>
      <chart-container id="chart-timeline"></chart-container>
    </div>
  `;

  renderCharts({ teams, matches, terms });
}

function matchCardHTML(m, teamsById, finished = false) {
  const home = teamsById[m.homeTeamId];
  const away = teamsById[m.awayTeamId];
  return `
    <div class="flex-between">
      <span>${home ? home.name : 'Por definir'}</span>
      <span class="mono" style="font-weight:700">${finished ? `${m.homeScore} - ${m.awayScore}` : 'vs'}</span>
      <span>${away ? away.name : 'Por definir'}</span>
    </div>
    <div class="text-dim mono" style="font-size:11px;margin-top:8px">${window.Statium.Helpers.formatDate(m.date)}</div>
    <a class="btn btn-sm mt-16" href="#match/${m.id}">Ver detalle</a>
  `;
}

function quickStandingsHTML(teams, terms) {
  const sorted = [...teams]
    .sort((a, b) => window.Statium.DB.computeTeamPoints(b.stats) - window.Statium.DB.computeTeamPoints(a.stats))
    .slice(0, 5);
  if (sorted.length === 0) return `<p class="text-dim">Todavía no hay equipos.</p>`;
  return `
    <table>
      <thead><tr><th>#</th><th>${terms.teamLabel}</th><th class="num">PJ</th><th class="num">Pts</th></tr></thead>
      <tbody>
        ${sorted.map((t, i) => `<tr><td class="num">${i + 1}</td><td>${t.name}</td><td class="num">${t.stats.pj}</td><td class="num" style="color:var(--accent);font-weight:700">${window.Statium.DB.computeTeamPoints(t.stats)}</td></tr>`).join('')}
      </tbody>
    </table>
    <a class="btn btn-sm mt-16" href="#stats">Ver tabla completa</a>
  `;
}

function quickBracketHTML(matches, teamsById, league) {
  const finished = matches.filter((m) => m.status === 'finalizado');
  const lastRound = finished.length ? Math.max(...finished.map((m) => m.round)) : 0;
  const nextRoundMatches = matches.filter((m) => m.round === lastRound + 1);
  return `
    <p class="text-dim">Última ronda finalizada: <strong>${finished.length ? window.Statium.DB.roundNameFor(league.bracketSize, lastRound) : 'Ninguna aún'}</strong></p>
    ${nextRoundMatches.length ? `<p class="text-dim">Próxima ronda: <strong>${window.Statium.DB.roundNameFor(league.bracketSize, lastRound + 1)}</strong> (${nextRoundMatches.length} partido${nextRoundMatches.length > 1 ? 's' : ''})</p>` : ''}
    <a class="btn btn-sm mt-16" href="#stats">Ver bracket completo</a>
  `;
}

function renderCharts({ teams, matches, terms }) {
  const topPf = [...teams].sort((a, b) => b.stats.pf - a.stats.pf).slice(0, 6);
  document.getElementById('chart-top-pf').config = {
    title: `Equipos con más ${terms.forColumn} (${terms.scoreEventPlural.toLowerCase()} a favor)`,
    type: 'bar',
    data: {
      labels: topPf.map((t) => t.name),
      datasets: [{ label: terms.forColumn, data: topPf.map((t) => t.stats.pf), backgroundColor: '#2f6d3b' }],
    },
  };

  const finished = matches.filter((m) => m.status === 'finalizado');
  let wins = 0, draws = 0, losses = 0;
  finished.forEach((m) => {
    if (m.homeScore === m.awayScore) draws += 1;
    else wins += 1;
  });
  document.getElementById('chart-results').config = {
    title: 'Distribución de resultados',
    type: 'doughnut',
    data: {
      labels: ['Con ganador', 'Empates'],
      datasets: [{ data: [wins, draws], backgroundColor: ['#2f6d3b', '#9aa4ad'] }],
    },
    empty: finished.length === 0,
  };

  const sortedFinished = [...finished].sort((a, b) => new Date(a.date) - new Date(b.date));
  let cumulative = 0;
  const timelineData = sortedFinished.map((m) => {
    cumulative += (m.homeScore || 0) + (m.awayScore || 0);
    return cumulative;
  });
  document.getElementById('chart-timeline').config = {
    title: `Evolución de ${terms.scoreEventPlural.toLowerCase()} en la liga`,
    type: 'line',
    data: {
      labels: sortedFinished.map((m) => new Date(m.date).toLocaleDateString('es-CR')),
      datasets: [{ label: terms.scoreEventPlural, data: timelineData, borderColor: '#2f6d3b', backgroundColor: 'rgba(47,109,59,0.2)', tension: 0.3, fill: true }],
    },
    empty: finished.length === 0,
  };
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderDashboard = renderDashboard;
})();
