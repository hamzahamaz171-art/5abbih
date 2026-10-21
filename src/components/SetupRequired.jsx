export default function SetupRequired() {
  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-dark-card border border-dark-border rounded-2xl p-8">
        <div className="text-center mb-6">
          <span className="text-5xl">⚽</span>
          <h1 className="text-2xl font-bold text-white mt-4">Configuration Supabase requise</h1>
          <p className="text-slate-400 mt-2 text-sm">
            L&apos;écran blanc vient du fichier <code className="text-green-400">.env</code> manquant ou incomplet.
          </p>
        </div>

        <ol className="space-y-4 text-sm text-slate-300">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-pitch text-white text-xs font-bold flex items-center justify-center">1</span>
            <span>Crée un projet sur <strong className="text-white">supabase.com</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-pitch text-white text-xs font-bold flex items-center justify-center">2</span>
            <span>Copie <code className="text-green-400">.env.example</code> vers <code className="text-green-400">.env</code> à la racine du projet</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-pitch text-white text-xs font-bold flex items-center justify-center">3</span>
            <span>Remplis tes clés depuis <strong className="text-white">Project Settings → API</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-pitch text-white text-xs font-bold flex items-center justify-center">4</span>
            <span>Exécute <code className="text-green-400">supabase/schema.sql</code> dans le SQL Editor</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-pitch text-white text-xs font-bold flex items-center justify-center">5</span>
            <span>Redémarre le serveur : <code className="text-green-400">npm run dev</code></span>
          </li>
        </ol>

        <div className="mt-6 p-4 bg-dark-bg rounded-xl border border-dark-border text-xs font-mono text-slate-400">
          <p className="text-slate-500 mb-2"># .env</p>
          <p>VITE_SUPABASE_URL=https://xxx.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=eyJhbG...</p>
        </div>
      </div>
    </div>
  );
}
