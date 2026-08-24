export default function Hero() {
  return (
    <div className="hero">
      <div className="hero-inner">
        <span className="eyebrow">✦ Yewonie CEGs ✦</span>
        <h1>Seu group order, organizado</h1>
        <p>Controle de vendas e CEGs para a comunidade da Ana. Status das CEGs, pagamentos, claims e envios.</p>
        <div className="hero-socials">
          <a
            className="hero-social-link"
            href="https://twitter.com/y_ewonie"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.6l-5.2-6.8L5.7 22H2.4l7.7-8.8L1 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
            </svg>
            X
          </a>
          <a
            className="hero-social-link"
            href="https://instagram.com/y.ewonie"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
