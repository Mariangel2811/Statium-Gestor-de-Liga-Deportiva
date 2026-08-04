
(function () {
  'use strict';

function crestHTML(team, size = 42) {
  if (team.crestUrl) {
    return `<img class="crest" style="width:${size}px;height:${size}px" src="${team.crestUrl}" alt="Escudo de ${team.name}" onerror="this.style.display='none'">`;
  }
  const initials = team.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return `<div class="crest" style="width:${size}px;height:${size}px;background:${team.colorPrimary || '#2F6D3B'};color:${team.colorSecondary || '#F2F1EC'}">${initials}</div>`;
}


// -------------------- LeagueCard --------------------

class LeagueCard extends HTMLElement {
  set data(league) {
    this._league = league;
    this.render();
  }

  render() {
    const l = this._league;
    if (!l) return;
    const terms = window.Statium.SportsTerms.getSportTerms(l.sport);
    this.className = 'card';
    this.innerHTML = `
      <div class="flex-between mb-16">
        <span style="font-size:22px">${terms.icon}</span>
        ${l.isActive ? '<span class="badge badge--active">Activa</span>' : ''}
      </div>
      <h3 style="font-size:16px;margin-bottom:4px">${l.name}</h3>
      <div class="text-dim" style="font-size:12px;margin-bottom:12px">${terms.label} · ${l.season} · ${l.mode === 'liga' ? 'Todos contra todos' : 'Eliminación directa'}</div>
      <div class="flex" style="gap:16px;font-family:var(--font-mono);font-size:12px;color:var(--ink-dim)" data-role="counts"></div>
      <div class="form-actions" style="margin-top:14px;justify-content:flex-start;flex-wrap:wrap" data-role="actions"></div>
    `;
  }
}
customElements.define('league-card', LeagueCard);

// -------------------- TeamCard --------------------

class TeamCard extends HTMLElement {
  set data({ team, position } = {}) {
    this._team = team;
    this._position = position;
    this.render();
  }

  render() {
    const t = this._team;
    if (!t) return;
    this.className = 'card card--clickable';
    this.innerHTML = `
      <div class="flex" style="gap:12px">
        ${crestHTML(t)}
        <div>
          <div style="font-weight:600">${t.name}</div>
          <div class="text-dim" style="font-size:12px">${t.city || 'Sin sede'}</div>
        </div>
      </div>
      <div class="flex-between mt-16" style="font-size:12px">
        <span class="text-dim">${this._position ? `Posición #${this._position}` : ''}</span>
        <span class="badge">${t._playerCount ?? ''} jug.</span>
      </div>
    `;
  }
}
customElements.define('team-card', TeamCard);

// -------------------- PlayerCard --------------------

class PlayerCard extends HTMLElement {
  set data({ player, team } = {}) {
    this._player = player;
    this._team = team;
    this.render();
  }

  render() {
    const p = this._player;
    if (!p) return;
    this.className = 'card card--clickable';
    const photo = p.photoUrl
      ? `<img class="crest" style="width:48px;height:48px" src="${p.photoUrl}" alt="${p.name}" onerror="this.style.display='none'">`
      : `<div class="crest" style="width:48px;height:48px;background:var(--accent);color:var(--accent-ink)">${p.number ?? '#'}</div>`;
    this.innerHTML = `
      <div class="flex" style="gap:12px">
        ${photo}
        <div>
          <div style="font-weight:600">${p.name}</div>
          <div class="text-dim" style="font-size:12px">${p.position || 'Sin posición'} · #${p.number}</div>
        </div>
      </div>
      ${this._team ? `<div class="flex mt-16" style="gap:6px;font-size:12px">${crestHTML(this._team, 18)} <span>${this._team.name}</span></div>` : ''}
    `;
  }
}
customElements.define('player-card', PlayerCard);

// -------------------- MatchCard --------------------

class MatchCard extends HTMLElement {
  set data({ match, homeTeam, awayTeam, sport, roundLabel } = {}) {
    this._match = match;
    this._homeTeam = homeTeam;
    this._awayTeam = awayTeam;
    this._sport = sport;
    this._roundLabel = roundLabel;
    this.render();
  }

  render() {
    const m = this._match;
    if (!m) return;
    const home = this._homeTeam;
    const away = this._awayTeam;
    const isFinished = m.status === 'finalizado';
    this.className = 'card card--clickable';
    const dateStr = m.date ? new Date(m.date).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Por definir';
    this.innerHTML = `
      <div class="flex-between" style="font-size:11px;color:var(--ink-dim);font-family:var(--font-mono);margin-bottom:10px">
        <span>${this._roundLabel || ''}</span>
        <span class="badge ${isFinished ? 'badge--success' : ''}">${isFinished ? 'Finalizado' : 'Programado'}</span>
      </div>
      <div class="flex-between">
        <div class="flex" style="gap:8px;flex:1;min-width:0">
          ${home ? crestHTML(home, 28) : ''}
          <span style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${home ? home.name : '<span class="tbd">Por definir</span>'}</span>
        </div>
        <span class="mono" style="font-weight:700;padding:0 8px">${isFinished ? m.homeScore : ''} ${isFinished ? '-' : 'vs'} ${isFinished ? m.awayScore : ''}</span>
        <div class="flex" style="gap:8px;flex:1;min-width:0;justify-content:flex-end">
          <span style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right">${away ? away.name : '<span class="tbd">Por definir</span>'}</span>
          ${away ? crestHTML(away, 28) : ''}
        </div>
      </div>
      <div class="text-dim mt-16" style="font-size:11px;font-family:var(--font-mono)">${dateStr}</div>
    `;
  }
}
customElements.define('match-card', MatchCard);

  window.Statium.Components = window.Statium.Components || {};
  window.Statium.Components.crestHTML = crestHTML;
})();
