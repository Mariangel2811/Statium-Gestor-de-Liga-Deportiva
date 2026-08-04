
(function () {
  'use strict';
  const { getActiveLeague, getById } = window.Statium.DB;

  let activeLeague = null;
  const listeners = new Set();

  async function loadActiveLeague() {
    const storedId = localStorage.getItem('statium:activeLeagueId');
    if (storedId) {
      const league = await getById('leagues', storedId);
      if (league && league.isActive) {
        activeLeague = league;
        notify();
        return activeLeague;
      }
    }
    activeLeague = await getActiveLeague();
    notify();
    return activeLeague;
  }

  function getCachedActiveLeague() {
    return activeLeague;
  }

  function onActiveLeagueChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    listeners.forEach((fn) => fn(activeLeague));
  }

  window.Statium.State = { loadActiveLeague, getCachedActiveLeague, onActiveLeagueChange };
})();
