
(function () {
  'use strict';
// -------------------- StandingsTable --------------------

class StandingsTable extends HTMLElement {
  set data({ teams, sport } = {}) {
    this._teams = teams || [];
    this._sport = sport;
    this.render();
  }

  render() {
    const terms = window.Statium.SportsTerms.getSportTerms(this._sport);
    const sorted = [...this._teams].sort((a, b) => {
      const ptsA = window.Statium.DB.computeTeamPoints(a.stats);
      const ptsB = window.Statium.DB.computeTeamPoints(b.stats);
      if (ptsB !== ptsA) return ptsB - ptsA;
      const diffA = a.stats.pf - a.stats.pc;
      const diffB = b.stats.pf - b.stats.pc;
      if (diffB !== diffA) return diffB - diffA;
      return b.stats.pf - a.stats.pf;
    });

    if (sorted.length === 0) {
      this.innerHTML = `<div class="empty-state"><p>Aún no hay equipos registrados.</p></div>`;
      return;
    }

    this.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th><th></th><th>${terms.teamLabel}</th>
            <th class="num">PJ</th><th class="num">PG</th><th class="num">PE</th><th class="num">PP</th>
            <th class="num">${terms.forColumn}</th><th class="num">${terms.againstColumn}</th>
            <th class="num">DIF</th><th class="num">Pts</th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map((t, i) => {
              const pts = window.Statium.DB.computeTeamPoints(t.stats);
              const diff = t.stats.pf - t.stats.pc;
              return `
                <tr class="row-link" data-team-id="${t.id}">
                  <td class="num">${i + 1}</td>
                  <td>${window.Statium.Components.crestHTML(t, 26)}</td>
                  <td>${t.name}</td>
                  <td class="num">${t.stats.pj}</td>
                  <td class="num">${t.stats.pg}</td>
                  <td class="num">${t.stats.pe}</td>
                  <td class="num">${t.stats.pp}</td>
                  <td class="num">${t.stats.pf}</td>
                  <td class="num">${t.stats.pc}</td>
                  <td class="num">${diff >= 0 ? '+' : ''}${diff}</td>
                  <td class="num" style="font-weight:700;color:var(--accent)">${pts}</td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    `;
    this.querySelectorAll('.row-link').forEach((row) => {
      row.addEventListener('click', () => window.Statium.Router.navigate(`#team/${row.dataset.teamId}`));
    });
  }
}
customElements.define('standings-table', StandingsTable);

// -------------------- RankingTable --------------------

class RankingTable extends HTMLElement {
  set data({ players, teamsById, sport, limit = 10 } = {}) {
    this._players = players || [];
    this._teamsById = teamsById || {};
    this._sport = sport;
    this._limit = limit;
    this.render();
  }

  render() {
    const terms = window.Statium.SportsTerms.getSportTerms(this._sport);
    const sorted = [...this._players]
      .filter((p) => p.stats.scored > 0)
      .sort((a, b) => b.stats.scored - a.stats.scored)
      .slice(0, this._limit);

    if (sorted.length === 0) {
      this.innerHTML = `<div class="empty-state"><p>Todavía no hay ${terms.scorersLabel.toLowerCase()}.</p></div>`;
      return;
    }

    this.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th><th></th><th>${terms.playerLabel}</th><th>${terms.teamLabel}</th>
            <th class="num">${terms.scoreEventPlural}</th><th class="num">PJ</th><th class="num">Prom.</th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map((p, i) => {
              const team = this._teamsById[p.teamId];
              const avg = p.stats.pj > 0 ? (p.stats.scored / p.stats.pj).toFixed(1) : '0.0';
              const photo = p.photoUrl
                ? `<img class="crest" style="width:26px;height:26px" src="${p.photoUrl}" alt="${p.name}" onerror="this.style.display='none'">`
                : `<div class="crest" style="width:26px;height:26px;font-size:11px;background:var(--accent);color:var(--accent-ink)">${p.number ?? ''}</div>`;
              return `
                <tr class="row-link" data-player-id="${p.id}">
                  <td class="num">${i + 1}</td>
                  <td>${photo}</td>
                  <td>${p.name}</td>
                  <td>${team ? team.name : '—'}</td>
                  <td class="num" style="font-weight:700;color:var(--accent)">${p.stats.scored}</td>
                  <td class="num">${p.stats.pj}</td>
                  <td class="num">${avg}</td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    `;
    this.querySelectorAll('.row-link').forEach((row) => {
      row.addEventListener('click', () => window.Statium.Router.navigate(`#player/${row.dataset.playerId}`));
    });
  }
}
customElements.define('ranking-table', RankingTable);

// -------------------- BracketView --------------------

class BracketView extends HTMLElement {
  set data({ matches, teamsById, bracketSize } = {}) {
    this._matches = matches || [];
    this._teamsById = teamsById || {};
    this._bracketSize = bracketSize;
    this.render();
  }

  render() {
    if (this._matches.length === 0) {
      this.innerHTML = `<div class="empty-state"><p>El bracket todavía no fue generado.</p></div>`;
      return;
    }
    const byRound = {};
    this._matches.forEach((m) => {
      (byRound[m.round] ??= []).push(m);
    });
    const roundIndexes = Object.keys(byRound).map(Number).sort((a, b) => a - b);

    this.innerHTML = `
      <div class="bracket">
        ${roundIndexes
          .map((r) => {
            const matches = byRound[r].sort((a, b) => (a.id > b.id ? 1 : -1));
            return `
              <div class="bracket__round">
                <div class="bracket__round-title">${window.Statium.DB.roundNameFor(this._bracketSize, r)}</div>
                ${matches
                  .map((m) => {
                    const home = this._teamsById[m.homeTeamId];
                    const away = this._teamsById[m.awayTeamId];
                    const homeWin = m.status === 'finalizado' && m.winnerTeamId === m.homeTeamId;
                    const awayWin = m.status === 'finalizado' && m.winnerTeamId === m.awayTeamId;
                    return `
                      <div class="bracket__match" data-match-id="${m.id}">
                        <div class="bracket__slot ${homeWin ? 'is-winner' : ''}">
                          <span>${home ? home.name : '<span class="tbd">Por definir</span>'}</span>
                          <span class="mono">${m.status === 'finalizado' ? m.homeScore : ''}</span>
                        </div>
                        <div class="bracket__slot ${awayWin ? 'is-winner' : ''}">
                          <span>${away ? away.name : '<span class="tbd">Por definir</span>'}</span>
                          <span class="mono">${m.status === 'finalizado' ? m.awayScore : ''}</span>
                        </div>
                      </div>`;
                  })
                  .join('')}
              </div>`;
          })
          .join('')}
      </div>
    `;
    this.querySelectorAll('.bracket__match').forEach((el) => {
      el.addEventListener('click', () => window.Statium.Router.navigate(`#match/${el.dataset.matchId}`));
    });
  }
}
customElements.define('bracket-view', BracketView);

})();
