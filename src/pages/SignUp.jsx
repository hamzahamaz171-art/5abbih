import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';

const ROLES = ['Coach', 'Player', 'Admin', 'Analyste'];

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Coach');
  const [showPassword, setShowPassword] = useState(false);
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');
  const [playerTeam, setPlayerTeam] = useState('');
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setConfirmOpen(false);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const result = await signup({
      name,
      email,
      password,
      role,
      playerProfile: role === 'Player'
        ? {
          number: playerNumber,
          position: playerPosition,
          team: playerTeam,
          photoUrl: playerPhotoUrl,
        }
        : null,
    });
    setLoading(false);

    if (result.success) {
      setConfirmMessage(result.message);
      setConfirmOpen(true);
    } else {
      setError(result.error);
    }
  }

  function handleCloseConfirm() {
    setConfirmOpen(false);
    navigate('/login');
  }

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Rejoignez la plateforme de tracking football"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            {success}
          </div>
        )}

        <Field label="Nom complet" icon={<User className="w-4 h-4" />}>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom complet"
            className="auth-input"
          />
        </Field>

        <Field label="Email" icon={<Mail className="w-4 h-4" />}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@club.com"
            className="auth-input"
          />
        </Field>

        <Field label="Rôle">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="auth-input"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>

        {role === 'Player' && (
          <>
            <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-3 space-y-3">
              <p className="text-xs text-brand-blue font-semibold uppercase tracking-wide">Informations sportives</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Numéro de maillot">
                  <input
                    type="number"
                    min={1}
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(e.target.value)}
                    placeholder="Ex: 10"
                    className="auth-input"
                  />
                </Field>

                <Field label="Poste">
                  <input
                    type="text"
                    value={playerPosition}
                    onChange={(e) => setPlayerPosition(e.target.value)}
                    placeholder="Ex: Milieu"
                    className="auth-input"
                  />
                </Field>
              </div>

              <Field label="Equipe">
                <input
                  type="text"
                  value={playerTeam}
                  onChange={(e) => setPlayerTeam(e.target.value)}
                  placeholder="Ex: U19"
                  className="auth-input"
                />
              </Field>

              <Field label="Photo de profil (URL)">
                <input
                  type="url"
                  value={playerPhotoUrl}
                  onChange={(e) => setPlayerPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="auth-input"
                />
              </Field>
            </div>
          </>
        )}

        <Field label="Mot de passe" icon={<Lock className="w-4 h-4" />}>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 caractères"
              className="auth-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirmer le mot de passe" icon={<Lock className="w-4 h-4" />}>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="auth-input"
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-pitch hover:bg-pitch-light text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-pitch/20 mt-2"
        >
          <UserPlus className="w-5 h-5" />
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>

        <p className="text-center text-sm text-slate-400 pt-2">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-green-400 hover:text-green-300 font-medium">
            Se connecter
          </Link>
        </p>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-dark-card border border-dark-border shadow-xl overflow-hidden">
            <div className="p-5 bg-gradient-to-br from-brand-blue/15 via-dark-card to-dark-card">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Compte créé</h3>
                    <p className="text-sm text-slate-300 mt-1">Confirmation</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseConfirm}
                  className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-300"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm text-slate-200 leading-relaxed">{confirmMessage}</p>
              <div className="mt-5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCloseConfirm}
                  className="px-4 py-2 rounded-xl bg-pitch hover:bg-pitch-light text-white font-semibold transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}
