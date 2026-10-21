import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Shield,
  Unplug,
  UserRound,
  Wifi,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [trackingDevices, setTrackingDevices] = useState([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingPlayerId, setSavingPlayerId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const [
        playersResult,
        sensorsResult,
        trackingResult,
      ] = await Promise.all([
        supabase
          .from('players')
          .select(`
            id,
            name,
            number,
            position,
            photo_url,
            status
          `)
          .order('name', { ascending: true }),

        supabase
          .from('sensor_metadata')
          .select(`
            esp_id,
            player_id,
            status,
            last_seen_at
          `)
          .order('esp_id', { ascending: true }),

        supabase
          .from('live_tracking')
          .select('esp_id')
          .not('esp_id', 'is', null)
          .limit(1000),
      ]);

      if (playersResult.error) {
        throw playersResult.error;
      }

      if (sensorsResult.error) {
        throw sensorsResult.error;
      }

      if (trackingResult.error) {
        throw trackingResult.error;
      }

      setPlayers(playersResult.data ?? []);
      setSensors(sensorsResult.data ?? []);

      const detectedDevices = [
        ...new Set(
          (trackingResult.data ?? [])
            .map((row) => row.esp_id)
            .filter(Boolean)
        ),
      ];

      setTrackingDevices(detectedDevices);
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError.message ||
        'Impossible de charger les joueurs et les appareils.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allDeviceIds = useMemo(() => {
    const deviceIds = new Set();

    sensors.forEach((sensor) => {
      if (sensor.esp_id) {
        deviceIds.add(sensor.esp_id);
      }
    });

    trackingDevices.forEach((deviceId) => {
      if (deviceId) {
        deviceIds.add(deviceId);
      }
    });

    return Array.from(deviceIds).sort();
  }, [sensors, trackingDevices]);

  const sensorByPlayerId = useMemo(() => {
    const map = new Map();

    sensors.forEach((sensor) => {
      if (sensor.player_id) {
        map.set(sensor.player_id, sensor);
      }
    });

    return map;
  }, [sensors]);

  const playerByDeviceId = useMemo(() => {
    const map = new Map();

    sensors.forEach((sensor) => {
      if (sensor.esp_id && sensor.player_id) {
        map.set(sensor.esp_id, sensor.player_id);
      }
    });

    return map;
  }, [sensors]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) => {
      return (
        player.name?.toLowerCase().includes(normalizedSearch) ||
        player.id?.toLowerCase().includes(normalizedSearch) ||
        player.position?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [players, search]);

  async function assignDevice(playerId, deviceId) {
    setSavingPlayerId(playerId);
    setError('');
    setMessage('');

    try {
      /*
       * Retirer l'ancien appareil de ce joueur.
       */
      const { error: clearPlayerError } = await supabase
        .from('sensor_metadata')
        .update({
          player_id: null,
        })
        .eq('player_id', playerId);

      if (clearPlayerError) {
        throw clearPlayerError;
      }

      /*
       * Si le coach choisit "Aucun appareil",
       * on s'arrête après la désassociation.
       */
      if (!deviceId) {
        setMessage('Appareil retiré du joueur.');
        await loadData();
        return;
      }

      /*
       * Retirer cet appareil de son ancien joueur.
       * Un appareil ne doit appartenir qu'à un joueur.
       */
      const { error: clearDeviceError } = await supabase
        .from('sensor_metadata')
        .update({
          player_id: null,
        })
        .eq('esp_id', deviceId);

      if (clearDeviceError) {
        throw clearDeviceError;
      }

      /*
       * Créer ou mettre à jour l'association.
       */
      const { error: assignError } = await supabase
        .from('sensor_metadata')
        .upsert(
          {
            esp_id: deviceId,
            player_id: playerId,
            status: 'active',
          },
          {
            onConflict: 'esp_id',
          }
        );

      if (assignError) {
        throw assignError;
      }

      setMessage(
        `L'appareil ${deviceId} a été associé avec succès.`
      );

      await loadData();
    } catch (assignError) {
      console.error(assignError);

      setError(
        assignError.message ||
        "Impossible de modifier l'association de l'appareil."
      );
    } finally {
      setSavingPlayerId(null);
    }
  }

  function isOnline(lastSeenAt) {
    if (!lastSeenAt) {
      return false;
    }

    const lastSeenTimestamp = new Date(lastSeenAt).getTime();
    const now = Date.now();

    return now - lastSeenTimestamp < 30_000;
  }

  return (
    <div className="min-h-screen bg-[#07110b] text-slate-100">
      <header className="border-b border-green-900/60 bg-[#0b1710]/95 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-green-800/70 bg-green-950/50 text-green-300 hover:bg-green-900/60 transition-colors"
              title="Retour au dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-400" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">
                Device Assignments
              </h1>

              <p className="text-sm text-slate-400">
                Associez chaque débardeur connecté à un joueur
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-700/70 bg-green-600/10 text-green-300 hover:bg-green-600/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />
            Actualiser
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        <section className="relative overflow-hidden rounded-3xl border border-green-800/50 bg-gradient-to-br from-green-950 via-[#0d1d13] to-[#09110c] p-6 md:p-8 mb-7">
          <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute -left-28 -bottom-28 w-72 h-72 rounded-full bg-emerald-400/5 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-green-300 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full mb-4">
                <Wifi className="w-4 h-4" />
                Smart Vest Management
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white">
                Gestion des capteurs joueurs
              </h2>

              <p className="text-slate-400 mt-3 max-w-2xl leading-7">
                Vous pouvez changer le débardeur d’un joueur depuis cette
                page. Aucun changement n’est nécessaire dans le code Arduino.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Joueurs"
                value={players.length}
                icon={<UserRound className="w-5 h-5" />}
              />

              <StatCard
                label="Appareils"
                value={allDeviceIds.length}
                icon={<Cpu className="w-5 h-5" />}
              />

              <StatCard
                label="Associés"
                value={
                  sensors.filter((sensor) => sensor.player_id).length
                }
                icon={<CheckCircle2 className="w-5 h-5" />}
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {message}
          </div>
        )}

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-900/60 bg-[#0d1711] px-4 py-3">
          <Search className="w-5 h-5 text-green-500" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un joueur, un ID ou une position..."
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
          />
        </div>

        <section className="rounded-2xl border border-green-900/60 bg-[#0d1711] overflow-hidden">
          <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(260px,1.5fr)_minmax(230px,1fr)] gap-4 px-5 py-4 bg-green-950/40 border-b border-green-900/60 text-xs uppercase tracking-wider font-bold text-green-300">
            <div>Joueur</div>
            <div>Identifiant players.id</div>
            <div>Appareil associé</div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              Aucun joueur trouvé
            </div>
          ) : (
            <div className="divide-y divide-green-950">
              {filteredPlayers.map((player) => {
                const assignedSensor =
                  sensorByPlayerId.get(player.id);

                const assignedDevice =
                  assignedSensor?.esp_id ?? '';

                const saving =
                  savingPlayerId === player.id;

                return (
                  <div
                    key={player.id}
                    className="grid grid-cols-[minmax(180px,1.2fr)_minmax(260px,1.5fr)_minmax(230px,1fr)] gap-4 px-5 py-4 items-center hover:bg-green-950/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={player.name}
                          className="w-11 h-11 rounded-full object-cover border border-green-800"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-green-500/10 border border-green-700/50 flex items-center justify-center font-bold text-green-300">
                          {player.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          {player.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {player.number
                            ? `#${player.number}`
                            : 'Sans numéro'}
                          {' · '}
                          {player.position || 'Position non définie'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <code className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-green-900/70 bg-black/25 px-3 py-2 text-xs text-green-200">
                        {player.id}
                      </code>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <select
                          value={assignedDevice}
                          disabled={saving}
                          onChange={(event) =>
                            assignDevice(
                              player.id,
                              event.target.value
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-green-800/70 bg-[#08110b] px-4 py-3 pr-10 text-sm text-white outline-none focus:border-green-500 disabled:opacity-50"
                        >
                          <option value="">
                            Aucun appareil
                          </option>

                          {allDeviceIds.map((deviceId) => {
                            const assignedPlayerId =
                              playerByDeviceId.get(deviceId);

                            const assignedToAnotherPlayer =
                              assignedPlayerId &&
                              assignedPlayerId !== player.id;

                            const assignedPlayer =
                              players.find(
                                (candidate) =>
                                  candidate.id === assignedPlayerId
                              );

                            return (
                              <option
                                key={deviceId}
                                value={deviceId}
                              >
                                {deviceId}
                                {assignedToAnotherPlayer
                                  ? ` — ${assignedPlayer?.name ?? 'Déjà utilisé'}`
                                  : ''}
                              </option>
                            );
                          })}
                        </select>

                        <SettingsIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                      </div>

                      {assignedSensor ? (
                        <div
                          title={
                            isOnline(assignedSensor.last_seen_at)
                              ? 'Appareil connecté'
                              : 'Appareil hors ligne'
                          }
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                            isOnline(assignedSensor.last_seen_at)
                              ? 'bg-green-500/15 border-green-500/30 text-green-400'
                              : 'bg-slate-500/10 border-slate-600 text-slate-500'
                          }`}
                        >
                          <Wifi className="w-4 h-4" />
                        </div>
                      ) : (
                        <div
                          title="Aucun appareil"
                          className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700 bg-slate-900/50 text-slate-600"
                        >
                          <Unplug className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="min-w-[110px] rounded-2xl border border-green-700/30 bg-black/20 p-4 backdrop-blur-xl">
      <div className="text-green-400 mb-3">
        {icon}
      </div>

      <p className="text-2xl font-black text-white">
        {value}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        {label}
      </p>
    </div>
  );
}