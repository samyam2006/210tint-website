/**
 * Temporary "site paused" placeholder.
 *
 * This is shown in place of the real site while it is paused (see the
 * SITE_PAUSED flag in main.tsx). It intentionally exposes none of the real
 * site content. To bring the site back online, set SITE_PAUSED = false in
 * main.tsx and redeploy — this file can then be left in place for next time.
 */
export default function Paused() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 20px',
        background: '#000',
        color: '#fff',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div
          style={{
            fontSize: 13,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#0088ff',
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          210 Tint
        </div>
        <h1
          style={{
            fontSize: 'clamp(28px, 6vw, 44px)',
            lineHeight: 1.1,
            margin: '0 0 16px',
            fontWeight: 800,
          }}
        >
          Coming soon
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.65)',
            margin: 0,
          }}
        >
          Our website is getting a few finishing touches and will be back
          shortly. Thanks for your patience.
        </p>
      </div>
    </div>
  );
}
