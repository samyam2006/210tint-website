import { useState, useEffect, useRef, useCallback } from 'react';

/* ── SCROLL REVEAL ── */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('v'); obs.unobserve(e.target); } }), { threshold: 0.08 });
    document.querySelectorAll('.rv,.rv-s,.rv-l,.rv-r,.rv-blur,.rv-rot').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  });
}

/* ── SCROLL-TRIGGERED COUNTER (for section dividers) ── */
function useScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const fn = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, 1 - rect.top / window.innerHeight));
      setProgress(p);
    };
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return { ref, progress };
}

/* ── ANIMATED SECTION DIVIDER ── */
function SectionDivider({ variant = 'line' }: { variant?: 'line' | 'dots' | 'glow' }) {
  const { ref, progress } = useScrollProgress();
  if (variant === 'dots') {
    return (
      <div ref={ref} style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '40px 0' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#6c63ff',
            opacity: progress > (i * 0.15 + 0.2) ? 0.6 : 0.08,
            transform: `scale(${progress > (i * 0.15 + 0.2) ? 1 : 0.5})`,
            transition: 'all 0.6s cubic-bezier(.16,1,.3,1)',
            transitionDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
    );
  }
  if (variant === 'glow') {
    return (
      <div ref={ref} style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: `${Math.min(progress * 150, 100)}%`, maxWidth: 600, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(108,99,255,0.4), transparent)',
          transition: 'width 0.3s ease',
        }} />
      </div>
    );
  }
  return (
    <div ref={ref} style={{ padding: '20px 28px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: `${Math.min(progress * 120, 100)}%`, maxWidth: 200, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

/* ── PARALLAX SCROLL ELEMENT ── */
function ScrollRevealSection({ children, direction = 'up', delay = 0 }: { children: React.ReactNode; direction?: 'up' | 'left' | 'right' | 'scale'; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const transforms: Record<string, string> = {
    up: visible ? 'translateY(0)' : 'translateY(60px)',
    left: visible ? 'translateX(0)' : 'translateX(-60px)',
    right: visible ? 'translateX(0)' : 'translateX(60px)',
    scale: visible ? 'scale(1)' : 'scale(0.9)',
  };
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: transforms[direction],
      transition: `all 1s cubic-bezier(.16,1,.3,1) ${delay}s`,
    }}>{children}</div>
  );
}

/* ── SCROLL PROGRESS BAR ── */
function ScrollBar() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const fn = () => { const h = document.documentElement.scrollHeight - window.innerHeight; setW(h > 0 ? (window.scrollY / h) * 100 : 0); };
    window.addEventListener('scroll', fn, { passive: true }); return () => window.removeEventListener('scroll', fn);
  }, []);
  return <div id="scroll-bar" style={{ width: `${w}%` }} />;
}

/* ── ANIMATED COUNTER ── */
function Counter({ end, suffix = '', decimals = 0 }: { end: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / 2200, 1);
          const ease = 1 - Math.pow(1 - p, 4);
          setVal(parseFloat((ease * end).toFixed(decimals)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, decimals]);
  return <span ref={ref}>{decimals > 0 ? val.toFixed(decimals) : val}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════
   THREE.JS HERO — GLASS TINT PANELS + PARTICLES
   Rotating translucent panels with glow particles
   ═══════════════════════════════════════════════════ */
function GlassScene() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let w = (c.width = c.offsetWidth * (window.devicePixelRatio > 1 ? 2 : 1));
    let h = (c.height = c.offsetHeight * (window.devicePixelRatio > 1 ? 2 : 1));
    let mouse = { x: w / 2, y: h / 2 };
    let time = 0;

    // Glass panels
    interface Panel { x: number; y: number; w: number; h: number; angle: number; speed: number; opacity: number; drift: number }
    const panels: Panel[] = [];
    for (let i = 0; i < 8; i++) {
      panels.push({
        x: Math.random() * w, y: Math.random() * h,
        w: 60 + Math.random() * 200, h: 80 + Math.random() * 300,
        angle: Math.random() * Math.PI * 0.3 - 0.15,
        speed: 0.001 + Math.random() * 0.003,
        opacity: 0.02 + Math.random() * 0.04,
        drift: Math.random() * 0.15,
      });
    }

    // Particles
    interface Dot { x: number; y: number; vx: number; vy: number; r: number; o: number; pulse: number }
    const dots: Dot[] = [];
    const dotCount = Math.min(Math.floor((w * h) / 15000), 90);
    for (let i = 0; i < dotCount; i++) {
      dots.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2.5 + 0.5, o: Math.random() * 0.6 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      time += 0.008;
      ctx.clearRect(0, 0, w, h);

      // Glass panels
      panels.forEach((p) => {
        ctx.save();
        ctx.translate(p.x + Math.sin(time * 0.5 + p.drift * 10) * 30, p.y + Math.cos(time * 0.3 + p.drift * 5) * 20);
        ctx.rotate(p.angle + Math.sin(time * p.speed * 50) * 0.05);

        // Panel body
        const grad = ctx.createLinearGradient(-p.w / 2, -p.h / 2, p.w / 2, p.h / 2);
        grad.addColorStop(0, `rgba(108,99,255,${p.opacity})`);
        grad.addColorStop(0.5, `rgba(139,131,255,${p.opacity * 1.5})`);
        grad.addColorStop(1, `rgba(108,99,255,${p.opacity * 0.5})`);
        ctx.fillStyle = grad;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

        // Panel edge glow
        ctx.strokeStyle = `rgba(108,99,255,${p.opacity * 2})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      // Connections between nearby dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(108,99,255,${0.08 * (1 - dist / 180)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Dots
      dots.forEach((d) => {
        // Mouse interaction
        const mdx = d.x - mouse.x;
        const mdy = d.y - mouse.y;
        const md = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < 250 && md > 0) {
          const force = (250 - md) / 250 * 0.4;
          d.vx += (mdx / md) * force;
          d.vy += (mdy / md) * force;
        }
        d.vx *= 0.97; d.vy *= 0.97;
        d.x += d.vx; d.y += d.vy;
        d.pulse += 0.02;
        if (d.x < 0) d.x = w; if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;

        const pulsedO = d.o * (0.6 + 0.4 * Math.sin(d.pulse));
        // Glow
        const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4);
        grd.addColorStop(0, `rgba(108,99,255,${pulsedO * 0.6})`);
        grd.addColorStop(1, 'rgba(108,99,255,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(d.x - d.r * 4, d.y - d.r * 4, d.r * 8, d.r * 8);
        // Core
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,131,255,${pulsedO})`;
        ctx.fill();
      });

      // Large ambient glow that follows mouse
      const mgrd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 350);
      mgrd.addColorStop(0, 'rgba(108,99,255,0.04)');
      mgrd.addColorStop(1, 'rgba(108,99,255,0)');
      ctx.fillStyle = mgrd;
      ctx.fillRect(mouse.x - 350, mouse.y - 350, 700, 700);

      raf = requestAnimationFrame(draw);
    };
    draw();

    const onR = () => {
      w = c.width = c.offsetWidth * (window.devicePixelRatio > 1 ? 2 : 1);
      h = c.height = c.offsetHeight * (window.devicePixelRatio > 1 ? 2 : 1);
    };
    const onM = (e: MouseEvent) => {
      const rect = c.getBoundingClientRect();
      const scaleX = w / rect.width;
      const scaleY = h / rect.height;
      mouse.x = (e.clientX - rect.left) * scaleX;
      mouse.y = (e.clientY - rect.top) * scaleY;
    };
    window.addEventListener('resize', onR);
    window.addEventListener('mousemove', onM);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR); window.removeEventListener('mousemove', onM); };
  }, []);

  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }} />;
}

/* ── HERO VIDEO BACKGROUND (dual video crossfade with image fallback) ── */
function HeroBackground() {
  const videos = ['/hero2.mp4', '/hero.mp4'];
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const imgs = [
    '/cars/lambo-urus.png',
    '/cars/snowy-c63.png',
    '/cars/mercedes-cla.png',
    '/cars/snowy-m8.png',
  ];
  const [imgIdx, setImgIdx] = useState(0);
  // Image fallback cycling
  useEffect(() => {
    if (videoLoaded) return;
    const t = setInterval(() => setImgIdx((i) => (i + 1) % imgs.length), 5000);
    return () => clearInterval(t);
  }, [videoLoaded]);
  // Video crossfade cycling (every 10s)
  useEffect(() => {
    if (!videoLoaded) return;
    const t = setInterval(() => setActiveVideo((v) => (v + 1) % videos.length), 10000);
    return () => clearInterval(t);
  }, [videoLoaded]);
  const videoStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    minWidth: '100%', minHeight: '100%',
    width: 'auto', height: 'auto',
    objectFit: 'cover',
    filter: 'saturate(0.6) brightness(0.5)',
    opacity: active && videoLoaded ? 1 : 0,
    transition: 'opacity 1.5s ease-in-out',
  });
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      {/* Image fallback */}
      {!videoLoaded && imgs.map((src, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === imgIdx ? 0.35 : 0,
          transition: 'opacity 1.5s ease-in-out',
          animation: i === imgIdx ? 'panZoom 8s ease-in-out forwards' : 'none',
          filter: 'saturate(0.5) brightness(0.7)',
        }} />
      ))}
      {/* Video 1 */}
      <video autoPlay muted loop playsInline onCanPlay={() => setVideoLoaded(true)} style={videoStyle(activeVideo === 0)}>
        <source src={videos[0]} type="video/mp4" />
      </video>
      {/* Video 2 */}
      <video autoPlay muted loop playsInline style={videoStyle(activeVideo === 1)}>
        <source src={videos[1]} type="video/mp4" />
      </video>
      {/* Overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,5,7,0.82) 0%, rgba(5,5,7,0.4) 50%, rgba(5,5,7,0.7) 100%)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to top, var(--bg), transparent)', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '20%', background: 'linear-gradient(to bottom, rgba(5,5,7,0.5), transparent)', zIndex: 1 }} />
    </div>
  );
}

/* ── PARALLAX SECTION WRAPPER ── */
function ParallaxBg({ children, offset = 0.3 }: { children: React.ReactNode; offset?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      setY(center * offset);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [offset]);
  return <div ref={ref} style={{ transform: `translateY(${y}px)`, transition: 'transform 0.1s linear' }}>{children}</div>;
}

/* ═══════════════════════════════════════════════════
   LOADING SCREEN
   ═══════════════════════════════════════════════════ */
/* ═══ LOADING SCREEN (CSS-driven, no stuck states) ═══ */
function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="loader-screen" style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#050507',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: 'loaderFadeOut 0.6s ease 2.2s forwards',
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)', pointerEvents: 'none', animation: 'loaderGlow 2s ease infinite' }} />
      {/* Logo */}
      <div style={{ animation: 'loaderLogoIn 0.8s cubic-bezier(.16,1,.3,1) 0.2s both' }}>
        <img src="/210tintlogo.jpeg" alt="210 Auto Customs" style={{ height: 120, width: 'auto', objectFit: 'contain' }} />
      </div>
      {/* Loading bar */}
      <div style={{ width: 140, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, marginTop: 32, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #6c63ff, #a78bfa, #6c63ff)', backgroundSize: '200% auto', animation: 'loaderBar 1.4s cubic-bezier(.16,1,.3,1) 0.4s both, shimmer 2s linear infinite' }} />
      </div>
      {/* Tagline */}
      <p style={{ fontFamily: 'Inter', fontSize: 12, letterSpacing: '4px', textTransform: 'uppercase', color: '#4a4a5a', marginTop: 20, animation: 'loaderLogoIn 0.6s ease 0.8s both' }}>
        Mobile Nano-Ceramic Specialists
      </p>
      {/* Decorative line accents */}
      <div style={{ position: 'absolute', top: '50%', left: '10%', width: 60, height: 1, background: 'linear-gradient(90deg, transparent, rgba(108,99,255,0.15))', animation: 'loaderLogoIn 1s ease 0.6s both' }} />
      <div style={{ position: 'absolute', top: '50%', right: '10%', width: 60, height: 1, background: 'linear-gradient(270deg, transparent, rgba(108,99,255,0.15))', animation: 'loaderLogoIn 1s ease 0.6s both' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CURSOR GLOW (follows mouse globally)
   ═══════════════════════════════════════════════════ */
function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.left = e.clientX + 'px';
        ref.current.style.top = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', fn, { passive: true });
    return () => window.removeEventListener('mousemove', fn);
  }, []);
  return (
    <div ref={ref} style={{
      position: 'fixed', width: 500, height: 500,
      borderRadius: '50%', pointerEvents: 'none', zIndex: 9998,
      background: 'radial-gradient(circle, rgba(108,99,255,0.04) 0%, rgba(108,99,255,0.015) 30%, transparent 70%)',
      transform: 'translate(-50%, -50%)',
      transition: 'left 0.15s ease, top 0.15s ease',
      left: '-100px', top: '-100px',
    }} />
  );
}

/* ═══════════════════════════════════════════════════
   SERVICE AREA MAP — SVG DMV region
   ═══════════════════════════════════════════════════ */
function ServiceAreaMap() {
  const [active, setActive] = useState<string | null>(null);
  // Hub: Columbia, MD at (350, 270). Scale ≈ 2.5 px per mile.
  // Inner ring: 50 mi (125 px). Outer ring: 80 mi (200 px).
  type Loc = { id: string; name: string; x: number; y: number; lp?: 't'|'b'|'l'|'r'; far?: boolean; hub?: boolean };
  const locations: Loc[] = [
    { id: 'columbia', name: 'Columbia, MD', x: 350, y: 270, hub: true },
    // North / Northeast
    { id: 'york', name: 'York, PA', x: 335, y: 110, lp: 't' },
    { id: 'westminster', name: 'Westminster', x: 305, y: 200, lp: 't' },
    { id: 'baltimore', name: 'Baltimore', x: 380, y: 200, lp: 't' },
    { id: 'belair', name: 'Bel Air', x: 450, y: 175, lp: 't' },
    { id: 'wilmington', name: 'Wilmington, DE', x: 535, y: 145, lp: 't' },
    // East
    { id: 'annapolis', name: 'Annapolis', x: 425, y: 295, lp: 'r' },
    { id: 'easton', name: 'Easton', x: 525, y: 305, lp: 't' },
    { id: 'oceancity', name: 'Ocean City', x: 660, y: 305, lp: 't', far: true },
    // South / Southeast
    { id: 'waldorf', name: 'Waldorf', x: 375, y: 370, lp: 'r' },
    { id: 'stmarys', name: "St. Mary's", x: 445, y: 465, lp: 'b' },
    // South-Southwest (DC + close NoVA)
    { id: 'dc', name: 'Washington, DC', x: 330, y: 345, lp: 'l' },
    { id: 'arlington', name: 'Arlington', x: 290, y: 365, lp: 'l' },
    { id: 'alexandria', name: 'Alexandria', x: 320, y: 395, lp: 'r' },
    // Southwest (NoVA outer)
    { id: 'fairfax', name: 'Fairfax', x: 250, y: 360, lp: 'l' },
    { id: 'manassas', name: 'Manassas', x: 215, y: 395, lp: 'l' },
    { id: 'fredericksburg', name: 'Fredericksburg', x: 260, y: 465, lp: 'b' },
    // West
    { id: 'leesburg', name: 'Leesburg', x: 215, y: 285, lp: 'l' },
    { id: 'frederick', name: 'Frederick', x: 250, y: 240, lp: 'l' },
    { id: 'hagerstown', name: 'Hagerstown', x: 130, y: 225, lp: 'l' },
  ];
  const labelOffsets = {
    t: { dx: 0, dy: -10, anchor: 'middle' as const },
    b: { dx: 0, dy: 16, anchor: 'middle' as const },
    l: { dx: -8, dy: 3, anchor: 'end' as const },
    r: { dx: 8, dy: 3, anchor: 'start' as const },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <svg viewBox="40 60 660 470" style={{ width: '100%', maxWidth: 720, height: 'auto' }}>
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(108,99,255,0.18)" />
            <stop offset="55%" stopColor="rgba(108,99,255,0.05)" />
            <stop offset="100%" stopColor="rgba(108,99,255,0)" />
          </radialGradient>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(108,99,255,0.55)" />
            <stop offset="100%" stopColor="rgba(108,99,255,0)" />
          </radialGradient>
        </defs>

        {/* Background glow */}
        <circle cx={350} cy={270} r={260} fill="url(#mapGlow)" />

        {/* Coverage radius rings */}
        <circle cx={350} cy={270} r={125} fill="none" stroke="rgba(108,99,255,0.18)" strokeWidth={1} strokeDasharray="2 5" />
        <circle cx={350} cy={270} r={200} fill="none" stroke="rgba(108,99,255,0.28)" strokeWidth={1.2} strokeDasharray="4 7" />

        {/* Radius labels */}
        <text x={350} y={138} textAnchor="middle" style={{ fontSize: 8, fill: 'rgba(108,99,255,0.55)', fontFamily: 'Inter', fontWeight: 700, letterSpacing: '2.5px' }}>~80 MI RADIUS</text>
        <text x={350} y={400} textAnchor="middle" style={{ fontSize: 7, fill: 'rgba(108,99,255,0.4)', fontFamily: 'Inter', fontWeight: 700, letterSpacing: '2px' }}>~50 MI</text>

        {/* Connection lines from hub to each location */}
        {locations.filter(l => !l.hub).map(l => (
          <line key={`ln-${l.id}`} x1={350} y1={270} x2={l.x} y2={l.y}
            stroke={l.far ? 'rgba(108,99,255,0.06)' : 'rgba(108,99,255,0.1)'} strokeWidth={1} strokeDasharray="1 3" />
        ))}

        {/* Hub glow */}
        <circle cx={350} cy={270} r={45} fill="url(#hubGlow)" />

        {/* Location pins */}
        {locations.map(l => {
          if (l.hub) {
            return (
              <g key={l.id}>
                <circle cx={l.x} cy={l.y} r={9} fill="#6c63ff" opacity={0.9}>
                  <animate attributeName="r" values="9;14;9" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.35;0.9" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx={l.x} cy={l.y} r={5} fill="#fff" />
                <text x={l.x} y={l.y - 18} textAnchor="middle" style={{ fontSize: 12, fill: '#fff', fontFamily: 'Space Grotesk', fontWeight: 700 }}>Columbia, MD</text>
                <text x={l.x} y={l.y + 24} textAnchor="middle" style={{ fontSize: 8, fill: '#6c63ff', fontFamily: 'Inter', fontWeight: 700, letterSpacing: '2.5px' }}>● HOME BASE</text>
              </g>
            );
          }
          const off = labelOffsets[l.lp || 't'];
          const isActive = active === l.id;
          return (
            <g key={l.id} onMouseEnter={() => setActive(l.id)} onMouseLeave={() => setActive(null)} style={{ cursor: 'pointer' }}>
              <circle cx={l.x} cy={l.y} r={isActive ? 5.5 : 3.5}
                fill={isActive ? '#6c63ff' : 'rgba(108,99,255,0.7)'}
                stroke={isActive ? '#fff' : 'rgba(108,99,255,0.4)'} strokeWidth={1}
                style={{ transition: 'all 0.3s' }} />
              <text x={l.x + off.dx} y={l.y + off.dy} textAnchor={off.anchor}
                style={{ fontSize: 9.5, fill: isActive ? '#fff' : '#8e8ea0', fontFamily: 'Inter', fontWeight: isActive ? 700 : 500, transition: 'all 0.3s', pointerEvents: 'none' }}>
                {l.name}
              </text>
            </g>
          );
        })}
      </svg>
      {active && (
        <div style={{
          padding: '12px 24px', borderRadius: 4, background: 'rgba(108,99,255,0.08)',
          border: '1px solid rgba(108,99,255,0.2)', animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{locations.find(l => l.id === active)?.name}</span>
          <span style={{ fontSize: 12, color: '#8e8ea0', marginLeft: 12 }}>We come to you</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FILM TINT SIMULATOR
   ═══════════════════════════════════════════════════ */
function TintSimulator() {
  const [tint, setTint] = useState(35);
  const vlt = 100 - tint;
  const windowOpacity = tint / 100;
  const presets = [
    { label: '70%', value: 70, desc: 'Barely noticeable' },
    { label: '50%', value: 50, desc: 'Light shade' },
    { label: '35%', value: 35, desc: 'MD legal front' },
    { label: '20%', value: 20, desc: 'Popular choice' },
    { label: '5%', value: 5, desc: 'Limo dark' },
  ];
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Quick presets */}
      <div className="rv" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button key={p.value} onClick={() => setTint(100 - p.value)} style={{
            padding: '10px 20px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.3s',
            background: vlt === p.value ? 'rgba(108,99,255,0.15)' : '#0a0a0f',
            border: vlt === p.value ? '1px solid rgba(108,99,255,0.4)' : '1px solid rgba(255,255,255,0.04)',
            color: vlt === p.value ? '#fff' : '#8e8ea0',
          }}>
            <span style={{ display: 'block', fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 800 }}>{p.label}</span>
            <span style={{ fontSize: 12, color: '#4a4a5a' }}>{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Main simulator area */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', background: 'linear-gradient(180deg, #0d0d14 0%, #080810 100%)' }}>
        {/* Ambient glow behind car */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Car SVG - more detailed sedan */}
        <div style={{ padding: '40px 40px 20px', position: 'relative' }}>
          <svg viewBox="0 0 500 220" style={{ width: '100%', height: 'auto', maxHeight: 280 }}>
            <defs>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a2a35" />
                <stop offset="100%" stopColor="#18181f" />
              </linearGradient>
              <linearGradient id="tintGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`rgba(20,15,40,${windowOpacity * 0.9})`} />
                <stop offset="100%" stopColor={`rgba(5,5,10,${windowOpacity})`} />
              </linearGradient>
              <linearGradient id="glassReflect" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={`rgba(160,160,255,${0.15 * (1 - windowOpacity * 0.7)})`} />
                <stop offset="50%" stopColor="rgba(160,160,255,0)" />
                <stop offset="100%" stopColor={`rgba(160,160,255,${0.08 * (1 - windowOpacity * 0.7)})`} />
              </linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {/* Ground shadow */}
            <ellipse cx="250" cy="188" rx="200" ry="12" fill="rgba(0,0,0,0.3)" />
            {/* Ground line */}
            <line x1="30" y1="182" x2="470" y2="182" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            {/* Car body */}
            <path d="M80,170 L88,170 L100,128 L130,105 L170,88 L185,82 L310,82 L335,90 L355,105 L380,128 L395,170 L415,170 L415,175 L80,175 Z" fill="url(#bodyGrad)" stroke="#3a3a48" strokeWidth="1" />
            {/* Lower body accent */}
            <path d="M90,170 L105,145 L395,145 L400,170 Z" fill="#1a1a24" opacity="0.5" />
            {/* Rear window */}
            <path d="M140,106 L170,88 L185,84 L198,84 L198,106 Z" fill="url(#tintGrad)" stroke="#4a4a5a" strokeWidth="0.5" />
            <path d="M140,106 L170,88 L185,84 L198,84 L198,106 Z" fill="url(#glassReflect)" />
            {/* Front side window */}
            <path d="M203,84 L305,84 L316,88 L330,98 L330,106 L203,106 Z" fill="url(#tintGrad)" stroke="#4a4a5a" strokeWidth="0.5" />
            <path d="M203,84 L305,84 L316,88 L330,98 L330,106 L203,106 Z" fill="url(#glassReflect)" />
            {/* Windshield (lighter tint) */}
            <path d="M335,100 L355,106 L375,125 L370,128 L340,106 Z" fill={`rgba(20,15,40,${windowOpacity * 0.2})`} stroke="#4a4a5a" strokeWidth="0.5" />
            <path d="M335,100 L355,106 L375,125 L370,128 L340,106 Z" fill="url(#glassReflect)" />
            {/* Door line */}
            <line x1="200" y1="84" x2="200" y2="168" stroke="#3a3a48" strokeWidth="0.8" />
            {/* Door handle */}
            <rect x="220" y="118" width="18" height="3" rx="1.5" fill="#4a4a5a" />
            {/* Headlight */}
            <path d="M390,132 L410,142 L410,158 L395,165 Z" fill="#2a2a35" stroke="#6c63ff" strokeWidth="0.5" opacity="0.6" />
            <path d="M393,138 L406,144 L406,155 L396,160 Z" fill="rgba(108,99,255,0.15)" filter="url(#glow)" />
            {/* Tail light */}
            <path d="M92,135 L100,128 L100,162 L92,168 Z" fill="rgba(255,50,50,0.25)" stroke="rgba(255,50,50,0.4)" strokeWidth="0.5" />
            {/* Wheels */}
            <circle cx="145" cy="172" r="22" fill="#0a0a0f" stroke="#3a3a48" strokeWidth="2" />
            <circle cx="145" cy="172" r="16" fill="none" stroke="#2a2a35" strokeWidth="1.5" />
            <circle cx="145" cy="172" r="6" fill="#2a2a35" />
            {[0,60,120,180,240,300].map(a => <line key={a} x1={145+6*Math.cos(a*Math.PI/180)} y1={172+6*Math.sin(a*Math.PI/180)} x2={145+15*Math.cos(a*Math.PI/180)} y2={172+15*Math.sin(a*Math.PI/180)} stroke="#2a2a35" strokeWidth="2" />)}
            <circle cx="355" cy="172" r="22" fill="#0a0a0f" stroke="#3a3a48" strokeWidth="2" />
            <circle cx="355" cy="172" r="16" fill="none" stroke="#2a2a35" strokeWidth="1.5" />
            <circle cx="355" cy="172" r="6" fill="#2a2a35" />
            {[0,60,120,180,240,300].map(a => <line key={a} x1={355+6*Math.cos(a*Math.PI/180)} y1={172+6*Math.sin(a*Math.PI/180)} x2={355+15*Math.cos(a*Math.PI/180)} y2={172+15*Math.sin(a*Math.PI/180)} stroke="#2a2a35" strokeWidth="2" />)}
            {/* Side mirror */}
            <ellipse cx="340" cy="108" rx="8" ry="5" fill="#2a2a35" stroke="#3a3a48" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Controls bar */}
        <div style={{ padding: '28px 40px 36px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
          {/* Tint slider */}
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4a4a5a' }}>Tint Darkness</span>
              <span style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 800, color: '#fff' }}>{tint}<span style={{ fontSize: 12, color: '#6c63ff' }}>%</span></span>
            </div>
            <input type="range" min={5} max={95} value={tint} onChange={(e) => setTint(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#4a4a5a' }}>Light (5%)</span>
              <span style={{ fontSize: 12, color: '#6c63ff', fontWeight: 600 }}>{vlt}% VLT</span>
              <span style={{ fontSize: 12, color: '#4a4a5a' }}>Limo (95%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="rv" style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Visible Light', value: `${vlt}% VLT` },
          { label: 'Tint Darkness', value: `${tint}%` },
          { label: 'MD Legal Front', value: vlt >= 35 ? 'Yes' : 'No' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4a4a5a', marginBottom: 4 }}>{s.label}</span>
            <span style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 800, color: s.label === 'MD Legal Front' ? (vlt >= 35 ? '#4ade80' : '#ff4d4d') : '#6c63ff' }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{
          display: 'inline-block', padding: '15px 40px', borderRadius: 3,
          background: '#6c63ff', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 4px 30px rgba(108,99,255,0.3)',
        }}>Book Your Tint</a>
      </div>
    </div>
  );
}

/* ═══ PRICING CALCULATOR ═══ */
function PriceCalculator() {
  const [vehicle, setVehicle] = useState('sedan');
  const [film, setFilm] = useState('ceramic');
  const [coverage, setCoverage] = useState('whole-no-wind');
  const [computerCut, setComputerCut] = useState(false);
  const [animPrice, setAnimPrice] = useState(0);

  const prices: Record<string, Record<string, Record<string, number>>> = {
    coupe: {
      carbon: { 'all-sides': 50, 'windshield': 80, 'whole-no-wind': 125, 'whole': 205 },
      nano: { 'all-sides': 75, 'windshield': 110, 'whole-no-wind': 180, 'whole': 290 },
      ceramic: { 'all-sides': 115, 'windshield': 170, 'whole-no-wind': 275, 'whole': 445 },
    },
    sedan: {
      carbon: { 'two-sides': 65, 'all-sides': 105, 'windshield': 80, 'whole-no-wind': 185, 'whole': 265 },
      nano: { 'two-sides': 75, 'all-sides': 145, 'windshield': 115, 'whole-no-wind': 260, 'whole': 375 },
      ceramic: { 'two-sides': 115, 'all-sides': 225, 'windshield': 180, 'whole-no-wind': 395, 'whole': 575 },
    },
    truck: {
      carbon: { 'two-sides': 65, 'all-sides': 120, 'windshield': 115, 'whole-no-wind': 210, 'whole': 325 },
      nano: { 'two-sides': 85, 'all-sides': 170, 'windshield': 145, 'whole-no-wind': 305, 'whole': 450 },
      ceramic: { 'two-sides': 135, 'all-sides': 260, 'windshield': 220, 'whole-no-wind': 470, 'whole': 690 },
    },
  };

  const coverageOptions: Record<string, { id: string; label: string }[]> = {
    coupe: [
      { id: 'all-sides', label: 'All Sides' },
      { id: 'windshield', label: 'Windshield' },
      { id: 'whole-no-wind', label: 'Full Car (no windshield)' },
      { id: 'whole', label: 'Whole Car' },
    ],
    sedan: [
      { id: 'two-sides', label: 'Two Sides' },
      { id: 'all-sides', label: 'All Four Sides' },
      { id: 'windshield', label: 'Windshield' },
      { id: 'whole-no-wind', label: 'Full Car (no windshield)' },
      { id: 'whole', label: 'Whole Car' },
    ],
    truck: [
      { id: 'two-sides', label: 'Two Sides' },
      { id: 'all-sides', label: 'All Sides' },
      { id: 'windshield', label: 'Windshield' },
      { id: 'whole-no-wind', label: 'Full Car (no windshield)' },
      { id: 'whole', label: 'Whole Car' },
    ],
  };

  const filmNames: Record<string, string> = { carbon: 'Premium Carbon', nano: 'Nano Carbon PUREMAX', ceramic: 'Nano Ceramic KOOLMAX' };
  const vehicleNames: Record<string, string> = { coupe: 'Coupe', sedan: 'Sedan', truck: 'Truck / SUV' };

  // Fix coverage when switching vehicle types
  useEffect(() => {
    const opts = coverageOptions[vehicle];
    if (!opts.find(o => o.id === coverage)) setCoverage(opts[opts.length - 2]?.id || opts[0].id);
  }, [vehicle]);

  const basePrice = prices[vehicle]?.[film]?.[coverage] || 0;
  const totalPrice = basePrice + (computerCut ? 50 : 0);

  // Animate price counter
  useEffect(() => {
    const start = animPrice;
    const end = totalPrice;
    if (start === end) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 400, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setAnimPrice(Math.round(start + (end - start) * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [totalPrice]);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '12px 16px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(.16,1,.3,1)',
    background: active ? 'rgba(108,99,255,0.15)' : '#101018',
    border: active ? '1px solid rgba(108,99,255,0.4)' : '1px solid rgba(255,255,255,0.04)',
    color: active ? '#fff' : '#8e8ea0', fontSize: 16, fontWeight: active ? 700 : 500,
    fontFamily: 'Inter', textAlign: 'left' as const,
  });

  return (
    <div>
      {/* Step 1: Vehicle */}
      <div className="rv" style={{ marginBottom: 28 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#6c63ff', marginBottom: 12 }}>① Vehicle Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {Object.entries(vehicleNames).map(([k, v]) => (
            <button key={k} onClick={() => setVehicle(k)} style={btnStyle(vehicle === k)}>
              <span style={{ display: 'block', fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700 }}>{v}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Film */}
      <div className="rv d1" style={{ marginBottom: 28 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#6c63ff', marginBottom: 12 }}>② Film Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {Object.entries(filmNames).map(([k, v]) => (
            <button key={k} onClick={() => setFilm(k)} style={btnStyle(film === k)}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: film === k ? '#6c63ff' : '#4a4a5a', marginBottom: 2 }}>{k === 'carbon' ? 'ENTRY' : k === 'nano' ? 'MID' : 'TOP TIER'}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Coverage */}
      <div className="rv d2" style={{ marginBottom: 28 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#6c63ff', marginBottom: 12 }}>③ Coverage</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
          {coverageOptions[vehicle].map(o => (
            <button key={o.id} onClick={() => setCoverage(o.id)} style={btnStyle(coverage === o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Computer Cut Add-on */}
      <div className="rv d3" style={{ marginBottom: 36 }}>
        <button onClick={() => setComputerCut(!computerCut)} style={{
          width: '100%', padding: '16px 20px', borderRadius: 4, cursor: 'pointer',
          background: computerCut ? 'rgba(108,99,255,0.1)' : '#101018',
          border: computerCut ? '1px solid rgba(108,99,255,0.3)' : '1px solid rgba(255,255,255,0.04)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          transition: 'all 0.3s', color: '#fff', textAlign: 'left',
        }}>
          <div>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 600, fontFamily: 'Space Grotesk' }}>Computer-Cut Film</span>
            <span style={{ fontSize: 12, color: '#8e8ea0' }}>Pre-cut to exact window shapes. No blade touches your car.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 800, color: '#6c63ff' }}>+$50</span>
            <div style={{ width: 20, height: 20, borderRadius: 4, border: computerCut ? '2px solid #6c63ff' : '2px solid #4a4a5a', background: computerCut ? '#6c63ff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontSize: 12, color: '#fff' }}>
              {computerCut && '✓'}
            </div>
          </div>
        </button>
      </div>

      {/* Price Display */}
      <div className="rv d4" style={{ textAlign: 'center', padding: '36px 28px', borderRadius: 8, background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(108,99,255,0.02))', border: '1px solid rgba(108,99,255,0.2)' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#4a4a5a', marginBottom: 8 }}>Your Price</span>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: 56, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          <span style={{ fontSize: 28, color: '#6c63ff', verticalAlign: 'top' }}>$</span>{animPrice}
        </div>
        <p style={{ color: '#8e8ea0', fontSize: 16, marginTop: 12 }}>
          {vehicleNames[vehicle]} · {filmNames[film]} · {coverageOptions[vehicle].find(o => o.id === coverage)?.label}
          {computerCut && ' · Computer Cut'}
        </p>
        <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{
          display: 'inline-block', marginTop: 24, padding: '16px 44px', borderRadius: 3,
          background: '#6c63ff', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 4px 30px rgba(108,99,255,0.35)',
        }}>Book for ${totalPrice}</a>
      </div>
    </div>
  );
}

/* ── NAV ── */
const NAV = [
  { id: 'home', label: 'Home' }, { id: 'portfolio', label: 'Portfolio' },
  { id: 'pricing', label: 'Pricing' }, { id: 'compare', label: 'Compare Films' },
  { id: 'contact', label: 'Contact' },
];

function Nav({ page, go }: { page: string; go: (p: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mob, setMob] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const nav = (p: string) => { go(p); setMob(false); };
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(5,5,7,0.9)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : 'none',
      transition: 'all 0.5s cubic-bezier(.16,1,.3,1)',
      padding: scrolled ? '12px 0' : '20px 0',
    }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => nav('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <img src="/210tintlogo.jpeg" alt="210 Auto Customs" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
        </button>
        <div className="desk-nav" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => nav(n.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: page === n.id ? '#6c63ff' : '#8e8ea0',
              fontWeight: page === n.id ? 600 : 400, fontSize: 16, letterSpacing: '.3px',
              transition: 'color 0.3s', fontFamily: 'Inter',
              position: 'relative',
            }}>
              {n.label}
              {page === n.id && <span style={{ position: 'absolute', bottom: -6, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6c63ff, #a78bfa)', borderRadius: 1, animation: 'lineExpand 0.4s ease forwards', transformOrigin: 'left' }} />}
            </button>
          ))}
          <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{
            background: '#6c63ff', color: '#fff', padding: '10px 26px', borderRadius: 3,
            fontSize: 16, fontWeight: 600, textDecoration: 'none', transition: 'all 0.3s',
          }}>Book Now</a>
        </div>
        <button className="mob-btn" onClick={() => setMob(!mob)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'none' }}>
          <div style={{ width: 22, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ height: 1.5, background: '#fff', transition: 'all 0.3s', transform: mob ? 'rotate(45deg) translateY(6.5px)' : 'none' }} />
            <span style={{ height: 1.5, background: '#fff', transition: 'all 0.3s', opacity: mob ? 0 : 1 }} />
            <span style={{ height: 1.5, background: '#fff', transition: 'all 0.3s', transform: mob ? 'rotate(-45deg) translateY(-6.5px)' : 'none' }} />
          </div>
        </button>
      </div>
      {mob && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(5,5,7,0.97)', backdropFilter: 'blur(30px)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 28px 24px' }}>
          {NAV.map((n) => <button key={n.id} onClick={() => nav(n.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', color: page === n.id ? '#6c63ff' : '#eee', fontSize: 16, fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{n.label}</button>)}
          <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 16, background: '#6c63ff', color: '#fff', padding: '14px', borderRadius: 3, textAlign: 'center', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>Book Appointment</a>
        </div>
      )}
    </nav>
  );
}

/* ── SECTION HEADER ── */
function SH({ tag, title, sub, align = 'center' }: { tag: string; title: string; sub?: string; align?: string }) {
  return (
    <div className="rv" style={{ textAlign: align as any, marginBottom: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
        <div style={{ width: 32, height: 1, background: '#6c63ff', animation: 'accentLine 1s ease forwards' }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#6c63ff' }}>{tag}</span>
        <div style={{ width: 32, height: 1, background: '#6c63ff', animation: 'accentLine 1s ease forwards' }} />
      </div>
      <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 'clamp(28px,4vw,50px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1 }}>{title}</h2>
      {sub && <p style={{ color: '#8e8ea0', fontSize: 16, maxWidth: align === 'center' ? 520 : 600, margin: align === 'center' ? '18px auto 0' : '18px 0 0', lineHeight: 1.8 }}>{sub}</p>}
    </div>
  );
}

/* ── FLOATING ORBS BACKGROUND ── */
function FloatingOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: 200 + i * 80,
          height: 200 + i * 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(108,99,255,${0.03 - i * 0.004}) 0%, transparent 70%)`,
          left: `${10 + i * 20}%`,
          top: `${20 + (i % 3) * 25}%`,
          animation: `orbFloat ${12 + i * 4}s ease-in-out infinite`,
          animationDelay: `${i * -3}s`,
        }} />
      ))}
    </div>
  );
}

/* ── FAQ ACCORDION ── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: 'What types of tint film do you offer?', a: 'We offer three tiers of UVIRON performance films: Premium Carbon for budget-friendly protection with a clean matte finish, Nano Carbon PUREMAX for enhanced heat rejection and durability, and Nano Ceramic KOOLMAX — our top tier — with maximum infrared heat rejection, crystal-clear clarity, and a lifetime warranty.' },
    { q: 'How long does window tinting take?', a: 'Most installations are completed in 1.5 to 3 hours depending on the vehicle type and number of windows. Full-vehicle tinting with windshield typically takes around 2.5 to 3 hours. We handle everything on-site at your location.' },
    { q: 'Do you really come to my location?', a: 'Yes! We are a 100% mobile tinting service. We come to your home, office, or any convenient location across the DMV — including Howard County, Montgomery County, PG County, Baltimore, DC, and Northern Virginia. No shop visit required.' },
    { q: 'What is your warranty policy?', a: 'Our Nano Ceramic KOOLMAX film comes with a lifetime warranty covering bubbling, peeling, lifting, cracking, delamination, color fading, adhesive failure, and manufacturer defects with full labor included. Nano Carbon carries a 5–7 year warranty, and Premium Carbon carries a 3–5 year warranty.' },
    { q: 'Will window tint interfere with my electronics?', a: 'Not at all. All of our UVIRON films — Premium Carbon, Nano Carbon, and Nano Ceramic — are 100% signal-friendly. They will not interfere with GPS, Bluetooth, cell signals, toll transponders, or any other vehicle electronics.' },
    { q: 'How should I care for my new tint?', a: 'Avoid rolling your windows down for 5–7 days after installation to allow the adhesive to fully cure. Clean with a soft microfiber cloth and ammonia-free cleaner. Avoid abrasive materials. Small water bubbles during the first few weeks are normal and will disappear as the film cures.' },
    { q: 'Is window tinting legal in Maryland?', a: 'Maryland allows window tinting on rear side windows and the rear windshield at any darkness level. Front side windows must allow more than 35% of light through. The front windshield may only have tinting along the top AS-1 line (typically the top 5 inches). We can advise on the best legal options for your vehicle.' },
    { q: 'How do I book an appointment?', a: 'Booking takes under two minutes! Click "Book Now" anywhere on our site to schedule through Calendly. Select your preferred date, time, and location. You can also call us at (240) 338-7762 or email 210tints@gmail.com.' },
  ];
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }} className="stagger-enter">
      {faqs.map((f, i) => (
        <div key={i} className={`faq-item${open === i ? ' active' : ''} rv d${(i % 4) + 1}`}>
          <button className="faq-toggle" onClick={() => setOpen(open === i ? null : i)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 800, color: '#6c63ff', opacity: 0.4, minWidth: 28 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontFamily: 'Space Grotesk', fontSize: 17, fontWeight: 700 }}>{f.q}</span>
            </div>
            <div className="faq-icon">
              <span style={{ color: open === i ? '#fff' : '#6c63ff', fontSize: 18, lineHeight: 1 }}>+</span>
            </div>
          </button>
          <div className="faq-answer">
            <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.9, paddingLeft: 44 }}>{f.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── FOOTER ── */
function Footer({ go }: { go: (p: string) => void }) {
  return (
    <footer style={{ background: '#0a0a0f', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '72px 28px 36px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(108,99,255,0.3), transparent)' }} />
      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 48 }}>
        <div>
          <div style={{ marginBottom: 20 }}>
            <img src="/210tintlogo.jpeg" alt="210 Auto Customs" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
          </div>
          <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8, maxWidth: 280 }}>Columbia's premier mobile window tinting. Nano-ceramic protection installed at your location.</p>
        </div>
        <div>
          <h4 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 12, letterSpacing: '3px', color: '#4a4a5a', marginBottom: 20, textTransform: 'uppercase' }}>Navigation</h4>
          {['Portfolio','Pricing','Compare Films','Contact'].map(l => <button key={l} onClick={() => go(l === 'Compare Films' ? 'compare' : l.toLowerCase())} style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', color: '#8e8ea0', fontSize: 16, padding: '5px 0' }}>{l}</button>)}
        </div>
        <div>
          <h4 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 12, letterSpacing: '3px', color: '#4a4a5a', marginBottom: 20, textTransform: 'uppercase' }}>Resources</h4>
          {[{label:'Tint Simulator',id:'tint-simulator'},{label:'Starlight Headliner',id:'starlight'},{label:'✦ Starlight Sale — 15% Off',id:'starlight-sale'},{label:'Warranty',id:'warranty'},{label:'MD Tint Laws',id:'tint-laws'},{label:'Ceramic vs Carbon',id:'ceramic-vs-carbon'},{label:'Best Tint for Summer',id:'md-summer-tint'}].map(l => <button key={l.id} onClick={() => go(l.id)} style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', color: l.id==='starlight-sale'?'#a78bfa':'#8e8ea0', fontSize: 16, padding: '5px 0', fontWeight: l.id==='starlight-sale'?600:400 }}>{l.label}</button>)}
        </div>
        <div>
          <h4 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 12, letterSpacing: '3px', color: '#4a4a5a', marginBottom: 20, textTransform: 'uppercase' }}>Contact</h4>
          <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 2.2 }}>210tints@gmail.com<br/>(240) 338-7762<br/>Columbia, MD</p>
        </div>
        <div>
          <h4 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 12, letterSpacing: '3px', color: '#4a4a5a', marginBottom: 20, textTransform: 'uppercase' }}>Hours</h4>
          <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 2.2 }}>Mon — Sat: 6AM — 11PM<br/>Sun: By Appointment</p>
        </div>
      </div>
      <div style={{ maxWidth: 1320, margin: '56px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: '#4a4a5a', fontSize: 12 }}>© 2026 210 Tint. All rights reserved.</p>
        <p style={{ color: '#4a4a5a', fontSize: 12 }}>Columbia, MD — Serving the DMV</p>
        <p style={{ color: '#4a4a5a', fontSize: 12 }}>Powered By <a href="https://peakdigi.net" target="_blank" rel="noreferrer" style={{ color: '#4a4a5a', textDecoration: 'none', borderBottom: '1px solid rgba(74,74,90,0.4)' }}>Peak Digital</a></p>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════ */
function HomePage({ go }: { go: (p: string) => void }) {
  useReveal();

  const process = [
    { num: '01', title: 'Book Online', desc: 'Pick your vehicle, film, and date — under 2 minutes.' },
    { num: '02', title: 'We Come To You', desc: 'Certified techs arrive anywhere in the DMV.' },
    { num: '03', title: 'Precision Install', desc: 'Computer-cut UVIRON film, no blade on your car.' },
    { num: '04', title: 'Drive Protected', desc: '99% UV blocked. Backed by a lifetime warranty.' },
  ];

  const whyUs = [
    { title: '100% Mobile Service', desc: 'We come to your home, office, or anywhere in the DMV. No shop visit required.' },
    { title: '4.9-Star Google Rating', desc: 'Hundreds of five-star reviews. Professional service on every single job.' },
    { title: 'Satisfaction Guaranteed', desc: 'Every installation backed by our guarantee. If anything is off, we fix it at no charge.' },
    { title: 'UVIRON Performance Films', desc: 'KOOLMAX nano-ceramic blocks up to 89% infrared heat and 99% UV radiation.' },
    { title: 'Transparent Pricing', desc: 'No hidden fees. Flat rates for every vehicle type published on our site.' },
    { title: 'Full DMV Coverage', desc: 'Howard, Montgomery, PG County, Baltimore, DC, and Northern Virginia.' },
  ];

  const testimonials = [
    { name: 'Ben', text: 'I highly recommend 210 Tint. One thing that stood out was how transparent they were with pricing. Customer service was fantastic and the quality came out great.', time: '1 week ago' },
    { name: 'Divya K.', text: 'Omar did a great job with the tint on my car. Professional, on time, and the install came out really clean. Smooth and convenient process.', time: '2 weeks ago' },
    { name: 'Wence M.', text: 'Very professional and took into account every minor detail. By far the best tint experience I have had in the DMV.', time: '3 weeks ago' },
    { name: 'Ryan', text: 'Very knowledgeable. Did an amazing job on my vehicle. Highly recommended — will be back for more.', time: '1 week ago' },
    { name: 'Jordan M.', text: 'Professional job and took his time to ensure nothing went wrong. Highly recommend to anyone looking to tint their vehicle.', time: '2 months ago' },
    { name: 'Tyler R.', text: 'Very experienced and professional. Got the job done efficiently. Recommend for all your tinting needs.', time: '2 months ago' },
  ];

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <HeroBackground />
        <GlassScene />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1320, margin: '0 auto', padding: '180px 28px 100px', width: '100%', textAlign: 'center' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ animation: 'fadeUp 1s ease forwards', animationDelay: '0.3s', opacity: 0 }}>
              <span style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: 2, fontSize: 12, fontWeight: 700,
                letterSpacing: '3px', textTransform: 'uppercase', color: '#6c63ff',
                border: '1px solid rgba(108,99,255,0.3)', background: 'rgba(108,99,255,0.08)',
              }}>Columbia, MD — Mobile Nano-Ceramic Specialists</span>
            </div>

            <h1 style={{
              fontFamily: 'Space Grotesk', fontSize: 'clamp(38px,7vw,84px)', fontWeight: 800,
              lineHeight: 1.0, letterSpacing: '-3px', marginTop: 32,
              animation: 'fadeUp 1s ease forwards', animationDelay: '0.5s', opacity: 0,
            }}>
              Window Tinting,<br /><span className="grad-text">Elevated.</span>
            </h1>

            <p style={{
              color: '#8e8ea0', fontSize: 'clamp(14px,1.5vw,19px)', lineHeight: 1.8,
              marginTop: 28, maxWidth: 480, margin: '28px auto 0',
              animation: 'fadeUp 1s ease forwards', animationDelay: '0.7s', opacity: 0,
            }}>
              UVIRON-certified nano-ceramic film. Lifetime warranty. Precision computer-cut installation delivered to your driveway.
            </p>

            <div style={{ display: 'flex', gap: 14, marginTop: 44, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeUp 1s ease forwards', animationDelay: '0.9s', opacity: 0 }}>
              <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{
                background: '#6c63ff', color: '#fff', padding: '16px 40px', borderRadius: 3,
                fontSize: 16, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 40px rgba(108,99,255,0.35)', letterSpacing: '0.3px',
                position: 'relative', overflow: 'hidden',
              }}>
                <span style={{ position: 'relative', zIndex: 1 }}>Book Your Appointment</span>
              </a>
              <button onClick={() => go('portfolio')} style={{
                background: 'transparent', color: '#fff', padding: '16px 40px', borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.12)', fontSize: 16, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(.16,1,.3,1)',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,99,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >View Our Work</button>
            </div>
          </div>

          {/* Stats */}
          <div className="hero-stats" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, marginTop: 80,
            paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)',
            animation: 'fadeUp 1s ease forwards', animationDelay: '1.1s', opacity: 0,
            maxWidth: 700, margin: '80px auto 0',
          }}>
            {[
              { end: 4.9, suffix: '', label: 'Google Rating', dec: 1 },
              { end: 1000, suffix: '+', label: 'Vehicles Tinted', dec: 0 },
              { end: 99, suffix: '%', label: 'UV Rejection', dec: 0 },
              { end: 100, suffix: '%', label: 'Satisfaction', dec: 0 },
            ].map((s, i) => (
              <div key={i}>
                <span style={{ fontFamily: 'Space Grotesk', fontSize: 'clamp(28px,3vw,38px)', fontWeight: 800 }}>
                  <Counter end={s.end} suffix={s.suffix} decimals={s.dec} />
                </span>
                <span style={{ display: 'block', fontSize: 12, color: '#4a4a5a', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
      <ScrollRevealSection direction="scale">
        <section style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 0', overflow: 'hidden', background: '#0a0a0f' }}>
          <div className="marquee-track">
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 64, paddingRight: 64 }}>
                {['Mobile Window Tinting', 'We Come To You', 'Columbia, Maryland', 'UVIRON Certified',
                  'Standard / Premium / Ceramic', '4.9 Rated on Google', 'Serving the DMV',
                  'Lifetime Warranty', 'Nano-Ceramic Film', 'Computer-Cut Precision'].map((t, j) => (
                  <span key={j} style={{ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, color: '#4a4a5a', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {t} <span style={{ color: '#6c63ff', margin: '0 16px', opacity: 0.4 }}>&#9670;</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      </ScrollRevealSection>

      {/* ═══ HOW IT WORKS — condensed timeline ═══ */}
      <SectionDivider variant="glow" />
      <section style={{ padding: '70px 28px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <SH tag="The Process" title="How It Works" sub="From booking to drive-away in four steps." />
        <div className="rv" style={{ position: 'relative', marginTop: 40 }}>
          {/* Horizontal connector line */}
          <div className="how-line" style={{
            position: 'absolute', left: '10%', right: '10%', top: 30, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(108,99,255,0.35), rgba(108,99,255,0.35), transparent)',
            zIndex: 0,
          }} />
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 24, position: 'relative', zIndex: 1,
          }}>
            {process.map((p, i) => (
              <div key={i} className={`rv d${i + 1}`} style={{ textAlign: 'center', padding: '0 8px' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px',
                  background: '#0a0a0f', border: '1.5px solid rgba(108,99,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Space Grotesk', fontSize: 17, fontWeight: 800, color: '#6c63ff',
                  boxShadow: '0 0 28px rgba(108,99,255,0.18)',
                  position: 'relative', zIndex: 2,
                }}>{p.num}</div>
                <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{p.title}</h3>
                <p style={{ color: '#8e8ea0', fontSize: 13.5, lineHeight: 1.65, maxWidth: 200, margin: '0 auto' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MOBILE GARAGE NOTICE ═══ */}
      <section style={{ padding: '0 28px 80px', maxWidth: 1320, margin: '0 auto' }}>
        <div className="rv" style={{
          padding: '28px 36px', borderRadius: 4,
          border: '1px solid rgba(251,191,36,0.25)',
          background: 'rgba(251,191,36,0.04)',
          display: 'flex', gap: 20, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>⚠️</span>
          <div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#fbbf24' }}>
              Mobile Jobs — Garage or Covered Space Strongly Recommended
            </h3>
            <p style={{ color: '#8e8ea0', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              When we come to you, working outdoors without a garage or covered space significantly increases the chance of minor imperfections — dust, debris, or wind can affect adhesion and film clarity during install. We always do our absolute best, but{' '}
              <strong style={{ color: '#e5e5e5' }}>we cannot guarantee a flawless result on an open-air mobile job.</strong>
              {' '}If you have access to a garage, carport, or covered parking, please have the vehicle there at the time of your appointment. It makes a real difference.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHY US ═══ */}
      <section style={{ padding: '120px 28px', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
        <FloatingOrbs />
        <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <SH tag="The Difference" title="Why Clients Choose 210 Tint" sub="Professional mobile tinting backed by the best films, transparent pricing, and a satisfaction guarantee." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 12 }}>
            {whyUs.map((w, i) => (
              <div key={i} className={`${i % 2 === 0 ? 'rv-l' : 'rv-r'} d${(i % 4) + 1} tilt-card`} style={{
                padding: '32px 28px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 3,
                cursor: 'default', background: '#0d0d14', position: 'relative', overflow: 'hidden',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.25)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.3), 0 0 30px rgba(108,99,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #6c63ff, transparent)', opacity: 0, transition: 'opacity 0.5s' }}
                  ref={(el) => { if (el) { el.parentElement!.addEventListener('mouseenter', () => el.style.opacity = '1'); el.parentElement!.addEventListener('mouseleave', () => el.style.opacity = '0'); }}} />
                <div style={{ width: 40, height: 2, background: '#6c63ff', marginBottom: 20, transition: 'width 0.5s ease' }}
                  ref={(el) => { if (el) { el.parentElement!.addEventListener('mouseenter', () => el.style.width = '60px'); el.parentElement!.addEventListener('mouseleave', () => el.style.width = '40px'); }}} />
                <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{w.title}</h3>
                <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GOOGLE REVIEWS SLIDER ═══ */}
      <section style={{ padding: '120px 0', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
        <FloatingOrbs />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ padding: '0 28px' }}>
            <div className="rv-blur"><SH tag="Google Reviews" title="Trusted Across the DMV" /></div>
            <ScrollRevealSection direction="scale" delay={0.2}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: -36, marginBottom: 52, flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  <span style={{ background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Arial' }}>G</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FFD700', fontSize: 18 }}>&#9733;</span>)}
                  </div>
                  <span style={{ fontSize: 12, color: '#8e8ea0', marginTop: 2 }}><strong style={{ color: '#fff', fontFamily: 'Space Grotesk' }}>4.9</strong> out of 5 · 30+ reviews on Google</span>
                </div>
              </div>
            </ScrollRevealSection>
          </div>
          {/* Auto-scrolling review marquee */}
          <div style={{ overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #0a0a0f, transparent)', zIndex: 5, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #0a0a0f, transparent)', zIndex: 5, pointerEvents: 'none' }} />
            <div className="review-track" style={{ display: 'flex', gap: 16, animation: 'reviewSlide 35s linear infinite', width: 'max-content', padding: '10px 0' }}>
              {[...testimonials, ...testimonials].map((t, i) => (
                <div key={i} style={{
                  minWidth: 340, maxWidth: 340, padding: '28px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.04)', background: '#0d0d14', flexShrink: 0,
                  transition: 'all 0.4s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 3 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FFD700', fontSize: 11 }}>&#9733;</span>)}</div>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>
                      <span style={{ background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Arial' }}>G</span>
                    </div>
                  </div>
                  <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #8b83ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 12, color: '#fff' }}>{t.name[0]}</div>
                    <div>
                      <span style={{ fontSize: 16, fontWeight: 600, display: 'block' }}>{t.name}</span>
                      <span style={{ fontSize: 12, color: '#4a4a5a' }}>{t.time} · via Google</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SERVICE AREA MAP ═══ */}
      <section style={{ padding: '120px 28px', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
        <FloatingOrbs />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="rv-blur"><SH tag="Coverage" title="Serving the DMV & Beyond" sub="All of Maryland, DC, Northern Virginia, the Eastern Shore, southern PA & northern Delaware — anywhere within ~80 miles of Columbia. We come to you." /></div>
          <div className="rv"><ServiceAreaMap /></div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <SectionDivider variant="dots" />
      <section style={{ padding: '100px 28px 140px', position: 'relative', overflow: 'hidden' }}>
        <FloatingOrbs />
        <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="rv-blur"><SH tag="FAQ" title="Frequently Asked Questions" sub="Everything you need to know about our mobile window tinting service." /></div>
          <FAQ />
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: '120px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(108,99,255,0.08) 0%, transparent 60%)' }} />
        <FloatingOrbs />
        <div className="rv" style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, justifyContent: 'center' }}>
            <div style={{ width: 24, height: 1, background: '#6c63ff', animation: 'accentLine 1s ease forwards' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#6c63ff' }}>Ready?</span>
            <div style={{ width: 24, height: 1, background: '#6c63ff', animation: 'accentLine 1s ease forwards' }} />
          </div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 20, lineHeight: 1.1 }}>
            Elevate Your <span className="grad-text">Vehicle</span>
          </h2>
          <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8, marginBottom: 44 }}>Schedule online in under two minutes. We come to you.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{ background: '#6c63ff', color: '#fff', padding: '16px 44px', borderRadius: 3, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 40px rgba(108,99,255,0.35)' }}>Book Your Appointment</a>
            <button onClick={() => go('contact')} style={{ background: 'transparent', color: '#fff', padding: '16px 44px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', fontSize: 16, fontWeight: 500, cursor: 'pointer', transition: 'all 0.4s cubic-bezier(.16,1,.3,1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >Get In Touch</button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══ PORTFOLIO ═══ */
/* ═══ LIGHTBOX ═══ */
function Lightbox({ images, startIndex, onClose }: { images: { name: string; film: string; img: string }[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const [touchStart, setTouchStart] = useState(0);
  const cur = images[idx];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + images.length) % images.length);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, []);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease', cursor: 'zoom-out' }}
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => { const diff = e.changedTouches[0].clientX - touchStart; if (Math.abs(diff) > 50) { setIdx(i => diff > 0 ? (i - 1 + images.length) % images.length : (i + 1) % images.length); } }}>
      {/* Close button */}
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', zIndex: 10, opacity: 0.7 }}>✕</button>
      {/* Counter */}
      <span style={{ position: 'absolute', top: 24, left: 24, fontSize: 13, color: '#8e8ea0', fontFamily: 'Space Grotesk' }}>{idx + 1} / {images.length}</span>
      {/* Image */}
      <img key={idx} src={cur.img} alt={cur.name} onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 6, cursor: 'default', animation: 'fadeIn 0.3s ease' }} />
      {/* Info */}
      <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 20, textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20, color: '#fff' }}>{cur.name}</h3>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#6c63ff' }}>{cur.film}</span>
      </div>
      {/* Nav arrows */}
      {images.length > 1 && <>
        <button onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(108,99,255,0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>&lsaquo;</button>
        <button onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); }} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(108,99,255,0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>&rsaquo;</button>
      </>}
    </div>
  );
}

function PortfolioPage() {
  useReveal();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const items = [
    { name: 'Lamborghini Urus', film: 'Premium Nano Ceramic', img: '/cars/lambo-urus.png' },
    { name: 'Mercedes C63', film: 'Premium Carbon', img: '/cars/snowy-c63.png' },
    { name: 'Mercedes CLA', film: 'Premium Nano Ceramic', img: '/cars/mercedes-cla.png' },
    { name: 'BMW M8', film: 'Standard Carbon', img: '/cars/snowy-m8.png' },
    { name: 'Dodge Durango', film: 'Premium Nano Carbon', img: '/cars/snowy-durango.png' },
    { name: 'Dodge Durango', film: 'Premium Nano Carbon', img: '/cars/dark-snowy-durango.png' },
  ];
  return (<div style={{ paddingTop: 130 }}><section style={{ padding: '0 28px 120px', maxWidth: 1320, margin: '0 auto' }}>
    <SH tag="Our Work" title="Vehicle Tinting Portfolio" sub="Professional-grade installations on luxury, performance, and everyday vehicles." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 14 }}>
      {items.map((p, i) => (<div key={i} className={`rv-s d${(i%3)+1} tilt-card`} style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f', cursor: 'pointer' }}
        onClick={() => setLightbox(i)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.25)'; e.currentTarget.style.boxShadow = '0 24px 60px rgba(0,0,0,0.4), 0 0 30px rgba(108,99,255,0.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none'; }}>
        <div style={{ overflow: 'hidden', height: 260, position: 'relative' }}>
          <img src={p.img} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s cubic-bezier(.16,1,.3,1)' }} onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'scale(1.06)'; }} onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,0)', transition: 'background 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(108,99,255,0)'; }}>
            <span style={{ color: '#fff', fontSize: 24, opacity: 0, transition: 'opacity 0.3s' }}
              ref={(el) => { if(el) { el.parentElement!.addEventListener('mouseenter', () => el.style.opacity = '1'); el.parentElement!.addEventListener('mouseleave', () => el.style.opacity = '0'); }}}>⤢</span>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18 }}>{p.name}</h3><span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#6c63ff' }}>{p.film}</span></div><span style={{ color: '#4a4a5a', fontSize: 18 }}>&rarr;</span></div>
      </div>))}
    </div>
    {lightbox !== null && <Lightbox images={items} startIndex={lightbox} onClose={() => setLightbox(null)} />}

    {/* Social follow CTA */}
    <div className="rv" style={{ marginTop: 72, padding: '52px 28px', borderRadius: 4, border: '1px solid rgba(108,99,255,0.15)', background: 'linear-gradient(135deg,rgba(108,99,255,0.04),rgba(108,99,255,0.01))', textAlign: 'center' }}>
      <p style={{ color: '#8e8ea0', fontSize: 13, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Follow Our Work</p>
      <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>See Every Install in Real Time</h3>
      <p style={{ color: '#8e8ea0', fontSize: 16, marginBottom: 36 }}>Behind-the-scenes content, fresh installs, and tint tips — follow us on Instagram and TikTok.</p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="https://www.instagram.com/210tint" target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#eeeef2', textDecoration: 'none', fontSize: 15, fontWeight: 600, transition: 'all 0.3s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(225,48,108,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(225,48,108,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          Instagram — @210tint
        </a>
        <a href="https://www.tiktok.com/@210tint" target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#eeeef2', textDecoration: 'none', fontSize: 15, fontWeight: 600, transition: 'all 0.3s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(105,201,208,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(105,201,208,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/></svg>
          TikTok — @210tint
        </a>
      </div>
    </div>
  </section></div>);
}

/* ═══ PRICING ═══ */
function PricingPage() {
  useReveal();
  const [tab, setTab] = useState('sedan');
  const data: Record<string,{label:string;tiers:{name:string;items:string[];top?:boolean}[]}> = {
    coupe:{label:'Coupes',tiers:[{name:'Premium Carbon',items:['$50 — All sides','$80 — Front or back windshield','$125 — Full car (no windshield)','$205 — Whole car']},{name:'Nano Carbon PUREMAX',items:['$75 — All sides','$110 — Front or back windshield','$180 — Full car (no windshield)','$290 — Whole car']},{name:'Nano Ceramic KOOLMAX',items:['$115 — All sides','$170 — Front or back windshield','$275 — Full car (no windshield)','$445 — Whole car'],top:true}]},
    sedan:{label:'Sedans',tiers:[{name:'Premium Carbon',items:['$65 — Two sides','$105 — All four sides','$80 — Front or back windshield','$185 — Full car (no windshield)','$265 — Whole car']},{name:'Nano Carbon PUREMAX',items:['$75 — Two sides','$145 — All four sides','$115 — Front or back windshield','$260 — Full car (no windshield)','$375 — Whole car']},{name:'Nano Ceramic KOOLMAX',items:['$115 — Two sides','$225 — All four sides','$180 — Front or back windshield','$395 — Full car (no windshield)','$575 — Whole car'],top:true}]},
    truck:{label:'Truck / SUV',tiers:[{name:'Premium Carbon',items:['$65 — Two side windows','$120 — All four/six sides','$115 — Front or back windshield','$210 — Full car (no windshield)','$325 — Whole car']},{name:'Nano Carbon PUREMAX',items:['$85 — Two side windows','$170 — All four/six sides','$145 — Front or back windshield','$305 — Full car (no windshield)','$450 — Whole car']},{name:'Nano Ceramic KOOLMAX',items:['$135 — Two side windows','$260 — All four/six sides','$220 — Front or back windshield','$470 — Full car (no windshield)','$690 — Whole car'],top:true}]},
  };
  const cur = data[tab];
  return (<div style={{paddingTop:130}}><section style={{padding:'0 28px 120px',maxWidth:1320,margin:'0 auto'}}>
    <SH tag="Pricing" title="Transparent Tinting Rates" sub="Flat pricing. No hidden fees. Select your vehicle and film." />
    <div style={{display:'flex',gap:2,justifyContent:'center',marginBottom:52,background:'#101018',borderRadius:3,padding:3,maxWidth:400,margin:'0 auto 52px'}}>
      {Object.entries(data).map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'11px 16px',borderRadius:2,border:'none',cursor:'pointer',fontSize:13,fontWeight:tab===k?700:400,background:tab===k?'#6c63ff':'transparent',color:tab===k?'#fff':'#8e8ea0',transition:'all 0.3s'}}>{v.label}</button>))}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
      {cur.tiers.map((t,i)=>(<div key={t.name} className="rv" style={{padding:0,borderRadius:4,overflow:'hidden',border:t.top?'1px solid rgba(108,99,255,0.3)':'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',boxShadow:t.top?'0 0 40px rgba(108,99,255,0.06)':'none'}}>
        {t.top&&<div style={{background:'#6c63ff',padding:'8px',textAlign:'center',fontSize:10,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase'}}>Top Tier</div>}
        <div style={{padding:32}}>
          <h3 style={{fontFamily:'Space Grotesk',fontSize:19,fontWeight:700,marginBottom:24}}>{t.name}</h3>
          {t.items.map((it,j)=>{const [price,desc]=it.split('—');return(<div key={j} style={{padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:14,color:'#8e8ea0',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>{desc?.trim()}</span><span style={{fontFamily:'Space Grotesk',fontWeight:700,color:'#eee'}}>{price?.trim()}</span></div>);})}
          <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{display:'block',marginTop:28,padding:'13px',textAlign:'center',borderRadius:3,background:t.top?'#6c63ff':'transparent',border:t.top?'none':'1px solid rgba(255,255,255,0.08)',color:'#fff',fontSize:13,fontWeight:600,textDecoration:'none'}}>Book Now</a>
        </div>
      </div>))}
    </div>
    <div className="rv" style={{marginTop:40,padding:'32px 36px',borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
      <div><h3 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:18}}>Computer-Cut Film Upgrade</h3><p style={{color:'#8e8ea0',fontSize:13,marginTop:6,maxWidth:480,lineHeight:1.7}}>Pre-cut to exact window shapes. No blade touches your car. Cleaner edges, tighter fit, flawless finish.</p></div>
      <div style={{textAlign:'center'}}><span style={{fontFamily:'Space Grotesk',fontSize:28,fontWeight:800,color:'#6c63ff'}}>+$50</span><span style={{display:'block',fontSize:11,color:'#4a4a5a'}}>one-time upgrade</span></div>
    </div>

    {/* ═══ STARLIGHT HEADLINER PRICING ═══ */}
    <div className="rv" style={{marginTop:60,padding:'40px 36px',borderRadius:4,border:'1px solid rgba(108,99,255,0.25)',background:'linear-gradient(180deg,#0a0a0f 0%,#0d0a1a 100%)'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:14,flexWrap:'wrap',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'#6c63ff'}}>New Service</span>
          <h3 style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:26,marginTop:6}}>Starlight Headliner</h3>
          <p style={{color:'#8e8ea0',fontSize:14,marginTop:8,maxWidth:600,lineHeight:1.7}}>Custom fiber-optic star ceiling installed in your car's headliner. A galaxy of pinpoint lights that turn on at night — fully customizable, dimmable, and wired into your dome light or a discreet switch.</p>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:20}}>
        <div style={{padding:'22px 20px',borderRadius:4,background:'#0a0a0f',border:'1px solid rgba(108,99,255,0.3)'}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'#8b83ff'}}>Starter</span>
          <div style={{marginTop:10}}><span style={{fontFamily:'Space Grotesk',fontSize:30,fontWeight:800,color:'#fff'}}>$700</span></div>
          <p style={{color:'#8e8ea0',fontSize:13,marginTop:8,lineHeight:1.6}}>550 stars — clean, even galaxy effect. Great entry-level install.</p>
        </div>
        <div style={{padding:'22px 20px',borderRadius:4,background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.04)'}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'#4a4a5a'}}>Add-On</span>
          <div style={{marginTop:10}}><span style={{fontFamily:'Space Grotesk',fontSize:30,fontWeight:800,color:'#fff'}}>+$100–150</span></div>
          <p style={{color:'#8e8ea0',fontSize:13,marginTop:8,lineHeight:1.6}}>Per additional 100 stars. Build a denser, more dramatic night sky.</p>
        </div>
        <div style={{padding:'22px 20px',borderRadius:4,background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.04)'}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'#4a4a5a'}}>Includes</span>
          <p style={{color:'#8e8ea0',fontSize:13,marginTop:14,lineHeight:1.7}}>Premium fiber optics, dimmable controller, professional headliner removal & reinstall.</p>
        </div>
      </div>
      <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:24,padding:'13px 28px',borderRadius:3,background:'#6c63ff',color:'#fff',fontSize:13,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 20px rgba(108,99,255,0.3)'}}>Book a Starlight Install</a>
    </div>

    {/* ═══ INSTANT PRICE CALCULATOR (moved from homepage) ═══ */}
    <div style={{marginTop:80}}>
      <div className="rv-blur"><SH tag="Instant Quote" title="Price Calculator" sub="Select your vehicle, film, and coverage to get an instant price." /></div>
      <div style={{maxWidth:800,margin:'0 auto'}}><PriceCalculator /></div>
    </div>

    <p className="rv" style={{marginTop:60,fontSize:12,color:'#4a4a5a',textAlign:'center',lineHeight:1.8}}>
      All services are non-refundable once installation has begun. If there is an issue with your install, we will correct it at no charge under our satisfaction guarantee — no monetary refunds are issued.
    </p>
  </section></div>);
}

/* ═══ COMPARE ═══ */
function ComparePage() {
  useReveal();
  const [tableScrolled, setTableScrolled] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollTable = () => { tableRef.current?.scrollBy({ left: 220, behavior: 'smooth' }); setTableScrolled(true); };
  const rows = [['UV Rejection','~98%','~99%','≥99.9%'],['Heat Rejection','25–35%','35–50%','50–75%'],['Infrared Blocking','Low','Moderate','Very High'],['Signal Interference','None','None','None'],['Glare Reduction','Up to 50%','Up to 60%','Up to 70%'],['Color Stability','Excellent','Excellent','Permanent'],['Optical Clarity','Good','Good','Crystal Clear'],['Warranty','3–5 Years','5–7 Years','Lifetime'],['Price Tier','Entry','Mid-Range','Premium']];
  return (<div style={{paddingTop:130}}><section style={{padding:'0 28px 120px',maxWidth:1320,margin:'0 auto'}}>
    <SH tag="Film Guide" title="Compare Tint Options" sub="Comfort, protection, and long-term value — not just darkness." />
    <div style={{position:'relative',marginBottom:80}}>
      <div ref={tableRef} className="rv" style={{overflowX:'auto'}} onScroll={(e)=>{ if(e.currentTarget.scrollLeft>10) setTableScrolled(true); }}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:640}}>
          <thead><tr style={{borderBottom:'2px solid rgba(255,255,255,0.06)'}}>
            {['Feature','Premium Carbon','Nano Carbon','Nano Ceramic'].map((h,i)=>(<th key={i} style={{padding:'16px 20px',textAlign:'left',fontSize:12,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:i===3?'#6c63ff':i===0?'#4a4a5a':'#eee',fontFamily:'Space Grotesk'}}>{h}</th>))}
          </tr></thead>
          <tbody>{rows.map((row,i)=>(<tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.3s'}} onMouseEnter={(e)=>{e.currentTarget.style.background='rgba(108,99,255,0.03)'}} onMouseLeave={(e)=>{e.currentTarget.style.background='transparent'}}>
            {row.map((c,j)=>(<td key={j} style={{padding:'14px 20px',fontSize:14,color:j===0?'#4a4a5a':j===3?'#8b83ff':'#8e8ea0',fontWeight:j===0||j===3?600:400}}>{c}</td>))}
          </tr>))}</tbody>
        </table>
      </div>
      {/* Right-edge fade — mobile only, visible until user scrolls */}
      <div className="mobile-only" style={{
        position:'absolute', top:0, right:0, bottom:0, width:80,
        background:'linear-gradient(to right, transparent, #05050f)',
        pointerEvents:'none',
        opacity: tableScrolled ? 0 : 1,
        transition:'opacity 0.4s ease',
      }} />
      {/* Clickable arrow button — mobile only */}
      <button className="mobile-only" onClick={scrollTable} style={{
        position:'absolute', top:'50%', right:8, transform:'translateY(-50%)',
        flexDirection:'column', alignItems:'center', gap:2,
        background:'rgba(108,99,255,0.15)', border:'2px solid rgba(108,99,255,0.5)',
        borderRadius:'50%', width:48, height:48,
        cursor:'pointer', padding:0,
        opacity: tableScrolled ? 0 : 1,
        pointerEvents: tableScrolled ? 'none' : 'all',
        transition:'opacity 0.4s ease',
        animation:'bounceRight 1.2s ease-in-out infinite',
      }}>
        <span style={{fontSize:28, color:'#6c63ff', lineHeight:1}}>›</span>
      </button>
    </div>
    {!tableScrolled && (
      <button className="mobile-only" onClick={scrollTable} style={{
        margin:'-68px auto 68px', background:'none', border:'none', cursor:'pointer',
        fontSize:11, fontWeight:600, color:'#4a4a5a', letterSpacing:'2.5px', textTransform:'uppercase',
      }}>
        swipe to compare →
      </button>
    )}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
      {[
        {tier:'Entry Level',name:'Premium Carbon',desc:'Solid protection and clean looks at the best price.',from:'$65',pros:['Budget-friendly for daily drivers','Matte black finish — clean OEM look','No signal or GPS interference','Will not fade or turn purple']},
        {tier:'Mid Range',name:'Nano Carbon PUREMAX',desc:'Enhanced performance and durability without top-tier price.',from:'$75',pros:['Better heat rejection than Premium Carbon','Deep black — no fade or purple tones','Safe for all vehicle electronics','5–7 year warranty']},
        {tier:'Top Tier',name:'Nano Ceramic KOOLMAX',desc:'Superior heat, UV, and clarity — the last tint you will ever need.',from:'$115',top:true,pros:['Max heat and infrared rejection','Crystal clear — no haze at night','Lifetime warranty on every install','Improves A/C efficiency','Never fades, bubbles, or discolors']},
      ].map((f,i)=>(<div key={i} className={`rv d${i+1}`} style={{padding:32,borderRadius:4,border:f.top?'1px solid rgba(108,99,255,0.3)':'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',boxShadow:f.top?'0 0 40px rgba(108,99,255,0.06)':'none'}}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'#6c63ff'}}>{f.tier}</span>
        <h3 style={{fontFamily:'Space Grotesk',fontSize:21,fontWeight:700,marginTop:8,marginBottom:8}}>{f.name}</h3>
        <p style={{color:'#8e8ea0',fontSize:14,lineHeight:1.65,marginBottom:20}}>{f.desc}</p>
        {f.pros.map((p,j)=>(<div key={j} style={{padding:'5px 0',fontSize:13,color:'#8e8ea0',display:'flex',gap:10,alignItems:'flex-start'}}><span style={{color:'#6c63ff',fontSize:8,marginTop:6}}>&#9646;</span>{p}</div>))}
        <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.04)'}}><span style={{fontSize:11,color:'#4a4a5a'}}>Starting from</span><span style={{fontFamily:'Space Grotesk',fontSize:28,fontWeight:800,marginLeft:8}}>{f.from}</span></div>
      </div>))}
    </div>
  </section></div>);
}

/* ═══ WARRANTY ═══ */
function WarrantyPage() {
  useReveal();
  const s = [
    {num:'01',title:'100% Satisfaction Guaranteed',body:'If anything beyond our accepted minor flaw standard is present, we come back and make it right at no charge.'},
    {num:'02',title:'Minor Imperfections',body:'We allow up to 4 minor imperfections per install — tiny dust particles, small edge gaps, micro bubbles during curing, or minor debris marks.'},
    {num:'03',title:'Mobile Tinting & Garage Requirement',body:'For the best possible result on a mobile job, a garage or covered space is strongly recommended. Working outdoors exposes the film to dust, wind, and debris that can cause minor imperfections beyond our standard allowance. If no covered space is available, we will still do our very best — but we cannot guarantee a perfect result under open-air conditions. If conditions are not suitable for a quality install, we reschedule. We never proceed on a day we cannot confidently deliver.'},
    {num:'04',title:'Lifetime Warranty',body:'Covers bubbling, peeling, lifting, cracking, delamination, color fading, adhesive failure, and manufacturer defects. Full labor included.'},
    {num:'05',title:'Warranty Exclusions',body:'Physical damage, rolling windows within 5–7 days, ammonia-based cleaners, accident damage, third-party removal, or care neglect.'},
    {num:'06',title:'Making a Claim',body:'Contact us directly for a free inspection. Proof of original service required. Non-transferable unless agreed in writing.'},
    {num:'07',title:'No Full Refunds',body:'All services are non-refundable once the installation has begun. We do not issue cash or card refunds under any circumstances. If you are unhappy with the result, we will rebook and correct the issue at no charge under our satisfaction guarantee — but no monetary refunds will be issued.'},
  ];
  return (<div style={{paddingTop:130}}><section style={{padding:'0 28px 120px',maxWidth:880,margin:'0 auto'}}>
    <SH tag="Our Commitment" title="Warranty & Policy" sub="Backed by our satisfaction guarantee and lifetime warranty." />
    {s.map((x,i)=>(<div key={i} className={`rv d${(i%3)+1}`} style={{padding:'32px 36px',borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',marginBottom:10}}>
      <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
        <span style={{fontFamily:'Space Grotesk',fontSize:32,fontWeight:800,color:'#6c63ff',opacity:0.3,lineHeight:1,minWidth:40}}>{x.num}</span>
        <div><h3 style={{fontFamily:'Space Grotesk',fontSize:19,fontWeight:700,marginBottom:10}}>{x.title}</h3><p style={{color:'#8e8ea0',fontSize:14,lineHeight:1.8}}>{x.body}</p></div>
      </div>
    </div>))}
  </section></div>);
}

/* ═══ CONTACT ═══ */
function ContactPage() {
  useReveal();
  const [form, setForm] = useState({ name: '', phone: '', email: '', vehicle: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: 'e9a25c8b-5b60-4184-a34a-746272b7c1ee',
          subject: `210 Tint Contact: ${form.vehicle || 'General Inquiry'} — ${form.name}`,
          from_name: form.name,
          name: form.name,
          email: form.email,
          phone: form.phone,
          vehicle: form.vehicle,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      }
    } catch { /* silent fail */ }
    setSending(false);
  };

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', background: '#101018', color: '#eee', fontSize: 15, outline: 'none', transition: 'border-color 0.3s', fontFamily: 'Inter, sans-serif' };

  return (<div style={{paddingTop:130}}><section style={{padding:'0 28px 120px',maxWidth:1100,margin:'0 auto'}}>
    <SH tag="Get In Touch" title="Reach Out Today" sub="Questions or ready to book? We are here to help." />
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:24}}>
      <div className="rv" style={{padding:36,borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f'}}>
        <h3 style={{fontFamily:'Space Grotesk',fontSize:19,fontWeight:700,marginBottom:4}}>Send a Message</h3>
        <p style={{color:'#4a4a5a',fontSize:13,marginBottom:28}}>We respond within 24 hours.</p>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Message Sent!</h3>
            <p style={{ color: '#8e8ea0', fontSize: 15, lineHeight: 1.7 }}>We got your message and will respond within 24 hours.</p>
            <button onClick={() => { setSent(false); setForm({ name: '', phone: '', email: '', vehicle: '', message: '' }); }} style={{ marginTop: 20, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#8e8ea0', padding: '10px 24px', borderRadius: 3, cursor: 'pointer', fontSize: 13 }}>Send Another</button>
          </div>
        ) : (
          <>
            {[{label:'Name',key:'name'},{label:'Phone',key:'phone'},{label:'Email',key:'email'},{label:'Vehicle / Service',key:'vehicle'}].map((l)=>(<div key={l.key} style={{marginBottom:14}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#4a4a5a',marginBottom:6,letterSpacing:'2px',textTransform:'uppercase'}}>{l.label}{(l.key==='name'||l.key==='email')&&<span style={{color:'#6c63ff'}}> *</span>}</label><input value={(form as any)[l.key]} onChange={(e)=>setForm({...form,[l.key]:e.target.value})} style={inputStyle} onFocus={(e)=>e.currentTarget.style.borderColor='#6c63ff'} onBlur={(e)=>e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}/></div>))}
            <div style={{marginBottom:14}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#4a4a5a',marginBottom:6,letterSpacing:'2px',textTransform:'uppercase'}}>Message <span style={{color:'#6c63ff'}}>*</span></label><textarea rows={4} value={form.message} onChange={(e)=>setForm({...form,message:e.target.value})} style={{...inputStyle,resize:'vertical'}} onFocus={(e)=>e.currentTarget.style.borderColor='#6c63ff'} onBlur={(e)=>e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}/></div>
            <button onClick={handleSubmit} disabled={sending || !form.name || !form.email || !form.message} style={{width:'100%',padding:'14px',borderRadius:3,border:'none',cursor: (!form.name||!form.email||!form.message) ? 'not-allowed' : 'pointer',background: (!form.name||!form.email||!form.message) ? '#333' : '#6c63ff',color:'#fff',fontSize:15,fontWeight:700,boxShadow: (!form.name||!form.email||!form.message) ? 'none' : '0 4px 20px rgba(108,99,255,0.3)',transition:'all 0.3s'}}>{sending ? 'Opening...' : 'Send Message'}</button>
          </>
        )}
      </div>
      <div className="rv d2">
        {[{label:'Service Area',val:'Mobile — Columbia, MD\n& the entire DMV'},{label:'Phone',val:'(240) 338-7762'},{label:'Email',val:'210tints@gmail.com'},{label:'Hours',val:'Mon — Sat: 6 AM — 11 PM\nSun: By Appointment'}].map((c,i)=>(<div key={i} style={{padding:'22px 24px',borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',marginBottom:10}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'#6c63ff',display:'block',marginBottom:6}}>{c.label}</span>
          <p style={{color:'#8e8ea0',fontSize:14,whiteSpace:'pre-line',lineHeight:1.7}}>{c.val}</p>
        </div>))}
        <div style={{marginTop:10,padding:'24px',borderRadius:4,background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.04)',textAlign:'center'}}>
          <h4 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:15,marginBottom:8}}>Mobile Service Available</h4>
          <p style={{color:'#8e8ea0',fontSize:12,marginBottom:16}}>We come to you — home, work, wherever works.</p>
          <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{display:'inline-block',background:'#6c63ff',color:'#fff',padding:'11px 28px',borderRadius:3,fontSize:13,fontWeight:600,textDecoration:'none'}}>Schedule Online</a>
        </div>
      </div>
    </div>
  </section></div>);
}

/* ═══ MARYLAND TINT LAWS ═══ */
function TintLawsPage({ go }: { go: (p: string) => void }) {
  useReveal();
  const laws = [
    { part: 'Front Windshield', rule: 'Non-reflective tint is allowed along the top of the windshield above the AS-1 line (manufacturer\'s line, typically top 5 inches).', legal: true },
    { part: 'Front Side Windows', rule: 'Must allow more than 35% of light in (35% VLT minimum). This is measured by law enforcement with a tint meter.', legal: true },
    { part: 'Rear Side Windows', rule: 'Any darkness can be used. No restrictions on VLT percentage for rear passenger windows.', legal: true },
    { part: 'Rear Windshield', rule: 'Any darkness can be used. No VLT restrictions. If rear window is tinted, dual side mirrors are required.', legal: true },
    { part: 'Reflectivity', rule: 'Maryland law does not allow tint that is more than 35% reflective on any window. Mirrored or highly reflective tint is prohibited.', legal: false },
    { part: 'Color Restrictions', rule: 'Red, yellow, and amber tint colors are not permitted on any windows in Maryland.', legal: false },
  ];
  const tips = [
    'Maryland state police use calibrated tint meters during traffic stops.',
    'Medical exemptions exist — a doctor can certify the need for darker front tint.',
    'Penalties for illegal tint include fines up to $500 and a repair order.',
    'Tint shops are not liable for your tint choice — you are responsible for compliance.',
    'Out-of-state vehicles are still subject to MD tint laws while driving in Maryland.',
  ];
  return (<div style={{ paddingTop: 130 }}><section style={{ padding: '0 28px 80px', maxWidth: 880, margin: '0 auto' }}>
    <SH tag="Maryland Law" title="Window Tint Laws in MD" sub="Know what's legal before you tint. Updated for 2026." />
    <div style={{ display: 'grid', gap: 10, marginBottom: 60 }}>
      {laws.map((l, i) => (
        <div key={i} className={`rv d${(i % 3) + 1}`} style={{ padding: '28px 32px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{l.legal ? '✅' : '🚫'}</span>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700 }}>{l.part}</h3>
          </div>
          <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8 }}>{l.rule}</p>
        </div>
      ))}
    </div>
    <div className="rv" style={{ padding: '36px', borderRadius: 4, border: '1px solid rgba(108,99,255,0.15)', background: '#0a0a0f', marginBottom: 60 }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Quick Tips</h3>
      {tips.map((t, i) => (
        <div key={i} style={{ padding: '8px 0', fontSize: 16, color: '#8e8ea0', display: 'flex', gap: 12, alignItems: 'flex-start', lineHeight: 1.7 }}>
          <span style={{ color: '#6c63ff', fontSize: 8, marginTop: 8, flexShrink: 0 }}>&#9646;</span>{t}
        </div>
      ))}
    </div>
    <div className="rv" style={{ textAlign: 'center', padding: '48px 28px', borderRadius: 4, background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.1)' }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Not Sure What's Legal?</h3>
      <p style={{ color: '#8e8ea0', fontSize: 16, marginBottom: 24 }}>We'll recommend the perfect shade for your vehicle — 100% legal and looking great.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{ background: '#6c63ff', color: '#fff', padding: '14px 36px', borderRadius: 3, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 30px rgba(108,99,255,0.3)' }}>Book Now</a>
        <button onClick={() => go('home')} style={{ background: 'transparent', color: '#fff', padding: '14px 36px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>Try Tint Simulator</button>
      </div>
    </div>
  </section>
  {/* Tint Care Guide */}
  <section style={{ padding: '80px 28px 120px', maxWidth: 880, margin: '0 auto' }}>
    <SH tag="After Care" title="How to Care for Your Tint" sub="Follow these steps to keep your tint looking flawless for years." />
    {[
      { title: 'Wait 5–7 Days Before Rolling Down Windows', desc: 'The adhesive needs time to fully cure. Rolling windows down too early can cause peeling, bubbling, or shifting. Be patient — it\'s worth the wait.' },
      { title: 'Small Bubbles Are Normal', desc: 'You may notice tiny water bubbles or a hazy appearance during the first few weeks. This is moisture trapped during installation. It will evaporate and disappear completely as the film cures.' },
      { title: 'Clean with Ammonia-Free Products Only', desc: 'Ammonia-based cleaners (like Windex) will damage and discolor tint film. Use a soft microfiber cloth with ammonia-free glass cleaner or just water and a drop of dish soap.' },
      { title: 'Avoid Abrasive Materials', desc: 'Never use paper towels, rough sponges, or scrapers on tinted windows. These can scratch the film surface. Always use a clean, soft microfiber cloth.' },
      { title: 'Be Gentle with Seat Belts & Sharp Objects', desc: 'Seat belt buckles, rings, and sharp objects can scratch tint when they contact the window. Be mindful when buckling up near tinted surfaces.' },
      { title: 'Park in Shade When Possible', desc: 'While quality films like UVIRON are UV-stable and won\'t fade, minimizing prolonged direct sun exposure helps maintain the adhesive and prolongs the life of any film.' },
    ].map((c, i) => (
      <div key={i} className={`rv d${(i % 3) + 1}`} style={{ padding: '28px 32px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: 800, color: '#6c63ff', opacity: 0.3, lineHeight: 1, minWidth: 32 }}>{String(i + 1).padStart(2, '0')}</span>
          <div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{c.title}</h3>
            <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8 }}>{c.desc}</p>
          </div>
        </div>
      </div>
    ))}
  </section></div>);
}

/* ═══ AI CHATBOT WIDGET (with Calendly booking) ═══ */
function ChatWidget() {
  const WORKER_URL = 'https://tints-proxy-production.up.railway.app';
  const CALENDLY_USER = 'https://api.calendly.com/users/7f757ebd-f408-4dcd-b06f-7cd791d4ec88';
  const EVENT_MAP: Record<string, string> = {
    'coupe-two-side':'coupe-two-side-windows','coupe-windshield':'coupe-front-or-back-windshield','coupe-all-sides':'coupe-all-side-windows','coupe-whole-no-wind':'coupe-whole-car-without-windshield','coupe-whole':'coupe-whole-car-with-windshield',
    'sedan-two-side':'sedan-two-side-windows','sedan-windshield':'sedan-front-or-back-windshield','sedan-all-sides':'sedan-all-side-windows','sedan-whole-no-wind':'sedan-whole-car-without-windshield','sedan-whole':'sedan-whole-car-with-windshield',
    'suv-two-side':'suv-truck-van-two-side-windows','suv-windshield':'suv-truck-van-front-or-back-windshield','suv-all-sides':'suv-truck-van-all-side-windows','suv-whole-no-wind':'suv-truck-van-whole-car-without-windshield','suv-whole':'suv-truck-van-whole-car-with-windshield',
    'mobile-job':'any-car-mobile-job-request',
  };

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string; html?: string }[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const eventCacheRef = useRef<any[] | null>(null);

  // Intro pop-up — appears 4s after page load if user hasn't dismissed it before
  useEffect(() => {
    if (sessionStorage.getItem('210-intro-dismissed') === '1') return;
    const t = setTimeout(() => setShowIntro(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const dismissIntro = () => {
    setShowIntro(false);
    sessionStorage.setItem('210-intro-dismissed', '1');
  };

  const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const SYSTEM = `You are the AI booking agent for 210 Tints — a 4.9-star rated mobile window tinting service in Columbia, Maryland serving the DMV. We proudly use UVIRON performance films.

CONTACT: (240) 338-7762, 210tints@gmail.com. 100% mobile service — we come to YOU anywhere in the DMV.

FILMS: Premium Carbon (entry, ~98% UV, 3-5yr warranty), Nano Carbon PUREMAX (mid, 99% UV, 35-58% TSER, lifetime warranty), Nano Ceramic KOOLMAX (top, 99% UV, 79-89% IR rejection, lifetime warranty).

PRICING - COUPES: Premium Carbon: all sides $50, windshield $80, full no wind $125, whole $205. Nano Carbon: all sides $75, windshield $110, full no wind $180, whole $290. Nano Ceramic: all sides $115, windshield $170, full no wind $275, whole $445.
SEDANS: Premium Carbon: 2 sides $65, all 4 $105, windshield $80, full no wind $185, whole $265. Nano Carbon: 2 sides $75, all 4 $145, windshield $115, full no wind $260, whole $375. Nano Ceramic: 2 sides $115, all 4 $225, windshield $180, full no wind $395, whole $575.
TRUCKS/SUVs: Premium Carbon: 2 sides $65, all sides $120, windshield $115, full no wind $210, whole $325. Nano Carbon: 2 sides $85, all sides $170, windshield $145, full no wind $305, whole $450. Nano Ceramic: 2 sides $135, all sides $260, windshield $220, full no wind $470, whole $690.
ADD-ON: Computer Cut Film +$50.

MOBILE JOB NOTICE: If the customer is booking a mobile job, always ask if they have access to a garage or covered parking space at their location. Let them know that without a garage or covered area, there is a significantly higher chance of minor imperfections (dust, wind, debris) affecting the install quality. We will always do our best, but we cannot guarantee a flawless result on an open-air mobile job. Mention this early and clearly.

BOOKING FLOW: Collect: name, email, phone, vehicle year/make/model, tint darkness %, tint type (Premium Carbon/Nano Carbon/Nano Ceramic), previously tinted (Yes/No/I don't know), waiting or leaving during appointment, any notes, preferred date.
Once you have all info, output: [BOOK:event_key:YYYY-MM-DD:name:email:phone:vehicle:tint_type:prev_tinted:waiting_or_leaving:extra_notes]

EVENT KEYS: coupe-two-side, coupe-windshield, coupe-all-sides, coupe-whole-no-wind, coupe-whole, sedan-two-side, sedan-windshield, sedan-all-sides, sedan-whole-no-wind, sedan-whole, suv-two-side, suv-windshield, suv-all-sides, suv-whole-no-wind, suv-whole, mobile-job

CRITICAL: In [BOOK:] command, tint_type MUST be exactly "Premium Carbon", "Nano Carbon", or "Nano Ceramic" — no brand names or symbols.
Today: ${todayStr}. Use current year or later for dates. Be friendly, conversational, short replies. Ask 1-2 things at a time.`;

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [messages, typing]);

  const addMsg = (role: string, content: string, html?: string) => {
    setMessages(prev => [...prev, { role, content, html }]);
  };

  const getEventTypes = async () => {
    if (eventCacheRef.current) return eventCacheRef.current;
    try {
      const res = await fetch(`${WORKER_URL}/calendly/event_types?user=${encodeURIComponent(CALENDLY_USER)}&count=50`, { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      eventCacheRef.current = data.collection || [];
      return eventCacheRef.current;
    } catch { return []; }
  };

  const getSlots = async (eventTypeUri: string, dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setDate(d.getDate() + 1);
      const end = d.toISOString().split('T')[0] + 'T04:59:59.000000Z';
      const res = await fetch(`${WORKER_URL}/calendly/event_type_available_times?event_type=${encodeURIComponent(eventTypeUri)}&start_time=${dateStr}T05:00:00.000000Z&end_time=${end}`, { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      return data.collection || [];
    } catch { return []; }
  };

  const createBooking = async (eventTypeUri: string, startTime: string, name: string, email: string, phone: string, vehicle: string, tintType: string, prevTinted: string, waitOrLeave: string, extraNotes: string) => {
    try {
      const res = await fetch(`${WORKER_URL}/calendly/scheduling_links`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_event_count: 1, owner: eventTypeUri, owner_type: 'EventType' }),
      });
      const data = await res.json();
      let url = data.resource?.booking_url;
      if (url) {
        const parts = name.trim().split(' ');
        const cleanPhone = phone.startsWith('+1') ? phone : '+1' + phone.replace(/\D/g, '');
        url += `?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&first_name=${encodeURIComponent(parts[0] || '')}&last_name=${encodeURIComponent(parts.slice(1).join(' ') || '')}&a1=${encodeURIComponent(cleanPhone)}&a2=${encodeURIComponent(vehicle)}&a3=${encodeURIComponent(tintType)}&a4=${encodeURIComponent(prevTinted)}&a5=${encodeURIComponent(waitOrLeave)}&a6=${encodeURIComponent(extraNotes)}`;
        const t = new Date(startTime).toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        addMsg('assistant', '', `<div style="padding:10px 14px;border-radius:16px;border-bottom-left-radius:4px;background:#0f0f0f;border:1px solid #222;font-size:13.5px;line-height:1.6">🎉 <strong>Almost done, ${parts[0]}!</strong><br><br>Your slot for <strong>${t}</strong> is being held.<br><br><a href="${url}" target="_blank" rel="noreferrer" style="display:inline-block;background:#4B5FE0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;margin:4px 0">✅ Confirm My Appointment</a><br><br><span style="font-size:11px;color:#6b7280">You'll get a confirmation email once booked.</span></div>`);
        return true;
      }
      return false;
    } catch { return false; }
  };

  const handleBooking = async (bookCmd: string) => {
    const parts = bookCmd.replace('[BOOK:', '').replace(']', '').split(':');
    const [eventKey, dateStr, name, email, phone, vehicle, tintType, prevTinted, waitOrLeave] = parts;
    const extraNotes = parts.slice(9).join(':') || '';

    addMsg('assistant', `⏳ Checking availability for **${dateStr}**...`);

    const eventTypes = await getEventTypes();
    const slug = EVENT_MAP[eventKey] || eventKey;
    const eventType = eventTypes.find((e: any) => e.slug === slug || e.name.toLowerCase().includes(slug.replace(/-/g, ' ')));

    if (!eventType) {
      addMsg('assistant', '', `<div style="padding:10px 14px;border-radius:16px;border-bottom-left-radius:4px;background:#0f0f0f;border:1px solid #222;font-size:13.5px;line-height:1.6">Couldn't find that service type. Book directly here:<br><br><div style="border-radius:12px;overflow:hidden;border:1px solid #222;margin-top:8px"><iframe src="https://calendly.com/210tints?embed_type=Inline&hide_gdpr_banner=1" style="width:100%;height:280px;border:none" title="Book"></iframe><div style="font-size:11px;color:#6b7280;padding:8px 12px;border-top:1px solid #1a1a1a">📅 Pick your date & time above</div></div></div>`);
      return;
    }

    const slots = await getSlots(eventType.uri, dateStr);
    if (!slots.length) {
      addMsg('assistant', `No slots available on ${dateStr}. Would you like to try a different date?`);
      historyRef.current.push({ role: 'assistant', content: `No slots available on ${dateStr}. Would you like to try a different date?` });
      return;
    }

    // Show slot picker
    const d = new Date(slots[0].start_time).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const slotButtons = slots.map((s: any) => {
      const t = new Date(s.start_time);
      const label = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `<button data-slot="${s.start_time}" data-uri="${eventType.uri}" data-name="${encodeURIComponent(name)}" data-email="${encodeURIComponent(email)}" data-phone="${encodeURIComponent(phone)}" data-vehicle="${encodeURIComponent(vehicle)}" data-tint="${encodeURIComponent(tintType)}" data-prev="${encodeURIComponent(prevTinted)}" data-wait="${encodeURIComponent(waitOrLeave)}" data-notes="${encodeURIComponent(extraNotes)}" style="background:#1a1a2e;border:1px solid #4B5FE0;color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit">${label}</button>`;
    }).join('');

    addMsg('assistant', '', `<div style="padding:10px 14px;border-radius:16px;border-bottom-left-radius:4px;background:#0f0f0f;border:1px solid #222;font-size:13.5px;line-height:1.6"><strong>✅ Available times on ${d}:</strong><br><br><div class="slot-picker" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">${slotButtons}</div></div>`);
    historyRef.current.push({ role: 'assistant', content: `Showing available slots for ${d}.` });
  };

  // Handle slot button clicks via event delegation
  useEffect(() => {
    const handler = async (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('[data-slot]') as HTMLElement | null;
      if (!btn) return;
      const startTime = btn.dataset.slot!;
      const label = new Date(startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      addMsg('assistant', `⏳ Securing your slot for **${label}**...`);
      const ok = await createBooking(btn.dataset.uri!, startTime, decodeURIComponent(btn.dataset.name!), decodeURIComponent(btn.dataset.email!), decodeURIComponent(btn.dataset.phone!), decodeURIComponent(btn.dataset.vehicle!), decodeURIComponent(btn.dataset.tint!), decodeURIComponent(btn.dataset.prev!), decodeURIComponent(btn.dataset.wait!), decodeURIComponent(btn.dataset.notes!));
      if (!ok) {
        addMsg('assistant', '', `<div style="padding:10px 14px;border-radius:16px;border-bottom-left-radius:4px;background:#0f0f0f;border:1px solid #222;font-size:13.5px;line-height:1.6">Let me open our booking page:<br><br><div style="border-radius:12px;overflow:hidden;border:1px solid #222;margin-top:8px"><iframe src="https://calendly.com/210tints?embed_type=Inline&hide_gdpr_banner=1" style="width:100%;height:280px;border:none" title="Book"></iframe></div></div>`);
      }
    };
    const el = msgsRef.current;
    el?.addEventListener('click', handler);
    return () => { el?.removeEventListener('click', handler); };
  }, []);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) dismissIntro();
    if (next && !hasOpened) {
      setHasOpened(true);
      const greet = { role: 'assistant', content: "Hey! 👋 Welcome to **210 Tints** — Columbia's mobile tinting specialists using **UVIRON** performance films.\n\nI can help with pricing, film info, or book you in. We come to you anywhere in the DMV! What can I help with?" };
      setMessages([greet]);
      historyRef.current = [greet];
      getEventTypes(); // pre-fetch
    }
  };

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    historyRef.current.push(userMsg);
    setTyping(true);
    try {
      const res = await fetch(`${WORKER_URL}/anthropic`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, system: SYSTEM, messages: historyRef.current }),
      });
      const data = await res.json();
      setTyping(false);
      if (data.content?.[0]) {
        const reply = data.content[0].text;
        const bookMatch = reply.match(/\[BOOK:[^\]]+\]/);
        if (bookMatch) {
          const cleaned = reply.replace(bookMatch[0], '').trim();
          if (cleaned) { addMsg('assistant', cleaned); historyRef.current.push({ role: 'assistant', content: cleaned }); }
          await handleBooking(bookMatch[0]);
        } else {
          addMsg('assistant', reply);
          historyRef.current.push({ role: 'assistant', content: reply });
        }
      }
    } catch { setTyping(false); addMsg('assistant', 'Connection issue — call us at (240) 338-7762.'); }
  };

  const formatMsg = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

  return (
    <>
      {/* Intro pop-up bubble — appears 4s after load, dismissible */}
      <div className="chat-intro-bubble" style={{
        position: 'fixed', bottom: 100, right: 28, maxWidth: 280, zIndex: 9997,
        background: '#fff', color: '#0a0a0f', borderRadius: 16, padding: '14px 38px 14px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(75,95,224,0.15)',
        opacity: showIntro && !isOpen ? 1 : 0,
        transform: showIntro && !isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
        pointerEvents: showIntro && !isOpen ? 'all' : 'none',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: 'pointer',
      }} onClick={() => { dismissIntro(); toggle(); }}>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Hi! I'm the 210 assistant 👋</div>
        <div style={{ fontSize: 13, color: '#4a4a5a', lineHeight: 1.45 }}>Ask me anything — pricing, films, or book in seconds.</div>
        <button onClick={(e) => { e.stopPropagation(); dismissIntro(); }} style={{
          position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
          border: 'none', background: 'rgba(0,0,0,0.06)', color: '#4a4a5a', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1, padding: 0,
        }} aria-label="Dismiss">×</button>
        {/* Tail pointing to chat button */}
        <div style={{ position: 'absolute', bottom: -7, right: 24, width: 14, height: 14, background: '#fff', transform: 'rotate(45deg)', boxShadow: '2px 2px 4px rgba(0,0,0,0.04)' }} />
      </div>
      <button className="chat-toggle-btn" onClick={toggle} style={{ position: 'fixed', bottom: 28, right: 28, width: 60, height: 60, background: '#4B5FE0', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'tintRing 3s ease infinite', transition: 'transform 0.2s' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {isOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />}
        </svg>
      </button>
      <div className="chat-window" style={{
        position: 'fixed', bottom: 100, right: 28, width: 390, maxHeight: 620, background: '#0d0d0d', border: '1px solid #222', borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 9998,
        boxShadow: '0 24px 80px rgba(0,0,0,0.8)', transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'all' : 'none', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
      }}>
        <div style={{ padding: '16px 18px', background: '#111', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, background: '#4B5FE0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 16, color: '#fff', position: 'relative' }}>
            AI<span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, background: '#4ade80', borderRadius: '50%', border: '2px solid #111' }} />
          </div>
          <div>
            <strong style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16, display: 'block', color: '#fff' }}>210 Tints Assistant</strong>
            <span style={{ fontSize: 12, color: '#6b7280' }}>UVIRON Certified · Columbia, MD</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => { setMessages([]); historyRef.current = []; setHasOpened(false); toggle(); setTimeout(toggle, 100); }} style={{ background: '#1a1a1a', border: 'none', color: '#6b7280', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↺</button>
            <button onClick={toggle} style={{ background: '#1a1a1a', border: 'none', color: '#6b7280', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
        <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 300, maxHeight: 400, scrollBehavior: 'smooth' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', maxWidth: m.html ? '100%' : '86%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.22s ease' }}>
              {m.html ? (
                <div dangerouslySetInnerHTML={{ __html: m.html }} />
              ) : (
                <div style={{ padding: '10px 14px', borderRadius: 16, fontSize: 13.5, lineHeight: 1.6, fontFamily: 'Inter, sans-serif', background: m.role === 'user' ? '#0c0e1f' : '#0f0f0f', border: m.role === 'user' ? '1px solid rgba(75,95,224,0.3)' : '1px solid #222', borderBottomRightRadius: m.role === 'user' ? 4 : 16, borderBottomLeftRadius: m.role === 'user' ? 16 : 4, color: '#fff' }} dangerouslySetInnerHTML={{ __html: formatMsg(m.content) }} />
              )}
            </div>
          ))}
          {typing && <div style={{ alignSelf: 'flex-start', background: '#0f0f0f', border: '1px solid #222', borderRadius: 16, borderBottomLeftRadius: 4, padding: '12px 16px', display: 'flex', gap: 5 }}>
            {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, background: '#6b7280', borderRadius: '50%', animation: `tintDot 1.3s infinite ${i * 0.18}s` }} />)}
          </div>}
        </div>
        {messages.length <= 1 && (
          <div style={{ padding: '8px 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
            {['Packages & Pricing', 'I want to book', 'KOOLMAX Ceramic?', 'Mobile Service?'].map(q => (
              <button key={q} onClick={() => send(q)} style={{ background: 'transparent', border: '1px solid #222', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#4B5FE0'; e.currentTarget.style.borderColor = '#4B5FE0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#222'; }}
              >{q}</button>
            ))}
          </div>
        )}
        <div style={{ borderTop: '1px solid #1a1a1a', padding: '12px 14px', display: 'flex', gap: 8, background: '#111', flexShrink: 0 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Ask about tinting, pricing, or book…"
            style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#fff', fontSize: 16, padding: '9px 13px', outline: 'none', fontFamily: 'Inter' }} />
          <button onClick={() => send()} style={{ width: 38, height: 38, background: '#4B5FE0', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 18 }}>➤</button>
        </div>
      </div>
    </>
  );
}

/* ═══ APP ═══ */
/* ═══ STICKY MOBILE BOOK BAR ═══ */
function MobileBookBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const fn = () => setShow(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9990,
      background: 'rgba(5,5,7,0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(108,99,255,0.15)',
      padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      transform: show ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.4s cubic-bezier(.16,1,.3,1)',
    }}>
      <div>
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 15, color: '#fff', display: 'block' }}>210 Tint</span>
        <a href="tel:2403387762" style={{ fontSize: 13, color: '#8e8ea0', textDecoration: 'none' }}>(240) 338-7762</a>
      </div>
      <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{
        background: '#6c63ff', color: '#fff', padding: '11px 28px', borderRadius: 3,
        fontSize: 14, fontWeight: 700, textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(108,99,255,0.3)', flexShrink: 0,
      }}>Book Now</a>
    </div>
  );
}

/* ═══ BACK TO TOP BUTTON ═══ */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const fn = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{
      position: 'fixed', bottom: 100, left: 28, width: 44, height: 44,
      borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(5,5,7,0.9)', backdropFilter: 'blur(10px)',
      color: '#8e8ea0', fontSize: 18, cursor: 'pointer', zIndex: 9980,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: show ? 1 : 0, pointerEvents: show ? 'all' : 'none',
      transform: show ? 'translateY(0)' : 'translateY(10px)',
      transition: 'all 0.3s cubic-bezier(.16,1,.3,1)',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)'; e.currentTarget.style.color = '#6c63ff'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8e8ea0'; }}
    >↑</button>
  );
}

/* ═══ TRUST BADGES ═══ */
function TrustBadges() {
  const badges = [
    { icon: '🛡️', label: 'UVIRON Certified', desc: 'Official performance film partner' },
    { icon: '⭐', label: '4.9 Google Rating', desc: '30+ five-star reviews' },
    { icon: '🔧', label: '1000+ Vehicles', desc: 'Professionally tinted' },
    { icon: '🏠', label: '100% Mobile', desc: 'We come to you — anywhere in DMV' },
    { icon: '✅', label: 'Lifetime Warranty', desc: 'On Nano Ceramic KOOLMAX' },
    { icon: '✂️', label: 'Computer-Cut', desc: 'No blade touches your car' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {badges.map((b, i) => (
        <div key={i} className={`rv d${(i % 4) + 1}`} style={{
          padding: '24px 20px', borderRadius: 4, background: '#0d0d14',
          border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center',
          transition: 'all 0.4s cubic-bezier(.16,1,.3,1)',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{b.icon}</span>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 4 }}>{b.label}</span>
          <span style={{ fontSize: 12, color: '#8e8ea0' }}>{b.desc}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ BLOG: CERAMIC VS CARBON ═══ */
function CeramicVsCarbonPage() {
  useReveal();
  return (<div style={{ paddingTop: 130 }}><section style={{ padding: '0 28px 120px', maxWidth: 880, margin: '0 auto' }}>
    <SH tag="Film Guide" title="Ceramic vs Carbon Tint" sub="Which film is worth it? A detailed breakdown to help you decide." />

    <div className="rv" style={{ padding: '32px', borderRadius: 4, border: '1px solid rgba(108,99,255,0.15)', background: '#0a0a0f', marginBottom: 32 }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20, marginBottom: 16 }}>The Short Answer</h3>
      <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8 }}>If you want the <strong style={{ color: '#fff' }}>best heat rejection, clarity, and longevity</strong> — go ceramic. If you want <strong style={{ color: '#fff' }}>solid protection at a lower price</strong> — carbon is excellent. Both block 98%+ UV rays.</p>
    </div>

    {[
      { title: 'What is Carbon Tint?', body: 'Carbon tint uses carbon particles embedded in the film to block solar heat. It produces a deep matte-black finish that won\'t fade or turn purple over time. It\'s the most popular entry-level professional film and a massive upgrade over dyed tint. Our Premium Carbon and Nano Carbon PUREMAX films fall in this category.' },
      { title: 'What is Ceramic Tint?', body: 'Ceramic tint uses nano-ceramic particles — non-metallic, non-conductive technology that blocks significantly more infrared heat than carbon. Our UVIRON KOOLMAX Nano Ceramic rejects up to 89% of infrared heat while maintaining crystal-clear visibility, even at night. No haze, no signal interference.' },
      { title: 'Heat Rejection', body: 'This is the biggest difference. Carbon tint blocks 25–50% of solar heat depending on the grade. Ceramic blocks 50–75%. On a hot Maryland summer day, that difference is dramatic — your AC works less, your interior stays cooler, and your passengers are more comfortable.' },
      { title: 'Optical Clarity', body: 'Carbon tint has good clarity but can appear slightly darker from the inside, especially at night. Ceramic tint is crystal clear — it looks like there\'s nothing on the glass from the inside, even at darker shades. Night driving visibility is noticeably better with ceramic.' },
      { title: 'Warranty & Durability', body: 'Our Premium Carbon comes with a 3–5 year warranty. Nano Carbon PUREMAX carries a lifetime warranty. Nano Ceramic KOOLMAX also has a lifetime warranty. All UVIRON films are scratch-resistant, 2-ply 1.5mil, and will never bubble, peel, or discolor.' },
      { title: 'Price Difference', body: 'For a full sedan (no windshield), Premium Carbon is $185, Nano Carbon is $260, and Nano Ceramic is $395. The ceramic upgrade costs roughly 2x the entry price — but you get 2-3x the heat rejection and a lifetime warranty. For most customers, the comfort difference alone justifies it.' },
      { title: 'Signal Interference', body: 'None. All three of our film tiers — Premium Carbon, Nano Carbon, and Nano Ceramic — are 100% signal-safe. No interference with GPS, Bluetooth, cell service, toll transponders, or garage door openers. This is a common myth about ceramic tint that is not true for modern films.' },
      { title: 'Our Recommendation', body: 'If you drive daily and want the absolute best protection and comfort, go with Nano Ceramic KOOLMAX. If you\'re budget-conscious but still want quality, Nano Carbon PUREMAX is a fantastic middle ground with a lifetime warranty. Premium Carbon is perfect for daily drivers who want clean looks and UV protection at the best price.' },
    ].map((s, i) => (
      <div key={i} className={`rv d${(i % 3) + 1}`} style={{ padding: '28px 32px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f', marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
        <p style={{ color: '#8e8ea0', fontSize: 15, lineHeight: 1.8 }}>{s.body}</p>
      </div>
    ))}

    <div className="rv" style={{ textAlign: 'center', padding: '48px 28px', marginTop: 40, borderRadius: 4, background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.1)' }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Ready to Choose?</h3>
      <p style={{ color: '#8e8ea0', fontSize: 15, marginBottom: 24 }}>Our team can help you pick the perfect film for your vehicle and budget.</p>
      <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{ display: 'inline-block', background: '#6c63ff', color: '#fff', padding: '15px 40px', borderRadius: 3, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 30px rgba(108,99,255,0.3)' }}>Book a Consultation</a>
    </div>
  </section></div>);
}

/* ═══ BLOG: BEST TINT FOR MD SUMMERS ═══ */
function MDSummerTintPage() {
  useReveal();
  return (<div style={{ paddingTop: 130 }}><section style={{ padding: '0 28px 120px', maxWidth: 880, margin: '0 auto' }}>
    <SH tag="Seasonal Guide" title="Best Tint for Maryland Summers" sub="Beat the DMV heat with the right window film. Here's what actually works." />

    <div className="rv" style={{ padding: '32px', borderRadius: 4, border: '1px solid rgba(108,99,255,0.15)', background: '#0a0a0f', marginBottom: 32 }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Why Tint Matters in Maryland</h3>
      <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8 }}>Maryland summers hit 90°F+ with brutal humidity. Your car's interior can reach <strong style={{ color: '#fff' }}>140°F or higher</strong> when parked in the sun. The right window tint blocks infrared heat before it enters your cabin, reducing interior temps by up to 40°F and saving your AC from working overtime.</p>
    </div>

    {[
      { title: 'The #1 Pick: Nano Ceramic KOOLMAX', body: 'For Maryland summers, nano ceramic is the clear winner. UVIRON KOOLMAX blocks up to 89% of infrared radiation — the heat you feel through the glass. Even at lighter shades (35% or 50%), you get massive heat rejection without going too dark. It\'s the single best upgrade you can make for summer comfort.' },
      { title: 'Budget Option: Nano Carbon PUREMAX', body: 'If ceramic is outside your budget, Nano Carbon PUREMAX is a strong second choice. It blocks 35–58% of solar energy and 30–59% of infrared heat. You\'ll still feel a significant difference compared to no tint, and it comes with a lifetime warranty.' },
      { title: 'Best Shade for Front Windows (Legal)', body: 'Maryland law requires front side windows to allow more than 35% of light through. Our recommendation: 35% VLT on the fronts for maximum legal protection. At 35%, you get noticeable heat reduction while staying fully compliant. Pair it with 20% or 5% on the rears for a clean gradient look.' },
      { title: 'Windshield Tint: Worth It?', body: 'Absolutely — the windshield is your biggest glass surface and where the most heat enters. A ceramic windshield strip along the AS-1 line (top 5 inches) is legal in Maryland and blocks a surprising amount of heat and glare. Full windshield ceramic tint at 70% VLT is nearly invisible but blocks significant infrared heat.' },
      { title: 'How Much Cooler Will My Car Be?', body: 'With nano ceramic on all windows, expect your parked interior temperature to drop 25–40°F compared to untinted glass. Your AC will cool the cabin faster, use less fuel, and your leather/upholstery won\'t crack or fade from UV exposure. Most customers say the difference is immediately noticeable on the first hot day.' },
      { title: 'Best Time to Tint', body: 'Spring (March–May) is the best time to schedule tinting in Maryland. You get ahead of the summer heat, the film has ideal curing conditions (not too hot, not too cold), and our schedule isn\'t as packed as June–August. That said, we install year-round — even winter installations cure perfectly in a heated garage.' },
      { title: 'UV Protection for Your Family', body: 'All our films block 98–99.9% of UV radiation regardless of shade. This protects your skin from sun damage during daily commutes, protects kids in car seats, and prevents your dashboard, seats, and trim from fading and cracking. Even a light 70% VLT ceramic tint provides full UV protection.' },
    ].map((s, i) => (
      <div key={i} className={`rv d${(i % 3) + 1}`} style={{ padding: '28px 32px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f', marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
        <p style={{ color: '#8e8ea0', fontSize: 15, lineHeight: 1.8 }}>{s.body}</p>
      </div>
    ))}

    <div className="rv" style={{ textAlign: 'center', padding: '48px 28px', marginTop: 40, borderRadius: 4, background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.1)' }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Beat the Heat This Summer</h3>
      <p style={{ color: '#8e8ea0', fontSize: 15, marginBottom: 24 }}>Book now and we'll come to you — home, office, anywhere in the DMV.</p>
      <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{ display: 'inline-block', background: '#6c63ff', color: '#fff', padding: '15px 40px', borderRadius: 3, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 30px rgba(108,99,255,0.3)' }}>Book Your Appointment</a>
    </div>
  </section></div>);
}

/* ═══ TINT SIMULATOR PAGE ═══ */
function TintSimulatorPage() {
  useReveal();
  return (<div style={{ paddingTop: 130 }}><section style={{ padding: '0 28px 120px', maxWidth: 1320, margin: '0 auto' }}>
    <SH tag="Try It" title="Tint Simulator" sub="Preview how different films and darkness levels look on your vehicle." />
    <TintSimulator />
  </section></div>);
}

/* ═══ STARLIGHT HEADLINER PAGE ═══ */
function StarlightPage({ go }: { go: (p: string) => void }) {
  useReveal();
  return (<div style={{ paddingTop: 130 }}><section style={{ padding: '0 28px 120px', maxWidth: 880, margin: '0 auto' }}>
    <SH tag="New Service" title="Starlight Headliner" sub="A custom fiber-optic galaxy installed in your car's ceiling. Made for night drives." />

    <div className="rv" style={{ padding: '32px', borderRadius: 4, border: '1px solid rgba(108,99,255,0.15)', background: 'linear-gradient(180deg,#0a0a0f 0%,#0d0a1a 100%)', marginBottom: 32 }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20, marginBottom: 16 }}>What Is a Starlight Headliner?</h3>
      <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8 }}>Starlight headliners replace your car's stock fabric ceiling with hundreds of fiber-optic strands that create a starry-night effect. Originally made famous by Rolls-Royce, the install is now available for any vehicle. The lights are dimmable, energy-efficient, and wired into your dome light or a hidden switch.</p>
    </div>

    <div className="rv" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 32 }}>
      <div style={{ padding: '24px 22px', borderRadius: 4, background: '#0a0a0f', border: '1px solid rgba(108,99,255,0.3)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#8b83ff' }}>Starter</span>
        <div style={{ marginTop: 10 }}><span style={{ fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: 800 }}>$700</span></div>
        <p style={{ color: '#8e8ea0', fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>550 stars — clean, even galaxy effect. Great entry-level install.</p>
      </div>
      <div style={{ padding: '24px 22px', borderRadius: 4, background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#4a4a5a' }}>Add Density</span>
        <div style={{ marginTop: 10 }}><span style={{ fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: 800 }}>+$100–150</span></div>
        <p style={{ color: '#8e8ea0', fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>Per additional 100 stars. Build a denser, more dramatic night sky.</p>
      </div>
    </div>

    {[
      { title: 'Fully Customizable', body: 'Choose your star density (550 base, up to 1,500+), shooting-star effects, color temperature, and even constellation patterns. We design each install to match the vibe of your vehicle.' },
      { title: 'Premium Fiber Optics', body: 'We use high-grade fiber strands paired with a dimmable LED illuminator. The result: pinpoint stars with no hot spots, no wiring visible, and zero impact on your headliner once installed.' },
      { title: 'Professional Headliner Removal', body: 'Your headliner is carefully removed, the fiber array is hand-installed point-by-point, and the headliner is reinstalled with no signs of modification. The factory finish is preserved.' },
      { title: 'Dimmable & Switchable', body: 'Wired into your dome light circuit by default, or we can run a discreet switch. Dim from a soft accent glow all the way up to a full night-sky effect.' },
      { title: 'Safe for Your Vehicle', body: 'Low-voltage LED system pulls minimal power, generates no heat, and is fully reversible. No drilling into roof panels, no damage to electronics, no impact on your warranty.' },
    ].map((s, i) => (
      <div key={i} className={`rv d${(i % 3) + 1}`} style={{ padding: '28px 32px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f', marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
        <p style={{ color: '#8e8ea0', fontSize: 15, lineHeight: 1.8 }}>{s.body}</p>
      </div>
    ))}

    <div className="rv" style={{ textAlign: 'center', padding: '48px 28px', marginTop: 40, borderRadius: 4, background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.1)' }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Turn Your Ceiling Into a Galaxy</h3>
      <p style={{ color: '#8e8ea0', fontSize: 15, marginBottom: 24 }}>Book a Starlight install or chat with us about custom designs.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#6c63ff', color: '#fff', padding: '15px 40px', borderRadius: 3, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 30px rgba(108,99,255,0.3)' }}>Book Now</a>
        <button onClick={() => go('pricing')} style={{ background: 'transparent', color: '#fff', padding: '15px 40px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.12)', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>View All Pricing</button>
      </div>
    </div>
  </section></div>);
}

/* ═══ STARLIGHT SALE PAGE ═══ */
function StarlightSalePage({ go }: { go: (p: string) => void }) {
  useReveal();
  const orig = [700, 100, 150];
  const disc = orig.map(p => Math.round(p * 0.85));
  return (
    <div style={{ paddingTop: 130 }}>
      <section style={{ padding: '0 28px 120px', maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div className="rv" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 24, padding: '6px 18px', marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>✦</span>
            <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Limited Time Offer</span>
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 'clamp(36px,6vw,64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
            Starlight Headliner<br />
            <span className="grad-text">15% Off — Right Now</span>
          </h1>
          <p style={{ color: '#8e8ea0', fontSize: 18, maxWidth: 560, margin: '0 auto 32px' }}>
            Transform your ceiling into a custom night sky. Book this week and save on every package.
          </p>
          {/* Countdown-feel urgency badge */}
          <div style={{ display: 'inline-block', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '8px 20px', color: '#f87171', fontWeight: 700, fontSize: 14, letterSpacing: '1px' }}>
            SALE ENDS SOON — BOOK TO LOCK IN YOUR PRICE
          </div>
        </div>

        {/* Pricing cards */}
        <div className="rv d1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, marginBottom: 48 }}>
          {/* Starter */}
          <div style={{ padding: '36px 32px', borderRadius: 4, border: '1px solid rgba(108,99,255,0.35)', background: 'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(108,99,255,0.02))', boxShadow: '0 0 40px rgba(108,99,255,0.08)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22 }}>✦</div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Starter Package</h3>
            <p style={{ color: '#8e8ea0', fontSize: 14, marginBottom: 24 }}>550 fiber optic stars — most popular</p>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#4a4a5a', fontSize: 16, textDecoration: 'line-through', marginRight: 8 }}>${orig[0]}</span>
              <span style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 42, color: '#fff' }}>${disc[0]}</span>
            </div>
            <div style={{ display: 'inline-block', background: 'rgba(108,99,255,0.2)', borderRadius: 2, padding: '3px 10px', color: '#a78bfa', fontSize: 12, fontWeight: 700, marginBottom: 28 }}>SAVE ${orig[0] - disc[0]}</div>
            <button onClick={() => go('contact')} style={{ width: '100%', padding: '14px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 3, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Book Now</button>
          </div>

          {/* Add-on standard */}
          <div style={{ padding: '36px 32px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0f', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22 }}>＋</div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Extra Stars — Standard</h3>
            <p style={{ color: '#8e8ea0', fontSize: 14, marginBottom: 24 }}>+100 stars added to any package</p>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#4a4a5a', fontSize: 16, textDecoration: 'line-through', marginRight: 8 }}>${orig[1]}</span>
              <span style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 42, color: '#fff' }}>${disc[1]}</span>
            </div>
            <div style={{ display: 'inline-block', background: 'rgba(108,99,255,0.1)', borderRadius: 2, padding: '3px 10px', color: '#a78bfa', fontSize: 12, fontWeight: 700, marginBottom: 28 }}>SAVE ${orig[1] - disc[1]}</div>
            <button onClick={() => go('contact')} style={{ width: '100%', padding: '14px', background: 'transparent', color: '#fff', border: '1px solid rgba(108,99,255,0.4)', borderRadius: 3, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Add On</button>
          </div>

          {/* Add-on premium */}
          <div style={{ padding: '36px 32px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0f', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22 }}>✦✦</div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Extra Stars — Premium</h3>
            <p style={{ color: '#8e8ea0', fontSize: 14, marginBottom: 24 }}>+100 premium-density stars</p>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#4a4a5a', fontSize: 16, textDecoration: 'line-through', marginRight: 8 }}>${orig[2]}</span>
              <span style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 42, color: '#fff' }}>${disc[2]}</span>
            </div>
            <div style={{ display: 'inline-block', background: 'rgba(108,99,255,0.1)', borderRadius: 2, padding: '3px 10px', color: '#a78bfa', fontSize: 12, fontWeight: 700, marginBottom: 28 }}>SAVE ${orig[2] - disc[2]}</div>
            <button onClick={() => go('contact')} style={{ width: '100%', padding: '14px', background: 'transparent', color: '#fff', border: '1px solid rgba(108,99,255,0.4)', borderRadius: 3, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Add On</button>
          </div>
        </div>

        {/* What's included */}
        <div className="rv d2" style={{ padding: '40px 36px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f', marginBottom: 40 }}>
          <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20, marginBottom: 24 }}>What's Included</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            {['Fiber optic star ceiling install','Custom star density layout','100% mobile — we come to you','Professional-grade materials','Clean install, no mess left behind','Book online in under 2 minutes'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8e8ea0', fontSize: 14 }}>
                <span style={{ color: '#6c63ff', fontSize: 16, flexShrink: 0 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rv d3" style={{ textAlign: 'center' }}>
          <p style={{ color: '#8e8ea0', fontSize: 15, marginBottom: 24 }}>Questions? Call or text <a href="tel:2403387762" style={{ color: '#a78bfa', textDecoration: 'none' }}>(240) 338-7762</a></p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{ padding: '16px 40px', background: '#6c63ff', color: '#fff', borderRadius: 3, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Book at Sale Price</a>
            <button onClick={() => go('starlight')} style={{ padding: '16px 40px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Learn More</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [transitioning, setTransitioning] = useState(false);
  const go = (p: string) => {
    if (p === page) return;
    setTransitioning(true);
    setTimeout(() => {
      setPage(p);
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        setTransitioning(false);
      });
    }, 300);
  };
  return (
    <div style={{ minHeight: '100vh' }}>
      <LoadingScreen />
      <CursorGlow />
      <ChatWidget />
      <style>{`
        @media(max-width:860px){
          .desk-nav{display:none!important}
          .mob-btn{display:block!important}
          .chat-toggle-btn{bottom:68px!important;width:50px!important;height:50px!important}
          .chat-window{bottom:130px!important;right:12px!important;left:12px!important;width:auto!important;max-height:70vh!important}
          .chat-intro-bubble{bottom:130px!important;right:12px!important;max-width:260px!important}
        }
        @media(max-width:640px){
          .hero-stats{grid-template-columns:repeat(2,1fr)!important;gap:20px!important}
          .faq-toggle{padding:18px 20px!important}
          .faq-answer{padding:0 20px 20px!important}
        }
      `}</style>
      <ScrollBar />
      <Nav page={page} go={go} />
      <main key={page} style={{ opacity: transitioning ? 0 : 1, transform: transitioning ? 'translateY(20px)' : 'translateY(0)', transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(.16,1,.3,1)' }}>
        {page==='home'&&<HomePage go={go}/>}
        {page==='portfolio'&&<PortfolioPage/>}
        {page==='pricing'&&<PricingPage/>}
        {page==='compare'&&<ComparePage/>}
        {page==='warranty'&&<WarrantyPage/>}
        {page==='tint-laws'&&<TintLawsPage go={go}/>}
        {page==='ceramic-vs-carbon'&&<CeramicVsCarbonPage/>}
        {page==='md-summer-tint'&&<MDSummerTintPage/>}
        {page==='tint-simulator'&&<TintSimulatorPage/>}
        {page==='starlight'&&<StarlightPage go={go}/>}
        {page==='starlight-sale'&&<StarlightSalePage go={go}/>}
        {page==='contact'&&<ContactPage/>}
      </main>
      <Footer go={go} />
      <BackToTop />
      <style>{`@media(min-width:861px){.mob-book-bar{display:none!important}}`}</style>
      <div className="mob-book-bar"><MobileBookBar /></div>
    </div>
  );
}
