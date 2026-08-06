
(function () {
  'use strict';

const { createLeague, createTeam, createPlayer } = window.Statium.DB;

const FUTBOL_TEAMS = [
  { name: 'Atlético Central', colorPrimary: '#2F6D3B', colorSecondary: '#F2F1EC', city: 'San José' },
  { name: 'Deportivo Norte', colorPrimary: '#1E3A5F', colorSecondary: '#F2F1EC', city: 'Heredia' },
  { name: 'Unión Rivera', colorPrimary: '#8C1F28', colorSecondary: '#F2F1EC', city: 'Alajuela' },
  { name: 'Estrella del Valle', colorPrimary: '#3B3B3B', colorSecondary: '#D9762B', city: 'Cartago' },
];

const BASQUET_TEAMS = [
  { name: 'Halcones', colorPrimary: '#D9762B', colorSecondary: '#14181C', city: 'Ciudad Norte' },
  { name: 'Tiburones', colorPrimary: '#1F8A8C', colorSecondary: '#14181C', city: 'Ciudad Sur' },
  { name: 'Lobos', colorPrimary: '#6B2FA3', colorSecondary: '#14181C', city: 'Ciudad Este' },
  { name: 'Cóndores', colorPrimary: '#B02E3C', colorSecondary: '#14181C', city: 'Ciudad Oeste' },
];

const VOLEY_TEAMS = [
  { name: 'Olas del Puerto', colorPrimary: '#2F80FF', colorSecondary: '#FFCC33', city: 'Puntarenas' },
  { name: 'Águilas Doradas', colorPrimary: '#FFCC33', colorSecondary: '#1A1400', city: 'San José' },
  { name: 'Tritones', colorPrimary: '#1B2A6B', colorSecondary: '#F2F1EC', city: 'Limón' },
  { name: 'Rayo Celeste', colorPrimary: '#3FB6E8', colorSecondary: '#14181C', city: 'Liberia' },
];

const FIRST_NAMES = ['Mateo', 'Sofía', 'Lucas', 'Valentina', 'Diego', 'Camila', 'Andrés', 'Renata', 'Iván', 'Paula'];
const LAST_NAMES = ['Rojas', 'Vargas', 'Mora', 'Solano', 'Jiménez', 'Castro', 'Araya', 'Chaves', 'Fallas', 'Núñez'];

function randomName(usedNames) {
  let name;
  do {
    const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    name = `${f} ${l}`;
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

async function seedTeamsWithPlayers(leagueId, teamDefs, positions) {
  const usedNames = new Set();
  for (const def of teamDefs) {
    const team = await createTeam({ leagueId, ...def });
    const numbers = new Set();
    for (let i = 0; i < 6; i++) {
      let number;
      do {
        number = 1 + Math.floor(Math.random() * 30);
      } while (numbers.has(number));
      numbers.add(number);
      await createPlayer({
        teamId: team.id,
        name: randomName(usedNames),
        position: positions[Math.floor(Math.random() * positions.length)],
        number,
      });
    }
  }
}

async function seedFutbolLeague() {
  const league = await createLeague({
    name: `Liga Amistosa Fútbol ${Date.now().toString(36).slice(-4)}`,
    sport: 'futbol',
    mode: 'liga',
    roundTrip: true,
    season: '2026-II',
    description: 'Liga de ejemplo generada automáticamente para pruebas.',
  });
  await seedTeamsWithPlayers(league.id, FUTBOL_TEAMS, ['Delantero', 'Mediocampista', 'Defensa', 'Arquero']);
  return league;
}

async function seedBasquetLeague() {
  const league = await createLeague({
    name: `Copa Relámpago Básquet ${Date.now().toString(36).slice(-4)}`,
    sport: 'basquet',
    mode: 'eliminacion',
    bracketSize: 4,
    season: '2026-II',
    description: 'Liga de ejemplo generada automáticamente para pruebas.',
  });
  await seedTeamsWithPlayers(league.id, BASQUET_TEAMS, ['Base', 'Escolta', 'Alero', 'Pívot']);
  return league;
}

async function seedVoleyLeague() {
  const league = await createLeague({
    name: `Liga Costera Vóley ${Date.now().toString(36).slice(-4)}`,
    sport: 'voley',
    mode: 'liga',
    roundTrip: false,
    season: '2026-II',
    description: 'Liga de ejemplo generada automáticamente para pruebas.',
  });
  await seedTeamsWithPlayers(league.id, VOLEY_TEAMS, ['Colocador', 'Opuesto', 'Central', 'Punta', 'Líbero']);
  return league;
}

  window.Statium.Seed = { seedFutbolLeague, seedBasquetLeague, seedVoleyLeague };
})();
