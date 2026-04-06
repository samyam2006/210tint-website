import { useState, useEffect, useRef, useCallback } from 'react';

/* ── SCROLL REVEAL ── */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('v'); obs.unobserve(e.target); } }), { threshold: 0.08 });
    document.querySelectorAll('.rv,.rv-s,.rv-l,.rv-r').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  });
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
              {page === n.id && <span style={{ position: 'absolute', bottom: -6, left: 0, right: 0, height: 2, background: '#6c63ff', borderRadius: 1 }} />}
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
        <div style={{ width: 32, height: 1, background: '#6c63ff' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#6c63ff' }}>{tag}</span>
        <div style={{ width: 32, height: 1, background: '#6c63ff' }} />
      </div>
      <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(28px,4vw,50px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1 }}>{title}</h2>
      {sub && <p style={{ color: '#8e8ea0', fontSize: 15, maxWidth: align === 'center' ? 520 : 600, margin: align === 'center' ? '18px auto 0' : '18px 0 0', lineHeight: 1.8 }}>{sub}</p>}
    </div>
  );
}

/* ── FOOTER ── */
function Footer({ go }: { go: (p: string) => void }) {
  return (
    <footer style={{ background: '#0a0a0f', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '72px 28px 36px' }}>
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
              <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{
                background: '#6c63ff', color: '#fff', padding: '16px 40px', borderRadius: 3,
                fontSize: 15, fontWeight: 700, textDecoration: 'none', transition: 'all 0.4s',
                boxShadow: '0 4px 40px rgba(108,99,255,0.35)', letterSpacing: '0.3px',
              }}>Book Your Appointment</a>
              <button onClick={() => go('portfolio')} style={{
                background: 'transparent', color: '#fff', padding: '16px 40px', borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.12)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.4s',
              }}>View Our Work</button>
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

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          animation: 'fadeIn 1s ease forwards', animationDelay: '1.5s', opacity: 0,
        }}>
          <span style={{ fontSize: 10, letterSpacing: '3px', textTransform: 'uppercase', color: '#4a4a5a' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, #6c63ff, transparent)' }} />
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
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

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ padding: '140px 28px', maxWidth: 1320, margin: '0 auto' }}>
        <SH tag="The Process" title="Four Steps to Perfection" sub="From booking to driving away protected — built for your convenience." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 0 }}>
          {process.map((p, i) => (
            <div key={i} className={`rv d${i + 1}`} style={{
              padding: '48px 32px', background: i % 2 === 0 ? '#0a0a0f' : '#0d0d14',
              borderTop: '2px solid transparent', position: 'relative', overflow: 'hidden',
              transition: 'all 0.5s ease',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderTopColor = '#6c63ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderTopColor = 'transparent'; }}
            >
              <span style={{ fontFamily: 'Syne', fontSize: 72, fontWeight: 800, color: '#6c63ff', opacity: 0.06, position: 'absolute', top: 12, right: 16, lineHeight: 1 }}>{p.num}</span>
              <span style={{ fontFamily: 'Syne', fontSize: 12, fontWeight: 700, color: '#6c63ff', letterSpacing: '3px' }}>Step {p.num}</span>
              <h3 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, marginTop: 16, marginBottom: 14 }}>{p.title}</h3>
              <p style={{ color: '#8e8ea0', fontSize: 14, lineHeight: 1.8 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ WHY US ═══ */}
      <section style={{ padding: '120px 28px', background: '#0a0a0f' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <SH tag="The Difference" title="Why Clients Choose 210 Tint" sub="Professional mobile tinting backed by the best films, transparent pricing, and a satisfaction guarantee." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 12 }}>
            {whyUs.map((w, i) => (
              <div key={i} className={`rv d${(i % 4) + 1}`} style={{
                padding: '32px 28px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 3,
                transition: 'all 0.5s cubic-bezier(.16,1,.3,1)', cursor: 'default', background: '#0d0d14',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: 40, height: 2, background: '#6c63ff', marginBottom: 20 }} />
                <h3 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{w.title}</h3>
                <p style={{ color: '#8e8ea0', fontSize: 14, lineHeight: 1.8 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED WORK ═══ */}
      <section style={{ padding: '140px 28px', maxWidth: 1320, margin: '0 auto' }}>
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
            <div key={i} className={`rv-s d${i + 1}`} onClick={() => go('portfolio')} style={{
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

      {/* ═══ TESTIMONIALS ═══ */}
      <section style={{ padding: '120px 28px', background: '#0a0a0f' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <SH tag="Testimonials" title="Trusted Across the DMV" />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: -36, marginBottom: 52 }}>
            {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FFD700', fontSize: 18 }}>&#9733;</span>)}
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, marginLeft: 10 }}>4.9</span>
            <span style={{ color: '#4a4a5a', fontSize: 13, marginLeft: 6, alignSelf: 'center' }}>on Google</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 }}>
            {testimonials.map((t, i) => (
              <div key={i} className={`rv d${(i % 4) + 1}`} style={{ padding: '28px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)', background: '#0d0d14' }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FFD700', fontSize: 11 }}>&#9733;</span>)}</div>
                <p style={{ color: '#8e8ea0', fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>{t.text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: '#fff' }}>{t.name[0]}</div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>{t.name}</span>
                    <span style={{ fontSize: 10, color: '#4a4a5a' }}>{t.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: '120px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(108,99,255,0.06) 0%, transparent 70%)' }} />
        <div className="rv" style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, justifyContent: 'center' }}>
            <div style={{ width: 24, height: 1, background: '#6c63ff' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#6c63ff' }}>Ready?</span>
            <div style={{ width: 24, height: 1, background: '#6c63ff' }} />
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 20, lineHeight: 1.1 }}>
            Elevate Your <span className="grad-text">Vehicle</span>
          </h2>
          <p style={{ color: '#8e8ea0', fontSize: 16, lineHeight: 1.8, marginBottom: 44 }}>Schedule online in under two minutes. We come to you.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://calendly.com/210tints" target="_blank" rel="noreferrer" style={{ background: '#6c63ff', color: '#fff', padding: '16px 44px', borderRadius: 3, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 40px rgba(108,99,255,0.35)' }}>Book Your Appointment</a>
            <button onClick={() => go('contact')} style={{ background: 'transparent', color: '#fff', padding: '16px 44px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Get In Touch</button>
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
      {items.map((p, i) => (<div key={i} className={`rv-s d${(i%3)+1}`} style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0f', transition: 'all 0.6s cubic-bezier(.16,1,.3,1)' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
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
  const go = (p: string) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`@media(max-width:860px){.desk-nav{display:none!important}.mob-btn{display:block!important}}`}</style>
      <ScrollBar />
      <Nav page={page} go={go} />
      <main key={page} style={{ animation: 'fadeUp 0.6s ease forwards' }}>
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
