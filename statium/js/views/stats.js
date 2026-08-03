/**
 * stats.js — vista de Statium (script clásico).
 */
(function () {
  'use strict';


const outlet = () => document.getElementById('view-outlet');

async function renderStats() {
  const root = outlet();
  const league = window.Statium.Helpers.requireActiveLeague();
  if (!league) {
    root.innerHTML = `<div class="view-header"><h1>Estadísticas</h1></div>${window.Statium.Helpers.emptyLeagueStateHTML()}`;
    return;
  }
  const terms = window.Statium.SportsTerms.getSportTerms(league.sport);
  const [teams, matches, players] = await Promise.all([
    window.Statium.Helpers.getTeamsForLeague(league.id),
    window.Statium.Helpers.getMatchesForLeague(league.id),
    window.Statium.Helpers.getPlayersForLeague(league.id),
  ]);
  const teamsById = window.Statium.Helpers.indexById(teams);

  root.innerHTML = `
    <div class="view-header">
      <h1>Estadísticas</h1>
      <div class="view-subtitle">${terms.icon} ${league.name}</div>
    </div>

    <div class="section-title">${league.mode === 'liga' ? 'Tabla de posiciones' : 'Bracket del torneo'}</div>
    ${league.mode === 'liga' ? `<standings-table id="standings"></standings-table>` : `<bracket-view id="bracket"></bracket-view>`}

    <div class="section-title">${terms.scorersLabel}</div>
    <ranking-table id="ranking"></ranking-table>

    <div class="section-title">Gráficos avanzados</div>
    <div class="charts-grid">
      ${league.mode === 'liga' ? `
        <chart-container id="chart-evolution" style="grid-column: span 2"></chart-container>
        <chart-container id="chart-top-scorers"></chart-container>
        <chart-container id="chart-extra"></chart-container>
      ` : `
        <chart-container id="chart-top-scorers"></chart-container>
        <chart-container id="chart-by-round"></chart-container>
        <chart-container id="chart-extra"></chart-container>
      `}
    </div>
  `;

  if (league.mode === 'liga') {
    document.getElementById('standings').data = { teams, sport: league.sport };
  } else {
    document.getElementById('bracket').data = { matches, teamsById, bracketSize: league.bracketSize };
  }
  document.getElementById('ranking').data = { players, teamsById, sport: league.sport, limit: 10 };

  renderCharts({ league, teams, matches, players, teamsById, terms });
}

function renderCharts({ league, teams, matches, players, teamsById, terms }) {
  const topScorers = [...players].sort((a, b) => b.stats.scored - a.stats.scored).slice(0, 10);
  document.getElementById('chart-top-scorers').config = {
    title: `Top 10 ${terms.scorersLabel.toLowerCase()}`,
    type: 'bar',
    data: {
      labels: topScorers.map((p) => p.name),
      datasets: [{ label: terms.scoreEventPlural, data: topScorers.map((p) => p.stats.scored), backgroundColor: '#d9762b' }],
    },
    options: { indexAxis: 'y' },
    empty: topScorers.every((p) => p.stats.scored === 0) || topScorers.length === 0,
  };

  if (league.mode === 'liga') {
    // Evolución multi-serie de puntos acumulados por equipo.
    const finished = matches.filter((m) => m.status === 'finalizado').sort((a, b) => new Date(a.date) - new Date(b.date));
    const dateLabels = [...new Set(finished.map((m) => new Date(m.date).toLocaleDateString('es-CR')))];
    const palette = ['#2f6d3b', '#d9762b', '#1f8a8c', '#8c1f28', '#6b2fa3', '#1e3a5f', '#b02e3c', '#3b3b3b'];
    const topTeams = [...teams].sort((a, b) => (b.stats.pg * 3 + b.stats.pe) - (a.stats.pg * 3 + a.stats.pe)).slice(0, 6);

    const datasets = topTeams.map((team, i) => {
      let cumulative = 0;
      const data = dateLabels.map((label) => {
        const dayMatches = finished.filter((m) => new Date(m.date).toLocaleDateString('es-CR') === label && (m.homeTeamId === team.id || m.awayTeamId === team.id));
        dayMatches.forEach((m) => {
          const isHome = m.homeTeamId === team.id;
          const own = isHome ? m.homeScore : m.awayScore;
          const other = isHome ? m.awayScore : m.homeScore;
          cumulative += own > other ? 3 : own === other ? 1 : 0;
        });
        return cumulative;
      });
      return { label: team.name, data, borderColor: palette[i % palette.length], backgroundColor: 'transparent', tension: 0.3 };
    });

    document.getElementById('chart-evolution').config = {
      title: 'Evolución de puntos acumulados por equipo',
      type: 'line',
      data: { labels: dateLabels, datasets },
      empty: finished.length === 0,
    };

    // Gráfico extra: puntos a favor vs en contra por equipo (radar).
    document.getElementById('chart-extra').config = {
      title: `${terms.forColumn} vs ${terms.againstColumn} por equipo`,
      type: 'radar',
      data: {
        labels: teams.map((t) => t.name),
        datasets: [
          { label: terms.forColumn, data: teams.map((t) => t.stats.pf), borderColor: '#2f6d3b', backgroundColor: 'rgba(47,109,59,0.2)' },
          { label: terms.againstColumn, data: teams.map((t) => t.stats.pc), borderColor: '#c34848', backgroundColor: 'rgba(195,72,72,0.15)' },
        ],
      },
      options: { scales: { r: { ticks: { color: '#9aa4ad', backdropColor: 'transparent' }, grid: { color: '#2c333a' }, pointLabels: { color: '#9aa4ad', font: { size: 10 } } } } },
      empty: teams.length === 0,
    };
  } else {
    // Anotaciones por ronda.
    const events = matches.filter((m) => m.status === 'finalizado');
    const roundIndexes = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
    const scoresByRound = roundIndexes.map((r) => {
      const roundMatches = matches.filter((m) => m.round === r && m.status === 'finalizado');
      return roundMatches.reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0);
    });
    document.getElementById('chart-by-round').config = {
      title: `${terms.scoreEventPlural} por ronda`,
      type: 'bar',
      data: {
        labels: roundIndexes.map((r) => window.Statium.DB.roundNameFor(league.bracketSize, r)),
        datasets: [{ label: terms.scoreEventPlural, data: scoresByRound, backgroundColor: '#1f8a8c' }],
      },
      empty: scoresByRound.every((v) => v === 0),
    };

    // Extra: promedio de anotaciones por partido, por ronda.
    const avgByRound = roundIndexes.map((r) => {
      const roundMatches = matches.filter((m) => m.round === r && m.status === 'finalizado');
      if (roundMatches.length === 0) return 0;
      const total = roundMatches.reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0);
      return +(total / roundMatches.length).toFixed(1);
    });
    document.getElementById('chart-extra').config = {
      title: `Promedio de ${terms.scoreEventPlural.toLowerCase()} por partido, por ronda`,
      type: 'line',
      data: {
        labels: roundIndexes.map((r) => window.Statium.DB.roundNameFor(league.bracketSize, r)),
        datasets: [{ label: 'Promedio', data: avgByRound, borderColor: '#d9762b', backgroundColor: 'rgba(217,118,43,0.2)', fill: true, tension: 0.3 }],
      },
      empty: avgByRound.every((v) => v === 0),
    };
  }
}

  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderStats = renderStats;
})();
