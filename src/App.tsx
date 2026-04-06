import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';

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

/* ── HERO IMAGE SLIDESHOW ── */
function HeroSlideshow() {
  const imgs = [
    'https://210tint.com/wp-content/uploads/2026/03/15903652-ee84-47db-985f-43bee6d9839a.png',
    'https://210tint.com/wp-content/uploads/2026/02/snowy-c63.png',
    'https://210tint.com/wp-content/uploads/2026/03/bac97502-b244-47f9-873b-c1cfd6bc741d.png',
    'https://210tint.com/wp-content/uploads/2026/02/snowy-m8.png',
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % imgs.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      {imgs.map((src, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === idx ? 0.35 : 0,
          transition: 'opacity 1.5s ease-in-out',
          animation: i === idx ? 'panZoom 8s ease-in-out forwards' : 'none',
          filter: 'saturate(0.5) brightness(0.7)',
        }} />
      ))}
      {/* Gradient overlays for readability */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,5,7,0.85) 0%, rgba(5,5,7,0.5) 50%, rgba(5,5,7,0.75) 100%)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%', background: 'linear-gradient(to top, var(--bg), transparent)', zIndex: 1 }} />
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
function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0); // 0=animate in, 1=hold, 2=fade out
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => onDone(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#050507',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: phase === 2 ? 0 : 1, transition: 'opacity 0.6s ease',
      pointerEvents: phase === 2 ? 'none' : 'all',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        transition: 'all 0.8s cubic-bezier(.16,1,.3,1)',
      }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 48, color: '#6c63ff', letterSpacing: '-1px' }}>210</span>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 48, color: '#fff', letterSpacing: '-1px' }}>TINT</span>
      </div>
      {/* Loading bar */}
      <div style={{ width: 120, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, marginTop: 28, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
          width: phase >= 1 ? '100%' : '0%',
          transition: 'width 1.2s cubic-bezier(.16,1,.3,1)',
        }} />
      </div>
      {/* Tagline */}
      <p style={{
        fontFamily: 'Plus Jakarta Sans', fontSize: 11, letterSpacing: '4px', textTransform: 'uppercase',
        color: '#4a4a5a', marginTop: 20,
        opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.8s ease 0.3s',
      }}>Mobile Nano-Ceramic Specialists</p>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
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
  const areas = [
    { id: 'howard', name: 'Howard County', d: 'M200,140 L260,120 L290,150 L280,200 L230,210 L195,180 Z', cx: 240, cy: 165 },
    { id: 'montgomery', name: 'Montgomery County', d: 'M130,190 L195,180 L230,210 L240,260 L180,280 L120,250 Z', cx: 180, cy: 230 },
    { id: 'pg', name: "Prince George's County", d: 'M230,210 L280,200 L310,240 L320,300 L260,310 L240,260 Z', cx: 275, cy: 260 },
    { id: 'baltimore', name: 'Baltimore', d: 'M260,80 L330,70 L360,100 L350,150 L290,150 L260,120 Z', cx: 310, cy: 110 },
    { id: 'dc', name: 'Washington, DC', d: 'M180,280 L240,260 L260,310 L230,340 L185,325 Z', cx: 220, cy: 300 },
    { id: 'nova', name: 'Northern Virginia', d: 'M120,250 L180,280 L185,325 L230,340 L200,390 L110,360 L80,290 Z', cx: 155, cy: 320 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
      <svg viewBox="50 50 340 370" style={{ width: '100%', maxWidth: 500, height: 'auto' }}>
        {/* Background grid effect */}
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(108,99,255,0.15)" />
            <stop offset="100%" stopColor="rgba(108,99,255,0)" />
          </radialGradient>
        </defs>
        <circle cx="220" cy="230" r="180" fill="url(#mapGlow)" />
        {areas.map(a => (
          <g key={a.id} onMouseEnter={() => setActive(a.id)} onMouseLeave={() => setActive(null)} style={{ cursor: 'pointer' }}>
            <path d={a.d} fill={active === a.id ? 'rgba(108,99,255,0.3)' : a.id === 'howard' ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.08)'}
              stroke={active === a.id ? '#6c63ff' : 'rgba(108,99,255,0.25)'} strokeWidth={active === a.id ? 2 : 1}
              style={{ transition: 'all 0.4s cubic-bezier(.16,1,.3,1)' }} />
            <text x={a.cx} y={a.cy} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: a.id === 'dc' ? 9 : 8, fill: active === a.id ? '#fff' : '#8e8ea0', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, letterSpacing: '0.5px', transition: 'fill 0.3s', pointerEvents: 'none' }}>
              {a.name}
            </text>
            {a.id === 'howard' && (
              <circle cx={a.cx} cy={a.cy + 16} r={3} fill="#6c63ff" style={{ animation: 'glowPulse 2s ease-in-out infinite' }}>
                <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}
        {/* Home base marker */}
        <text x={240} y={188} textAnchor="middle" style={{ fontSize: 7, fill: '#6c63ff', fontFamily: 'Plus Jakarta Sans', fontWeight: 700, letterSpacing: '1px' }}>&#9679; HOME BASE</text>
      </svg>
      {active && (
        <div style={{
          padding: '12px 24px', borderRadius: 4, background: 'rgba(108,99,255,0.08)',
          border: '1px solid rgba(108,99,255,0.2)', animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{areas.find(a => a.id === active)?.name}</span>
          <span style={{ fontSize: 12, color: '#8e8ea0', marginLeft: 12 }}>Full coverage — we come to you</span>
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
  const [film, setFilm] = useState('ceramic');
  const films: Record<string, { name: string; label: string; uv: string; heat: string; warranty: string; price: string }> = {
    carbon: { name: 'Premium Carbon', label: 'ENTRY', uv: '~98%', heat: '25–35%', warranty: '3–5 yr', price: 'From $50' },
    nano: { name: 'Nano Carbon', label: 'MID', uv: '~99%', heat: '35–50%', warranty: '5–7 yr', price: 'From $75' },
    ceramic: { name: 'Nano Ceramic', label: 'TOP TIER', uv: '≥99.9%', heat: '50–75%', warranty: 'Lifetime', price: 'From $115' },
  };
  const cur = films[film];
  const vlt = 100 - tint;
  const windowOpacity = tint / 100;
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Film selector tabs */}
      <div className="rv" style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 48, flexWrap: 'wrap' }}>
        {Object.entries(films).map(([k, v]) => (
          <button key={k} onClick={() => setFilm(k)} style={{
            padding: '14px 28px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.4s cubic-bezier(.16,1,.3,1)',
            background: film === k ? 'rgba(108,99,255,0.12)' : '#0a0a0f',
            border: film === k ? '1px solid rgba(108,99,255,0.4)' : '1px solid rgba(255,255,255,0.04)',
            boxShadow: film === k ? '0 0 30px rgba(108,99,255,0.08)' : 'none',
            color: film === k ? '#fff' : '#8e8ea0',
          }}>
            <span style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: '#6c63ff', marginBottom: 4 }}>{v.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Syne' }}>{v.name}</span>
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
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4a4a5a' }}>Tint Darkness</span>
              <span style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: '#fff' }}>{tint}<span style={{ fontSize: 12, color: '#6c63ff' }}>%</span></span>
            </div>
            <input type="range" min={5} max={95} value={tint} onChange={(e) => setTint(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 10, color: '#4a4a5a' }}>Light (5%)</span>
              <span style={{ fontSize: 10, color: '#6c63ff', fontWeight: 600 }}>{vlt}% VLT</span>
              <span style={{ fontSize: 10, color: '#4a4a5a' }}>Limo (95%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards below */}
      <div className="rv" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 20 }}>
        {[
          { label: 'UV Rejection', value: cur.uv },
          { label: 'Heat Rejection', value: cur.heat },
          { label: 'Warranty', value: cur.warranty },
          { label: 'Price', value: cur.price },
        ].map((s, i) => (
          <div key={i} style={{ padding: '18px 20px', borderRadius: 4, background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', transition: 'all 0.4s' }}>
            <span style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4a4a5a', marginBottom: 6 }}>{s.label}</span>
            <span style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: i === 3 ? '#fff' : '#6c63ff' }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{
          display: 'inline-block', padding: '15px 40px', borderRadius: 3,
          background: '#6c63ff', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 4px 30px rgba(108,99,255,0.3)',
        }}>Book {cur.name}</a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INSTAGRAM REEL CAROUSEL (iframe-based)
   ═══════════════════════════════════════════════════ */
function InstagramCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const reels = [
    { id: 'DJKYiAmOlpz', caption: 'Latest Install' },
    { id: 'DIsGxqtuVaZ', caption: 'Ceramic Tint' },
    { id: 'DIt7FMGOqTa', caption: 'Full Vehicle' },
    { id: 'DIdpGtzO-Sp', caption: 'Before & After' },
    { id: 'DH3WLFKuJ50', caption: 'Mobile Service' },
    { id: 'DHwL3PLuRDZ', caption: 'Precision Cut' },
    { id: 'DHfNPzjO6RB', caption: 'Client Review' },
    { id: 'DHTfGNjuPiR', caption: 'Behind the Scenes' },
  ];
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanLeft(scrollLeft > 10);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 10);
  };
  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 340, behavior: 'smooth' });
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (el) { el.addEventListener('scroll', checkScroll, { passive: true }); checkScroll(); }
    return () => { el?.removeEventListener('scroll', checkScroll); };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Scroll buttons */}
      {canLeft && (
        <button onClick={() => scroll(-1)} style={{
          position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
          width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(108,99,255,0.3)',
          background: 'rgba(5,5,7,0.9)', color: '#6c63ff', fontSize: 20, cursor: 'pointer',
          backdropFilter: 'blur(10px)', transition: 'all 0.3s',
        }}>&lsaquo;</button>
      )}
      {canRight && (
        <button onClick={() => scroll(1)} style={{
          position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
          width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(108,99,255,0.3)',
          background: 'rgba(5,5,7,0.9)', color: '#6c63ff', fontSize: 20, cursor: 'pointer',
          backdropFilter: 'blur(10px)', transition: 'all 0.3s',
        }}>&rsaquo;</button>
      )}
      {/* Fade edges */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(to right, var(--bg), transparent)', zIndex: 5, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(to left, var(--bg), transparent)', zIndex: 5, pointerEvents: 'none' }} />
      {/* Reel strip */}
      <div ref={scrollRef} style={{
        display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory',
        padding: '10px 40px', scrollbarWidth: 'none',
      }}>
        {reels.map((reel, i) => (
          <div key={i} className={`rv-s d${(i % 4) + 1}`} style={{
            minWidth: 310, maxWidth: 310, scrollSnapAlign: 'start',
            borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)',
            background: '#0a0a0f', flexShrink: 0, transition: 'all 0.5s cubic-bezier(.16,1,.3,1)',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.25)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <iframe
              src={`https://www.instagram.com/reel/${reel.id}/embed/`}
              style={{ width: '100%', height: 440, border: 'none', background: '#0a0a0f' }}
              allowFullScreen
              loading="lazy"
              title={reel.caption}
            />
          </div>
        ))}
      </div>
      {/* Follow CTA */}
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <a href="https://www.instagram.com/210tint/" target="_blank" rel="noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 28px',
          borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', color: '#8e8ea0',
          fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all 0.3s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8e8ea0'; }}
        >
          Follow @210tint on Instagram &rarr;
        </a>
      </div>
    </div>
  );
}

/* ── NAV ── */
const NAV = [
  { id: 'home', label: 'Home' }, { id: 'portfolio', label: 'Portfolio' },
  { id: 'pricing', label: 'Pricing' }, { id: 'compare', label: 'Compare Films' },
  { id: 'warranty', label: 'Warranty' }, { id: 'contact', label: 'Contact' },
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
        <button onClick={() => nav('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: '#6c63ff', letterSpacing: '-0.5px' }}>210</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: '#fff', letterSpacing: '-0.5px' }}>TINT</span>
        </button>
        <div className="desk-nav" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => nav(n.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: page === n.id ? '#6c63ff' : '#8e8ea0',
              fontWeight: page === n.id ? 600 : 400, fontSize: 13, letterSpacing: '.3px',
              transition: 'color 0.3s', fontFamily: 'Plus Jakarta Sans',
              position: 'relative',
            }}>
              {n.label}
              {page === n.id && <span style={{ position: 'absolute', bottom: -6, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6c63ff, #a78bfa)', borderRadius: 1, animation: 'lineExpand 0.4s ease forwards', transformOrigin: 'left' }} />}
            </button>
          ))}
          <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{
            background: '#6c63ff', color: '#fff', padding: '10px 26px', borderRadius: 3,
            fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all 0.3s',
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
          <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 16, background: '#6c63ff', color: '#fff', padding: '14px', borderRadius: 3, textAlign: 'center', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Book Appointment</a>
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
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#6c63ff' }}>{tag}</span>
        <div style={{ width: 32, height: 1, background: '#6c63ff', animation: 'accentLine 1s ease forwards' }} />
      </div>
      <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(28px,4vw,50px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1 }}>{title}</h2>
      {sub && <p style={{ color: '#8e8ea0', fontSize: 15, maxWidth: align === 'center' ? 520 : 600, margin: align === 'center' ? '18px auto 0' : '18px 0 0', lineHeight: 1.8 }}>{sub}</p>}
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
              <span style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, color: '#6c63ff', opacity: 0.4, minWidth: 28 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 700 }}>{f.q}</span>
            </div>
            <div className="faq-icon">
              <span style={{ color: open === i ? '#fff' : '#6c63ff', fontSize: 18, lineHeight: 1 }}>+</span>
            </div>
          </button>
          <div className="faq-answer">
            <p style={{ color: '#8e8ea0', fontSize: 14, lineHeight: 1.9, paddingLeft: 44 }}>{f.a}</p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#6c63ff' }}>210</span>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff' }}>TINT</span>
          </div>
          <p style={{ color: '#8e8ea0', fontSize: 13, lineHeight: 1.8, maxWidth: 280 }}>Columbia's premier mobile window tinting. Nano-ceramic protection installed at your location.</p>
        </div>
        <div>
          <h4 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, letterSpacing: '3px', color: '#4a4a5a', marginBottom: 20, textTransform: 'uppercase' }}>Navigation</h4>
          {['Portfolio','Pricing','Compare Films','Warranty','Contact'].map(l => <button key={l} onClick={() => go(l === 'Compare Films' ? 'compare' : l.toLowerCase())} style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', color: '#8e8ea0', fontSize: 13, padding: '5px 0' }}>{l}</button>)}
        </div>
        <div>
          <h4 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, letterSpacing: '3px', color: '#4a4a5a', marginBottom: 20, textTransform: 'uppercase' }}>Contact</h4>
          <p style={{ color: '#8e8ea0', fontSize: 13, lineHeight: 2.2 }}>210tints@gmail.com<br/>(240) 338-7762<br/>10451 Fair Oaks Drive<br/>Columbia, MD 21044</p>
        </div>
        <div>
          <h4 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, letterSpacing: '3px', color: '#4a4a5a', marginBottom: 20, textTransform: 'uppercase' }}>Hours</h4>
          <p style={{ color: '#8e8ea0', fontSize: 13, lineHeight: 2.2 }}>Mon — Sat: 8AM — 6PM<br/>Sun: By Appointment</p>
        </div>
      </div>
      <div style={{ maxWidth: 1320, margin: '56px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: '#4a4a5a', fontSize: 12 }}>© 2026 210 Tint. All rights reserved.</p>
        <p style={{ color: '#4a4a5a', fontSize: 12 }}>Columbia, MD — Serving the DMV</p>
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
    { num: '01', title: 'Book Online', desc: 'Select your vehicle, preferred film, and date. The entire process takes under two minutes.' },
    { num: '02', title: 'We Come To You', desc: 'Our certified technicians arrive at your home, office, or any location across the DMV.' },
    { num: '03', title: 'Precision Install', desc: 'UVIRON performance films applied with computer-cut precision. No blade touches your vehicle.' },
    { num: '04', title: 'Drive Protected', desc: 'Up to 99.9% UV rejection, lifetime warranty, and a vehicle that commands attention.' },
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
        <HeroSlideshow />
        <GlassScene />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1320, margin: '0 auto', padding: '180px 28px 100px', width: '100%' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ animation: 'fadeUp 1s ease forwards', animationDelay: '0.3s', opacity: 0 }}>
              <span style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: 2, fontSize: 11, fontWeight: 700,
                letterSpacing: '3px', textTransform: 'uppercase', color: '#6c63ff',
                border: '1px solid rgba(108,99,255,0.3)', background: 'rgba(108,99,255,0.08)',
              }}>Columbia, MD — Mobile Nano-Ceramic Specialists</span>
            </div>

            <h1 style={{
              fontFamily: 'Syne', fontSize: 'clamp(44px,7vw,84px)', fontWeight: 800,
              lineHeight: 1.0, letterSpacing: '-3px', marginTop: 32,
              animation: 'fadeUp 1s ease forwards', animationDelay: '0.5s', opacity: 0,
            }}>
              Window Tinting,<br /><span className="grad-text">Elevated.</span>
            </h1>

            <p style={{
              color: '#8e8ea0', fontSize: 'clamp(15px,1.5vw,19px)', lineHeight: 1.8,
              marginTop: 28, maxWidth: 460,
              animation: 'fadeUp 1s ease forwards', animationDelay: '0.7s', opacity: 0,
            }}>
              UVIRON-certified nano-ceramic film. Lifetime warranty. Precision computer-cut installation delivered to your driveway.
            </p>

            <div style={{ display: 'flex', gap: 14, marginTop: 44, flexWrap: 'wrap', animation: 'fadeUp 1s ease forwards', animationDelay: '0.9s', opacity: 0 }}>
              <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{
                background: '#6c63ff', color: '#fff', padding: '16px 40px', borderRadius: 3,
                fontSize: 15, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 40px rgba(108,99,255,0.35)', letterSpacing: '0.3px',
                position: 'relative', overflow: 'hidden',
              }}>
                <span style={{ position: 'relative', zIndex: 1 }}>Book Your Appointment</span>
              </a>
              <button onClick={() => go('portfolio')} style={{
                background: 'transparent', color: '#fff', padding: '16px 40px', borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.12)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(.16,1,.3,1)',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,99,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >View Our Work</button>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, marginTop: 80,
            paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)',
            animation: 'fadeUp 1s ease forwards', animationDelay: '1.1s', opacity: 0,
            maxWidth: 700,
          }}>
            {[
              { end: 4.9, suffix: '', label: 'Google Rating', dec: 1 },
              { end: 500, suffix: '+', label: 'Vehicles Tinted', dec: 0 },
              { end: 99, suffix: '%', label: 'UV Rejection', dec: 0 },
              { end: 100, suffix: '%', label: 'Satisfaction', dec: 0 },
            ].map((s, i) => (
              <div key={i}>
                <span style={{ fontFamily: 'Syne', fontSize: 'clamp(28px,3vw,38px)', fontWeight: 800 }}>
                  <Counter end={s.end} suffix={s.suffix} decimals={s.dec} />
                </span>
                <span style={{ display: 'block', fontSize: 10, color: '#4a4a5a', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</span>
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
                  <span key={j} style={{ whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: '#4a4a5a', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {t} <span style={{ color: '#6c63ff', margin: '0 16px', opacity: 0.4 }}>&#9670;</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      </ScrollRevealSection>

      {/* ═══ HOW IT WORKS ═══ */}
      <SectionDivider variant="glow" />
      <section style={{ padding: '100px 28px 140px', maxWidth: 1320, margin: '0 auto', position: 'relative' }}>
        <SH tag="The Process" title="Four Steps to Perfection" sub="From booking to driving away protected — built for your convenience." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 0 }}>
          {process.map((p, i) => (
            <div key={i} className={`rv d${i + 1}`} style={{
              padding: '48px 32px', background: i % 2 === 0 ? '#0a0a0f' : '#0d0d14',
              borderTop: '2px solid transparent', position: 'relative', overflow: 'hidden',
              transition: 'all 0.5s cubic-bezier(.16,1,.3,1)',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderTopColor = '#6c63ff'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'; const num = e.currentTarget.querySelector('.step-num') as HTMLElement; if(num) num.style.opacity = '0.15'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderTopColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; const num = e.currentTarget.querySelector('.step-num') as HTMLElement; if(num) num.style.opacity = '0.06'; }}
            >
              <span className="step-num" style={{ fontFamily: 'Syne', fontSize: 72, fontWeight: 800, color: '#6c63ff', opacity: 0.06, position: 'absolute', top: 12, right: 16, lineHeight: 1, transition: 'opacity 0.5s ease' }}>{p.num}</span>
              <span style={{ fontFamily: 'Syne', fontSize: 12, fontWeight: 700, color: '#6c63ff', letterSpacing: '3px' }}>Step {p.num}</span>
              <h3 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, marginTop: 16, marginBottom: 14 }}>{p.title}</h3>
              <p style={{ color: '#8e8ea0', fontSize: 14, lineHeight: 1.8 }}>{p.desc}</p>
            </div>
          ))}
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
                <h3 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{w.title}</h3>
                <p style={{ color: '#8e8ea0', fontSize: 14, lineHeight: 1.8 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED WORK ═══ */}
      <SectionDivider variant="dots" />
      <section style={{ padding: '100px 28px 140px', maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20, marginBottom: 0 }}>
          <SH tag="Portfolio" title="Recent Installations" align="left" />
          <button onClick={() => go('portfolio')} className="rv d2" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#8e8ea0', padding: '10px 24px', borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 60 }}>View All</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
          {[
            { name: 'Lamborghini Urus', film: 'Premium Nano Ceramic', img: 'https://210tint.com/wp-content/uploads/2026/03/15903652-ee84-47db-985f-43bee6d9839a.png' },
            { name: 'Mercedes C63', film: 'Premium Carbon', img: 'https://210tint.com/wp-content/uploads/2026/02/snowy-c63.png' },
            { name: 'BMW M8', film: 'Standard Carbon', img: 'https://210tint.com/wp-content/uploads/2026/02/snowy-m8.png' },
          ].map((p, i) => (
            <div key={i} className={`${i === 1 ? 'rv' : i === 0 ? 'rv-l' : 'rv-r'} d${i + 1}`} onClick={() => go('portfolio')} style={{
              borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)',
              background: '#0a0a0f', transition: 'all 0.6s cubic-bezier(.16,1,.3,1)', cursor: 'pointer',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-8px) scale(1.01)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ overflow: 'hidden', height: 240 }}>
                <img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s cubic-bezier(.16,1,.3,1)' }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'scale(1.08)'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }} />
              </div>
              <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17 }}>{p.name}</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#6c63ff' }}>{p.film}</span>
                </div>
                <span style={{ color: '#4a4a5a', fontSize: 20, transition: 'transform 0.3s' }}>&rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ GOOGLE REVIEWS ═══ */}
      <section style={{ padding: '120px 28px', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
        <FloatingOrbs />
        <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="rv-blur"><SH tag="Google Reviews" title="Trusted Across the DMV" /></div>
          <ScrollRevealSection direction="scale" delay={0.2}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: -36, marginBottom: 52, flexWrap: 'wrap' }}>
              {/* Google "G" logo */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <span style={{ background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Arial' }}>G</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FFD700', fontSize: 18 }}>&#9733;</span>)}
                </div>
                <span style={{ fontSize: 12, color: '#8e8ea0', marginTop: 2 }}><strong style={{ color: '#fff', fontFamily: 'Syne' }}>4.9</strong> out of 5 · 30+ reviews on Google</span>
              </div>
            </div>
          </ScrollRevealSection>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 }}>
            {testimonials.map((t, i) => (
              <div key={i} className={`rv d${(i % 4) + 1} tilt-card`} style={{ padding: '28px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)', background: '#0d0d14', position: 'relative' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Google icon */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 3 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FFD700', fontSize: 11 }}>&#9733;</span>)}</div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>
                    <span style={{ background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Arial' }}>G</span>
                  </div>
                </div>
                <p style={{ color: '#8e8ea0', fontSize: 14, lineHeight: 1.8, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #8b83ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: '#fff', boxShadow: '0 2px 12px rgba(108,99,255,0.3)' }}>{t.name[0]}</div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>{t.name}</span>
                    <span style={{ fontSize: 10, color: '#4a4a5a' }}>{t.time} · via Google</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* See all reviews link */}
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <a href="https://www.google.com/maps/place/210+Tint/@39.1938115,-76.9493414,12z/data=!4m6!3m5!1s0x89b7df8c50a20153:0x9294ac751d9098b3!8m2!3d39.1938405!4d-76.8669405" target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px',
              borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', color: '#8e8ea0',
              fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all 0.3s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8e8ea0'; }}
            >See All Reviews on Google &rarr;</a>
          </div>
        </div>
      </section>

      {/* ═══ INSTAGRAM ═══ */}
      <SectionDivider variant="glow" />
      <section style={{ padding: '100px 28px 140px', maxWidth: 1320, margin: '0 auto' }}>
        <div className="rv-blur"><SH tag="Follow Us" title="See Us in Action" sub="Watch our latest installs and behind-the-scenes on Instagram." /></div>
        <InstagramCarousel />
      </section>

      {/* ═══ SERVICE AREA MAP ═══ */}
      <section style={{ padding: '120px 28px', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
        <FloatingOrbs />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="rv-blur"><SH tag="Coverage" title="Serving the Entire DMV" sub="Howard County, Montgomery County, PG County, Baltimore, DC, and Northern Virginia — we come to you." /></div>
          <div className="rv"><ServiceAreaMap /></div>
        </div>
      </section>

      {/* ═══ TINT SIMULATOR ═══ */}
      <SectionDivider variant="dots" />
      <section style={{ padding: '100px 28px 140px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="rv-blur"><SH tag="Try It" title="Tint Simulator" sub="Preview how different films and darkness levels look on your vehicle." /></div>
          <TintSimulator />
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
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#6c63ff' }}>Ready?</span>
            <div style={{ width: 24, height: 1, background: '#6c63ff', animation: 'accentLine 1s ease forwards' }} />
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 20, lineHeight: 1.1 }}>
            Elevate Your <span className="grad-text">Vehicle</span>
          </h2>
          <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8, marginBottom: 44 }}>Schedule online in under two minutes. We come to you.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" className="magnetic-btn" style={{ background: '#6c63ff', color: '#fff', padding: '16px 44px', borderRadius: 3, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 40px rgba(108,99,255,0.35)' }}>Book Your Appointment</a>
            <button onClick={() => go('contact')} style={{ background: 'transparent', color: '#fff', padding: '16px 44px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'all 0.4s cubic-bezier(.16,1,.3,1)' }}
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
function PortfolioPage() {
  useReveal();
  const items = [
    { name: 'Lamborghini Urus', film: 'Premium Nano Ceramic', img: 'https://210tint.com/wp-content/uploads/2026/03/15903652-ee84-47db-985f-43bee6d9839a.png' },
    { name: 'Mercedes C63', film: 'Premium Carbon', img: 'https://210tint.com/wp-content/uploads/2026/02/snowy-c63.png' },
    { name: 'Mercedes CLA', film: 'Premium Nano Ceramic', img: 'https://210tint.com/wp-content/uploads/2026/03/bac97502-b244-47f9-873b-c1cfd6bc741d.png' },
    { name: 'BMW M8', film: 'Standard Carbon', img: 'https://210tint.com/wp-content/uploads/2026/02/snowy-m8.png' },
    { name: 'Dodge Durango', film: 'Premium Nano Carbon', img: 'https://210tint.com/wp-content/uploads/2026/02/snowy-durango.png' },
    { name: 'Dodge Durango', film: 'Premium Nano Carbon', img: 'https://210tint.com/wp-content/uploads/2026/02/dark-snowy-durango.png' },
  ];
  return (<div style={{ paddingTop: 130 }}><section style={{ padding: '0 28px 120px', maxWidth: 1320, margin: '0 auto' }}>
    <SH tag="Our Work" title="Vehicle Tinting Portfolio" sub="Professional-grade installations on luxury, performance, and everyday vehicles." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 14 }}>
      {items.map((p, i) => (<div key={i} className={`rv-s d${(i%3)+1} tilt-card`} style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.25)'; e.currentTarget.style.boxShadow = '0 24px 60px rgba(0,0,0,0.4), 0 0 30px rgba(108,99,255,0.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none'; }}>
        <div style={{ overflow: 'hidden', height: 260 }}><img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s cubic-bezier(.16,1,.3,1)' }} onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'scale(1.06)'; }} onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }} /></div>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18 }}>{p.name}</h3><span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#6c63ff' }}>{p.film}</span></div><span style={{ color: '#4a4a5a', fontSize: 18 }}>&rarr;</span></div>
      </div>))}
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
          <h3 style={{fontFamily:'Syne',fontSize:19,fontWeight:700,marginBottom:24}}>{t.name}</h3>
          {t.items.map((it,j)=>{const [price,desc]=it.split('—');return(<div key={j} style={{padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:14,color:'#8e8ea0',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>{desc?.trim()}</span><span style={{fontFamily:'Syne',fontWeight:700,color:'#eee'}}>{price?.trim()}</span></div>);})}
          <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{display:'block',marginTop:28,padding:'13px',textAlign:'center',borderRadius:3,background:t.top?'#6c63ff':'transparent',border:t.top?'none':'1px solid rgba(255,255,255,0.08)',color:'#fff',fontSize:13,fontWeight:600,textDecoration:'none'}}>Book Now</a>
        </div>
      </div>))}
    </div>
    <div className="rv" style={{marginTop:40,padding:'32px 36px',borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
      <div><h3 style={{fontFamily:'Syne',fontWeight:700,fontSize:18}}>Computer-Cut Film Upgrade</h3><p style={{color:'#8e8ea0',fontSize:13,marginTop:6,maxWidth:480,lineHeight:1.7}}>Pre-cut to exact window shapes. No blade touches your car. Cleaner edges, tighter fit, flawless finish.</p></div>
      <div style={{textAlign:'center'}}><span style={{fontFamily:'Syne',fontSize:28,fontWeight:800,color:'#6c63ff'}}>+$50</span><span style={{display:'block',fontSize:11,color:'#4a4a5a'}}>one-time upgrade</span></div>
    </div>
  </section></div>);
}

/* ═══ COMPARE ═══ */
function ComparePage() {
  useReveal();
  const rows = [['UV Rejection','~98%','~99%','≥99.9%'],['Heat Rejection','25–35%','35–50%','50–75%'],['Infrared Blocking','Low','Moderate','Very High'],['Signal Interference','None','None','None'],['Glare Reduction','Up to 50%','Up to 60%','Up to 70%'],['Color Stability','Excellent','Excellent','Permanent'],['Optical Clarity','Good','Good','Crystal Clear'],['Warranty','3–5 Years','5–7 Years','Lifetime'],['Price Tier','Entry','Mid-Range','Premium']];
  return (<div style={{paddingTop:130}}><section style={{padding:'0 28px 120px',maxWidth:1320,margin:'0 auto'}}>
    <SH tag="Film Guide" title="Compare Tint Options" sub="Comfort, protection, and long-term value — not just darkness." />
    <div className="rv" style={{overflowX:'auto',marginBottom:80}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth:640}}>
        <thead><tr style={{borderBottom:'2px solid rgba(255,255,255,0.06)'}}>
          {['Feature','Premium Carbon','Nano Carbon','Nano Ceramic'].map((h,i)=>(<th key={i} style={{padding:'16px 20px',textAlign:'left',fontSize:12,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:i===3?'#6c63ff':i===0?'#4a4a5a':'#eee',fontFamily:'Syne'}}>{h}</th>))}
        </tr></thead>
        <tbody>{rows.map((row,i)=>(<tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.3s'}} onMouseEnter={(e)=>{e.currentTarget.style.background='rgba(108,99,255,0.03)'}} onMouseLeave={(e)=>{e.currentTarget.style.background='transparent'}}>
          {row.map((c,j)=>(<td key={j} style={{padding:'14px 20px',fontSize:14,color:j===0?'#4a4a5a':j===3?'#8b83ff':'#8e8ea0',fontWeight:j===0||j===3?600:400}}>{c}</td>))}
        </tr>))}</tbody>
      </table>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
      {[
        {tier:'Entry Level',name:'Premium Carbon',desc:'Solid protection and clean looks at the best price.',from:'$45',pros:['Budget-friendly for daily drivers','Matte black finish — clean OEM look','No signal or GPS interference','Will not fade or turn purple']},
        {tier:'Mid Range',name:'Nano Carbon PUREMAX',desc:'Enhanced performance and durability without top-tier price.',from:'$75',pros:['Better heat rejection than Premium Carbon','Deep black — no fade or purple tones','Safe for all vehicle electronics','5–7 year warranty']},
        {tier:'Top Tier',name:'Nano Ceramic KOOLMAX',desc:'Superior heat, UV, and clarity — the last tint you will ever need.',from:'$115',top:true,pros:['Max heat and infrared rejection','Crystal clear — no haze at night','Lifetime warranty on every install','Improves A/C efficiency','Never fades, bubbles, or discolors']},
      ].map((f,i)=>(<div key={i} className={`rv d${i+1}`} style={{padding:32,borderRadius:4,border:f.top?'1px solid rgba(108,99,255,0.3)':'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',boxShadow:f.top?'0 0 40px rgba(108,99,255,0.06)':'none'}}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'#6c63ff'}}>{f.tier}</span>
        <h3 style={{fontFamily:'Syne',fontSize:21,fontWeight:700,marginTop:8,marginBottom:8}}>{f.name}</h3>
        <p style={{color:'#8e8ea0',fontSize:14,lineHeight:1.65,marginBottom:20}}>{f.desc}</p>
        {f.pros.map((p,j)=>(<div key={j} style={{padding:'5px 0',fontSize:13,color:'#8e8ea0',display:'flex',gap:10,alignItems:'flex-start'}}><span style={{color:'#6c63ff',fontSize:8,marginTop:6}}>&#9646;</span>{p}</div>))}
        <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.04)'}}><span style={{fontSize:11,color:'#4a4a5a'}}>Starting from</span><span style={{fontFamily:'Syne',fontSize:28,fontWeight:800,marginLeft:8}}>{f.from}</span></div>
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
    {num:'03',title:'Mobile Tinting',body:'If conditions are not suitable for a quality install, we reschedule. We never proceed on a day we cannot confidently deliver.'},
    {num:'04',title:'Lifetime Warranty',body:'Covers bubbling, peeling, lifting, cracking, delamination, color fading, adhesive failure, and manufacturer defects. Full labor included.'},
    {num:'05',title:'Warranty Exclusions',body:'Physical damage, rolling windows within 5–7 days, ammonia-based cleaners, accident damage, third-party removal, or care neglect.'},
    {num:'06',title:'Making a Claim',body:'Contact us directly for a free inspection. Proof of original service required. Non-transferable unless agreed in writing.'},
  ];
  return (<div style={{paddingTop:130}}><section style={{padding:'0 28px 120px',maxWidth:880,margin:'0 auto'}}>
    <SH tag="Our Commitment" title="Warranty & Policy" sub="Backed by our satisfaction guarantee and lifetime warranty." />
    {s.map((x,i)=>(<div key={i} className={`rv d${(i%3)+1}`} style={{padding:'32px 36px',borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',marginBottom:10}}>
      <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
        <span style={{fontFamily:'Syne',fontSize:32,fontWeight:800,color:'#6c63ff',opacity:0.3,lineHeight:1,minWidth:40}}>{x.num}</span>
        <div><h3 style={{fontFamily:'Syne',fontSize:19,fontWeight:700,marginBottom:10}}>{x.title}</h3><p style={{color:'#8e8ea0',fontSize:14,lineHeight:1.8}}>{x.body}</p></div>
      </div>
    </div>))}
  </section></div>);
}

/* ═══ CONTACT ═══ */
function ContactPage() {
  useReveal();
  return (<div style={{paddingTop:130}}><section style={{padding:'0 28px 120px',maxWidth:1100,margin:'0 auto'}}>
    <SH tag="Get In Touch" title="Reach Out Today" sub="Questions or ready to book? We are here to help." />
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:24}}>
      <div className="rv" style={{padding:36,borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f'}}>
        <h3 style={{fontFamily:'Syne',fontSize:19,fontWeight:700,marginBottom:4}}>Send a Message</h3>
        <p style={{color:'#4a4a5a',fontSize:12,marginBottom:28}}>We respond within 24 hours.</p>
        {['Name','Phone','Email','Vehicle / Service'].map((l,i)=>(<div key={i} style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:600,color:'#4a4a5a',marginBottom:6,letterSpacing:'2px',textTransform:'uppercase'}}>{l}</label><input style={{width:'100%',padding:'11px 14px',borderRadius:3,border:'1px solid rgba(255,255,255,0.05)',background:'#101018',color:'#eee',fontSize:14,outline:'none',transition:'border-color 0.3s'}} onFocus={(e)=>e.currentTarget.style.borderColor='#6c63ff'} onBlur={(e)=>e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}/></div>))}
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:600,color:'#4a4a5a',marginBottom:6,letterSpacing:'2px',textTransform:'uppercase'}}>Message</label><textarea rows={4} style={{width:'100%',padding:'11px 14px',borderRadius:3,border:'1px solid rgba(255,255,255,0.05)',background:'#101018',color:'#eee',fontSize:14,outline:'none',resize:'vertical',transition:'border-color 0.3s'}} onFocus={(e)=>e.currentTarget.style.borderColor='#6c63ff'} onBlur={(e)=>e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}/></div>
        <button style={{width:'100%',padding:'14px',borderRadius:3,border:'none',cursor:'pointer',background:'#6c63ff',color:'#fff',fontSize:14,fontWeight:700,boxShadow:'0 4px 20px rgba(108,99,255,0.3)',transition:'all 0.3s'}}>Send Message</button>
      </div>
      <div className="rv d2">
        {[{label:'Address',val:'10451 Fair Oaks Dr\nColumbia, MD 21044'},{label:'Phone',val:'(240) 338-7762'},{label:'Email',val:'210tints@gmail.com'},{label:'Hours',val:'Mon — Sat: 8 AM — 6 PM\nSun: By Appointment'}].map((c,i)=>(<div key={i} style={{padding:'22px 24px',borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',background:'#0a0a0f',marginBottom:10}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'#6c63ff',display:'block',marginBottom:6}}>{c.label}</span>
          <p style={{color:'#8e8ea0',fontSize:14,whiteSpace:'pre-line',lineHeight:1.7}}>{c.val}</p>
        </div>))}
        <div style={{marginTop:10,padding:'24px',borderRadius:4,background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.04)',textAlign:'center'}}>
          <h4 style={{fontFamily:'Syne',fontWeight:700,fontSize:15,marginBottom:8}}>Mobile Service Available</h4>
          <p style={{color:'#8e8ea0',fontSize:12,marginBottom:16}}>We come to you — home, work, wherever works.</p>
          <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{display:'inline-block',background:'#6c63ff',color:'#fff',padding:'11px 28px',borderRadius:3,fontSize:13,fontWeight:600,textDecoration:'none'}}>Schedule Online</a>
        </div>
      </div>
    </div>
  </section></div>);
}

/* ═══ APP ═══ */
export default function App() {
  const [page, setPage] = useState('home');
  const [loading, setLoading] = useState(true);
  const go = (p: string) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const onLoadDone = useCallback(() => setLoading(false), []);
  return (
    <div style={{ minHeight: '100vh' }}>
      {loading && <LoadingScreen onDone={onLoadDone} />}
      <CursorGlow />
      <style>{`@media(max-width:860px){.desk-nav{display:none!important}.mob-btn{display:block!important}}`}</style>
      <ScrollBar />
      <Nav page={page} go={go} />
      <main key={page} style={{ animation: 'fadeUp 0.6s cubic-bezier(.16,1,.3,1) forwards' }}>
        {page==='home'&&<HomePage go={go}/>}
        {page==='portfolio'&&<PortfolioPage/>}
        {page==='pricing'&&<PricingPage/>}
        {page==='compare'&&<ComparePage/>}
        {page==='warranty'&&<WarrantyPage/>}
        {page==='contact'&&<ContactPage/>}
      </main>
      <Footer go={go} />
    </div>
  );
}
