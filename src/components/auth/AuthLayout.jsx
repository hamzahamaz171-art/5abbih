import { Shield } from 'lucide-react';
import FootballPitch from './FootballPitch';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen w-full flex">
      {/* Left panel — football branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <FootballPitch />

        <div className="relative z-10 max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <span className="text-5xl">⚽</span>
          </div>

          <h1 className="text-4xl font-bold text-white tracking-wide mb-3">
            LIVE SPORT
            <span className="block text-2xl text-green-300 font-semibold mt-1">TRACKER</span>
          </h1>

          <p className="text-green-100/80 text-lg leading-relaxed mb-8">
            Suivez vos joueurs en temps réel. Analysez les performances sur le terrain comme un pro.
          </p>

          <div className="flex justify-center gap-8 text-center">
            <Stat label="Joueurs" value="22+" />
            <Stat label="Vitesse max" value="32 km/h" />
            <Stat label="Sessions" value="Live" />
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col bg-dark-bg min-h-screen">
        <div className="lg:hidden relative h-48 shrink-0">
          <FootballPitch />
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur rounded-xl border border-white/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white tracking-wider">LIVE SPORT</p>
              <p className="text-xs text-green-300 tracking-widest">TRACKER</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-slate-400 mt-2">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-green-200/70 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
