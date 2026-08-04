
(function () {
  'use strict';

  const { registerRoute, startRouter } = window.Statium.Router;
  const { loadActiveLeague, onActiveLeagueChange } = window.Statium.State;
  const { openDatabase } = window.Statium.DB;
  const V = window.Statium.Views;

  // El data-sport del <body> controla el acento de color global (css/styles.css).
  // Se actualiza automáticamente cada vez que cambia la liga activa.
  onActiveLeagueChange((league) => {
    document.body.dataset.sport = league ? league.sport : 'futbol';
  });

  registerRoute('dashboard', V.renderDashboard);
  registerRoute('leagues', V.renderLeagues);
  registerRoute('teams', V.renderTeams);
  registerRoute('team/:id', V.renderTeamDetail);
  registerRoute('players', V.renderPlayers);
  registerRoute('player/:id', V.renderPlayerDetail);
  registerRoute('matches', V.renderMatches);
  registerRoute('match/:id', V.renderMatchDetail);
  registerRoute('stats', V.renderStats);

  async function bootstrap() {
    try {
      await openDatabase();
      await loadActiveLeague();
    } catch (err) {
      console.error('Error inicializando Statium:', err);
    }
    startRouter();
  }

  bootstrap();
})();
