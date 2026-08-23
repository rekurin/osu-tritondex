'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import rosterData from '../data/roster.json';

type GameMode = 'osu' | 'mania' | 'taiko' | 'fruits';

type RosterEntry = {
  username: string;
  major: string;
  mode?: GameMode;
  modes?: GameMode[];
};

type TopScore = {
  title: string;
  artist: string;
  difficulty: string;
  accuracy: number;
  pp: number;
  rank: string;
  mods: string[];
};

export type Player = {
  id: string;
  username: string;
  major: string;
  countryCode: string;
  globalRank: number;
  countryRank: number;
  pp: number;
  accuracy: number;
  playCount: number;
  level: number;
  maxCombo: number;
  rankedScore: number;
  hit300: number;
  hasStats: boolean;
  avatarUrl?: string;
  osuUrl: string;
  mode: GameMode;
  topScores: TopScore[];
};

type DataPayload = {
  players: Player[];
  source: 'live' | 'roster';
  updatedAt?: string;
  notice?: string;
};

const roster = rosterData as RosterEntry[];
const modeLabels: Record<GameMode, string> = { osu: 'STD', mania: 'MANIA', taiko: 'TAIKO', fruits: 'CTB' };
const number = new Intl.NumberFormat('en-US');
const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

function rosterPlayer(entry: RosterEntry, index: number, mode: GameMode): Player {
  return {
    id: `roster-${index + 1}-${mode}`,
    username: entry.username,
    major: entry.major,
    countryCode: '—',
    globalRank: 0,
    countryRank: 0,
    pp: 0,
    accuracy: 0,
    playCount: 0,
    level: 0,
    maxCombo: 0,
    rankedScore: 0,
    hit300: 0,
    hasStats: false,
    osuUrl: `https://osu.ppy.sh/users/${encodeURIComponent(entry.username)}`,
    mode,
    topScores: [],
  };
}

const initialPlayers = roster.flatMap((entry, index) => {
  const modes = entry.modes?.length ? entry.modes : [entry.mode ?? 'osu'];
  return modes.map((mode) => rosterPlayer(entry, index, mode));
});

function getInitials(username: string) {
  return username.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'OS';
}

function getLevelParts(level: number) {
  const base = Math.floor(level);
  return { base, progress: Math.round((level - base) * 100) };
}

function formatTime(iso?: string) {
  if (!iso) return 'PENDING';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'PENDING';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase();
}

function compactStat(value: number, hasStats: boolean) {
  return hasStats ? compactNumber.format(value) : '—';
}

function fullStat(value: number, hasStats: boolean) {
  return hasStats ? number.format(value) : '—';
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<GameMode>('osu');
  const [source, setSource] = useState<'live' | 'roster'>('roster');
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [notice, setNotice] = useState('Roster loaded. Statistics refresh from osu! API snapshots generated during deployment.');
  const [loading, setLoading] = useState(false);

  async function reloadSnapshot() {
    setLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      const response = await fetch(`${basePath}/osu-data.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No generated snapshot available');
      const payload = (await response.json()) as DataPayload;
      if (payload.players.length) {
        setPlayers(payload.players);
        setSource(payload.source);
        setUpdatedAt(payload.updatedAt);
        setSelectedId((current) => current && payload.players.some((player) => player.id === current) ? current : null);
      }
      setNotice(payload.notice ?? 'Roster snapshot reloaded.');
    } catch {
      setNotice('Roster loaded from the site bundle. Statistics will appear after the next automated API snapshot.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void reloadSnapshot(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredPlayers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return players.filter((player) => {
      const matchesMode = player.mode === mode;
      const matchesQuery = !needle || `${player.username} ${player.major}`.toLowerCase().includes(needle);
      return matchesMode && matchesQuery;
    }).sort((left, right) => {
      if (left.hasStats !== right.hasStats) return left.hasStats ? -1 : 1;
      if (left.hasStats && right.hasStats && left.pp !== right.pp) return right.pp - left.pp;
      return left.username.localeCompare(right.username, undefined, { sensitivity: 'base' });
    });
  }, [mode, players, query]);

  const selected = selectedId ? filteredPlayers.find((player) => player.id === selectedId) : undefined;
  const selectedRank = selected ? filteredPlayers.indexOf(selected) + 1 : 0;
  const level = selected ? getLevelParts(selected.level) : { base: 0, progress: 0 };
  const uniquePlayerCount = new Set(players.map((player) => player.username.toLowerCase())).size;
  const rankedPlayers = filteredPlayers.filter((player) => player.hasStats && player.pp > 0);
  const avgPp = rankedPlayers.length ? Math.round(rankedPlayers.reduce((sum, player) => sum + player.pp, 0) / rankedPlayers.length) : null;

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />

      <header className="site-header">
        <a className="brand" href="#top" aria-label="TritonDex home">
          <span className="brand-mark"><span>TD</span></span>
          <span className="brand-type"><strong>TRITONDEX</strong><small>OSU! CAMPUS REGISTRY</small></span>
        </a>
        <div className="header-meta">
          <span className={`status-dot ${source === 'live' ? 'is-live' : ''}`} />
          <span>{source === 'live' ? 'OSU! API SNAPSHOT' : 'ROSTER LOADED'}</span><span className="header-rule" /><span>UC SAN DIEGO</span>
        </div>
      </header>

      <section className="device" id="top" aria-label="UC San Diego osu player viewer">
        <div className="device-topbar">
          <div className="lens-cluster" aria-hidden="true"><span className="main-lens" /><span className="mini-light red" /><span className="mini-light gold" /><span className="mini-light green" /></div>
          <div className="device-label"><span>TRITON RESEARCH DIVISION</span><strong>DEX // 858</strong></div>
          <div className="sound-slits" aria-hidden="true"><span /><span /><span /><span /></div>
        </div>

        <div className="device-body">
          <aside className="registry-panel">
            <div className="panel-kicker"><span>PLAYER INDEX</span><span>{String(uniquePlayerCount).padStart(2, '0')} PLAYERS</span></div>
            <div className="registry-title-row">
              <div><p>UCSD OSU! CLUB</p><h1>PLAYER<br />LIST</h1></div>
              <div className="registry-seal" aria-hidden="true"><span>UC</span></div>
            </div>
            <div className="summary-strip" aria-label="Roster summary">
              <div><strong>{filteredPlayers.length}</strong><span>RANKED</span></div><div><strong>{avgPp === null ? '—' : compactNumber.format(avgPp)}</strong><span>AVG PP</span></div><div><strong>{source === 'live' ? 'LIVE' : 'LIST'}</strong><span>DATA</span></div>
            </div>
            <label className="search-box">
              <span aria-hidden="true">⌕</span><span className="sr-only">Search players or majors</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH PLAYER OR MAJOR..." /><kbd>/</kbd>
            </label>
            <div className="mode-tabs" aria-label="Filter ranking by osu game mode">
              {(Object.keys(modeLabels) as GameMode[]).map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => { setMode(item); setSelectedId(null); }}>{modeLabels[item]}</button>)}
            </div>
            <div className="player-list" aria-label="Player profiles">
              {filteredPlayers.map((player, rankIndex) => {
                const active = player.id === selected?.id;
                return (
                  <button key={player.id} className={`player-row ${active ? 'active' : ''}`} onClick={() => setSelectedId(player.id)} aria-pressed={active}>
                    <span className="entry-number">#{String(rankIndex + 1).padStart(3, '0')}</span>
                    <span className="row-avatar">{player.avatarUrl ? <img src={player.avatarUrl} alt="" /> : getInitials(player.username)}</span>
                    <span className="row-copy"><strong>{player.username}</strong><small>{modeLabels[player.mode]}{player.major ? ` · ${player.major}` : ''}</small></span>
                    <span className="row-rank"><strong>{compactStat(player.pp, player.hasStats)}</strong><small>PP</small></span><span className="row-arrow">›</span>
                  </button>
                );
              })}
              {filteredPlayers.length === 0 && <div className="empty-state"><strong>NO MATCH FOUND</strong><span>Try another player, major, or game mode.</span></div>}
            </div>
            <div className="registry-footer"><span>API SNAPSHOT // {formatTime(updatedAt)}</span><button onClick={reloadSnapshot} disabled={loading}>{loading ? 'LOADING…' : '↻ RELOAD'}</button></div>
          </aside>

          <section className="profile-panel" aria-live="polite">
            <div className="profile-header">
              {selected
                ? <div className="profile-breadcrumb"><span>PLAYER DATA</span><i /><span>#{String(selectedRank).padStart(3, '0')}</span><i /><strong>{modeLabels[selected.mode]}</strong></div>
                : <div className="profile-breadcrumb"><span>PLAYER DATA</span><i /><strong>AWAITING SELECTION</strong></div>}
              <div className="source-chip"><span className={source === 'live' ? 'live' : ''} />{source === 'live' ? 'API SNAPSHOT' : 'ROSTER DATA'}</div>
            </div>

            {selected ? <>
            <div className="identity-grid">
              <div className="portrait-console">
                <div className="portrait-corners" aria-hidden="true"><span /><span /><span /><span /></div>
                <div className="portrait-orbit">
                  <span className="orbit-mark mark-one" /><span className="orbit-mark mark-two" /><span className="orbit-mark mark-three" />
                  <div className="portrait">{selected.avatarUrl ? <img src={selected.avatarUrl} alt={`${selected.username} osu! avatar`} /> : getInitials(selected.username)}</div>
                </div>
                <div className="portrait-readout"><span>SUBJECT LOCKED</span><strong>{selected.countryCode}</strong></div>
              </div>
              <div className="identity-copy">
                <div className="taxonomy"><span>UCSD</span><span>{modeLabels[selected.mode]}</span><span>PP RANK</span></div>
                <p className="serial">TRAINER #{String(selectedRank).padStart(3, '0')}</p><h2>{selected.username}</h2>
                {selected.major && <p className="school-line">{selected.major}</p>}
                <div className="level-row">
                  <div className="level-badge"><small>LV.</small><strong>{selected.hasStats ? level.base : '—'}</strong></div>
                  <div className="level-track-wrap"><div><span>LEVEL PROGRESS</span><strong>{selected.hasStats ? `${level.progress}%` : 'PENDING'}</strong></div><div className="level-track"><span style={{ width: selected.hasStats ? `${level.progress}%` : '0%' }} /></div></div>
                </div>
                <p className="profile-note">{notice}</p>
                <a className="primary-action" href={selected.osuUrl} target="_blank" rel="noreferrer">OPEN OSU! PROFILE <span>↗</span></a>
              </div>
            </div>

            <div className="data-section-title"><span>CORE STATISTICS</span><i /></div>
            <div className="stat-grid">
              <article className="stat-card primary-stat"><span>PERFORMANCE</span><strong>{fullStat(Math.round(selected.pp), selected.hasStats)}<small>PP</small></strong><em>{selected.hasStats && selected.globalRank ? `GLOBAL #${number.format(selected.globalRank)}` : 'RANK PENDING'}</em></article>
              <article className="stat-card"><span>ACCURACY</span><strong>{selected.hasStats ? selected.accuracy.toFixed(2) : '—'}<small>%</small></strong><div className="micro-track"><i style={{ width: selected.hasStats ? `${selected.accuracy}%` : '0%' }} /></div></article>
              <article className="stat-card"><span>PLAY COUNT</span><strong>{compactStat(selected.playCount, selected.hasStats)}</strong><em>{selected.hasStats ? `${number.format(selected.playCount)} TOTAL` : 'SYNC PENDING'}</em></article>
              <article className="stat-card"><span>MAX COMBO</span><strong>{fullStat(selected.maxCombo, selected.hasStats)}<small>×</small></strong><em>PERSONAL RECORD</em></article>
            </div>

            <div className="lower-grid">
              <div className="scores-panel">
                <div className="data-section-title"><span>TOP CAPTURES</span><i /><em>BEST 03</em></div>
                <div className="score-list">
                  {selected.topScores.slice(0, 3).map((score, index) => (
                    <article className="score-row" key={`${score.title}-${index}`}>
                      <span className={`grade grade-${score.rank.toLowerCase()}`}>{score.rank}</span>
                      <span className="score-song"><strong>{score.title}</strong><small>{score.artist} · [{score.difficulty}]</small></span>
                      <span className="mods">{score.mods.length ? score.mods.map((mod) => <i key={mod}>{mod}</i>) : <i>NM</i>}</span>
                      <span className="score-pp"><strong>{Math.round(score.pp)}</strong><small>PP</small></span>
                    </article>
                  ))}
                  {selected.topScores.length === 0 && <div className="scores-empty"><strong>API SNAPSHOT PENDING</strong><span>Top plays populate after the automated osu! data refresh runs.</span></div>}
                </div>
              </div>
              <div className="system-panel">
                <div className="data-section-title"><span>SYSTEM READOUT</span><i /></div>
                <dl>
                  <div><dt>COUNTRY RANK</dt><dd>{selected.hasStats && selected.countryRank ? `#${number.format(selected.countryRank)}` : '—'}</dd></div><div><dt>RANKED SCORE</dt><dd>{compactStat(selected.rankedScore, selected.hasStats)}</dd></div>
                  <div><dt>300 HITS</dt><dd>{compactStat(selected.hit300, selected.hasStats)}</dd></div>{selected.major && <div><dt>MAJOR</dt><dd>{selected.major}</dd></div>}
                </dl>
                <div className="waveform" aria-hidden="true">{[28,52,37,76,45,88,61,95,53,70,38,81,44,63,29,72,48,91,34,57,26,68].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
              </div>
            </div>
            </> : <div className="no-player-state">
              <div className="idle-scanner" aria-hidden="true"><span /><span /><i /></div>
              <p>PLAYER VIEWER // IDLE</p>
              <h2>Select a player</h2>
              <span>Choose a ranked entry from the leaderboard to inspect profile statistics and top plays.</span>
            </div>}
          </section>
        </div>

        <div className="device-footer"><span>TRITONDEX IS A FAN-MADE CAMPUS VIEWER</span><span>STATIC DATA SNAPSHOT // OSU! API V2</span></div>
      </section>

      <footer className="site-footer"><span>BUILT FOR THE UC SAN DIEGO OSU! COMMUNITY</span><span>ROSTER MAINTAINED BY THE COMMUNITY · PUBLISH WITH PLAYER CONSENT</span></footer>
    </main>
  );
}
