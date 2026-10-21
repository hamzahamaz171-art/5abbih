import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Filter, Shield, Menu, ChevronDown, LogOut, CheckCircle2, Trash2, XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSelectedPlayer } from '../context/SelectedPlayerContext';
import { useTheme } from '../context/ThemeContext';

export default function Players() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { selectedPlayerId, setSelectedPlayerId, clearSelectedPlayer } = useSelectedPlayer();
  const { isLight } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    setDeletingId(null);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('role', 'Player')
      .order('name');

    if (profilesError) {
      setError("Impossible de charger les profils joueurs.");
      setLoading(false);
      return;
    }

    const playerIds = profiles.map((profile) => profile.id);
    let playerRows = [];

    if (playerIds.length) {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, user_id, number, position, photo_url, team_id, status, teams(name)')
        .in('user_id', playerIds);

      if (playersError) {
        setError("Impossible de charger les données sportives des joueurs.");
        setLoading(false);
        return;
      }

      playerRows = playersData ?? [];
    }

    const playerByUser = new Map(playerRows.map((p) => [p.user_id, p]));
    const mergedPlayers = profiles
      .map((profile) => {
        const details = playerByUser.get(profile.id);
        if (!details) return null;

        return {
  // Identifiant principal utilisé par le dashboard.
  // Il correspond à players.id et aux colonnes player_id.
  id: details.id,

  // Identifiant du compte utilisateur dans profiles/auth.users.
  profileId: profile.id,

  name: profile.name,
  role: profile.role,

  // On le conserve pour éviter de modifier le code de suppression.
  playerRowId: details.id,

  number: details.number ?? null,
  position: details.position ?? 'Non défini',
  photoUrl: details.photo_url ?? '',
  status: details.status ?? 'active',
  teamId: details.team_id ?? null,
  teamName: details?.teams?.name ?? 'Sans équipe',
};
      })
      .filter(Boolean);

    setPlayers(mergedPlayers);
    setLoading(false);
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CO';

  const positions = useMemo(() => {
    const values = Array.from(new Set(players.map((p) => p.position).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [players]);

  const teams = useMemo(() => {
    const values = Array.from(new Set(players.map((p) => p.teamName).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players.filter((player) => {
      const searchMatches = !query
        || player.name.toLowerCase().includes(query)
        || String(player.number ?? '').includes(query)
        || player.position.toLowerCase().includes(query)
        || player.teamName.toLowerCase().includes(query);
      const positionMatches = positionFilter === 'all' || player.position === positionFilter;
      const teamMatches = teamFilter === 'all' || player.teamName === teamFilter;
      return searchMatches && positionMatches && teamMatches;
    });
  }, [players, search, positionFilter, teamFilter]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleSelectPlayer(player) {
    setSelectedPlayerId(player.id);
    navigate('/dashboard');
  }

  const isCoach = user?.role === 'Coach';

  async function handleDeletePlayer(player) {
    if (!isCoach) return;
    if (!player.playerRowId) return;

    const ok = window.confirm(`Supprimer ${player.name} ? Cette action supprime la fiche dans la table players.`);
    if (!ok) return;

    try {
      setDeletingId(player.id);
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', player.playerRowId);

      if (deleteError) {
        setError(deleteError.message || "Suppression impossible.");
        setDeletingId(null);
        return;
      }

      if (selectedPlayerId === player.id) {
        clearSelectedPlayer();
      }

      await loadPlayers();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={`relative flex h-screen w-full font-sans overflow-hidden ${isLight ? 'bg-gradient-to-b from-sky-50 via-white to-slate-100 text-slate-900' : 'bg-gradient-to-b from-slate-950 via-slate-900 to-dark-bg text-slate-200'}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${isLight ? 'opacity-100 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.12),transparent_52%),radial-gradient(ellipse_at_70%_25%,_rgba(59,130,246,0.10),transparent_42%)]' : 'opacity-80 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.26),transparent_55%),radial-gradient(ellipse_at_70%_25%,_rgba(14,165,233,0.14),transparent_45%)]'}`}
      />
      <aside className="relative z-10 w-64 shrink-0 bg-dark-card border-r border-dark-border flex flex-col justify-between">
        <div>
          <div className="p-5 flex items-center justify-between border-b border-dark-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-blue/20 rounded-lg">
                <Shield className="w-5 h-5 text-brand-blue" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-wider leading-tight">LIVE SPORT</h1>
                <p className="text-[10px] text-slate-400 tracking-widest">TRACKER</p>
              </div>
            </div>
            <button className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <nav className="mt-6 px-4 space-y-1">
            <button onClick={() => navigate('/dashboard')} className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200">
              <Users className="w-5 h-5 shrink-0" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm bg-brand-blue/90 text-white">
              <Users className="w-5 h-5 shrink-0" />
              <span className="font-medium">Players</span>
            </button>
          </nav>
        </div>

        <div className="p-4">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-full flex items-center justify-between p-3 bg-dark-bg rounded-xl border border-dark-border hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-pitch flex items-center justify-center text-xs font-bold text-white">
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

      <main className="relative z-10 flex-1 min-w-0 overflow-y-auto p-6 lg:p-8">
        <header className="mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-gradient-to-br from-brand-blue/15 via-dark-card to-dark-card p-5 lg:p-6">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-blue/20 rounded-full blur-2xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Players</h2>
                <p className="text-sm text-slate-300 mt-1">
                  Sélectionnez un joueur pour filtrer le dashboard en temps réel.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill text={`${filteredPlayers.length} joueurs`} tone="blue" />
                {selectedPlayerId && <Pill text="Mode joueur sélectionné" tone="green" />}
                {isCoach && <Pill text="Coach: gestion activée" tone="amber" />}
              </div>
            </div>
          </div>
        </header>

        <div className="bg-dark-card/70 backdrop-blur border border-dark-border rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un joueur, numéro, poste..."
                className="w-full bg-dark-bg/60 border border-dark-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
              />
            </label>

            <label className="relative">
              <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full bg-dark-bg/60 border border-dark-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/60 appearance-none"
              >
                <option value="all">Tous les postes</option>
                {positions.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </label>

            <label className="relative">
              <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full bg-dark-bg/60 border border-dark-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/60 appearance-none"
              >
                <option value="all">Toutes les équipes</option>
                {teams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </label>
          </div>

          {(search || positionFilter !== 'all' || teamFilter !== 'all') && (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPositionFilter('all');
                  setTeamFilter('all');
                }}
                className="text-xs text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/50 border border-dark-border"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-52 bg-dark-card/60 border border-dark-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => {
              const isSelected = selectedPlayerId === player.id;
              const status = player.status || 'active';
              const statusMeta = getStatusMeta(status);
              return (
                <div
                  key={player.id}
                  className={`group relative bg-dark-card/60 backdrop-blur border rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-600 ${isSelected ? 'border-brand-blue shadow-[0_0_0_1px_rgba(59,130,246,0.55)]' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPlayer(player)}
                    className="text-left w-full"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {player.photoUrl ? (
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            className="w-12 h-12 rounded-full object-cover border border-slate-700 shadow-[0_0_20px_rgba(59,130,246,0.18)]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue/25 to-slate-700/60 flex items-center justify-center text-sm font-bold text-slate-200 border border-slate-600">
                            {player.number != null ? `#${player.number}` : player.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{player.name}</p>
                          <p className="text-xs text-slate-400 truncate">{player.teamName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div className="w-9 h-9 rounded-xl bg-brand-blue/15 border border-brand-blue/40 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-brand-blue" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Chip text={player.number != null ? `#${player.number}` : 'N° —'} tone="blue" />
                      <Chip text={player.position || 'Poste —'} tone="purple" />
                      <Chip text={player.teamName || 'Équipe —'} tone="slate" />
                      <Chip text={statusMeta.label} tone={statusMeta.tone} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Numéro" value={player.number != null ? String(player.number) : '—'} />
                      <Stat label="Poste" value={player.position || '—'} />
                      <Stat label="Équipe" value={player.teamName} />
                      <Stat label="Statut" value={statusMeta.label} />
                    </div>
                  </button>

                  {isCoach && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeletePlayer(player);
                        }}
                        disabled={!player.playerRowId || deletingId === player.id}
                        className={`p-2 rounded-xl border transition-colors ${
                          !player.playerRowId
                            ? 'bg-slate-800/40 border-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15 hover:border-red-500/45'
                        }`}
                        title={!player.playerRowId ? "Aucune fiche dans la table players à supprimer" : "Supprimer le joueur"}
                      >
                        {deletingId === player.id ? (
                          <XCircle className="w-4 h-4 animate-pulse" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredPlayers.length === 0 && (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-xl">
            <Users className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">Aucun joueur trouvé</p>
            <p className="text-slate-500 text-sm mt-1">Essayez un autre filtre ou modifiez votre recherche.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-dark-bg border border-dark-border rounded-lg px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-100 truncate">{value}</p>
    </div>
  );
}

function Chip({ text, tone }) {
  const classes = (() => {
    switch (tone) {
      case 'blue':
        return 'bg-brand-blue/15 border-brand-blue/35 text-brand-blue';
      case 'purple':
        return 'bg-brand-purple/15 border-brand-purple/35 text-brand-purple';
      case 'green':
        return 'bg-green-500/15 border-green-500/35 text-green-400';
      case 'amber':
        return 'bg-amber-500/15 border-amber-500/35 text-amber-300';
      case 'red':
        return 'bg-red-500/15 border-red-500/35 text-red-400';
      default:
        return 'bg-slate-800/40 border-slate-700 text-slate-300';
    }
  })();

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${classes}`}>
      {text}
    </span>
  );
}

function Pill({ text, tone }) {
  const classes = (() => {
    switch (tone) {
      case 'blue':
        return 'bg-brand-blue/15 border-brand-blue/35 text-brand-blue';
      case 'green':
        return 'bg-green-500/15 border-green-500/35 text-green-400';
      case 'amber':
        return 'bg-amber-500/15 border-amber-500/35 text-amber-300';
      default:
        return 'bg-slate-800/40 border-slate-700 text-slate-300';
    }
  })();

  return (
    <span className={`inline-flex items-center text-xs px-3 py-1.5 rounded-xl border ${classes}`}>
      {text}
    </span>
  );
}

function getStatusMeta(status) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { label: 'Actif', tone: 'green' };
  if (s === 'injured') return { label: 'Blessé', tone: 'amber' };
  if (s === 'inactive') return { label: 'Inactif', tone: 'red' };
  return { label: status || 'active', tone: 'blue' };
}
