
(function () {
  'use strict';
const DB_NAME = 'statium-db';
const DB_VERSION = 1;

let dbInstance = null;

/** Abre (o crea) la base de datos. Idempotente: reutiliza la conexión. */
function openDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('leagues')) {
        const leagues = db.createObjectStore('leagues', { keyPath: 'id' });
        leagues.createIndex('name', 'name', { unique: false });
        leagues.createIndex('isActive', 'isActive', { unique: false });
      }

      if (!db.objectStoreNames.contains('teams')) {
        const teams = db.createObjectStore('teams', { keyPath: 'id' });
        teams.createIndex('leagueId', 'leagueId', { unique: false });
        teams.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains('players')) {
        const players = db.createObjectStore('players', { keyPath: 'id' });
        players.createIndex('teamId', 'teamId', { unique: false });
        players.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains('matches')) {
        const matches = db.createObjectStore('matches', { keyPath: 'id' });
        matches.createIndex('leagueId', 'leagueId', { unique: false });
        matches.createIndex('homeTeamId', 'homeTeamId', { unique: false });
        matches.createIndex('awayTeamId', 'awayTeamId', { unique: false });
        matches.createIndex('date', 'date', { unique: false });
        matches.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains('events')) {
        const events = db.createObjectStore('events', { keyPath: 'id' });
        events.createIndex('matchId', 'matchId', { unique: false });
        events.createIndex('playerId', 'playerId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      dbInstance.onversionchange = () => dbInstance.close();
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

/** Genera un id único razonable sin dependencias externas. */
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}


// Helpers genéricos de bajo nivel (envuelven un IDBRequest en Promise)

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txToPromise(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
  });
}

/** Lee todos los registros de un store. */
async function getAll(storeName) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const result = await reqToPromise(tx.objectStore(storeName).getAll());
  return result;
}

/** Lee todos los registros de un store filtrando por un índice. */
async function getAllByIndex(storeName, indexName, value) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const idx = tx.objectStore(storeName).index(indexName);
  return reqToPromise(idx.getAll(value));
}

/** Lee un registro por id. */
async function getById(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  return reqToPromise(tx.objectStore(storeName).get(id));
}

/** Inserta o reemplaza un registro (operación atómica simple). */
async function put(storeName, record) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(record);
  await txToPromise(tx);
  return record;
}

/** Elimina un registro por id (operación atómica simple). */
async function remove(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  await txToPromise(tx);
}

// LIGAS — operaciones simples

async function createLeague(data) {
  const league = {
    id: uid(),
    name: data.name,
    sport: data.sport,
    mode: data.mode, // 'liga' | 'eliminacion'
    roundTrip: data.mode === 'liga' ? !!data.roundTrip : null,
    bracketSize: data.mode === 'eliminacion' ? Number(data.bracketSize) : null,
    season: data.season,
    description: data.description || '',
    isActive: 0,
    fixtureGenerated: false,
    createdAt: Date.now(),
  };
  return put('leagues', league);
}

async function updateLeague(id, patch) {
  const existing = await getById('leagues', id);
  if (!existing) throw new Error('Liga no encontrada');
  // La modalidad no puede modificarse una vez creada (sección 4.2.2).
  const safePatch = { ...patch };
  delete safePatch.mode;
  delete safePatch.roundTrip;
  delete safePatch.bracketSize;
  delete safePatch.sport;
  const updated = { ...existing, ...safePatch };
  return put('leagues', updated);
}

// ------------------------------------------------------------------
// ACTIVAR LIGA (operación de integridad: desactiva la anterior, activa la nueva)
// ------------------------------------------------------------------

async function activateLeague(leagueId) {
  const db = await openDatabase();
  const tx = db.transaction('leagues', 'readwrite');
  const store = tx.objectStore('leagues');
  const all = await reqToPromise(store.getAll());
  for (const league of all) {
    const shouldBeActive = league.id === leagueId ? 1 : 0;
    if (league.isActive !== shouldBeActive) {
      league.isActive = shouldBeActive;
      store.put(league);
    }
  }
  await txToPromise(tx);
  localStorage.setItem('statium:activeLeagueId', leagueId);
}

async function getActiveLeague() {
  const leagues = await getAllByIndex('leagues', 'isActive', 1);
  return leagues[0] || null;
}

// ELIMINAR LIGA EN CASCADA (operación de integridad)

async function deleteLeagueCascade(leagueId) {
  const db = await openDatabase();
  const teams = await getAllByIndex('teams', 'leagueId', leagueId);
  const matches = await getAllByIndex('matches', 'leagueId', leagueId);

  const teamIds = new Set(teams.map((t) => t.id));
  const matchIds = new Set(matches.map((m) => m.id));

  // Buscamos jugadores y eventos relacionados antes de abrir la transacción
  // de escritura, para mantener la transacción lo más corta posible.
  const allPlayers = await getAll('players');
  const players = allPlayers.filter((p) => teamIds.has(p.teamId));

  const allEvents = await getAll('events');
  const events = allEvents.filter((e) => matchIds.has(e.matchId));

  const tx = db.transaction(['leagues', 'teams', 'players', 'matches', 'events'], 'readwrite');
  tx.objectStore('leagues').delete(leagueId);
  teams.forEach((t) => tx.objectStore('teams').delete(t.id));
  players.forEach((p) => tx.objectStore('players').delete(p.id));
  matches.forEach((m) => tx.objectStore('matches').delete(m.id));
  events.forEach((e) => tx.objectStore('events').delete(e.id));
  await txToPromise(tx);

  // Si borramos la liga activa, activar otra disponible (o ninguna).
  const wasActive = localStorage.getItem('statium:activeLeagueId') === leagueId;
  if (wasActive) {
    localStorage.removeItem('statium:activeLeagueId');
    const remaining = await getAll('leagues');
    if (remaining.length > 0) {
      await activateLeague(remaining[0].id);
    }
  }
}

// EQUIPOS

async function createTeam(data) {
  const team = {
    id: uid(),
    leagueId: data.leagueId,
    name: data.name,
    crestUrl: data.crestUrl || '',
    colorPrimary: data.colorPrimary || '#2F6D3B',
    colorSecondary: data.colorSecondary || '#F2F1EC',
    city: data.city || '',
    stats: { pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0 },
    createdAt: Date.now(),
  };
  return put('teams', team);
}

async function updateTeam(id, patch) {
  const existing = await getById('teams', id);
  if (!existing) throw new Error('Equipo no encontrado');
  return put('teams', { ...existing, ...patch });
}

/** Elimina un equipo. Bloquea si tiene partidos; borra jugadores en cascada si no. */
async function deleteTeam(teamId) {
  const matches = await getAllByIndex('matches', 'homeTeamId', teamId);
  const matches2 = await getAllByIndex('matches', 'awayTeamId', teamId);
  if (matches.length > 0 || matches2.length > 0) {
    throw new Error('No se puede eliminar: el equipo tiene partidos programados o jugados.');
  }
  const players = await getAllByIndex('players', 'teamId', teamId);
  const db = await openDatabase();
  const tx = db.transaction(['teams', 'players'], 'readwrite');
  tx.objectStore('teams').delete(teamId);
  players.forEach((p) => tx.objectStore('players').delete(p.id));
  await txToPromise(tx);
}

// JUGADORES

async function createPlayer(data) {
  const player = {
    id: uid(),
    teamId: data.teamId,
    name: data.name,
    photoUrl: data.photoUrl || '',
    position: data.position || '',
    number: Number(data.number),
    stats: { pj: 0, scored: 0 },
    createdAt: Date.now(),
  };
  return put('players', player);
}

async function updatePlayer(id, patch) {
  const existing = await getById('players', id);
  if (!existing) throw new Error('Jugador no encontrado');
  return put('players', { ...existing, ...patch });
}

async function deletePlayer(playerId) {
  const events = await getAllByIndex('events', 'playerId', playerId);
  if (events.length > 0) {
    throw new Error('No se puede eliminar: el jugador tiene anotaciones registradas.');
  }
  return remove('players', playerId);
}

// PARTIDOS — creación manual (solo modalidad liga)

async function createMatch(data) {
  const match = {
    id: uid(),
    leagueId: data.leagueId,
    homeTeamId: data.homeTeamId,
    awayTeamId: data.awayTeamId,
    date: data.date,
    status: 'programado',
    homeScore: null,
    awayScore: null,
    round: data.round ?? null,
    nextMatchId: data.nextMatchId ?? null,
    nextMatchSlot: data.nextMatchSlot ?? null,
    winnerTeamId: null,
  };
  return put('matches', match);
}

async function updateMatchDate(matchId, date) {
  const existing = await getById('matches', matchId);
  if (!existing) throw new Error('Partido no encontrado');
  return put('matches', { ...existing, date });
}

/** Solo se pueden eliminar partidos programados en modalidad liga. */
async function deleteMatch(matchId) {
  const match = await getById('matches', matchId);
  if (!match) throw new Error('Partido no encontrado');
  const league = await getById('leagues', match.leagueId);
  if (league.mode === 'eliminacion') {
    throw new Error('No se pueden eliminar partidos individuales en eliminación directa.');
  }
  if (match.status === 'finalizado') {
    throw new Error('No se puede eliminar un partido finalizado. Debe deshacerse primero.');
  }
  return remove('matches', matchId);
}

// GENERAR FIXTURE (modalidad liga) — operación de integridad

async function generateFixture(leagueId, startDate = new Date()) {
  const league = await getById('leagues', leagueId);
  if (!league) throw new Error('Liga no encontrada');
  if (league.mode !== 'liga') throw new Error('Esta liga no es modalidad "liga".');

  const teams = await getAllByIndex('teams', 'leagueId', leagueId);
  if (teams.length < 2) throw new Error('Se necesitan al menos 2 equipos.');

  const pairings = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairings.push([teams[i], teams[j]]);
      if (league.roundTrip) pairings.push([teams[j], teams[i]]);
    }
  }

  // Escalonamos las fechas: un partido cada 3 días a partir de startDate.
  const matches = pairings.map((pair, index) => {
    const date = new Date(startDate.getTime());
    date.setDate(date.getDate() + index * 3);
    return {
      id: uid(),
      leagueId,
      homeTeamId: pair[0].id,
      awayTeamId: pair[1].id,
      date: date.toISOString(),
      status: 'programado',
      homeScore: null,
      awayScore: null,
      round: null,
      nextMatchId: null,
      nextMatchSlot: null,
      winnerTeamId: null,
    };
  });

  const db = await openDatabase();
  const tx = db.transaction(['leagues', 'matches'], 'readwrite');
  matches.forEach((m) => tx.objectStore('matches').add(m));
  league.fixtureGenerated = true;
  tx.objectStore('leagues').put(league);
  await txToPromise(tx);
  return matches;
}

// GENERAR BRACKET (modalidad eliminación directa) — operación de integridad

const ROUND_NAMES = {
  16: ['Octavos', 'Cuartos', 'Semifinal', 'Final'],
  8: ['Cuartos', 'Semifinal', 'Final'],
  4: ['Semifinal', 'Final'],
};

function roundNameFor(bracketSize, roundIndex) {
  const names = ROUND_NAMES[bracketSize] || [];
  return names[roundIndex] || `Ronda ${roundIndex + 1}`;
}

async function generateBracket(leagueId, startDate = new Date()) {
  const league = await getById('leagues', leagueId);
  if (!league) throw new Error('Liga no encontrada');
  if (league.mode !== 'eliminacion') throw new Error('Esta liga no es eliminación directa.');

  const teams = await getAllByIndex('teams', 'leagueId', leagueId);
  if (teams.length !== league.bracketSize) {
    throw new Error(
      `Se necesitan exactamente ${league.bracketSize} equipos (hay ${teams.length}).`
    );
  }

  // Sorteo aleatorio simple (Fisher-Yates).
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const totalRounds = Math.log2(league.bracketSize);
  /** @type {any[][]} matchesByRound[0] = ronda 1, etc. */
  const matchesByRound = [];

  // Ronda 1: partidos reales con equipos asignados.
  const round1 = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const date = new Date(startDate.getTime());
    date.setDate(date.getDate() + (i / 2) * 3);
    round1.push({
      id: uid(),
      leagueId,
      homeTeamId: shuffled[i].id,
      awayTeamId: shuffled[i + 1].id,
      date: date.toISOString(),
      status: 'programado',
      homeScore: null,
      awayScore: null,
      round: 0,
      nextMatchId: null,
      nextMatchSlot: null,
      winnerTeamId: null,
    });
  }
  matchesByRound.push(round1);

  // Rondas posteriores: plantillas "Por definir".
  for (let r = 1; r < totalRounds; r++) {
    const prevRound = matchesByRound[r - 1];
    const round = [];
    for (let i = 0; i < prevRound.length; i += 2) {
      round.push({
        id: uid(),
        leagueId,
        homeTeamId: null,
        awayTeamId: null,
        date: null,
        status: 'programado',
        homeScore: null,
        awayScore: null,
        round: r,
        nextMatchId: null,
        nextMatchSlot: null,
        winnerTeamId: null,
      });
    }
    matchesByRound.push(round);

    // Enlazamos los partidos de la ronda anterior con esta ronda.
    prevRound.forEach((m, idx) => {
      const nextMatch = round[Math.floor(idx / 2)];
      m.nextMatchId = nextMatch.id;
      m.nextMatchSlot = idx % 2 === 0 ? 'home' : 'away';
    });
  }

  const allMatches = matchesByRound.flat();

  const db = await openDatabase();
  const tx = db.transaction(['leagues', 'matches'], 'readwrite');
  allMatches.forEach((m) => tx.objectStore('matches').add(m));
  league.fixtureGenerated = true;
  tx.objectStore('leagues').put(league);
  await txToPromise(tx);
  return allMatches;
}

// FINALIZAR PARTIDO — la operación de integridad central del proyecto

async function finalizeMatch(matchId, events, winnerTeamIdIfTie = null) {
  const db = await openDatabase();

  const match = await getById('matches', matchId);
  if (!match) throw new Error('Partido no encontrado');
  if (match.status === 'finalizado') throw new Error('El partido ya está finalizado.');

  const league = await getById('leagues', match.leagueId);
  const homeTeam = await getById('teams', match.homeTeamId);
  const awayTeam = await getById('teams', match.awayTeamId);

  const homeScore = events.filter((e) => e.teamId === match.homeTeamId).length;
  const awayScore = events.filter((e) => e.teamId === match.awayTeamId).length;

  let winnerTeamId = null;
  if (league.mode === 'eliminacion') {
    if (homeScore === awayScore) {
      if (!winnerTeamIdIfTie) {
        throw new Error('Debe declararse un ganador: el marcador quedó empatado.');
      }
      winnerTeamId = winnerTeamIdIfTie;
    } else {
      winnerTeamId = homeScore > awayScore ? match.homeTeamId : match.awayTeamId;
    }
  }

  // Agrupamos anotaciones por jugador para actualizar sus estadísticas.
  const playerIds = [...new Set(events.map((e) => e.playerId).filter(Boolean))];
  const players = await Promise.all(playerIds.map((id) => getById('players', id)));

  const stores = ['matches', 'teams', 'players', 'events'];
  const tx = db.transaction(stores, 'readwrite');

  try {
    // 1. Actualizar el partido.
    match.status = 'finalizado';
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.winnerTeamId = winnerTeamId;
    tx.objectStore('matches').put(match);

    // 2 y 3. Actualizar estadísticas de ambos equipos.
    applyMatchResultToTeam(homeTeam, homeScore, awayScore, league.mode, winnerTeamId, match.homeTeamId);
    applyMatchResultToTeam(awayTeam, awayScore, homeScore, league.mode, winnerTeamId, match.awayTeamId);
    tx.objectStore('teams').put(homeTeam);
    tx.objectStore('teams').put(awayTeam);

    // 4. Actualizar estadísticas de jugadores que anotaron.
    for (const player of players) {
      if (!player) continue;
      const playerEvents = events.filter((e) => e.playerId === player.id);
      if (!player._matchesCounted) player._matchesCounted = [];
      if (!player._matchesCounted.includes(matchId)) {
        player.stats.pj += 1;
        player._matchesCounted.push(matchId);
      }
      player.stats.scored += playerEvents.length;
      tx.objectStore('players').put(player);
    }

    // 5. Persistir los eventos.
    for (const e of events) {
      tx.objectStore('events').add({
        id: uid(),
        matchId,
        teamId: e.teamId,
        playerId: e.playerId,
        minute: e.minute ?? null,
      });
    }

    // 6. Eliminación directa: avanzar ganador a la siguiente ronda.
    if (league.mode === 'eliminacion' && match.nextMatchId) {
      const nextMatch = await getById('matches', match.nextMatchId);
      if (nextMatch) {
        if (match.nextMatchSlot === 'home') nextMatch.homeTeamId = winnerTeamId;
        else nextMatch.awayTeamId = winnerTeamId;
        if (!nextMatch.date) nextMatch.date = new Date().toISOString();
        tx.objectStore('matches').put(nextMatch);
      }
    }

    await txToPromise(tx);
  } catch (err) {
    tx.abort();
    throw err;
  }

  return match;
}

function applyMatchResultToTeam(team, scored, conceded, mode, winnerTeamId, teamId) {
  team.stats.pj += 1;
  team.stats.pf += scored;
  team.stats.pc += conceded;

  if (mode === 'eliminacion') {
    // En bracket no acumulamos puntos de tabla, pero sí PG/PE/PP para referencia.
    if (winnerTeamId === teamId) team.stats.pg += 1;
    else team.stats.pp += 1;
    return;
  }

  if (scored > conceded) team.stats.pg += 1;
  else if (scored === conceded) team.stats.pe += 1;
  else team.stats.pp += 1;
}

/** Calcula los puntos de tabla de un equipo (3-1-0). */
function computeTeamPoints(stats) {
  return stats.pg * 3 + stats.pe * 1;
}

// DESHACER PARTIDO — operación de integridad inversa

async function undoMatch(matchId) {
  const db = await openDatabase();

  const match = await getById('matches', matchId);
  if (!match) throw new Error('Partido no encontrado');
  if (match.status !== 'finalizado') throw new Error('El partido no está finalizado.');

  const league = await getById('leagues', match.leagueId);

  // Restricción: no se puede deshacer si el partido de la siguiente ronda
  // ya está finalizado.
  if (league.mode === 'eliminacion' && match.nextMatchId) {
    const nextMatch = await getById('matches', match.nextMatchId);
    if (nextMatch && nextMatch.status === 'finalizado') {
      throw new Error(
        'No se puede deshacer: el partido de la siguiente ronda ya está finalizado. Deshágalo primero.'
      );
    }
  }

  const homeTeam = await getById('teams', match.homeTeamId);
  const awayTeam = await getById('teams', match.awayTeamId);
  const events = await getAllByIndex('events', 'matchId', matchId);

  const playerIds = [...new Set(events.map((e) => e.playerId).filter(Boolean))];
  const players = await Promise.all(playerIds.map((id) => getById('players', id)));

  const stores = ['matches', 'teams', 'players', 'matches'];
  const tx = db.transaction(['matches', 'teams', 'players'], 'readwrite');

  try {
    // 2 y 3. Restar contribuciones a estadísticas de equipos.
    revertMatchResultFromTeam(homeTeam, match.homeScore, match.awayScore, league.mode, match.winnerTeamId, match.homeTeamId);
    revertMatchResultFromTeam(awayTeam, match.awayScore, match.homeScore, league.mode, match.winnerTeamId, match.awayTeamId);
    tx.objectStore('teams').put(homeTeam);
    tx.objectStore('teams').put(awayTeam);

    // 3. Restar anotaciones de jugadores.
    for (const player of players) {
      if (!player) continue;
      const playerEvents = events.filter((e) => e.playerId === player.id);
      player.stats.scored -= playerEvents.length;
      if (player._matchesCounted) {
        player._matchesCounted = player._matchesCounted.filter((id) => id !== matchId);
      }
      player.stats.pj = Math.max(0, player.stats.pj - 1);
      tx.objectStore('players').put(player);
    }

    // 1. Restablecer el partido a "Programado" (los eventos se conservan).
    match.status = 'programado';
    match.homeScore = null;
    match.awayScore = null;
    const previousWinner = match.winnerTeamId;
    match.winnerTeamId = null;
    tx.objectStore('matches').put(match);

    // 5. Limpiar el slot del partido siguiente si aún no está finalizado.
    if (league.mode === 'eliminacion' && match.nextMatchId) {
      const nextMatch = await getById('matches', match.nextMatchId);
      if (nextMatch && nextMatch.status !== 'finalizado') {
        if (match.nextMatchSlot === 'home') nextMatch.homeTeamId = null;
        else nextMatch.awayTeamId = null;
        tx.objectStore('matches').put(nextMatch);
      }
    }

    await txToPromise(tx);
  } catch (err) {
    tx.abort();
    throw err;
  }

  return match;
}

function revertMatchResultFromTeam(team, scored, conceded, mode, winnerTeamId, teamId) {
  team.stats.pj = Math.max(0, team.stats.pj - 1);
  team.stats.pf = Math.max(0, team.stats.pf - scored);
  team.stats.pc = Math.max(0, team.stats.pc - conceded);

  if (mode === 'eliminacion') {
    if (winnerTeamId === teamId) team.stats.pg = Math.max(0, team.stats.pg - 1);
    else team.stats.pp = Math.max(0, team.stats.pp - 1);
    return;
  }

  if (scored > conceded) team.stats.pg = Math.max(0, team.stats.pg - 1);
  else if (scored === conceded) team.stats.pe = Math.max(0, team.stats.pe - 1);
  else team.stats.pp = Math.max(0, team.stats.pp - 1);
}

// EXPORTAR / IMPORTAR

async function exportLeague(leagueId) {
  const league = await getById('leagues', leagueId);
  if (!league) throw new Error('Liga no encontrada');
  const teams = await getAllByIndex('teams', 'leagueId', leagueId);
  const matches = await getAllByIndex('matches', 'leagueId', leagueId);

  const allPlayers = await getAll('players');
  const teamIds = new Set(teams.map((t) => t.id));
  const players = allPlayers.filter((p) => teamIds.has(p.teamId));

  const allEvents = await getAll('events');
  const matchIds = new Set(matches.map((m) => m.id));
  const events = allEvents.filter((e) => matchIds.has(e.matchId));

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    league,
    teams,
    players,
    matches,
    events,
  };
}

/** Valida la forma mínima del JSON importado. */
function validateImportShape(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.league || !Array.isArray(data.teams) || !Array.isArray(data.players)) return false;
  if (!Array.isArray(data.matches) || !Array.isArray(data.events)) return false;
  if (!data.league.name || !data.league.sport || !data.league.mode) return false;
  return true;
}

/**
 * Importa una liga completa. Si el nombre ya existe, se debe pasar
 * newName para renombrarla (la UI se encarga de pedirlo).
 */
async function importLeague(data, newName = null) {
  if (!validateImportShape(data)) {
    throw new Error('El archivo no tiene una estructura válida de liga Statium.');
  }

  const existing = await getAllByIndex('leagues', 'name', data.league.name);
  if (existing.length > 0 && !newName) {
    const err = new Error('DUPLICATE_NAME');
    err.code = 'DUPLICATE_NAME';
    throw err;
  }

  // Remapeamos IDs para evitar colisiones con datos existentes.
  const idMap = new Map();
  const remap = (oldId) => {
    if (!oldId) return oldId;
    if (!idMap.has(oldId)) idMap.set(oldId, uid());
    return idMap.get(oldId);
  };

  const league = {
    ...data.league,
    id: remap(data.league.id),
    name: newName || data.league.name,
    isActive: 0,
  };

  const teams = data.teams.map((t) => ({
    ...t,
    id: remap(t.id),
    leagueId: league.id,
  }));

  const players = data.players.map((p) => ({
    ...p,
    id: remap(p.id),
    teamId: remap(p.teamId),
  }));

  const matches = data.matches.map((m) => ({
    ...m,
    id: remap(m.id),
    leagueId: league.id,
    homeTeamId: remap(m.homeTeamId),
    awayTeamId: remap(m.awayTeamId),
    nextMatchId: remap(m.nextMatchId),
  }));

  const events = data.events.map((e) => ({
    ...e,
    id: remap(e.id),
    matchId: remap(e.matchId),
    playerId: remap(e.playerId),
  }));

  const db = await openDatabase();
  const tx = db.transaction(['leagues', 'teams', 'players', 'matches', 'events'], 'readwrite');
  try {
    tx.objectStore('leagues').add(league);
    teams.forEach((t) => tx.objectStore('teams').add(t));
    players.forEach((p) => tx.objectStore('players').add(p));
    matches.forEach((m) => tx.objectStore('matches').add(m));
    events.forEach((e) => tx.objectStore('events').add(e));
    await txToPromise(tx);
  } catch (err) {
    tx.abort();
    throw err;
  }

  return league;
}

  window.Statium = window.Statium || {};
  window.Statium.DB = {
    openDatabase,
    uid,
    getAll,
    getAllByIndex,
    getById,
    put,
    remove,
    createLeague,
    updateLeague,
    activateLeague,
    getActiveLeague,
    deleteLeagueCascade,
    createTeam,
    updateTeam,
    deleteTeam,
    createPlayer,
    updatePlayer,
    deletePlayer,
    createMatch,
    updateMatchDate,
    deleteMatch,
    generateFixture,
    roundNameFor,
    generateBracket,
    finalizeMatch,
    computeTeamPoints,
    undoMatch,
    exportLeague,
    importLeague,
  };
})();
