/* sports-terms.js empaquetado como script clásico (sin ES modules). */
(function () {
  'use strict';

/**
 * sports-terms.js
 * ------------------------------------------------------------------
 * Mapa de terminología por deporte. Esta es la ÚNICA fuente de verdad
 * para las etiquetas visibles que cambian según el deporte de la liga
 * activa. Ningún componente debe hardcodear "Gol", "Canasta", etc.
 * directamente: siempre deben leer de este mapa a través de
 * getSportTerms(sportId).
 *
 * La lógica de negocio (puntuación, estructura de datos) es IDÉNTICA
 * para todos los deportes — ver sección 1.3.1 del documento de
 * requerimientos. Este archivo solo controla texto e identidad visual.
 * ------------------------------------------------------------------
 */

const SPORTS = {
  futbol: {
    id: 'futbol',
    label: 'Fútbol',
    icon: '⚽',
    themeClass: 'theme-futbol',
    accentColor: '#2F6D3B',
    scoreEventSingular: 'Gol',
    scoreEventPlural: 'Goles',
    scoreEventVerbPast: 'anotó',
    forColumn: 'GF',
    againstColumn: 'GC',
    scorersLabel: 'Goleadores',
    scorerLabel: 'Goleador',
    matchLabel: 'Partido',
    matchesLabel: 'Partidos',
    playerLabel: 'Jugador',
    playersLabel: 'Jugadores',
    teamLabel: 'Equipo',
    teamsLabel: 'Equipos',
    addEventLabel: 'Agregar gol',
    positionsHint: 'Ej: Delantero, Mediocampista, Defensa, Arquero',
  },
  basquet: {
    id: 'basquet',
    label: 'Básquet',
    icon: '🏀',
    themeClass: 'theme-basquet',
    accentColor: '#D9762B',
    scoreEventSingular: 'Canasta',
    scoreEventPlural: 'Canastas',
    scoreEventVerbPast: 'encestó',
    forColumn: 'PF',
    againstColumn: 'PC',
    scorersLabel: 'Encestadores',
    scorerLabel: 'Encestador',
    matchLabel: 'Partido',
    matchesLabel: 'Partidos',
    playerLabel: 'Jugador',
    playersLabel: 'Jugadores',
    teamLabel: 'Equipo',
    teamsLabel: 'Equipos',
    addEventLabel: 'Agregar canasta',
    positionsHint: 'Ej: Base, Escolta, Alero, Ala-Pívot, Pívot',
  },
  voley: {
    id: 'voley',
    label: 'Vóley',
    icon: '🏐',
    themeClass: 'theme-voley',
    accentColor: '#1F8A8C',
    scoreEventSingular: 'Punto',
    scoreEventPlural: 'Puntos',
    scoreEventVerbPast: 'anotó',
    forColumn: 'PF',
    againstColumn: 'PC',
    scorersLabel: 'Anotadores',
    scorerLabel: 'Anotador',
    matchLabel: 'Partido',
    matchesLabel: 'Partidos',
    playerLabel: 'Jugador',
    playersLabel: 'Jugadores',
    teamLabel: 'Equipo',
    teamsLabel: 'Equipos',
    addEventLabel: 'Agregar punto',
    positionsHint: 'Ej: Armador, Opuesto, Central, Punta, Líbero',
  },
};

const DEFAULT_SPORT = 'futbol';

/** Devuelve el objeto de terminología para un deporte, con fallback seguro. */
function getSportTerms(sportId) {
  return SPORTS[sportId] || SPORTS[DEFAULT_SPORT];
}

/** Lista de deportes disponibles, para poblar selectores. */
function listSports() {
  return Object.values(SPORTS);
}

  window.Statium = window.Statium || {};
  window.Statium.SportsTerms = { SPORTS, DEFAULT_SPORT, getSportTerms, listSports };
})();
