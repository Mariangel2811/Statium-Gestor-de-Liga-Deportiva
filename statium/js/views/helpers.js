
(function () {
  'use strict';
  const { getAllByIndex, getById, getAll } = window.Statium.DB;

  function requireActiveLeague() {
    const league = window.Statium.State.getCachedActiveLeague();
    if (!league) return null;
    return league;
  }

  async function getTeamsForLeague(leagueId) {
    return getAllByIndex('teams', 'leagueId', leagueId);
  }

  async function getMatchesForLeague(leagueId) {
    return getAllByIndex('matches', 'leagueId', leagueId);
  }

  async function getPlayersForTeams(teamIds) {
    const all = await getAll('players');
    const set = new Set(teamIds);
    return all.filter((p) => set.has(p.teamId));
  }

  async function getPlayersForLeague(leagueId) {
    const teams = await getTeamsForLeague(leagueId);
    return getPlayersForTeams(teams.map((t) => t.id));
  }

  function indexById(arr) {
    const map = {};
    arr.forEach((item) => (map[item.id] = item));
    return map;
  }

  function emptyLeagueStateHTML(message = 'Primero creá o activá una liga para ver esta sección.') {
    return `
      <div class="empty-state">
        <p>${message}</p>
        <a href="#leagues" class="btn btn-primary">Ir a Ligas</a>
      </div>
    `;
  }

  function formatDate(iso) {
    if (!iso) return 'Por definir';
    return new Date(iso).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
  }

  async function withErrorToast(fn) {
    try {
      return await fn();
    } catch (err) {
      window.Statium.UI.showToast(err.message || 'Ocurrió un error inesperado.', 'error');
      throw err;
    }
  }

  window.Statium.Helpers = {
    requireActiveLeague, getTeamsForLeague, getMatchesForLeague, getPlayersForTeams,
    getPlayersForLeague, indexById, emptyLeagueStateHTML, formatDate, withErrorToast,
  };
})();
