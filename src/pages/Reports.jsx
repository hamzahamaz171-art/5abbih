import { useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Battery,
  Bell,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Footprints,
  Gauge,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Printer,
  Radio,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSelectedPlayer } from '../context/SelectedPlayerContext';
import { useDashboard, useLiveClock } from '../hooks/useDashboard';
import {
  formatDateTime,
  formatDistance,
  formatSpeed,
} from '../utils/dashboard';

export default function Reports() {
  const { user, logout } = useAuth();
  const { selectedPlayerId, setSelectedPlayerId } = useSelectedPlayer();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [period, setPeriod] = useState('full');
  const [reportPlayerId, setReportPlayerId] = useState(selectedPlayerId || 'all');
  const [coachNotes, setCoachNotes] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const isCoach = user?.role === 'Coach';
  const { data, loading, error, refresh } = useDashboard(
    isCoach ? user : null,
    reportPlayerId === 'all' ? null : reportPlayerId,
  );

  const now = useLiveClock();
  const { date, time } = formatDateTime(now);

  const {
    kpis,
    sidebar,
    topPlayers,
    speedZones,
    devices,
    team,
    session,
    selectedPlayer,
    unreadAlerts,
  } = data;

  const initials =
    user?.name
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CO';

  const reportRows = useMemo(
    () =>
      topPlayers.map((player) => ({
        id: player.playerId,
        rank: player.rank,
        name: player.name,
        number: player.number ?? '—',
        photoUrl: player.photoUrl,
        distanceM: Number(player.distanceM || 0),
        avgSpeed: nullableNumber(player.avgSpeed ?? player.averageSpeed),
        maxSpeed: nullableNumber(player.maxSpeed),
        sprintCount: nullableNumber(player.sprintCount ?? player.sprints),
        playerLoad: nullableNumber(player.playerLoad ?? player.load),
        battery: nullableNumber(player.battery),
        connected:
          player.connected ??
          devices.some((device) => device.playerId === player.playerId),
      })),
    [topPlayers, devices],
  );

  const filteredRows = useMemo(() => {
    if (reportPlayerId === 'all') return reportRows;
    return reportRows.filter((row) => row.id === reportPlayerId);
  }, [reportRows, reportPlayerId]);

  const distanceChartData = useMemo(
    () =>
      filteredRows.slice(0, 10).map((row) => ({
        name: shortName(row.name),
        distance: Number((row.distanceM / 1000).toFixed(2)),
      })),
    [filteredRows],
  );

  const awards = useMemo(() => {
    const distanceWinner = maxBy(reportRows, 'distanceM');
    const speedWinner = maxBy(reportRows, 'maxSpeed');
    const sprintWinner = maxBy(reportRows, 'sprintCount');
    const loadWinner = maxBy(reportRows, 'playerLoad');

    return [
      {
        label: 'Top Distance',
        player: distanceWinner?.name || 'No data',
        value: distanceWinner
          ? formatDistance(distanceWinner.distanceM)
          : '—',
        icon: <MapPin className="h-5 w-5" />,
      },
      {
        label: 'Fastest Player',
        player: speedWinner?.name || selectedPlayer?.name || 'No data',
        value: speedWinner?.maxSpeed != null
          ? formatSpeed(speedWinner.maxSpeed)
          : formatSpeed(kpis.avgSpeed),
        icon: <Zap className="h-5 w-5" />,
      },
      {
        label: 'Most Sprints',
        player: sprintWinner?.name || selectedPlayer?.name || 'Team',
        value:
          sprintWinner?.sprintCount != null
            ? `${sprintWinner.sprintCount} sprints`
            : `${kpis.sprintCount || 0} sprints`,
        icon: <Footprints className="h-5 w-5" />,
      },
      {
        label: 'Highest Load',
        player: loadWinner?.name || selectedPlayer?.name || 'Team',
        value:
          loadWinner?.playerLoad != null
            ? `${Math.round(loadWinner.playerLoad)} AU`
            : `${Math.round(kpis.playerLoad || 0)} AU`,
        icon: <Activity className="h-5 w-5" />,
      },
    ];
  }, [reportRows, selectedPlayer, kpis]);

  const insights = useMemo(() => {
    const results = [];
    const validDistances = reportRows.filter((row) => row.distanceM > 0);

    if (validDistances.length > 0) {
      const best = maxBy(validDistances, 'distanceM');
      const average =
        validDistances.reduce((sum, row) => sum + row.distanceM, 0) /
        validDistances.length;
      const difference =
        average > 0 ? ((best.distanceM - average) / average) * 100 : 0;

      results.push(
        `${best.name} covered the greatest distance (${formatDistance(
          best.distanceM,
        )}), ${Math.max(0, difference).toFixed(0)}% above the squad average.`,
      );
    }

    if (kpis.avgBattery < 30) {
      results.push(
        `Average device battery is low at ${Math.round(
          kpis.avgBattery,
        )}%. Charge the player tags before the next session.`,
      );
    } else if (kpis.avgBattery > 0) {
      results.push(
        `Device availability is healthy, with an average battery level of ${Math.round(
          kpis.avgBattery,
        )}%.`,
      );
    }

    if (kpis.sprintCount > 0) {
      results.push(
        `The session generated ${kpis.sprintCount} recorded sprint${
          kpis.sprintCount > 1 ? 's' : ''
        }, indicating meaningful high-intensity activity.`,
      );
    }

    if (sidebar.playerTags > 0) {
      results.push(
        `${sidebar.playerTags} player tag${
          sidebar.playerTags > 1 ? 's are' : ' is'
        } connected through ${sidebar.gateways || 0} gateway${
          sidebar.gateways === 1 ? '' : 's'
        }.`,
      );
    }

    return results.length
      ? results
      : ['More tracking data is required before automatic insights can be generated.'];
  }, [reportRows, kpis, sidebar]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handlePlayerChange(event) {
    const value = event.target.value;
    setReportPlayerId(value);

    if (value !== 'all') {
      setSelectedPlayerId(value);
    }
  }

  function handleSaveNotes() {
    localStorage.setItem(
      `report-notes-${session?.id || 'current'}`,
      coachNotes,
    );
    setNotesSaved(true);
    window.setTimeout(() => setNotesSaved(false), 2200);
  }

  function handlePrint() {
    window.print();
  }

  function exportCsv() {
    const rows = [
      [
        'Rank',
        'Player',
        'Number',
        'Distance',
        'Average Speed',
        'Maximum Speed',
        'Sprints',
        'Player Load',
        'Battery',
        'Connected',
      ],
      ...filteredRows.map((row) => [
        row.rank,
        row.name,
        row.number,
        `${(row.distanceM / 1000).toFixed(2)} km`,
        displayMetric(row.avgSpeed, 'km/h'),
        displayMetric(row.maxSpeed, 'km/h'),
        displayMetric(row.sprintCount, ''),
        displayMetric(row.playerLoad, 'AU'),
        displayMetric(row.battery, '%'),
        row.connected ? 'Yes' : 'No',
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','),
      )
      .join('\n');

    downloadBlob(
      new Blob([`\uFEFF${csv}`], {
        type: 'text/csv;charset=utf-8;',
      }),
      `${reportFileName()}.csv`,
    );
  }

  async function exportPdf() {
    if (!reportRef.current || isExporting) return;

    setIsExporting(true);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(reportRef.current, {
        scale: 1.7,
        backgroundColor: '#050a07',
        useCORS: true,
        logging: false,
        windowWidth: reportRef.current.scrollWidth,
      });

      const imageData = canvas.toDataURL('image/png', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * printableWidth) / canvas.width;
      const printableHeight = pageHeight - margin * 2;

      let remainingHeight = imageHeight;
      let y = margin;

      pdf.addImage(
        imageData,
        'PNG',
        margin,
        y,
        printableWidth,
        imageHeight,
        undefined,
        'FAST',
      );

      remainingHeight -= printableHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        y = margin - (imageHeight - remainingHeight);
        pdf.addImage(
          imageData,
          'PNG',
          margin,
          y,
          printableWidth,
          imageHeight,
          undefined,
          'FAST',
        );
        remainingHeight -= printableHeight;
      }

      pdf.save(`${reportFileName()}.pdf`);
    } catch (exportError) {
      console.error('PDF export failed:', exportError);
      window.alert(
        "L'export PDF a échoué. Vérifie que jspdf et html2canvas sont installés.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  function reportFileName() {
    const sessionName = slugify(session?.name || 'session-report');
    return `${sessionName}-${new Date().toISOString().slice(0, 10)}`;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050a07] font-sans text-slate-200">
      <aside className="relative z-30 flex w-64 shrink-0 flex-col justify-between overflow-hidden border-r border-emerald-500/10 bg-[#07100b]/95 shadow-[20px_0_70px_rgba(0,0,0,0.32)] backdrop-blur-xl print:hidden">
        <div className="pointer-events-none absolute -left-20 top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div>
          <div className="relative flex items-center justify-between border-b border-emerald-500/10 p-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/20 to-emerald-950/40 shadow-[0_0_28px_rgba(34,197,94,0.12)]">
                <Shield className="h-5 w-5 text-emerald-300" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#07100b] bg-emerald-400" />
              </div>

              <div>
                <h1 className="text-sm font-black leading-tight tracking-[0.16em] text-white">
                  LIVE SPORT
                </h1>
                <p className="mt-1 text-[9px] font-semibold tracking-[0.28em] text-emerald-400/70">
                  PERFORMANCE
                </p>
              </div>
            </div>

            <button className="rounded-xl p-2 text-slate-500 transition hover:bg-emerald-500/5 hover:text-emerald-300">
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-6 space-y-1.5 px-4">
            <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
            <NavItem to="/players" icon={<Users />} label="Players" />
            <NavItem to="/live-tracking" icon={<MapPin />} label="Live Tracking" />
            <NavItem to="/analytics" icon={<BarChart3 />} label="Analytics" />
            <NavItem to="/reports" icon={<FileText />} label="Reports" />
            <NavItem to="/alerts" icon={<Bell />} label="Alerts" />
            <NavItem to="/settings" icon={<Settings />} label="Settings" />
          </nav>
        </div>

        <div className="p-4">
          <div className="mb-5 rounded-2xl border border-emerald-500/10 bg-white/[0.018] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Data connection
              </p>
              <Radio className="h-4 w-4 text-emerald-400" />
            </div>

            <ConnectionRow label="Player Tags" value={sidebar.playerTags} />
            <ConnectionRow label="Gateways" value={sidebar.gateways} />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu((value) => !value)}
              className="flex w-full items-center justify-between rounded-2xl border border-emerald-500/10 bg-black/20 p-3 transition hover:border-emerald-400/25"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-800 text-xs font-black text-white">
                  {initials}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.role}</p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition ${
                  showMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showMenu && (
              <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-emerald-500/10 bg-[#0d1711] shadow-xl">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_15%_0%,rgba(34,197,94,0.08),transparent_25%),radial-gradient(circle_at_90%_95%,rgba(16,185,129,0.05),transparent_30%),#050a07] p-6 lg:p-8 print:overflow-visible print:bg-[#050a07] print:p-0">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050a07]/70 backdrop-blur-sm print:hidden">
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        )}

        <div ref={reportRef} className="mx-auto max-w-[1550px]">
          <header className="relative mb-6 overflow-hidden rounded-3xl border border-emerald-400/10 bg-gradient-to-r from-[#0b1810] via-[#0c1510] to-[#08100b] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  <FileText className="h-4 w-4" />
                  Session Report
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                  {session?.name || 'Current Performance Session'}
                </h2>
                <p className="mt-1.5 text-sm text-slate-400">
                  {team?.name || 'Team'} · {session?.status || 'Live data'} ·{' '}
                  {filteredRows.length || kpis.totalPlayers || 0} player
                  {(filteredRows.length || kpis.totalPlayers) === 1 ? '' : 's'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 print:hidden">
                <ActionButton
                  onClick={refresh}
                  icon={<RefreshCw className="h-4 w-4" />}
                  label="Refresh"
                />
                <ActionButton
                  onClick={exportCsv}
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  label="Excel"
                />
                <ActionButton
                  onClick={handlePrint}
                  icon={<Printer className="h-4 w-4" />}
                  label="Print"
                />
                <button
                  onClick={exportPdf}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-[#041009] shadow-[0_0_24px_rgba(52,211,153,0.18)] transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Generating...' : 'Export PDF'}
                </button>
              </div>
            </div>
          </header>

          {error && (
  <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
    {error}
  </div>
)}

{isCoach && !loading && kpis.connectedPlayers === 0 && (
  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4 text-amber-200">
    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
      <Radio className="h-5 w-5 text-amber-300" />
    </div>

    <div>
      <p className="font-bold text-amber-100">
        No live devices detected
      </p>

      <p className="mt-1 text-sm leading-6 text-amber-200/75">
        Showing the latest available session data. Connect and power on the
        ESP32 device to resume live tracking.
      </p>
    </div>
  </div>
)}
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 print:hidden">
            <FilterField label="Session">
              <select className="report-select" value={session?.id || 'current'} disabled>
                <option value={session?.id || 'current'}>
                  {session?.name || 'Current session'}
                </option>
              </select>
            </FilterField>

            <FilterField label="Period">
              <select
                className="report-select"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="full">Full session</option>
                <option value="first-half">First half</option>
                <option value="second-half">Second half</option>
              </select>
            </FilterField>

            <FilterField label="Player">
              <select
                className="report-select"
                value={reportPlayerId}
                onChange={handlePlayerChange}
              >
                <option value="all">All players</option>
                {topPlayers.map((player) => (
                  <option key={player.playerId} value={player.playerId}>
                    {player.name}
                  </option>
                ))}
              </select>
            </FilterField>
          </section>

          <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <ReportKpi
              title="Duration"
              value={formatDuration(session)}
              subtitle={periodLabel(period)}
              icon={<Calendar className="h-5 w-5" />}
            />
            <ReportKpi
              title="Players"
              value={filteredRows.length || kpis.totalPlayers || 0}
              subtitle={`${kpis.connectedPlayers || 0} connected`}
              icon={<Users className="h-5 w-5" />}
            />
            <ReportKpi
              title="Total Distance"
              value={(Number(kpis.totalDistanceM || 0) / 1000).toFixed(2)}
              unit="km"
              subtitle={selectedPlayer ? 'Selected player' : 'Current session'}
              icon={<MapPin className="h-5 w-5" />}
            />
            <ReportKpi
              title="Average Speed"
              value={Number(kpis.avgSpeed || 0).toFixed(1)}
              unit="km/h"
              subtitle="Session average"
              icon={<Gauge className="h-5 w-5" />}
            />
            <ReportKpi
              title="Total Sprints"
              value={kpis.sprintCount || 0}
              subtitle="Recorded efforts"
              icon={<Footprints className="h-5 w-5" />}
            />
            <ReportKpi
              title="Average Load"
              value={Math.round(kpis.playerLoad || 0)}
              unit="AU"
              subtitle="External load"
              icon={<Activity className="h-5 w-5" />}
            />
          </section>

          <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912] to-[#09110c] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <SectionHeader
              icon={<Users className="h-4 w-4" />}
              title="Player Performance"
              subtitle="Session metrics and device availability"
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-emerald-500/10 bg-black/15 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-5 py-3">Rank</th>
                    <th className="px-5 py-3">Player</th>
                    <th className="px-5 py-3">Distance</th>
                    <th className="px-5 py-3">Avg Speed</th>
                    <th className="px-5 py-3">Max Speed</th>
                    <th className="px-5 py-3">Sprints</th>
                    <th className="px-5 py-3">Load</th>
                    <th className="px-5 py-3">Battery</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-5 py-12 text-center text-sm text-slate-500">
                        No player report data is available for this session.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-emerald-500/[0.06] text-sm transition hover:bg-emerald-400/[0.025] last:border-0"
                      >
                        <td className="px-5 py-4 font-black text-emerald-400">
                          #{row.rank}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {row.photoUrl ? (
                              <img
                                src={row.photoUrl}
                                alt={row.name}
                                className="h-9 w-9 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 font-black text-emerald-300">
                                {row.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-white">{row.name}</p>
                              <p className="text-xs text-slate-500">#{row.number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-white">
                          {formatDistance(row.distanceM)}
                        </td>
                        <td className="px-5 py-4">{displayMetric(row.avgSpeed, 'km/h')}</td>
                        <td className="px-5 py-4">{displayMetric(row.maxSpeed, 'km/h')}</td>
                        <td className="px-5 py-4">{displayMetric(row.sprintCount, '')}</td>
                        <td className="px-5 py-4">{displayMetric(row.playerLoad, 'AU')}</td>
                        <td className="px-5 py-4">
                          <BatteryMetric value={row.battery} />
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              row.connected
                                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                                : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.connected ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                            />
                            {row.connected ? 'Online' : 'Offline'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ReportPanel
              title="Distance by Player"
              subtitle="Top 10 players in the selected report"
              icon={<BarChart3 className="h-4 w-4" />}
            >
              <div className="h-72">
                {distanceChartData.length === 0 ? (
                  <EmptyState text="No distance data available" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distanceChartData}>
                      <CartesianGrid
                        stroke="rgba(74,222,128,0.08)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        unit=" km"
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(34,197,94,0.035)' }}
                        contentStyle={{
                          background: '#0b1510',
                          border: '1px solid rgba(74,222,128,0.15)',
                          borderRadius: '12px',
                          color: '#e2e8f0',
                        }}
                      />
                      <Bar dataKey="distance" radius={[8, 8, 0, 0]}>
                        {distanceChartData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={
                              index === 0
                                ? '#34d399'
                                : `rgba(52,211,153,${Math.max(
                                    0.28,
                                    0.78 - index * 0.055,
                                  )})`
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ReportPanel>

            <ReportPanel
              title="Speed Zones"
              subtitle="Distribution of time by intensity"
              icon={<Gauge className="h-4 w-4" />}
            >
              <div className="flex min-h-72 items-center">
                {speedZones.length === 0 ? (
                  <EmptyState text="No speed-zone data available" />
                ) : (
                  <>
                    <div className="h-64 w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={speedZones}
                            dataKey="value"
                            innerRadius={58}
                            outerRadius={90}
                            paddingAngle={3}
                          >
                            {speedZones.map((zone) => (
                              <Cell
                                key={zone.name}
                                fill={zone.color}
                                stroke="none"
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: '#0b1510',
                              border: '1px solid rgba(74,222,128,0.15)',
                              borderRadius: '12px',
                              color: '#e2e8f0',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-1/2 space-y-3">
                      {speedZones.map((zone) => (
                        <div
                          key={zone.name}
                          className="flex items-center justify-between rounded-xl border border-emerald-500/[0.06] bg-black/15 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: zone.color }}
                            />
                            <span className="text-sm text-slate-300">
                              {zone.name}
                            </span>
                          </div>
                          <span className="font-black text-white">
                            {zone.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ReportPanel>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ReportPanel
              title="Top Performances"
              subtitle="Session leaders"
              icon={<Trophy className="h-4 w-4" />}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {awards.map((award) => (
                  <div
                    key={award.label}
                    className="rounded-2xl border border-emerald-400/10 bg-black/15 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                        {award.icon}
                      </div>
                      <Trophy className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {award.label}
                    </p>
                    <p className="mt-2 font-bold text-white">{award.player}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-400">
                      {award.value}
                    </p>
                  </div>
                ))}
              </div>
            </ReportPanel>

            <ReportPanel
              title="Performance Insights"
              subtitle="Automatically generated from the session"
              icon={<Sparkles className="h-4 w-4" />}
            >
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={`${insight}-${index}`}
                    className="flex gap-3 rounded-2xl border border-emerald-500/[0.07] bg-black/15 p-4"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-xs font-black text-emerald-300">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{insight}</p>
                  </div>
                ))}
              </div>
            </ReportPanel>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_.7fr]">
            <ReportPanel
              title="Coach Notes"
              subtitle="Observations and follow-up actions"
              icon={<FileText className="h-4 w-4" />}
            >
              <textarea
                value={coachNotes}
                onChange={(event) => setCoachNotes(event.target.value)}
                placeholder="Write observations about the session, player workload, recovery requirements or tactical notes..."
                className="min-h-48 w-full resize-y rounded-2xl border border-emerald-400/10 bg-black/20 p-4 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/35 focus:ring-4 focus:ring-emerald-400/[0.06]"
              />

              <div className="mt-3 flex items-center justify-between print:hidden">
                <p className="text-xs text-slate-600">
                  Notes are saved locally for the current session.
                </p>
                <button
                  onClick={handleSaveNotes}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/15"
                >
                  <Save className="h-4 w-4" />
                  {notesSaved ? 'Saved' : 'Save Notes'}
                </button>
              </div>
            </ReportPanel>

            <ReportPanel
              title="Data Quality"
              subtitle="Tracking and report integrity"
              icon={<Radio className="h-4 w-4" />}
            >
              <div className="space-y-3">
                <QualityRow
                  label="Player tags"
                  value={`${sidebar.playerTags || 0}`}
                  status={sidebar.playerTags > 0}
                />
                <QualityRow
                  label="Gateways"
                  value={`${sidebar.gateways || 0}`}
                  status={sidebar.gateways > 0}
                />
                <QualityRow
                  label="Devices in report"
                  value={`${devices.length || 0}`}
                  status={devices.length > 0}
                />
                <QualityRow
                  label="Average battery"
                  value={`${Math.round(kpis.avgBattery || 0)}%`}
                  status={kpis.avgBattery >= 30}
                />
                <QualityRow
                  label="Report generated"
                  value={`${date} · ${time}`}
                  status
                />
              </div>
            </ReportPanel>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-500/10 px-1 py-5 text-xs text-slate-600">
            <p>
              Live Sport Performance · {team?.name || 'Team report'} ·{' '}
              {session?.name || 'Current session'}
            </p>
            <p>
              Generated {date} at {time}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-200 ${
          isActive
            ? 'border-emerald-400/20 bg-gradient-to-r from-emerald-400/15 to-emerald-400/[0.025] text-emerald-200'
            : 'border-transparent text-slate-500 hover:border-emerald-500/10 hover:bg-white/[0.025] hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute bottom-2.5 left-0 top-2.5 w-1 rounded-r-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          )}
          <span
            className={`h-5 w-5 shrink-0 [&>svg]:h-5 [&>svg]:w-5 ${
              isActive
                ? 'text-emerald-400'
                : 'text-slate-600 group-hover:text-slate-300'
            }`}
          >
            {icon}
          </span>
          <span className="font-semibold">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function ConnectionRow({ label, value }) {
  return (
    <div className="mt-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            value > 0
              ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
              : 'bg-slate-600'
          }`}
        />
        <span className="text-slate-400">{label}</span>
      </div>
      <span className="font-black text-white">{value || 0}</span>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912] to-[#09110c] p-4">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ActionButton({ onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/10 bg-black/20 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-emerald-400/25 hover:text-emerald-300"
    >
      {icon}
      {label}
    </button>
  );
}

function ReportKpi({ title, value, unit, subtitle, icon }) {
  return (
    <div className="relative min-h-[135px] overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#101b14] to-[#09110c] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/[0.04] blur-2xl" />

      <div className="relative">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
              {title}
            </p>
            <span className="mt-2 block h-[2px] w-8 rounded-full bg-gradient-to-r from-emerald-400 to-transparent" />
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-400">
            {icon}
          </div>
        </div>

        <div className="flex items-end gap-1">
          <span className="text-[27px] font-black leading-none tracking-tight text-white">
            {value}
          </span>
          {unit && (
            <span className="pb-0.5 text-sm font-medium text-slate-500">
              {unit}
            </span>
          )}
        </div>

        <p className="mt-3 text-[11px] font-medium text-emerald-400/90">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">
          <span className="text-emerald-400">{icon}</span>
          {title}
        </div>
        <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}

function ReportPanel({ title, subtitle, icon, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912] to-[#09110c] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <SectionHeader title={title} subtitle={subtitle} icon={icon} />
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function BatteryMetric({ value }) {
  if (value == null) {
    return <span className="text-slate-600">—</span>;
  }

  const safeValue = Math.max(0, Math.min(100, value));
  const statusClass =
    safeValue < 20
      ? 'bg-red-500'
      : safeValue < 45
        ? 'bg-amber-400'
        : 'bg-emerald-400';

  return (
    <div className="flex items-center gap-2">
      <Battery className="h-4 w-4 text-slate-500" />
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full ${statusClass}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <span className="text-xs font-bold">{Math.round(safeValue)}%</span>
    </div>
  );
}

function QualityRow({ label, value, status }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-500/[0.06] bg-black/15 px-3.5 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            status ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
        <span className="text-sm font-bold text-white">{value}</span>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-600">
      {text}
    </div>
  );
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function displayMetric(value, unit) {
  if (value === null || value === undefined) return '—';
  const formatted = Number.isInteger(value)
    ? value
    : Number(value).toFixed(1);
  return unit ? `${formatted} ${unit}` : String(formatted);
}

function maxBy(rows, key) {
  return rows.reduce((best, row) => {
    if (row[key] === null || row[key] === undefined) return best;
    if (!best || row[key] > best[key]) return row;
    return best;
  }, null);
}

function shortName(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.slice(0, 10);
  return `${parts[0][0]}. ${parts.at(-1)}`.slice(0, 12);
}

function periodLabel(period) {
  if (period === 'first-half') return 'First half';
  if (period === 'second-half') return 'Second half';
  return 'Full session';
}

function formatDuration(session) {
  const explicit =
    session?.duration ||
    session?.durationText ||
    session?.duration_minutes ||
    session?.durationMinutes;

  if (typeof explicit === 'string') return explicit;
  if (typeof explicit === 'number') {
    const hours = Math.floor(explicit / 60);
    const minutes = Math.round(explicit % 60);
    return hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      : `${minutes} min`;
  }

  if (session?.started_at || session?.start_time) {
    const startedAt = new Date(session.started_at || session.start_time);
    const finishedAt = session.ended_at || session.end_time
      ? new Date(session.ended_at || session.end_time)
      : new Date();

    const difference = Math.max(0, finishedAt - startedAt);
    const totalMinutes = Math.floor(difference / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return '—';
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}