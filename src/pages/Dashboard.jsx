import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, BarChart2, FileText, Bell, Settings,
  Sun, Calendar, Zap, MapPin, Battery, ChevronDown, Radio, Plus, Menu, Shield,
  Footprints, LogOut, RefreshCw, Wifi, Signal, Trophy, CircleDot
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSelectedPlayer } from '../context/SelectedPlayerContext';
import { useTheme } from '../context/ThemeContext';
import { useDashboard, useLiveClock } from '../hooks/useDashboard';
import { formatDistance, formatSpeed, formatTime, formatDateTime, gpsToPitch, computeBounds } from '../utils/dashboard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { selectedPlayerId, setSelectedPlayerId } = useSelectedPlayer();
  const { isLight, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const isCoach = user?.role === 'Coach';
  const { data, loading, error, refresh } = useDashboard(isCoach ? user : null, selectedPlayerId);
  const now = useLiveClock();
  const { date, time } = formatDateTime(now);

  const chartTheme = useMemo(() => {
    if (!isLight) {
      return {
        gridStroke: 'rgba(74, 222, 128, 0.12)',
        axisStroke: '#64748b',
        tooltipBg: '#0b1510',
        tooltipBorder: '1px solid rgba(74, 222, 128, 0.18)',
        tooltipText: '#e2e8f0',
      };
    }

    return {
      gridStroke: '#e2e8f0',
      axisStroke: '#64748b',
      tooltipBg: '#f8fafc',
      tooltipBorder: '1px solid #e2e8f0',
      tooltipText: '#0f172a',
    };
  }, [isLight]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleRankingPlayerClick(playerId) {
    if (!playerId || playerId === selectedPlayerId) return;

    setSelectedPlayerId(playerId);
    navigate('/dashboard');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CO';

  const {
    kpis, sidebar, topPlayers, speedOverTime, livePositions, heatmapCells, speedZones,
    events, devices, unreadAlerts, team, session, selectedPlayer, _teamDebug, _trackingDebug,
  } = data;
  const pitchBounds = computeBounds(livePositions);
  const hasTeam = Boolean(team);
  const showTeamSetupWarning = isCoach && !hasTeam;

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#050a07] text-slate-200'}`}>

      <aside className="relative z-30 w-64 shrink-0 overflow-hidden border-r border-emerald-500/10 bg-[#07100b]/95 shadow-[20px_0_70px_rgba(0,0,0,0.32)] backdrop-blur-xl flex flex-col justify-between">
        <div className="pointer-events-none absolute -left-20 top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div>
          <div className="relative p-5 flex items-center justify-between border-b border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/20 to-emerald-950/40 shadow-[0_0_28px_rgba(34,197,94,0.12)]">
                <Shield className="w-5 h-5 text-emerald-300" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#07100b] bg-emerald-400" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-[0.16em] leading-tight text-white">LIVE SPORT</h1>
                <p className="mt-1 text-[9px] font-semibold text-emerald-400/70 tracking-[0.28em]">PERFORMANCE</p>
              </div>
            </div>
            <button className="rounded-xl border border-transparent p-2 text-slate-500 transition hover:border-emerald-500/15 hover:bg-emerald-500/5 hover:text-emerald-300">
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <nav className="mt-6 px-4 space-y-1.5">
            <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
            <NavItem to="/players" icon={<Users />} label="Players" />
            <NavItem icon={<MapPin />} label="Live Tracking" />
            <NavItem icon={<BarChart2 />} label="Analytics" />
            <NavItem
    to="/reports"
    icon={<FileText />}
    label="Reports"
/>
            <NavItem icon={<Bell />} label="Alerts" />
            <NavItem
  to="/settings"
  icon={<Settings />}
  label="Settings"
/>
          </nav>
        </div>

        <div className="p-4">
          <div className="mb-5 rounded-2xl border border-emerald-500/10 bg-white/[0.018] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Connected Devices</p>
              <Signal className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full border-2 ${sidebar.playerTags > 0 ? 'border-green-500 bg-green-500' : 'border-slate-500'}`}></span>
                <span>Player Tags</span>
              </div>
              <span className="font-bold">{sidebar.playerTags}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full border-2 ${sidebar.gateways > 0 ? 'border-green-500 bg-green-500' : 'border-slate-500'}`}></span>
                <span>Gateways</span>
              </div>
              <span className="font-bold">{sidebar.gateways}</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-full flex items-center justify-between rounded-2xl border border-emerald-500/10 bg-black/20 p-3 transition-all hover:border-emerald-400/25 hover:bg-emerald-500/[0.035]"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500 to-green-800 text-xs font-black text-white shadow-[0_0_18px_rgba(34,197,94,0.18)]">
                  {initials}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-slate-400">{user?.role}</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-dark-card border border-dark-border rounded-xl overflow-hidden shadow-xl z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_15%_0%,rgba(34,197,94,0.08),transparent_25%),radial-gradient(circle_at_90%_95%,rgba(16,185,129,0.05),transparent_30%),#050a07] p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(74,222,128,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.6)_1px,transparent_1px)] [background-size:48px_48px]" />

        {loading && (
          <div className="absolute inset-0 bg-dark-bg/60 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent shadow-[0_0_24px_rgba(34,197,94,0.18)]" />
          </div>
        )}

        <header className="relative z-10 mb-6 overflow-hidden rounded-3xl border border-emerald-400/10 bg-gradient-to-r from-[#0b1810]/95 via-[#0c1510]/95 to-[#08100b]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                Live Performance Center
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                {selectedPlayer?.name || 'Team Performance'}
              </h2>
              <p className="mt-1.5 text-sm text-slate-400">
                {session ? `${session.name || 'Session'} · ${session.status}` : 'Real-time overview'}
                {team && <span className="text-slate-500"> · {team.name}</span>}
                {selectedPlayer && (
                  <span className="text-emerald-400"> · Selected athlete</span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={refresh}
                className="group rounded-xl border border-emerald-500/10 bg-black/20 p-2.5 transition hover:border-emerald-400/25 hover:bg-emerald-500/[0.06]"
                title="Actualiser"
              >
                <RefreshCw className="h-5 w-5 text-slate-400 transition group-hover:rotate-90 group-hover:text-emerald-300" />
              </button>
              <button
                onClick={toggleTheme}
                className="rounded-xl border border-emerald-500/10 bg-black/20 p-2.5 transition hover:border-emerald-400/25 hover:bg-emerald-500/[0.06]"
                title={isLight ? 'Passer en mode sombre' : 'Passer en mode clair'}
              >
                <Sun className="h-5 w-5 text-slate-400" />
              </button>
              <button className="relative rounded-xl border border-emerald-500/10 bg-black/20 p-2.5 transition hover:border-emerald-400/25 hover:bg-emerald-500/[0.06]">
                <Bell className="h-5 w-5 text-slate-400" />
                {unreadAlerts > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#0b1810] bg-red-500 px-1 text-[9px] font-black text-white">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/10 bg-black/20 px-4 py-2.5 text-sm text-slate-300">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>{date}</span>
                <span className="text-slate-600">|</span>
                <span className="font-semibold text-white">{time}</span>
              </div>
            </div>
          </div>
        </header>

        {!isCoach && (
          <div className="mb-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200">
            <h3 className="text-base font-semibold text-emerald-100 mb-1">Access Restricted</h3>
            <p className="text-sm">Only coaches can view player statistics.</p>
          </div>
        )}

        {isCoach && error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {showTeamSetupWarning && !loading && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm">
            Aucune équipe trouvée. Exécute <code className="text-yellow-100">supabase/migrate-coach-id.sql</code> dans Supabase pour ajouter <code className="text-yellow-100">teams.coach_id</code>, ou crée une équipe liée à ton compte coach.
          </div>
        )}

        {isCoach && _teamDebug && !loading && (
          <details className="mb-6 p-4 rounded-xl bg-slate-800/60 border border-slate-600 text-xs text-slate-300 font-mono">
            <summary className="cursor-pointer text-slate-200 font-sans text-sm font-semibold mb-2">
              Debug — résolution équipe (temporaire)
            </summary>
            <div className="space-y-2">
              <p><span className="text-slate-400">user.id :</span> {_teamDebug.userId ?? '—'}</p>
              <p><span className="text-slate-400">rôle détecté :</span> {_teamDebug.role ?? '—'}</p>
              <p><span className="text-slate-400">selectedPlayerId :</span> {_teamDebug.selectedPlayerId ?? '—'}</p>
              <p><span className="text-slate-400">requête teams :</span></p>
              <pre className="overflow-x-auto p-2 bg-slate-900/80 rounded text-[11px]">
                {JSON.stringify(_teamDebug.teamsQuery, null, 2)}
              </pre>
              {_teamDebug.fallback && (
                <>
                  <p><span className="text-slate-400">fallback :</span></p>
                  <pre className="overflow-x-auto p-2 bg-slate-900/80 rounded text-[11px]">
                    {JSON.stringify(_teamDebug.fallback, null, 2)}
                  </pre>
                </>
              )}
              <p><span className="text-slate-400">team_id final :</span> {_teamDebug.finalTeamId ?? 'null'}</p>
              <p><span className="text-slate-400">requête players :</span></p>
              <pre className="overflow-x-auto p-2 bg-slate-900/80 rounded text-[11px]">
                {JSON.stringify(_teamDebug.playersQuery, null, 2)}
              </pre>
            </div>
          </details>
        )}

        {isCoach && _trackingDebug && !loading && (
          <details className="mb-6 p-4 rounded-xl bg-slate-800/60 border border-slate-600 text-xs text-slate-300 font-mono">
            <summary className="cursor-pointer text-slate-200 font-sans text-sm font-semibold mb-2">
              Debug — live_tracking (temporaire)
            </summary>
            <pre className="overflow-x-auto p-2 bg-slate-900/80 rounded text-[11px]">
              {JSON.stringify(_trackingDebug, null, 2)}
            </pre>
          </details>
        )}

        {isCoach && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <KpiCard title="TOTAL PLAYERS" value={kpis.totalPlayers} subtitle={`${kpis.connectedPlayers} connected`} icon={<Users className="w-5 h-5 text-emerald-400" />} sparkColor="#22c55e" />
          <KpiCard title="AVG. SPEED" value={formatSpeed(kpis.avgSpeed)} unit="km/h" subtitle={selectedPlayer ? 'Selected player' : 'Team average'} icon={<Zap className="w-5 h-5 text-yellow-500" />} sparkColor="#eab308" />
          <KpiCard title="TOTAL DISTANCE" value={(kpis.totalDistanceM / 1000).toFixed(2)} unit="km" subtitle={selectedPlayer ? 'Selected player' : 'Current session'} icon={<MapPin className="w-5 h-5 text-violet-400" />} sparkColor="#a78bfa" />
          <KpiCard title="PLAYER LOAD" value={Math.round(kpis.playerLoad)} unit="AU" subtitle={selectedPlayer ? 'Selected player' : 'Team average'} icon={<Activity className="w-5 h-5 text-green-500" />} sparkColor="#22c55e" />
          <KpiCard title="SPRINTS" value={kpis.sprintCount} subtitle="This session" icon={<Footprints className="w-5 h-5 text-brand-orange" />} sparkColor="#f97316" />
          <KpiCard title="BATTERY STATUS" value={Math.round(kpis.avgBattery)} unit="%" subtitle="Average" icon={<Battery className="w-5 h-5 text-green-500" />} progress={Math.round(kpis.avgBattery)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912]/95 to-[#09110c]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">
                  Top Players by Distance
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Cliquez sur un joueur pour ouvrir son dashboard
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {topPlayers.length === 0 ? (
                <EmptyState text="Aucune donnée de distance" />
              ) : (
                topPlayers.map((player) => (
                  <PlayerListItem
                    key={player.playerId}
                    playerId={player.playerId}
                    rank={player.rank}
                    name={player.name}
                    number={player.number}
                    distance={formatDistance(player.distanceM)}
                    percent={player.percent}
                    photoUrl={player.photoUrl}
                    isSelected={player.isSelected}
                    onClick={handleRankingPlayerClick}
                  />
                ))
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912]/95 to-[#09110c]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Speed Over Time <span className="normal-case text-xs">({selectedPlayer ? 'Selected Player' : 'Team Average'})</span></h3>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 shadow-[0_0_18px_rgba(34,197,94,0.08)]">Live</span>
            </div>
            <div className="h-48">
              {speedOverTime.length === 0 ? (
                <EmptyState text="En attente de données GPS" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={speedOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                    <XAxis dataKey="time" stroke={chartTheme.axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={chartTheme.axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        border: chartTheme.tooltipBorder,
                        borderRadius: '8px',
                        color: chartTheme.tooltipText,
                      }}
                    />
                    <Line type="monotone" dataKey="speed" stroke="#34d399" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912]/95 to-[#09110c]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Player Position (Live)</h3>
            </div>
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-emerald-300/35 shadow-[inset_0_0_55px_rgba(0,0,0,0.38),0_0_25px_rgba(34,197,94,0.06)]" style={{ background: 'repeating-linear-gradient(90deg,#106b35 0,#106b35 42px,#0d5c2e 42px,#0d5c2e 84px)' }}>
              <div className="absolute inset-2 border-2 border-white/30 rounded"></div>
              <div className="absolute w-full h-px bg-white/30 top-1/2 -translate-y-1/2"></div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/30 rounded-full"></div>
              {livePositions.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">En attente GPS live</div>
              ) : (
                livePositions.map((pos) => {
                  const pt = gpsToPitch(pos.latitude, pos.longitude, pitchBounds);
                  if (!pt) return null;
                  return (
                    <div
                      key={pos.playerId}
                      className="absolute w-6 h-6 bg-emerald-400 text-[#041009] rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-[0_0_16px_rgba(52,211,153,0.8)] transition-all duration-500"
                      style={{ left: `${pt.x}%`, top: `${pt.y}%`, transform: 'translate(-50%, -50%)' }}
                      title={pos.name}
                    >
                      {pos.number ?? '?'}
                    </div>
                  );
                })
              )}
            </div>
          </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912]/95 to-[#09110c]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Heatmap</h3>
            <div className={`relative h-40 w-full overflow-hidden rounded-xl border shadow-[inset_0_0_45px_rgba(0,0,0,0.32)] ${isLight ? 'bg-green-200/40 border-green-300' : 'border-emerald-400/20 bg-[repeating-linear-gradient(90deg,#0e5f31_0,#0e5f31_38px,#0b522a_38px,#0b522a_76px)]'}`}>
              <div className="absolute inset-2 border border-white/20 rounded"></div>
              {heatmapCells.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Aucune heatmap</div>
              ) : (
                heatmapCells.map((cell) => (
                  <div
                    key={cell.id}
                    className="absolute rounded-full blur-sm"
                    style={{
                      left: `${(cell.grid_x / 20) * 100}%`,
                      top: `${(cell.grid_y / 14) * 100}%`,
                      width: '12%',
                      height: '12%',
                      backgroundColor: `rgba(239, 68, 68, ${Math.min(cell.intensity, 1)})`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912]/95 to-[#09110c]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Performance Zones</h3>
            <div className="flex items-center h-40">
              {speedZones.length === 0 ? (
                <EmptyState text="Aucune zone calculée" />
              ) : (
                <>
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={speedZones} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                          {speedZones.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2 text-xs">
                    {speedZones.map((zone) => (
                      <div key={zone.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }}></span>
                          <span className="text-slate-300">{zone.name}</span>
                        </div>
                        <span className="font-bold">{zone.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912]/95 to-[#09110c]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Latest Events</h3>
            </div>
            <div className="space-y-1">
              {events.length === 0 ? (
                <EmptyState text="Aucun événement" />
              ) : (
                events.map((ev, i) => (
                  <EventItem
                    key={i}
                    time={formatTime(ev.time)}
                    icon={eventIcon(ev.type)}
                    event={ev.label}
                    player={ev.player?.number ? `Player #${ev.player.number}` : 'Player'}
                    value={ev.value}
                  />
                ))
              )}
            </div>
          </div>
            </div>

            <div>
          <div className="mb-3 flex items-center gap-2"><Wifi className="h-4 w-4 text-emerald-400" /><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Device Status</h3></div>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {devices.length === 0 ? (
              <div className="text-sm text-slate-500 py-4">Aucun capteur LoRa enregistré</div>
            ) : (
              devices.map((d) => (
                <DeviceCard
                  key={d.playerId}
                  player={d.label}
                  battery={d.battery != null ? `${Math.round(d.battery)}%` : '—'}
                  temp={d.temperature != null ? `${Number(d.temperature).toFixed(1)} °C` : '—'}
                />
              ))
            )}
            <button className="min-w-[150px] h-[72px] bg-dark-bg border border-dashed border-slate-600 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 transition-colors">
              <Plus className="w-5 h-5 mr-2" /> Add Device
            </button>
          </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}

function eventIcon(type) {
  if (type === 'sprint' || type === 'speed') return <Activity className="text-brand-blue w-4 h-4" />;
  if (type === 'acceleration') return <Zap className="text-yellow-500 w-4 h-4" />;
  if (type === 'deceleration') return <BarChart2 className="text-purple-500 w-4 h-4" />;
  return <Bell className="text-slate-400 w-4 h-4" />;
}

function EmptyState({ text }) {
  return <p className="text-slate-500 text-sm text-center py-6">{text}</p>;
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to || '#'}
      className={({ isActive }) => `
        group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-200
        ${isActive
          ? 'border-emerald-400/20 bg-gradient-to-r from-emerald-400/15 to-emerald-400/[0.025] text-emerald-200 shadow-[0_0_24px_rgba(34,197,94,0.07)]'
          : 'border-transparent text-slate-500 hover:border-emerald-500/10 hover:bg-white/[0.025] hover:text-slate-200'}
      `}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute bottom-2.5 left-0 top-2.5 w-1 rounded-r-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          )}
          <span className={`h-5 w-5 shrink-0 [&>svg]:h-5 [&>svg]:w-5 ${isActive ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-300'}`}>
            {icon}
          </span>
          <span className="font-semibold">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function KpiCard({ title, value, unit, subtitle, icon, progress, sparkColor }) {
  const safeProgress = Math.max(0, Math.min(Number(progress) || 0, 100));

  return (
    <div className="group relative min-h-[142px] overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#101b14]/95 to-[#09110c]/95 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/20 hover:shadow-[0_22px_60px_rgba(0,0,0,0.32),0_0_28px_rgba(34,197,94,0.06)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/[0.035] blur-2xl transition group-hover:bg-emerald-400/[0.07]" />
      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{title}</h3>
            <span className="mt-2 block h-[2px] w-8 rounded-full bg-gradient-to-r from-emerald-400 to-transparent" />
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05]">
            {icon}
          </div>
        </div>

        <div className="flex items-end gap-1">
          <span className="text-[28px] font-black leading-none tracking-tight text-white">{value}</span>
          {unit && <span className="pb-0.5 text-sm font-medium text-slate-500">{unit}</span>}
        </div>

        {progress !== undefined ? (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between text-[10px]">
              <span className="text-slate-500">{subtitle}</span>
              <span className="font-bold text-emerald-400">{Math.round(safeProgress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.45)] transition-all duration-500"
                style={{ width: `${safeProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] font-medium text-emerald-400/90">{subtitle}</p>
        )}
      </div>

      {sparkColor && (
        <svg className="absolute bottom-2 left-4 h-7 w-[calc(100%-2rem)] opacity-35" viewBox="0 0 100 20" preserveAspectRatio="none">
          <polyline fill="none" stroke={sparkColor} strokeWidth="1.6" points="0,16 14,12 28,14 43,7 58,10 73,4 88,7 100,2" />
        </svg>
      )}
    </div>
  );
}

function PlayerListItem({
  playerId,
  rank,
  name,
  number,
  distance,
  percent,
  photoUrl,
  isSelected,
  onClick,
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

  return (
    <button
      type="button"
      onClick={() => onClick(playerId)}
      className={`w-full flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/25 hover:bg-emerald-400/[0.045] ${
        isSelected
          ? 'border-emerald-400/30 bg-emerald-400/[0.06] shadow-[0_0_22px_rgba(34,197,94,0.08)]'
          : 'border-transparent bg-black/15'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <span className="w-6 shrink-0 text-center text-base">{medal}</span>

        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-9 h-9 rounded-full object-cover border border-slate-600"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
            {name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-100 truncate">{name}</p>
            {isSelected && (
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
                Selected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{number}</p>
        </div>
      </div>

      <div className="text-right ml-3 shrink-0">
        <p className="font-semibold text-slate-100 mb-1">{distance}</p>
        <div className="w-24 bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300 shadow-[0_0_10px_rgba(34,197,94,0.35)] transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function EventItem({ time, icon, event, player, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border-b border-emerald-500/[0.06] px-2 py-2.5 text-xs transition hover:bg-white/[0.02] last:border-0">
      <span className="text-slate-400 w-16">{time}</span>
      <div className="flex items-center space-x-2 flex-1">
        {icon}
        <span>{event}</span>
      </div>
      <span className="text-slate-400">{player}</span>
      <span className="font-medium text-right w-16 truncate">{value}</span>
    </div>
  );
}

function DeviceCard({ player, battery, temp }) {
  return (
    <div className="flex min-w-[190px] items-center space-x-3 rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912] to-[#09110c] p-3 shadow-[0_14px_35px_rgba(0,0,0,0.18)]">
      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-2">
        <Radio className="w-5 h-5 text-green-400" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-400 mb-1">Player {player}</p>
        <div className="flex justify-between items-center text-sm font-semibold">
          <span>{battery}</span>
          <span className="text-slate-500">|</span>
          <span>{temp}</span>
        </div>
      </div>
    </div>
  );
}