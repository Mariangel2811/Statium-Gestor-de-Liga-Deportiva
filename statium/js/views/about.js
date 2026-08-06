(function () {
  'use strict';

  const outlet = () => document.getElementById('view-outlet');

  async function renderAbout() {
    const root = outlet();
    root.innerHTML = `
      <div class="view-header">
        <h1><span class="navbar__star" style="font-size:24px">★</span> Acerca de Statium</h1>
      </div>

      <div class="card" style="max-width: 720px; margin: 0 auto 20px; padding: 26px;">
        <p style="font-size: 15px; line-height: 1.7; color: var(--ink);">
          <strong>Statium</strong> este es un gestor de ligas y torneos ya sea de futbol, voleybol y basquetball
          el cual permite al usuario llevar un registro de los partidos, jugadores y estadisticas de tanto los jugadores
          como de los equipos en dichos torneos y ligas.
        </p>
      </div>

      <div class="grid" style="max-width: 720px; margin: 0 auto;">
        <div class="card">
          <h4 style="margin-bottom:8px;">🏆 Modalidad de Torneos</h4>
          <p class="text-dim" style="font-size:13px; line-height:1.5;">
            Modo liga (todos contra todos, tabla de posiciones) o eliminacion
            directa (bracket con avance automático de ganadores).
          </p>
        </div>
        <div class="card">
          <h4 style="margin-bottom:8px;">👥 Equipos y jugadores</h4>
          <p class="text-dim" style="font-size:13px; line-height:1.5;">
            Carga los jugadores de cada equipo con posición y numero, y sigue el
            rendimiento individual de cada jugador partido a partido en el torneo.
          </p>
        </div>
        <div class="card">
          <h4 style="margin-bottom:8px;">📊 Estadisticas</h4>
          <p class="text-dim" style="font-size:13px; line-height:1.5;">
            Rankings de goleadores/anotadores, graficos y el estado del bracket o la tabla
            se calculan automaticamente a partir de los partidos ya jugados.
          </p>
        </div>
      </div>

      <div class="flex" style="justify-content:center; margin-top: 26px;">
        <a href="#dashboard" class="btn btn-primary">Ir al Dashboard</a>
      </div>
    `;
  }

  window.Statium = window.Statium || {};
  window.Statium.Views = window.Statium.Views || {};
  window.Statium.Views.renderAbout = renderAbout;
})();
