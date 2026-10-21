export default function FootballPitch() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-pitch-dark via-pitch to-pitch-light" />

      {/* Grass stripes */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-[8.33%]"
            style={{
              left: `${i * 8.33}%`,
              background: i % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent',
            }}
          />
        ))}
      </div>

      {/* Pitch markings */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
        <rect x="20" y="20" width="360" height="560" fill="none" stroke="white" strokeWidth="2" />
        <line x1="20" y1="300" x2="380" y2="300" stroke="white" strokeWidth="2" />
        <circle cx="200" cy="300" r="50" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="200" cy="300" r="4" fill="white" />
        <rect x="120" y="20" width="160" height="70" fill="none" stroke="white" strokeWidth="2" />
        <rect x="120" y="510" width="160" height="70" fill="none" stroke="white" strokeWidth="2" />
        <rect x="155" y="20" width="90" height="30" fill="none" stroke="white" strokeWidth="2" />
        <rect x="155" y="550" width="90" height="30" fill="none" stroke="white" strokeWidth="2" />
      </svg>

      {/* Stadium glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-white/5 blur-3xl rounded-full" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}
