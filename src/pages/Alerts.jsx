import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Battery,
  BatteryLow,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Radio,
  RefreshCw,
  Save,
  Settings,
  Shield,
  SlidersHorizontal,
  Thermometer,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboard, useLiveClock } from '../hooks/useDashboard';
import { formatDateTime } from '../utils/dashboard';

const THRESHOLDS_KEY = 'alert-thresholds';
const READ_KEY = 'alerts-read';
const DISMISSED_KEY = 'alerts-dismissed';

const DEFAULT_THRESHOLDS = { battery: 20, temperature: 45 };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'battery', label: 'Battery' },
  { key: 'temperature', label: 'Temperature' },
];

const SEVERITY = {
  critical: {
    label: 'Critical',
    badge: 'border-red-400/25 bg-red-400/10 text-red-300',
    icon: 'border-red-400/20 bg-red-400/10 text-red-300',
    bar: 'bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.7)]',
  },
  warning: {
    label: 'Warning',
    badge: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    icon: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    bar: 'bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.6)]',
  },
};

// Alertes d'exemple, affichées seulement si l'utilisateur clique sur "Load sample alerts"
const SAMPLE_ALERTS = [
  {
    id: 'sample-1',
    type: 'battery',
    severity: 'critical',
    player: 'Leo Messi',
    number: 10,
    device: 'Player Tag',
    value: 8,
    message: 'Battery is critically low. Charge the device immediately.',
  },
  {
    id: 'sample-2',
    type: 'temperature',
    severity: 'critical',
    player: 'Cristiano Ronaldo',
    number: 7,
    device: 'Player Tag',
    value: 51,
    message: 'Device temperature is too high. Check the belt and let it cool down.',
  },
  {
    id: 'sample-3',
    type: 'battery',
    severity: 'warning',
    player: 'Mbappé',
    number: 7,
    device: 'Player Tag',
    value: 19,
    message: 'Battery is low. Charge the device after the session.',
  },
  {
    id: 'sample-4',
    type: 'temperature',
    severity: 'warning',
    player: 'Haaland',
    number: 9,
    device: 'Player Tag',
    value: 46,
    message: 'Device temperature is rising. Keep monitoring it.',
  },
];

export default function Alerts() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showMenu, setShowMenu] = useState(false);
  const [filter, setFilter] = useState('all');
  const [useSample, setUseSample] = useState(false);
  const [thresholds, setThresholds] = useState(() =>
    loadJson(THRESHOLDS_KEY, DEFAULT_THRESHOLDS),
  );
  const [readIds, setReadIds] = useState(() => loadJson(READ_KEY, []));
  const [dismissedIds, setDismissedIds] = useState(() =>
    loadJson(DISMISSED_KEY, []),
  );
  const [saved, setSaved] = useState(false);

  const isCoach = user?.role === 'Coach';
  const { data, loading, error, refresh } = useDashboard(
    isCoach ? user : null,
    null,
  );

  const now = useLiveClock();
  const { date, time } = formatDateTime(now);

  const { kpis, sidebar, topPlayers, devices } = data;

  const initials =
    user?.name
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CO';

  useEffect(() => saveJson(READ_KEY, readIds), [readIds]);
  useEffect(() => saveJson(DISMISSED_KEY, dismissedIds), [dismissedIds]);

  // Une ligne par joueur avec la batterie et la température du dispositif
  const playerRows = useMemo(
    () =>
      topPlayers.map((player) => ({
        id: player.playerId,
        name: player.name,
        number: player.number ?? '—',
        battery: nullableNumber(player.battery),
        temperature: nullableNumber(
          player.temperature ?? player.temp ?? player.deviceTemp,
        ),
        connected:
          player.connected ??
          devices.some((device) => device.playerId === player.playerId),
      })),
    [topPlayers, devices],
  );

  // Alertes calculées à partir des seuils
  const liveAlerts = useMemo(() => {
    const results = [];

    playerRows.forEach((row) => {
      if (row.battery != null && row.battery < thresholds.battery) {
        const critical = row.battery < thresholds.battery / 2;
        results.push({
          id: `battery-${row.id}`,
          type: 'battery',
          severity: critical ? 'critical' : 'warning',
          player: row.name,
          number: row.number,
          device: 'Player Tag',
          value: Math.round(row.battery),
          message: critical
            ? 'Battery is critically low. Charge the device immediately.'
            : 'Battery is low. Charge the device after the session.',
        });
      }

      if (row.temperature != null && row.temperature > thresholds.temperature) {
        const critical = row.temperature > thresholds.temperature + 5;
        results.push({
          id: `temperature-${row.id}`,
          type: 'temperature',
          severity: critical ? 'critical' : 'warning',
          player: row.name,
          number: row.number,
          device: 'Player Tag',
          value: Math.round(row.temperature),
          message: critical
            ? 'Device temperature is too high. Check the belt and let it cool down.'
            : 'Device temperature is rising. Keep monitoring it.',
        });
      }
    });

    return results;
  }, [playerRows, thresholds]);

  const alerts = useMemo(() => {
    const source = useSample ? SAMPLE_ALERTS : liveAlerts;
    return source
      .filter((alert) => !dismissedIds.includes(alert.id))
      .map((alert) => ({ ...alert, read: readIds.includes(alert.id) }))
      .sort(
        (a, b) =>
          Number(a.severity !== 'critical') - Number(b.severity !== 'critical'),
      );
  }, [useSample, liveAlerts, dismissedIds, readIds]);

  const counts = useMemo(
    () => ({
      active: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      battery: alerts.filter((a) => a.type === 'battery').length,
      temperature: alerts.filter((a) => a.type === 'temperature').length,
    }),
    [alerts],
  );

  const visibleAlerts = alerts.filter((alert) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.read;
    return alert.type === filter;
  });

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function markRead(id) {
    setReadIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function markAllRead() {
    setReadIds((ids) => [...new Set([...ids, ...alerts.map((a) => a.id)])]);
  }

  function dismiss(id) {
    setDismissedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function handleSaveThresholds() {
    saveJson(THRESHOLDS_KEY, thresholds);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
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
            <NavItem
              to="/alerts"
              icon={<Bell />}
              label="Alerts"
              badge={counts.active}
            />
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

      <main className="relative min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_15%_0%,rgba(34,197,94,0.08),transparent_25%),radial-gradient(circle_at_90%_95%,rgba(16,185,129,0.05),transparent_30%),#050a07] p-6 lg:p-8">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050a07]/70 backdrop-blur-sm">
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        )}

        <div className="mx-auto max-w-[1550px]">
          <header className="relative mb-6 overflow-hidden rounded-3xl border border-emerald-400/10 bg-gradient-to-r from-[#0b1810] via-[#0c1510] to-[#08100b] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  <Bell className="h-4 w-4" />
                  Device Alerts
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                  Alerts &amp; Device Health
                </h2>
                <p className="mt-1.5 text-sm text-slate-400">
                  Low battery and high temperature · {counts.active} active alert
                  {counts.active === 1 ? '' : 's'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <ActionButton
                  onClick={refresh}
                  icon={<RefreshCw className="h-4 w-4" />}
                  label="Refresh"
                />
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-[#041009] shadow-[0_0_24px_rgba(52,211,153,0.18)] transition hover:bg-emerald-300"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all as read
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
                <p className="font-bold text-amber-100">No live devices detected</p>
                <p className="mt-1 text-sm leading-6 text-amber-200/75">
                  Alerts are based on the latest available device data. Connect and
                  power on the ESP32 device to receive live alerts.
                </p>
              </div>
            </div>
          )}

          <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <AlertKpi
              title="Active Alerts"
              value={counts.active}
              subtitle="Currently open"
              icon={<BellRing className="h-5 w-5" />}
            />
            <AlertKpi
              title="Critical"
              value={counts.critical}
              subtitle="Immediate action"
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="danger"
            />
            <AlertKpi
              title="Low Battery"
              value={counts.battery}
              subtitle={`Below ${thresholds.battery}%`}
              icon={<BatteryLow className="h-5 w-5" />}
              tone="warning"
            />
            <AlertKpi
              title="High Temperature"
              value={counts.temperature}
              subtitle={`Above ${thresholds.temperature} °C`}
              icon={<Thermometer className="h-5 w-5" />}
              tone="warning"
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_.6fr]">
            <Panel
              title="Latest Alerts"
              subtitle="Battery and temperature events from player devices"
              icon={<Bell className="h-4 w-4" />}
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setFilter(item.key)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                      filter === item.key
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : 'border-emerald-500/10 bg-black/15 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {visibleAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/10 bg-black/10 px-4 py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300">
                      <CheckCheck className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-white">All devices are healthy</p>
                    <p className="mt-1 text-sm text-slate-500">
                      No battery or temperature alerts to display.
                    </p>
                    {!useSample && (
                      <button
                        onClick={() => setUseSample(true)}
                        className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/15"
                      >
                        Load sample alerts
                      </button>
                    )}
                  </div>
                ) : (
                  visibleAlerts.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onRead={() => markRead(alert.id)}
                      onDismiss={() => dismiss(alert.id)}
                    />
                  ))
                )}
              </div>

              {useSample && (
                <button
                  onClick={() => {
                    setUseSample(false);
                    setDismissedIds([]);
                    setReadIds([]);
                  }}
                  className="mt-4 text-xs font-semibold text-slate-500 transition hover:text-emerald-300"
                >
                  Hide sample alerts
                </button>
              )}
            </Panel>

            <div className="space-y-6">
              <Panel
                title="Alert Thresholds"
                subtitle="When should an alert be triggered"
                icon={<SlidersHorizontal className="h-4 w-4" />}
              >
                <div className="space-y-6">
                  <ThresholdSlider
                    label="Low battery"
                    icon={<BatteryLow className="h-4 w-4 text-amber-300" />}
                    value={thresholds.battery}
                    display={`< ${thresholds.battery} %`}
                    min={5}
                    max={50}
                    onChange={(value) =>
                      setThresholds((current) => ({ ...current, battery: value }))
                    }
                  />
                  <ThresholdSlider
                    label="High temperature"
                    icon={<Thermometer className="h-4 w-4 text-amber-300" />}
                    value={thresholds.temperature}
                    display={`> ${thresholds.temperature} °C`}
                    min={30}
                    max={70}
                    onChange={(value) =>
                      setThresholds((current) => ({
                        ...current,
                        temperature: value,
                      }))
                    }
                  />
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Saved locally on this device.
                  </p>
                  <button
                    onClick={handleSaveThresholds}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/15"
                  >
                    <Save className="h-4 w-4" />
                    {saved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </Panel>

              <Panel
                title="Device Status"
                subtitle="Battery and temperature per player"
                icon={<Radio className="h-4 w-4" />}
              >
                <div className="space-y-3">
                  {playerRows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-600">
                      No device data available
                    </p>
                  ) : (
                    playerRows.slice(0, 6).map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/[0.06] bg-black/15 px-3.5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {row.name}
                          </p>
                          <p className="text-xs text-slate-500">#{row.number}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <BatteryMetric value={row.battery} />
                          <span className="w-14 text-right text-xs font-bold text-slate-300">
                            {row.temperature != null
                              ? `${Math.round(row.temperature)} °C`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-500/10 px-1 py-5 text-xs text-slate-600">
            <p>Live Sport Performance · Device alerts</p>
            <p>
              Updated {date} at {time}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, badge }) {
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
          {badge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/90 px-1.5 text-[10px] font-black text-white">
              {badge}
            </span>
          )}
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

function AlertKpi({ title, value, subtitle, icon, tone }) {
  const iconTone =
    tone === 'danger'
      ? 'border-red-400/15 bg-red-400/[0.07] text-red-300'
      : tone === 'warning'
        ? 'border-amber-400/15 bg-amber-400/[0.07] text-amber-300'
        : 'border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-400';

  const lineTone =
    tone === 'danger'
      ? 'from-red-400'
      : tone === 'warning'
        ? 'from-amber-400'
        : 'from-emerald-400';

  return (
    <div className="relative min-h-[135px] overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#101b14] to-[#09110c] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/[0.04] blur-2xl" />

      <div className="relative">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
              {title}
            </p>
            <span
              className={`mt-2 block h-[2px] w-8 rounded-full bg-gradient-to-r ${lineTone} to-transparent`}
            />
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${iconTone}`}
          >
            {icon}
          </div>
        </div>

        <span className="text-[27px] font-black leading-none tracking-tight text-white">
          {value}
        </span>

        <p className="mt-3 text-[11px] font-medium text-emerald-400/90">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e1912] to-[#09110c] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">
          <span className="text-emerald-400">{icon}</span>
          {title}
        </div>
        <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function AlertRow({ alert, onRead, onDismiss }) {
  const style = SEVERITY[alert.severity];
  const isBattery = alert.type === 'battery';
  const Icon = isBattery ? BatteryLow : Thermometer;

  return (
    <div
      className={`relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border p-4 transition ${
        alert.read
          ? 'border-emerald-500/[0.06] bg-black/10 opacity-60'
          : 'border-emerald-400/10 bg-black/20 hover:border-emerald-400/20'
      }`}
    >
      <span
        className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${style.bar}`}
      />

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${style.icon}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-[200px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-white">{alert.player}</p>
          <span className="text-xs text-slate-500">#{alert.number}</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.badge}`}
          >
            {style.label}
          </span>
          {!alert.read && (
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          )}
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-400">{alert.message}</p>
        <p className="mt-0.5 text-xs text-slate-600">{alert.device}</p>
      </div>

      <div className="text-right">
        <p className="text-2xl font-black leading-none text-white">
          {alert.value}
          <span className="ml-1 text-sm font-medium text-slate-500">
            {isBattery ? '%' : '°C'}
          </span>
        </p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          {isBattery ? 'Battery' : 'Temperature'}
        </p>
      </div>

      <div className="flex gap-2">
        {!alert.read && (
          <button
            onClick={onRead}
            title="Mark as read"
            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-300 transition hover:bg-emerald-400/15"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDismiss}
          title="Dismiss"
          className="rounded-xl border border-emerald-500/10 bg-black/20 p-2 text-slate-500 transition hover:border-emerald-400/25 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ThresholdSlider({ label, icon, value, display, min, max, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-400">
          {icon}
          {label}
        </span>
        <span className="font-black text-white">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-emerald-400"
      />
    </div>
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

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible : on ignore
  }
}
