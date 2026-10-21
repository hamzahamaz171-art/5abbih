import { supabase } from "../lib/supabase";
import { ZONE_CONFIG, emptyDashboard } from "../utils/dashboard";

async function safeQuery(queryFn, fallback = null) {
  try {
    const result = await queryFn();

    if (result.error) {
      console.warn("Supabase query warning:", result.error.message);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (err) {
    console.warn("Supabase query error:", err);
    return fallback;
  }
}

/**
 * Requête avec retour brut pour le diagnostic.
 * Les logs sont temporaires et permettent de vérifier les UUID utilisés.
 */
async function tracedQuery(label, queryFn) {
  try {
    const result = await queryFn();

    const trace = {
      label,
      data: result.data ?? null,
      error: result.error
        ? {
            message: result.error.message,
            code: result.error.code,
            details: result.error.details,
          }
        : null,
      count: Array.isArray(result.data)
        ? result.data.length
        : result.data
          ? 1
          : 0,
    };

    console.log(`[Dashboard][${label}]`, trace);

    return trace;
  } catch (err) {
    const trace = {
      label,
      data: null,
      error: {
        message: err.message,
      },
      count: 0,
    };

    console.error(`[Dashboard][${label}]`, trace);

    return trace;
  }
}

function groupSpeedOverTime(rows) {
  const buckets = new Map();

  for (const row of rows) {
    if (row.speed == null) {
      continue;
    }

    const key = new Date(row.timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }

    buckets.get(key).push(row.speed);
  }

  return Array.from(buckets.entries()).map(([time, speeds]) => ({
    time,
    speed: Number(
      (
        speeds.reduce((total, speed) => total + speed, 0) / speeds.length
      ).toFixed(1),
    ),
  }));
}

function latestPerPlayer(rows, keyFn = (row) => row.player_id) {
  const map = new Map();

  for (const row of rows) {
    const key = keyFn(row);

    if (!map.has(key)) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

function distanceByPlayerFromTracking(rows) {
  const totals = {};

  for (const row of rows) {
    if (!row.player_id || row.distance == null) {
      continue;
    }

    totals[row.player_id] = Math.max(
      totals[row.player_id] ?? 0,
      row.distance,
    );
  }

  return totals;
}

function buildSpeedZonesFromStats(stats) {
  if (!stats?.length) {
    return [];
  }

  return [...stats]
    .sort((a, b) => a.zone - b.zone)
    .map((stat) => ({
      name: ZONE_CONFIG[stat.zone]?.name ?? `Zone ${stat.zone}`,
      value: Math.round(stat.percentage ?? 0),
      color: ZONE_CONFIG[stat.zone]?.color ?? "#64748b",
    }))
    .filter((zone) => zone.value > 0);
}

function buildSpeedZonesFromTracking(rows) {
  const counts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const row of rows) {
    if (row.speed_zone >= 1 && row.speed_zone <= 5) {
      counts[row.speed_zone] += 1;
    }
  }

  const total = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );

  if (total === 0) {
    return [];
  }

  return Object.entries(counts).map(([zone, count]) => ({
    name: ZONE_CONFIG[zone]?.name ?? `Zone ${zone}`,
    value: Math.round((count / total) * 100),
    color: ZONE_CONFIG[zone]?.color ?? "#64748b",
  }));
}

function mapEventType(type) {
  const labels = {
    speed: "High Speed",
    acceleration: "High Acceleration",
    deceleration: "High Deceleration",
    battery: "Low Battery",
    sprint: "Sprint",
    jump: "Jump",
    symmetry: "Symmetry Alert",
    distance: "Distance",
    other: "Event",
  };

  return labels[type] ?? type;
}

async function fetchTeamById(teamId) {
  const trace = await tracedQuery("teams.by_id", () =>
    supabase
      .from("teams")
      .select("id, name")
      .eq("id", teamId)
      .maybeSingle(),
  );

  return {
    team: trace.data ?? null,
    trace,
  };
}

async function fetchTeamsByCoachId(coachId) {
  return tracedQuery("teams.by_coach_id", () =>
    supabase
      .from("teams")
      .select("id, name")
      .eq("coach_id", coachId)
      .order("name", { ascending: true }),

  );
}

async function countTrackingForSession(sessionId, playerIds) {
  if (!sessionId || !playerIds.length) {
    return 0;
  }

  const { count, error } = await supabase
    .from("live_tracking")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("session_id", sessionId)
    .in("player_id", playerIds);

  if (error) {
    console.warn("[Dashboard] countTrackingForSession:", error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Cherche une session contenant des données pour le ou les joueurs
 * actuellement sélectionnés.
 */
async function resolveSessionForDashboard(teamId, playerIds) {
  const sessions = await safeQuery(
    () =>
      supabase
        .from("training_sessions")
        .select("*")
        .eq("team_id", teamId)
        .order("date", {
          ascending: false,
        })
        .limit(10),
    [],
  );

  if (!playerIds.length) {
    return {
      session: sessions[0] ?? null,
      sessionId: sessions[0]?.id ?? null,
      source: "latest_session_no_players",
    };
  }

  for (const candidate of sessions) {
    const rowCount = await countTrackingForSession(candidate.id, playerIds);

    if (rowCount > 0) {
      return {
        session: candidate,
        sessionId: candidate.id,
        source: "session_with_tracking",
        trackingRows: rowCount,
      };
    }
  }

  const latestTrackingTrace = await tracedQuery(
    "live_tracking.latest_session_hint",
    () =>
      supabase
        .from("live_tracking")
        .select("session_id")
        .in("player_id", playerIds)
        .not("session_id", "is", null)
        .order("timestamp", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),
  );

  const inferredSessionId = latestTrackingTrace.data?.session_id ?? null;

  if (inferredSessionId) {
    const session = await safeQuery(
      () =>
        supabase
          .from("training_sessions")
          .select("*")
          .eq("id", inferredSessionId)
          .maybeSingle(),
      null,
    );

    return {
      session,
      sessionId: inferredSessionId,
      source: "tracking_inferred_session",
    };
  }

  const anyTrackingTrace = await tracedQuery(
    "live_tracking.any_for_players",
    () =>
      supabase
        .from("live_tracking")
        .select("id")
        .in("player_id", playerIds)
        .limit(1),
  );

  if (anyTrackingTrace.count > 0) {
    return {
      session: sessions[0] ?? null,
      sessionId: null,
      source: "no_session_filter",
      note: "Données live_tracking sans session_id correspondante",
    };
  }

  return {
    session: sessions[0] ?? null,
    sessionId: sessions[0]?.id ?? null,
    source: "latest_session_empty",
  };
}

async function fetchScopedRows(
  table,
  {
    playerIds,
    sessionId,
    orderBy,
    ascending = true,
    limit,
  },
) {
  const buildQuery = (requestedSessionId) => {
    let query = supabase.from(table).select("*");

    if (requestedSessionId) {
      query = query.eq("session_id", requestedSessionId);
    }

    if (playerIds.length) {
      query = query.in("player_id", playerIds);
    }

    if (orderBy) {
      query = query.order(orderBy, {
        ascending,
      });
    }

    if (limit) {
      query = query.limit(limit);
    }

    return query;
  };

  const primaryLabel = `${table}${
    sessionId
      ? `.session_${sessionId.slice(0, 8)}`
      : ".all"
  }`;

  const primaryTrace = await tracedQuery(
    primaryLabel,
    () => buildQuery(sessionId),
  );

  let rows = primaryTrace.data ?? [];
  let usedSessionFallback = false;

  /*
   * Si la session ne contient aucune donnée pour le joueur,
   * on cherche les lignes du même joueur sans imposer session_id.
   *
   * Le filtre player_id reste toujours actif.
   */
  if (
    rows.length === 0 &&
    sessionId &&
    playerIds.length
  ) {
    const fallbackTrace = await tracedQuery(
      `${table}.no_session_fallback`,
      () => buildQuery(null),
    );

    rows = fallbackTrace.data ?? [];
    usedSessionFallback = rows.length > 0;

    if (usedSessionFallback) {
      return {
        rows,
        trace: fallbackTrace,
        sessionIdUsed: null,
        usedSessionFallback: true,
      };
    }
  }

  return {
    rows,
    trace: primaryTrace,
    sessionIdUsed: sessionId,
    usedSessionFallback,
  };
}

export async function fetchDashboardData(
  user,
  selectedPlayerId = null,
) {
  const teamDebug = {
    userId: user?.id ?? null,
    role: user?.role ?? null,
    selectedPlayerId: selectedPlayerId ?? null,
    teamsQuery: null,
    fallback: null,
    finalTeamId: null,
    playersQuery: null,
  };

  if (!supabase || !user?.id) {
    console.warn("[Dashboard] fetchDashboardData aborted:", {
      hasSupabase: Boolean(supabase),
      userId: user?.id,
    });

    return {
      ...emptyDashboard(),
      _teamDebug: teamDebug,
    };
  }

  console.group("[Dashboard] Team resolution trace");

  console.log("user.id:", user.id);
  console.log("user.role:", user.role);
  console.log("selectedPlayerId:", selectedPlayerId);

  let team = null;
  let teamId = null;
  let coachTeamIds = [];

  if (user.role === "Coach") {
    /*
     * 1. Priorité à l'équipe du joueur sélectionné.
     */
    if (selectedPlayerId) {
      let selectedPlayerTrace = await tracedQuery(
        "players.by_selected_player_id",
        () =>
          supabase
            .from("players")
            .select("id, user_id, team_id, status")
            .eq("id", selectedPlayerId)
            .eq("status", "active")
            .maybeSingle(),
      );

      /*
       * Compatibilité temporaire avec l'ancien comportement
       * où selectedPlayerId contenait profiles.id/user_id.
       */
      if (
        !selectedPlayerTrace.data &&
        !selectedPlayerTrace.error
      ) {
        selectedPlayerTrace = await tracedQuery(
          "players.by_selected_profile_id_legacy",
          () =>
            supabase
              .from("players")
              .select("id, user_id, team_id, status")
              .eq("user_id", selectedPlayerId)
              .eq("status", "active")
              .maybeSingle(),
        );
      }

      const selectedTeamId =
        selectedPlayerTrace.data?.team_id ?? null;

      teamDebug.selectedPlayerTeam = {
        selectedPlayerId,
        player: selectedPlayerTrace.data,
        error: selectedPlayerTrace.error,
        teamId: selectedTeamId,
      };

      console.log(
        "[Dashboard] selected player team lookup:",
        teamDebug.selectedPlayerTeam,
      );

      if (selectedTeamId) {
        const selectedTeamResult =
          await fetchTeamById(selectedTeamId);

        team = selectedTeamResult.team;
        teamId = selectedTeamId;
      }
    }

    /*
     * 2. Charger toutes les équipes du coach.
     */
    const teamsTrace = await fetchTeamsByCoachId(user.id);

    const coachIdColumnMissing =
      teamsTrace.error?.code === "42703";

    teamDebug.teamsQuery = {
      filter: coachIdColumnMissing
        ? null
        : {
            coach_id: user.id,
          },
      rows: teamsTrace.data,
      error: teamsTrace.error,
      count: teamsTrace.count,
      note: coachIdColumnMissing
        ? "Colonne teams.coach_id absente — exécute supabase/migrate-coach-id.sql"
        : null,
    };

    coachTeamIds =
      (teamsTrace.data ?? []).map(
        (coachTeam) => coachTeam.id,
      );

    /*
     * Ne pas écraser l'équipe du joueur sélectionné.
     */
    if (
      !teamId &&
      !teamsTrace.error &&
      teamsTrace.data?.length
    ) {
      team = teamsTrace.data[0];
      teamId = team.id;
    }

    console.log(
      "teams query result:",
      teamsTrace.data,
    );

    console.log(
      "team after primary lookup:",
      team,
    );

    /*
     * Fallback général seulement quand aucun joueur
     * n'est sélectionné.
     */
    if (
      !teamId &&
      !selectedPlayerId
    ) {
      let inferredTeamId = null;

      const fallbackTrace = {
        anyPlayer: null,
        inferredTeam: null,
      };

      const anyPlayerTrace = await tracedQuery(
        "players.any_active",
        () =>
          supabase
            .from("players")
            .select("team_id, status")
            .eq("status", "active")
            .limit(1)
            .maybeSingle(),
      );

      fallbackTrace.anyPlayer = {
        data: anyPlayerTrace.data,
        error: anyPlayerTrace.error,
      };

      inferredTeamId =
        anyPlayerTrace.data?.team_id ?? null;

      if (inferredTeamId) {
        const {
          team: inferredTeam,
          trace: inferredTeamTrace,
        } = await fetchTeamById(inferredTeamId);

        fallbackTrace.inferredTeam = {
          data: inferredTeam,
          error: inferredTeamTrace.error,
        };

        team = inferredTeam;
        teamId = inferredTeamId;
      }

      teamDebug.fallback = {
        inferredTeamId,
        ...fallbackTrace,
      };

      console.log(
        "fallback trace:",
        teamDebug.fallback,
      );
    }
  } else if (user.role === "Player") {
    const playerTeam = await safeQuery(
      () =>
        supabase
          .from("players")
          .select("team_id, teams(id, name)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(),
      null,
    );

    team = playerTeam?.teams ?? null;

    teamId =
      playerTeam?.team_id ??
      playerTeam?.teams?.id ??
      null;

    teamDebug.teamsQuery = {
      filter: {
        user_id: user.id,
      },
      rows: playerTeam,
      error: null,
    };
  } else {
    console.warn(
      "[Dashboard] Unhandled role — coach/player branch skipped:",
      user.role,
    );

    teamDebug.teamsQuery = {
      filter: null,
      rows: null,
      error: {
        message: `Rôle non géré: ${user.role}`,
      },
    };
  }

  if (teamId && !team) {
    const {
      team: resolvedTeam,
      trace,
    } = await fetchTeamById(teamId);

    team = resolvedTeam;

    teamDebug.teamResolvedById = {
      data: resolvedTeam,
      error: trace.error,
    };
  }

  teamDebug.finalTeamId = teamId;

  console.log(
    "final team_id before players load:",
    teamId,
  );

  console.log(
    "final team object:",
    team,
  );

  console.groupEnd();

  let players = [];

  if (teamId) {
    const playersTrace = await tracedQuery(
      "players.by_team_id",
      () =>
        supabase
          .from("players")
          .select("*")
          .eq("team_id", teamId)
          .eq("status", "active")
          .order("number"),
    );

    teamDebug.playersQuery = {
      filter: {
        team_id: teamId,
        status: "active",
      },
      rows: playersTrace.data,
      error: playersTrace.error,
      count: playersTrace.count,
    };

    players = playersTrace.data ?? [];

    console.log(
      "[Dashboard] players loaded:",
      players.length,
      playersTrace.data,
    );
  } else if (user.role === "Player") {
    players = await safeQuery(
      () =>
        supabase
          .from("players")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("number"),
      [],
    );
  }

  if (!players.length) {
    return {
      ...emptyDashboard(),
      team,
      _teamDebug: teamDebug,
    };
  }

  /*
   * Joueurs utilisés dans le classement global.
   */
  let rankingPlayers = players;

  if (
    user.role === "Coach" &&
    coachTeamIds.length > 0
  ) {
    const rankingPlayersTrace = await tracedQuery(
      "players.for_coach_distance_ranking",
      () =>
        supabase
          .from("players")
          .select("*")
          .in("team_id", coachTeamIds)
          .eq("status", "active")
          .order("number"),
    );

    if (rankingPlayersTrace.data?.length) {
      rankingPlayers = rankingPlayersTrace.data;
    }

    teamDebug.rankingPlayersQuery = {
      teamIds: coachTeamIds,
      rows: rankingPlayersTrace.data,
      error: rankingPlayersTrace.error,
      count: rankingPlayersTrace.count,
    };
  }

  /*
   * selectedPlayerId doit correspondre à players.id.
   */
  const selectedPlayer = selectedPlayerId
    ? players.find(
        (player) =>
          player.id === selectedPlayerId ||
          player.user_id === selectedPlayerId,
      )
    : null;

  if (
    selectedPlayerId &&
    !selectedPlayer
  ) {
    console.error(
      "[Dashboard] Joueur sélectionné introuvable dans équipe",
      {
        selectedPlayerId,
        teamId,
        players: players.map((player) => ({
          id: player.id,
          user_id: player.user_id,
          team_id: player.team_id,
          name: player.name,
        })),
      },
    );

    return {
      ...emptyDashboard(),
      team,
      selectedPlayer: null,
      _teamDebug: {
        ...teamDebug,
        selectedPlayerError: {
          selectedPlayerId,
          teamId,
          message:
            "Le joueur sélectionné n'a pas été trouvé dans l'équipe chargée.",
        },
      },
    };
  }

  const scopedPlayers = selectedPlayer
    ? [selectedPlayer]
    : players;

  const playerIds =
    scopedPlayers.map(
      (player) => player.id,
    );

  const rankingPlayerIds =
    rankingPlayers.map(
      (player) => player.id,
    );

  const playerMap = Object.fromEntries(
    [...rankingPlayers, ...players].map(
      (player) => [
        player.id,
        player,
      ],
    ),
  );

  const sessionResolution = teamId
    ? await resolveSessionForDashboard(
        teamId,
        playerIds,
      )
    : {
        session: null,
        sessionId: null,
        source: "no_team",
      };

  const session = sessionResolution.session;

  let sessionId =
    sessionResolution.sessionId;

  console.group(
    "[Dashboard] Live tracking trace",
  );

  console.log(
    "playerIds (players.id):",
    playerIds,
  );

  console.log(
    "session resolution:",
    sessionResolution,
  );

  const trackingDebug = {
    playerIds,
    scopedPlayerCount: scopedPlayers.length,
    selectedPlayerMatch: selectedPlayer
      ? {
          playersId: selectedPlayer.id,
          userId: selectedPlayer.user_id,
          name: selectedPlayer.name,
        }
      : null,
    sessionResolution,
    queries: {},
  };

  let tracking = [];
  let sprints = [];
  let loads = [];
  let alerts = [];
  let zoneStats = [];
  let heatmapCells = [];

  const trackingResult =
    await fetchScopedRows(
      "live_tracking",
      {
        playerIds,
        sessionId,
        orderBy: "timestamp",
        ascending: true,
      },
    );

  tracking = trackingResult.rows;

  trackingDebug.queries.live_tracking = {
    sessionIdRequested: sessionId,
    sessionIdUsed:
      trackingResult.sessionIdUsed,
    usedSessionFallback:
      trackingResult.usedSessionFallback,
    rowCount: tracking.length,
    error: trackingResult.trace.error,
    sample: tracking[0] ?? null,
  };

  if (
    trackingResult.usedSessionFallback
  ) {
    sessionId = null;
  }

  /*
   * Chargement séparé pour le classement.
   *
   * Aucun filtre session_id afin de pouvoir classer
   * les joueurs même s'ils ont des sessions différentes.
   */
  const rankingTrackingResult =
    await fetchScopedRows(
      "live_tracking",
      {
        playerIds: rankingPlayerIds,
        sessionId: null,
        orderBy: "timestamp",
        ascending: true,
      },
    );

  const rankingTracking =
    rankingTrackingResult.rows;

  trackingDebug.queries.distance_ranking = {
    playerIds: rankingPlayerIds,
    rowCount: rankingTracking.length,
    error:
      rankingTrackingResult.trace.error,
  };

  const sprintsResult =
    await fetchScopedRows(
      "sprints",
      {
        playerIds,
        sessionId,
        orderBy: "timestamp",
        ascending: false,
        limit: 20,
      },
    );

  sprints = sprintsResult.rows;

  trackingDebug.queries.sprints = {
    rowCount: sprints.length,
    error: sprintsResult.trace.error,
  };

  const loadsResult =
    await fetchScopedRows(
      "player_loads",
      {
        playerIds,
        sessionId,
        orderBy: "timestamp",
        ascending: false,
      },
    );

  loads = loadsResult.rows;

  trackingDebug.queries.player_loads = {
    rowCount: loads.length,
    error: loadsResult.trace.error,
  };

  const alertsResult =
    await fetchScopedRows(
      "alerts",
      {
        playerIds,
        sessionId,
        orderBy: "created_at",
        ascending: false,
        limit: 20,
      },
    );

  alerts = alertsResult.rows;

  trackingDebug.queries.alerts = {
    rowCount: alerts.length,
    error: alertsResult.trace.error,
  };

  const zoneStatsResult =
    await fetchScopedRows(
      "speed_zone_stats",
      {
        playerIds,
        sessionId,
      },
    );

  zoneStats = zoneStatsResult.rows;

  trackingDebug.queries.speed_zone_stats = {
    rowCount: zoneStats.length,
    error: zoneStatsResult.trace.error,
  };

  const heatmapResult =
    await fetchScopedRows(
      "heatmap_cells",
      {
        playerIds,
        sessionId,
      },
    );

  heatmapCells = heatmapResult.rows;

  trackingDebug.queries.heatmap_cells = {
    rowCount: heatmapCells.length,
    error: heatmapResult.trace.error,
  };

  console.log(
    "tracking rows loaded:",
    tracking.length,
  );

  if (
    tracking.length === 0 &&
    playerIds.length
  ) {
    const diagnosticTrace =
      await tracedQuery(
        "live_tracking.diagnostic_sample",
        () =>
          supabase
            .from("live_tracking")
            .select(
              "id, player_id, session_id, speed, distance, latitude, longitude, timestamp",
            )
            .order("timestamp", {
              ascending: false,
            })
            .limit(5),
      );

    trackingDebug.diagnosticSample = {
      rows: diagnosticTrace.data,
      error: diagnosticTrace.error,
      hint:
        "Compare player_id ici avec players.id attendus ci-dessus",
    };
  }

  console.log(
    "tracking debug:",
    trackingDebug,
  );

  console.groupEnd();

  const gateways = await safeQuery(
    () =>
      supabase
        .from("gateways")
        .select("id, status")
        .eq("team_id", teamId),
    [],
  );

  const sensors = playerIds.length
    ? await safeQuery(
        () =>
          supabase
            .from("sensor_metadata")
            .select("*")
            .in("player_id", playerIds),
        [],
      )
    : [];

  let unreadAlerts = 0;

  if (playerIds.length) {
    const {
      count,
      error,
    } = await supabase
      .from("alerts")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("is_read", false)
      .in("player_id", playerIds);

    if (!error) {
      unreadAlerts = count ?? 0;
    }
  }

  // KPIs
  const speeds = tracking
    .filter(
      (row) => row.speed != null,
    )
    .map(
      (row) => row.speed,
    );

  const avgSpeed = speeds.length
    ? speeds.reduce(
        (sum, speed) =>
          sum + speed,
        0,
      ) / speeds.length
    : 0;

  const distanceByPlayer =
    distanceByPlayerFromTracking(
      tracking,
    );

  const totalDistanceM =
    Object.values(
      distanceByPlayer,
    ).reduce(
      (sum, distance) =>
        sum + distance,
      0,
    );

  const latestLoads =
    latestPerPlayer(loads);

  const playerLoad = latestLoads.length
    ? latestLoads.reduce(
        (sum, load) =>
          sum +
          (load.player_load ?? 0),
        0,
      ) / latestLoads.length
    : 0;

  const latestBatteries =
    latestPerPlayer(
      [...tracking].sort(
        (a, b) =>
          new Date(b.timestamp) -
          new Date(a.timestamp),
      ),
      (row) => row.player_id,
    ).filter(
      (row) =>
        row.battery != null,
    );

  const avgBattery =
    latestBatteries.length
      ? latestBatteries.reduce(
          (sum, row) =>
            sum + row.battery,
          0,
        ) /
        latestBatteries.length
      : 0;

  const twoMinAgo =
    Date.now() -
    2 * 60 * 1000;

  const connectedIds = new Set(
    tracking
      .filter(
        (row) =>
          new Date(
            row.timestamp,
          ).getTime() >
          twoMinAgo,
      )
      .map(
        (row) => row.player_id,
      ),
  );

  // Classement global par distance.
  const rankingDistanceByPlayer =
    distanceByPlayerFromTracking(
      rankingTracking,
    );

  const rankedPlayers =
    rankingPlayers
      .map((player) => ({
        player,
        distanceM:
          rankingDistanceByPlayer[player.id] ??
          0,
      }))
      .sort(
        (first, second) =>
          second.distanceM -
          first.distanceM,
      );

  const maxRankingDistance =
    Math.max(
      ...rankedPlayers.map(
        (item) => item.distanceM,
      ),
      1,
    );

  const topPlayers =
    rankedPlayers
      .slice(0, 5)
      .map(
        (
          {
            player,
            distanceM,
          },
          index,
        ) => ({
          playerId: player.id,
          rank: index + 1,
          name:
            player.name ?? "Joueur",
          number: player.number
            ? `#${player.number}`
            : "—",
          distanceM,
          percent: Math.round(
            (
              distanceM /
              maxRankingDistance
            ) *
            100,
          ),
          photoUrl:
            player.photo_url,
          isSelected:
            player.id ===
            selectedPlayer?.id,
        }),
      );

  // Positions live
  const latestTracking =
    latestPerPlayer(
      [...tracking].sort(
        (a, b) =>
          new Date(b.timestamp) -
          new Date(a.timestamp),
      ),
    );

  const livePositions =
    latestTracking
      .filter(
        (row) =>
          row.latitude != null &&
          row.longitude != null,
      )
      .map((row) => {
        const player =
          playerMap[row.player_id];

        return {
          playerId: row.player_id,
          number: player?.number,
          name: player?.name,
          latitude: row.latitude,
          longitude: row.longitude,
        };
      });

  // Événements
  const sprintEvents =
    (sprints ?? []).map(
      (sprint) => ({
        time: sprint.timestamp,
        type: "sprint",
        label: "Sprint",
        player:
          playerMap[
            sprint.player_id
          ],
        value:
          sprint.speed != null
            ? `${Number(
                sprint.speed,
              ).toFixed(1)} km/h`
            : "—",
      }),
    );

  const alertEvents =
    (alerts ?? []).map(
      (alert) => ({
        time: alert.created_at,
        type: alert.type,
        label: mapEventType(
          alert.type,
        ),
        player:
          playerMap[
            alert.player_id
          ],
        value:
          alert.message?.slice(
            0,
            20,
          ) ?? "—",
      }),
    );

  const events = [
    ...sprintEvents,
    ...alertEvents,
  ]
    .sort(
      (a, b) =>
        new Date(b.time) -
        new Date(a.time),
    )
    .slice(0, 8);

  // Capteurs
  const sensorMap =
    Object.fromEntries(
      (sensors ?? []).map(
        (sensor) => [
          sensor.player_id,
          sensor,
        ],
      ),
    );

  const devices =
    scopedPlayers
      .filter(
        (player) =>
          player.esp_id,
      )
      .map((player) => {
        const latest =
          latestTracking.find(
            (row) =>
              row.player_id ===
              player.id,
          );

        const sensor =
          sensorMap[player.id];

        return {
          playerId: player.id,
          label: player.number
            ? `#${player.number}`
            : player.name,
          battery:
            latest?.battery ??
            sensor?.battery_health_percentage ??
            null,
          temperature:
            latest?.temperature ??
            sensor?.temperature ??
            null,
          espId: player.esp_id,
        };
      });

  const speedZones =
    zoneStats?.length
      ? buildSpeedZonesFromStats(
          zoneStats,
        )
      : buildSpeedZonesFromTracking(
          tracking,
        );

  return {
    team,
    session,
    players: scopedPlayers,
    selectedPlayer,

    kpis: {
      totalPlayers:
        scopedPlayers.length,
      connectedPlayers:
        connectedIds.size,
      avgSpeed,
      totalDistanceM,
      playerLoad,
      sprintCount:
        sprints?.length ?? 0,
      avgBattery,
    },

    sidebar: {
      playerTags:
        players.filter(
          (player) =>
            player.esp_id,
        ).length,
      gateways:
        gateways?.filter(
          (gateway) =>
            gateway.status ===
            "online",
        ).length ??
        gateways?.length ??
        0,
    },

    topPlayers,

    speedOverTime:
      groupSpeedOverTime(
        tracking,
      ),

    livePositions,

    heatmapCells:
      heatmapCells ?? [],

    speedZones,

    events,

    devices,

    unreadAlerts,

    _teamDebug: teamDebug,

    _trackingDebug:
      trackingDebug,
  };
}

export const REALTIME_TABLES = [
  "live_tracking",
  "alerts",
  "sprints",
  "player_loads",
  "players",
  "speed_zone_stats",
  "heatmap_cells",
  "gateways",
];