import Nav from "@/components/Nav";
import ScatterHero from "@/components/ScatterHero";
import DemoAnalysis from "@/components/DemoAnalysis";
import WaitlistForm from "@/components/WaitlistForm";

const HOW = [
  {
    num: "01",
    icon: "📁",
    title: "Upload your session",
    body: "Export a CSV from your launch monitor's app after any practice session, then drag and drop it into ShotIQ. Takes about 10 seconds.",
  },
  {
    num: "02",
    icon: "🎯",
    title: "Tag your shots",
    body: "Mark each shot as good, ok, or bad. ShotIQ can also auto-tag based on smash factor and deviation, whichever you prefer.",
  },
  {
    num: "03",
    icon: "⚡",
    title: "Get your insights",
    body: "AI analyses what separates your best shots from your worst, per club and per session, then tells you what to work on next.",
  },
];

const FEATURES = [
  {
    accent: true,
    tag: "Core feature",
    tagClass: "tag-green",
    title: "Good vs bad shot analysis",
    body: "Most tools show you averages. ShotIQ compares your best shots to your worst and pinpoints the specific metric (face angle, attack angle, club path) that explains the gap, per club, every session.",
  },
  {
    accent: false,
    tag: "Progression",
    tagClass: "tag-blue",
    title: "Session-by-session trend tracking",
    body: "Every upload adds to your profile. ShotIQ tracks whether your dominant fault is improving over time, so you know if your practice is actually working.",
  },
  {
    accent: false,
    tag: "Benchmarking",
    tagClass: "tag-amber",
    title: "Compare to your handicap band",
    body: "Not PGA Tour benchmarks. Real data from golfers at your handicap level, so you can see where you stand on club speed, smash factor, and face variance against people actually similar to you.",
  },
  {
    accent: false,
    tag: "Handicap",
    tagClass: "tag-blue",
    title: "Data-derived handicap intelligence",
    body: "Drop in your round scores and get more than a number. ShotIQ tells you whether your handicap is being held back by striking, short game, or course management, and quantifies the gap.",
  },
];

const VISION_STATS = [
  { num: "12+", label: "Data points captured per shot by a modern launch monitor" },
  { num: "0", label: "Existing tools that compare your good shots to your bad shots" },
  { num: "£0", label: "Additional hardware required, works with your existing launch monitor" },
];

const paragraph = {
  color: "var(--t2)",
  fontSize: "1rem",
  lineHeight: 1.7,
  marginTop: "1rem",
  fontWeight: 300,
} as const;

export default function Home() {
  return (
    <>
      <Nav />

      <section className="hero">
        <div className="hero-eyebrow">Launch monitor data · AI analysis · Real improvement</div>
        <h1>
          Your golf data has the answers.
          <br />
          <em>Now you can read them.</em>
        </h1>
        <p className="hero-sub">
          ShotIQ turns your launch monitor data into personalised coaching insights. It shows you
          exactly what separates your best shots from your worst, and what to fix next.
        </p>
        <div className="hero-actions">
          <a href="#waitlist" className="btn-primary">
            Join the waitlist
          </a>
          <a href="#demo" className="btn-ghost">
            See a live demo ↓
          </a>
        </div>

        <ScatterHero />
      </section>

      <hr className="hr" />

      <section id="how">
        <div className="container">
          <div className="section-label">How it works</div>
          <h2>Three steps to smarter practice</h2>
          <p className="section-sub">
            No hardware changes, no subscriptions to other apps. Just your existing launch monitor
            data, finally made useful.
          </p>
          <div className="how-grid">
            {HOW.map((c) => (
              <div className="how-card" key={c.num}>
                <div className="how-num">{c.num}</div>
                <div className="how-icon">{c.icon}</div>
                <div className="how-title">{c.title}</div>
                <div className="how-body">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="hr" />

      <section>
        <div className="container">
          <div className="section-label">What makes it different</div>
          <h2>
            Built around your swing,
            <br />
            not a pro&apos;s
          </h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div className={f.accent ? "feat-card accent" : "feat-card"} key={f.title}>
                <span className={`feat-tag ${f.tagClass}`}>{f.tag}</span>
                <div className="feat-title">{f.title}</div>
                <div className="feat-body">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="hr" />

      <section id="demo" style={{ paddingTop: "4rem", paddingBottom: 0 }}>
        <div className="container">
          <div className="demo-header">
            <div className="section-label">Live demo</div>
            <h2>See a real session analysis</h2>
            <p className="section-sub" style={{ margin: "0 auto" }}>
              This is an actual output from a two-session launch monitor dataset. Every number is
              real, and this is exactly what ShotIQ produces.
            </p>
          </div>
        </div>
        <div style={{ maxWidth: 820, margin: "2rem auto 0", padding: "0 1.5rem" }}>
          <div className="demo-frame">
            <div className="demo-bar">
              <div className="demo-dot" style={{ background: "#F87171" }} />
              <div className="demo-dot" style={{ background: "#FBBF24" }} />
              <div className="demo-dot" style={{ background: "#4ADE80" }} />
              <div className="demo-url">shotiq.app/analysis/session-2</div>
            </div>
            <div className="demo-inner">
              <DemoAnalysis />
            </div>
          </div>
        </div>
      </section>

      <hr className="hr" style={{ marginTop: "4rem" }} />

      <section id="vision" className="vision">
        <div className="container">
          <div className="vision-grid">
            <div>
              <div className="section-label">Our vision</div>
              <h2>
                Golf has always been data-rich.
                <br />
                Now it&apos;s data-driven.
              </h2>
              <p style={paragraph}>
                A modern launch monitor captures over a dozen data points every time you hit a ball.
                Most golfers upload that data, glance at a number, and forget it. ShotIQ exists to
                close that loop, turning raw metrics into the kind of honest, specific coaching that
                actually changes how you practice.
              </p>
              <p style={paragraph}>
                As our community grows, so does the intelligence behind the platform. We&apos;re
                building the first real dataset of what good golf looks like at every handicap level:
                benchmarks built from real golfers, not pros.
              </p>
              <p style={paragraph}>
                The goal is simple: every golfer who uses ShotIQ should practice more purposefully,
                improve measurably, and understand their own game in a way they never have before.
              </p>
            </div>
            <div className="vision-stats">
              {VISION_STATS.map((s) => (
                <div className="vstat" key={s.num}>
                  <div className="vstat-num">{s.num}</div>
                  <div className="vstat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="hr" />

      <section id="waitlist">
        <div className="container">
          <div className="section-label">Early access</div>
          <h2>Be first when we launch</h2>
          <p className="section-sub" style={{ margin: "0 auto" }}>
            ShotIQ is in development. Join the waitlist for early access, product updates, and the
            chance to shape what we build.
          </p>
          <div className="waitlist-box">
            <p style={{ fontSize: 14, color: "var(--t2)" }}>
              Drop your email and we&apos;ll reach out when we&apos;re ready for beta testers.
            </p>
            <WaitlistForm />
            <p className="waitlist-note">No spam. Unsubscribe any time.</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-logo">
          Shot<span>IQ</span>
        </div>
        <div className="footer-text">
          © 2026 ShotIQ · Built for launch monitor owners who want more from their data
        </div>
      </footer>
    </>
  );
}
