import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Radio,
  Shield,
  Wifi,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className="home-page">
      <video
        className="home-video"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/football-training-poster.jpg"
      >
        <source
          src="/videos/football-training.mp4"
          type="video/mp4"
        />
      </video>

      <div className="home-overlay" />
      <div className="home-gradient" />

      <div className="home-glow home-glow-left" />
      <div className="home-glow home-glow-right" />

      <header className="home-header">
        <div className="home-brand">
          <div className="home-brand-icon">
            <Shield size={24} />
          </div>

          <div>
            <h1>LIVE SPORT</h1>
            <p>PERFORMANCE TRACKER</p>
          </div>
        </div>

        <div className="home-header-actions">
          <button
            type="button"
            className="home-button home-button-secondary"
            onClick={() => navigate('/login')}
          >
            Se connecter
          </button>

          <button
            type="button"
            className="home-button home-button-primary home-header-signup"
            onClick={() => navigate('/signup')}
          >
            Créer un compte
          </button>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-content">
          <div className="home-live-badge">
            <Radio size={16} />
            Tracking sportif en temps réel
          </div>

          <h2 className="home-title">
            Performance
            <span>powered by data</span>
          </h2>

          <p className="home-description">
            Analysez la vitesse, la distance, l’accélération, la position GPS
            et la charge physique de vos joueurs grâce à une plateforme
            connectée aux capteurs ESP32, LoRa et Supabase.
          </p>

       
          <div className="home-features">
            <FeatureCard
              icon={<Activity size={22} />}
              title="Données en direct"
              text="Vitesse, distance, accélération et batterie actualisées en temps réel."
            />

            <FeatureCard
              icon={<BarChart3 size={22} />}
              title="Analyse sportive"
              text="Classement, graphiques, heatmap et indicateurs de performance."
            />

            <FeatureCard
              icon={<Wifi size={22} />}
              title="Capteurs connectés"
              text="Architecture compatible ESP32, LoRa et synchronisation Supabase."
            />
          </div>
        </div>

        <div className="home-live-card">
          <div className="home-live-card-header">
            <span>LIVE TELEMETRY</span>

            <span className="home-connected">
              <span />
              Connected
            </span>
          </div>

          <div className="home-live-card-grid">
            <Metric label="Speed" value="31.5 km/h" />
            <Metric label="Distance" value="7.00 km" />
            <Metric label="Players" value="12 online" />
            <Metric label="Battery" value="94%" />
          </div>
        </div>
      </section>

      <div className="home-scroll-indicator">
        <span />
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <article className="home-feature-card">
      <div className="home-feature-icon">
        {icon}
      </div>

      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div className="home-metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}