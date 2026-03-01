import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2, Globe, CheckCircle, ArrowRight,
  Star, ChevronDown, Play, Volume2, Target, TrendingUp,
  Twitter, Github, Linkedin, Mic,
} from 'lucide-react';

// ─── SVG Logo Mark ────────────────────────────────────────────────────────────
// Sound-wave bars that animate using the logo-wave keyframes defined in index.css
function LogoMark({ size = 32 }: { size?: number }) {
  const bars = [
    { height: 8, delay: '0s' },
    { height: 14, delay: '0.15s' },
    { height: 20, delay: '0.05s' },
    { height: 24, delay: '0.25s' },
    { height: 20, delay: '0.10s' },
    { height: 14, delay: '0.20s' },
    { height: 8, delay: '0.30s' },
  ];
  const barW = 3;
  const gap = 2;
  const totalW = bars.length * barW + (bars.length - 1) * gap;
  const cx = size / 2 - totalW / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-label="Proxena logo">
      {/* Background rounded square */}
      <rect width={size} height={size} rx={size * 0.25} fill="#2563eb" />
      {bars.map((b, i) => {
        const x = cx + i * (barW + gap);
        const y = size / 2 - b.height / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={b.height}
            rx={1.5}
            fill="white"
            style={{
              transformOrigin: `${x + barW / 2}px ${size / 2}px`,
              animation: `logo-wave 1.4s ease-in-out infinite`,
              animationDelay: b.delay,
            }}
          />
        );
      })}
    </svg>
  );
}

// ─── Intersection Observer hook for scroll-reveal ─────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-child');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = el.dataset.delay ?? '0';
            setTimeout(() => el.classList.add('in-view'), parseInt(delay));
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.10 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Animated typing headline ─────────────────────────────────────────────────
const WORDS = ['Confident', 'Fluent', 'Precise', 'Expressive', 'Powerful'];

function TypingWord() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  const timeout = useRef<number | null>(null);

  useEffect(() => {
    const target = WORDS[idx];
    if (!deleting) {
      if (displayed.length < target.length) {
        timeout.current = window.setTimeout(
          () => setDisplayed(target.slice(0, displayed.length + 1)),
          70,
        );
      } else {
        timeout.current = window.setTimeout(() => setDeleting(true), 1800);
      }
    } else {
      if (displayed.length > 0) {
        timeout.current = window.setTimeout(
          () => setDisplayed(displayed.slice(0, -1)),
          40,
        );
      } else {
        setDeleting(false);
        setIdx((i) => (i + 1) % WORDS.length);
      }
    }
    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [displayed, deleting, idx]);

  return (
    <span className="gradient-text-animate">
      {displayed}
      <span className="cursor-blink ml-0.5 text-blue-500">|</span>
    </span>
  );
}

// ─── Live word demo simulation ────────────────────────────────────────────────
const DEMO_WORDS = [
  { word: 'The',        status: 'correct' },
  { word: 'quick',      status: 'correct' },
  { word: 'brown',      status: 'partial' },
  { word: 'fox',        status: 'correct' },
  { word: 'jumps',      status: 'incorrect' },
  { word: 'over',       status: 'correct' },
  { word: 'the',        status: 'correct' },
  { word: 'lazy',       status: 'partial' },
  { word: 'dog',        status: 'correct' },
];

const STATUS_CLASS: Record<string, string> = {
  correct:   'bg-green-100 text-green-800',
  partial:   'bg-yellow-100 text-yellow-800',
  incorrect: 'bg-red-100   text-red-700',
  pending:   'text-gray-400',
};

function WordDemo() {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= DEMO_WORDS.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 480);
    return () => clearTimeout(t);
  }, [revealed]);

  useEffect(() => {
    if (revealed < DEMO_WORDS.length) return;
    const t = setTimeout(() => setRevealed(0), 2800);
    return () => clearTimeout(t);
  }, [revealed]);

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {DEMO_WORDS.map((w, i) => (
        <span
          key={i}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 ${
            i < revealed ? STATUS_CLASS[w.status] : 'text-gray-300'
          }`}
        >
          {w.word}
        </span>
      ))}
    </div>
  );
}

// ─── Score ring (SVG) ─────────────────────────────────────────────────────────
function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * (value / 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
      </svg>
      <span className="text-lg font-bold text-gray-900 -mt-12 mb-6">{value}%</span>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, desc, delay,
}: { icon: React.ElementType; title: string; desc: string; delay: number }) {
  return (
    <div
      className="reveal-child group relative bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      data-delay={String(delay)}
    >
      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors overflow-hidden">
        <Icon className="w-6 h-6 text-blue-600 icon-pop" />
      </div>
      <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({
  num, title, desc, delay, last,
}: { num: string; title: string; desc: string; delay: number; last?: boolean }) {
  return (
    <div className="reveal-child flex gap-5 relative" data-delay={String(delay)}>
      {/* Connector line between steps */}
      {!last && <div className="step-line" />}
      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm z-10">
        {num}
      </div>
      <div className="pb-2">
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Testimonial ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "Proxena transformed the way I speak in English meetings. My confidence is through the roof after just three weeks.",
    name: "Anjali M.",
    role: "Software Engineer, Bangalore",
    avatar: "AM",
    color: "bg-purple-500",
  },
  {
    quote: "The real-time word highlighting is incredible. I can see exactly which sounds trip me up and fix them on the spot.",
    name: "Carlos R.",
    role: "MBA Student, Madrid",
    avatar: "CR",
    color: "bg-blue-500",
  },
  {
    quote: "I've tried Duolingo, YouTube videos — nothing comes close to practicing with instant AI feedback on every single word.",
    name: "Yuki T.",
    role: "Product Manager, Tokyo",
    avatar: "YT",
    color: "bg-emerald-500",
  },
];

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '#pricing', label: 'Pricing' },
  ];

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="font-bold text-gray-900 text-lg tracking-tight">Proxena</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7 text-sm text-gray-600">
          {navLinks.map(({ href, label }) => (
            <a key={href} href={href} className="hover:text-gray-900 transition-colors">{label}</a>
          ))}
        </div>

        {/* Desktop CTA + mobile hamburger */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors hidden sm:block"
          >
            Get started free
          </Link>
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              // X icon
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Hamburger icon
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md px-6 py-4 flex flex-col gap-1">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="py-2.5 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              {label}
            </a>
          ))}
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="py-2.5 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="w-full text-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-100 bg-white pt-16 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Top: 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <LogoMark size={30} />
              <span className="font-bold text-gray-900 text-base tracking-tight">Proxena</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-[220px]">
              Real-time AI pronunciation coaching for non-native English speakers.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3 mt-1">
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Product</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'Features', href: '#features' },
                { label: 'How it works', href: '#how-it-works' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Exercise library', href: '/login' },
                { label: 'Analytics', href: '/login' },
              ].map((l) => (
                <li key={l.label}>
                  {l.href.startsWith('#') ? (
                    <a href={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l.label}</a>
                  ) : (
                    <Link to={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Resources</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'Documentation', href: '#' },
                { label: 'API reference', href: '#' },
                { label: 'Pronunciation guide', href: '#' },
                { label: 'Blog', href: '#' },
                { label: 'Community', href: '#' },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Company</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'About us', href: '#' },
                { label: 'Careers', href: '#' },
                { label: 'Privacy policy', href: '#' },
                { label: 'Terms of service', href: '#' },
                { label: 'Contact', href: '#' },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© {year} Proxena, Inc. All rights reserved.</p>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            Powered by
            <span className="font-medium text-gray-600">Azure Speech AI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage() {
  useReveal();

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-24 px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-blue-100 opacity-50 blur-3xl glow-pulse pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-violet-100 opacity-40 blur-3xl glow-pulse pointer-events-none" style={{ animationDelay: '2.5s' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge with live dot */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-xs font-medium text-blue-700 mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-500 live-dot shrink-0" />
            Powered by Azure Speech AI · Real-time analysis
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Speak&nbsp;
            <TypingWord />
            <br />
            <span className="text-gray-900">in any accent</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Proxena listens to you speak and gives instant, word-level pronunciation feedback —
            so you can build real fluency, not just memorize phrases.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-2xl font-semibold text-base transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 px-7 py-3.5 rounded-2xl font-medium text-base border border-gray-200 hover:border-gray-300 transition-all duration-200"
            >
              <Play className="w-4 h-4 fill-gray-400" />
              See how it works
            </a>
          </div>

          {/* Hero demo card */}
          <div className="float relative bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-blue-100/50 p-8 max-w-2xl mx-auto">
            {/* Fake top bar */}
            <div className="flex items-center gap-1.5 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-yellow-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
              <span className="ml-3 text-xs text-gray-400 font-mono">proxena — live session</span>
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-widest mb-4 font-medium">
              Exercise: Daily Conversation — Medium
            </p>

            {/* Animated words */}
            <WordDemo />

            {/* Score row */}
            <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t border-gray-50">
              <ScoreRing value={87} label="Accuracy" color="#22c55e" />
              <ScoreRing value={74} label="Fluency" color="#3b82f6" />
              <ScoreRing value={92} label="Complete" color="#8b5cf6" />
            </div>

            {/* Waveform bar */}
            <div className="flex items-center justify-center gap-1 mt-6">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="waveform-bar w-1 bg-blue-400 rounded-full"
                  style={{
                    height: `${12 + Math.sin(i * 0.7) * 8}px`,
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div className="mt-14 flex flex-col items-center gap-2 text-gray-400 text-xs">
            <span>Scroll to learn more</span>
            <ChevronDown className="w-4 h-4 gentle-bounce" />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ───────────────────────────────────────────── */}
      <section className="border-y border-gray-100 py-5 overflow-hidden bg-gray-50/60">
        <div className="flex gap-0">
          <div className="marquee-track flex gap-14 items-center whitespace-nowrap pr-14">
            {[
              'American Accent', 'British RP', 'Australian', 'Indian English',
              'Neutral English', 'IELTS Prep', 'TOEFL Prep', 'Interview Ready',
              'American Accent', 'British RP', 'Australian', 'Indian English',
              'Neutral English', 'IELTS Prep', 'TOEFL Prep', 'Interview Ready',
            ].map((label, i) => (
              <span key={i} className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-16">
            <span className="text-xs uppercase tracking-widest text-blue-600 font-semibold">Features</span>
            <h2 className="text-4xl font-extrabold mt-3 mb-4">
              Everything you need to speak with confidence
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Built for non-native speakers who are serious about sounding natural and professional.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Mic}
              title="Real-time word analysis"
              desc="Every word you speak is analysed on the fly. See accuracy scores the moment you say each word — no waiting, no guessing."
              delay={0}
            />
            <FeatureCard
              icon={Target}
              title="Precision pronunciation scoring"
              desc="Azure Speech SDK evaluates each phoneme. You get colour-coded feedback: green means great, yellow means close, red means let's work on it."
              delay={80}
            />
            <FeatureCard
              icon={Globe}
              title="Multiple accents & languages"
              desc="Practice American, British, Australian, or neutral English. Choose your target accent and Proxena calibrates scoring accordingly."
              delay={160}
            />
            <FeatureCard
              icon={BarChart2}
              title="Progress analytics"
              desc="Track your accuracy and fluency trends across every session. Know exactly which areas are improving and which still need work."
              delay={0}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Curated exercise library"
              desc="50+ exercises across conversation, storytelling, interviews, and daily life — from easy warm-ups to challenging cold-reads."
              delay={80}
            />
            <FeatureCard
              icon={Volume2}
              title="Calm, supportive feedback"
              desc="We never say 'Wrong'. Instead: 'Let's refine this word'. Proxena is designed to reduce anxiety and build your confidence session by session."
              delay={160}
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-16">
            <span className="text-xs uppercase tracking-widest text-blue-600 font-semibold">How it works</span>
            <h2 className="text-4xl font-extrabold mt-3 mb-4">From nervous to natural in minutes</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              No downloads, no complicated setup. Open your browser and start speaking.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Steps */}
            <div className="flex flex-col gap-10">
              <StepCard num="1" title="Pick an exercise" desc="Choose from our library filtered by category and difficulty. From casual conversation to job interview scripts." delay={0} />
              <StepCard num="2" title="Read aloud into your mic" desc="Hit record and speak naturally. Proxena streams your audio in real time — no upload required." delay={100} />
              <StepCard num="3" title="Watch words light up" desc="Each word highlights as you say it: green for great, yellow for close, red for words to revisit." delay={200} />
              <StepCard num="4" title="Review & improve" desc="Your session summary shows scores, problem words, and encouragement. Practice the same exercise until you nail it." delay={300} last />
            </div>

            {/* Visual demo panel */}
            <div className="reveal relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-violet-50 rounded-3xl" />
              <div className="relative bg-white/80 backdrop-blur rounded-3xl border border-white shadow-xl p-8">
                {/* Live badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-green-500 live-dot shrink-0" />
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">Live session</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {[
                    { w: 'Good', s: 'correct' }, { w: 'morning,', s: 'correct' },
                    { w: 'everyone.', s: 'partial' }, { w: "I'd", s: 'correct' },
                    { w: 'like', s: 'correct' }, { w: 'to', s: 'correct' },
                    { w: 'present', s: 'incorrect' }, { w: 'our', s: 'pending' },
                    { w: 'quarterly', s: 'pending' }, { w: 'results.', s: 'pending' },
                  ].map((item, i) => (
                    <span
                      key={i}
                      className={`word-token text-base font-medium ${STATUS_CLASS[item.s] ?? 'text-gray-300'}`}
                    >
                      {item.w}
                    </span>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs text-gray-500 mb-6">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-200 inline-block" /> Correct</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-200 inline-block" /> Needs work</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 inline-block" /> Improve</span>
                </div>

                {/* Mic button */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 mic-pulse flex items-center justify-center shadow-lg shadow-blue-200">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Recording…</div>
                    <div className="text-xs text-gray-400">00:47 elapsed</div>
                  </div>
                  {/* Mini waveform */}
                  <div className="flex items-center gap-0.5 ml-auto">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="waveform-bar w-1 bg-blue-400 rounded-full"
                        style={{ height: `${8 + Math.sin(i) * 5}px`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-16">
            <span className="text-xs uppercase tracking-widest text-blue-600 font-semibold">Testimonials</span>
            <h2 className="text-4xl font-extrabold mt-3 mb-4">Loved by speakers worldwide</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Join thousands of non-native speakers improving with Proxena every day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="reveal-child bg-white rounded-2xl border border-gray-100 shadow-sm p-7 flex flex-col gap-5 hover:shadow-lg transition-shadow duration-300"
                data-delay={String(i * 100)}
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${t.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-400 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-16">
            <span className="text-xs uppercase tracking-widest text-blue-600 font-semibold">Pricing</span>
            <h2 className="text-4xl font-extrabold mt-3 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Start free. Upgrade when you're ready to go unlimited.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="reveal-child bg-white rounded-2xl border border-gray-200 p-8 flex flex-col" data-delay="0">
              <div className="mb-6">
                <h3 className="font-bold text-xl text-gray-900">Free</h3>
                <div className="text-4xl font-extrabold text-gray-900 mt-3">
                  $0
                  <span className="text-base font-normal text-gray-400"> / month</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">Perfect to get started</p>
              </div>
              <ul className="flex flex-col gap-3 flex-1 mb-8">
                {[
                  '5 minutes of practice per day',
                  'Up to 3 sessions per day',
                  'Real-time word-level feedback',
                  'Basic accuracy & fluency scores',
                  'Session history',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="w-full text-center py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:border-blue-300 hover:text-blue-600 transition-colors text-sm"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="reveal-child relative bg-blue-600 rounded-2xl p-8 flex flex-col overflow-hidden" data-delay="100">
              {/* Glow */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-400 opacity-30 rounded-full blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-6">
                  <h3 className="font-bold text-xl text-white">Pro</h3>
                  <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium">Most popular</span>
                </div>
                <div className="text-4xl font-extrabold text-white mt-3">
                  $12
                  <span className="text-base font-normal text-blue-200"> / month</span>
                </div>
                <p className="text-blue-200 text-sm mt-2">For serious learners</p>
              </div>
              <ul className="flex flex-col gap-3 flex-1 my-8 relative">
                {[
                  'Unlimited practice time',
                  'Unlimited daily sessions',
                  'Real-time word-level feedback',
                  'Advanced analytics & trends',
                  'Full session history',
                  'Priority support',
                  'Early access to new features',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                    <CheckCircle className="w-4 h-4 text-blue-200 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="relative w-full text-center py-3 rounded-xl bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors text-sm"
              >
                Start Pro free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-violet-600" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 opacity-20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-violet-400 opacity-20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl mx-auto text-center reveal">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
            Your accent is not a barrier —<br />it's a starting point.
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-lg mx-auto">
            Join thousands of speakers who are practicing smarter with Proxena.
            Start for free — no credit card required.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-base hover:bg-blue-50 transition-all duration-200 shadow-xl hover:-translate-y-0.5"
          >
            Get started for free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
