import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const rosterPath = join(projectRoot, 'data', 'roster.json');
const outputPath = join(projectRoot, 'public', 'osu-data.json');
const roster = JSON.parse(await readFile(rosterPath, 'utf8'));
const allModes = ['osu', 'mania', 'taiko', 'fruits'];

function placeholder(entry, index, requestedMode) {
  const mode = requestedMode ?? entry.modes?.[0] ?? entry.mode ?? 'osu';
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

async function writeSnapshot(players, source, notice) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ players, source, updatedAt: new Date().toISOString(), notice }, null, 2)}\n`, 'utf8');
}

async function getToken(clientId, clientSecret) {
  const response = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: Number(clientId), client_secret: clientSecret, grant_type: 'client_credentials', scope: 'public' }),
  });
  if (!response.ok) throw new Error(`OAuth request returned ${response.status}`);
  const payload = await response.json();
  return payload.access_token;
}

function modsFrom(score) {
  if (!Array.isArray(score.mods)) return [];
  return score.mods.map((mod) => typeof mod === 'string' ? mod : mod?.acronym).filter(Boolean);
}

async function fetchMode(entry, token, mode) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const key = /^\d+$/.test(entry.username) ? 'id' : 'username';
  const userResponse = await fetch(`https://osu.ppy.sh/api/v2/users/${encodeURIComponent(entry.username)}/${mode}?key=${key}`, { headers });
  if (!userResponse.ok) throw new Error(`profile returned ${userResponse.status}`);
  const user = await userResponse.json();
  const stats = user.statistics ?? {};
  if (!user.statistics || Number(stats.play_count ?? 0) <= 0) return null;
  const scoreResponse = await fetch(`https://osu.ppy.sh/api/v2/users/${user.id}/scores/best?mode=${mode}&limit=3&include_fails=0`, { headers });
  const scores = scoreResponse.ok ? await scoreResponse.json() : [];

  return {
    id: `${user.id}-${mode}`,
    username: user.username,
    major: entry.major,
    countryCode: user.country_code ?? '—',
    globalRank: stats.global_rank ?? 0,
    countryRank: stats.country_rank ?? 0,
    pp: stats.pp ?? 0,
    accuracy: stats.hit_accuracy ?? 0,
    playCount: stats.play_count ?? 0,
    level: Number(stats.level?.current ?? 0) + Number(stats.level?.progress ?? 0) / 100,
    maxCombo: stats.maximum_combo ?? 0,
    rankedScore: stats.ranked_score ?? 0,
    hit300: stats.count_300 ?? 0,
    hasStats: true,
    avatarUrl: user.avatar_url,
    osuUrl: `https://osu.ppy.sh/users/${user.id}/${mode}`,
    mode,
    topScores: scores.slice(0, 3).map((score) => ({
      title: score.beatmapset?.title ?? 'Unknown beatmap',
      artist: score.beatmapset?.artist ?? 'Unknown artist',
      difficulty: score.beatmap?.version ?? 'Unknown difficulty',
      accuracy: Number(score.accuracy ?? 0) * 100,
      pp: score.pp ?? 0,
      rank: score.rank ?? '—',
      mods: modsFrom(score),
    })),
  };
}

async function fetchPlayerModes(entry, token) {
  const configuredModes = Array.isArray(entry.modes) ? entry.modes.filter((mode) => allModes.includes(mode)) : [];
  const modes = configuredModes.length ? configuredModes : (allModes.includes(entry.mode) ? [entry.mode] : allModes);
  const results = [];
  for (const mode of modes) {
    try {
      const playerMode = await fetchMode(entry, token, mode);
      if (playerMode) results.push(playerMode);
    } catch (error) {
      console.warn(`Could not sync ${entry.username} (${mode}): ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  return results;
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const clientId = process.env.OSU_CLIENT_ID;
const clientSecret = process.env.OSU_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  await writeSnapshot(roster.map((entry, index) => placeholder(entry, index)), 'roster', 'Roster loaded. Add OSU_CLIENT_ID and OSU_CLIENT_SECRET as repository secrets to generate live statistics.');
  console.log(`Wrote roster-only snapshot for ${roster.length} players.`);
} else {
  try {
    const token = await getToken(clientId, clientSecret);
    const playerGroups = await mapWithLimit(roster, 3, async (entry, index) => {
      const modeEntries = await fetchPlayerModes(entry, token);
      return modeEntries.length ? modeEntries : [placeholder(entry, index)];
    });
    const players = playerGroups.flat();
    const liveEntries = players.filter((player) => player.hasStats);
    const syncedPlayers = new Set(liveEntries.map((player) => player.username.toLowerCase())).size;
    const source = liveEntries.length > 0 ? 'live' : 'roster';
    await writeSnapshot(players, source, `${syncedPlayers}/${roster.length} players synced across ${liveEntries.length} active game-mode rankings.`);
    console.log(`Wrote osu! snapshot with ${syncedPlayers}/${roster.length} players across ${liveEntries.length} active mode rankings.`);
  } catch (error) {
    console.warn(`osu! sync unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
    await writeSnapshot(roster.map((entry, index) => placeholder(entry, index)), 'roster', 'Roster loaded. The latest automated osu! API refresh was unavailable.');
  }
}
