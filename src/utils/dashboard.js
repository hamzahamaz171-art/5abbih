export const ZONE_CONFIG = {
  1: { name: 'Zone 1', label: 'Idle', color: '#8b5cf6' },
  2: { name: 'Zone 2', label: 'Light', color: '#0ea5e9' },
  3: { name: 'Zone 3', label: 'Moderate', color: '#eab308' },
  4: { name: 'Zone 4', label: 'Speed', color: '#f97316' },
  5: { name: 'Zone 5', label: 'Sprint', color: '#ef4444' },
};

export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return '0 km';
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(2) : km.toFixed(1)} km`;
}

export function formatSpeed(speed) {
  if (speed == null || Number.isNaN(speed)) return '0';
  return Number(speed).toFixed(1);
}

export function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(date = new Date()) {
  return {
    date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

export function gpsToPitch(lat, lng, bounds) {
  if (!bounds || lat == null || lng == null) return null;
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const latSpan = maxLat - minLat || 0.0001;
  const lngSpan = maxLng - minLng || 0.0001;
  return {
    x: Math.min(95, Math.max(5, ((lng - minLng) / lngSpan) * 100)),
    y: Math.min(95, Math.max(5, ((maxLat - lat) / latSpan) * 100)),
  };
}

export function computeBounds(positions) {
  const valid = positions.filter((p) => p.latitude != null && p.longitude != null);
  if (valid.length === 0) return null;
  return {
    minLat: Math.min(...valid.map((p) => p.latitude)),
    maxLat: Math.max(...valid.map((p) => p.latitude)),
    minLng: Math.min(...valid.map((p) => p.longitude)),
    maxLng: Math.max(...valid.map((p) => p.longitude)),
  };
}

export function emptyDashboard() {
  return {
    team: null,
    session: null,
    selectedPlayer: null,
    players: [],
    kpis: {
      totalPlayers: 0,
      connectedPlayers: 0,
      avgSpeed: 0,
      totalDistanceM: 0,
      playerLoad: 0,
      sprintCount: 0,
      avgBattery: 0,
    },
    sidebar: { playerTags: 0, gateways: 0 },
    topPlayers: [],
    speedOverTime: [],
    livePositions: [],
    heatmapCells: [],
    speedZones: [],
    events: [],
    devices: [],
    unreadAlerts: 0,
  };
}
