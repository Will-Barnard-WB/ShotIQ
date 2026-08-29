/**
 * The landing page's demo screenshot. Deliberately static: it is a marketing
 * artefact showing a real output, and its numbers are quoted throughout the
 * copy. The live version of this screen is components/analysis/*, rendered
 * from the signed-in user's own data.
 */

const dim = { fontSize: "11px", color: "#9a9894" } as const;
const small = { fontSize: "11px" } as const;

export default function DemoAnalysis() {
  return (
    <div className="analysis-wrap">
      <div className="app-header">
        <div className="app-logo">
          Shot<span>IQ</span>
        </div>
      </div>
      <div className="session-meta">
        Session 2 · 31 March 2026 · Launch monitor session · 5 clubs analysed
      </div>

      <div className="section-title">Session overview</div>
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Shots analysed</div>
          <div className="metric-val">47</div>
          <div className="metric-sub">vs 38 last session</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Good shot rate</div>
          <div className="metric-val up">62%</div>
          <div className="metric-sub">↑ from 48% (S1)</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Clubs hitting well</div>
          <div className="metric-val">8</div>
          <div className="metric-sub">vs 4 last session</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Estimated handicap</div>
          <div className="metric-val">20–26</div>
          <div className="metric-sub">Based on ball data</div>
        </div>
      </div>

      <div className="section-title">Session 1 vs Session 2, common clubs</div>
      <div className="comp-grid">
        <div className="comp-card">
          <div className="comp-club">8 Iron</div>
          <div className="comp-metric">Smash factor</div>
          <div className="comp-change up">+0.08 ↑</div>
          <div className="comp-metric" style={{ marginTop: 6 }}>Deviation</div>
          <div className="comp-change up" style={{ fontSize: 14 }}>−20 → −3 yds ↑</div>
        </div>
        <div className="comp-card">
          <div className="comp-club">7 Iron</div>
          <div className="comp-metric">Club path</div>
          <div className="comp-change up">−12° → −10° ↑</div>
          <div className="comp-metric" style={{ marginTop: 6 }}>Club face</div>
          <div className="comp-change up" style={{ fontSize: 14 }}>−5° → −3° ↑</div>
        </div>
        <div className="comp-card">
          <div className="comp-club">5 Iron</div>
          <div className="comp-metric">Club face</div>
          <div className="comp-change up">−7° → −2° ↑</div>
          <div className="comp-metric" style={{ marginTop: 6 }}>Distance</div>
          <div className="comp-change down" style={{ fontSize: 14 }}>148 → 135 yds ↓</div>
        </div>
      </div>

      <hr className="divider" />
      <div className="section-title">This session, club by club</div>

      <div className="card">
        <div className="club-header">
          <span className="club-name">5 Wood</span>
          <span className="badge badge-warn">needs work</span>
        </div>
        <div className="stat-row"><span className="stat-label">Avg distance</span><span className="stat-val">165 yds</span></div>
        <div className="stat-row">
          <span className="stat-label">Smash factor</span>
          <span className="stat-val">1.32 <span style={dim}>↓ from 1.35</span></span>
        </div>
        <div className="stat-row"><span className="stat-label">Good vs bad gap</span><span className="stat-val down">72 yards</span></div>
        <div className="stat-row"><span className="stat-label">Club path</span><span className="stat-val">−4.8° (improved)</span></div>
        <div className="bar-wrap">
          <div className="bar-row">
            <span className="bar-label">Smash 1.32</span>
            <div className="bar-bg"><div className="bar-fill" style={{ width: "68%", background: "#EF9F27" }} /></div>
            <span className="bar-val" style={{ color: "#BA7517" }}>Avg</span>
          </div>
          <div className="bar-row">
            <span className="bar-label">Path −4.8°</span>
            <div className="bar-bg"><div className="bar-fill" style={{ width: "72%", background: "#1D9E75" }} /></div>
            <span className="bar-val" style={{ color: "#1D9E75" }}>Better</span>
          </div>
        </div>
        <div className="hcp-row">
          <span className="hcp-pill">Scratch: 1.48+</span>
          <span className="hcp-pill">10 hcp: 1.40+</span>
          <span className="hcp-you">You: 1.32</span>
          <span className="hcp-pill">20+ hcp: 1.25–1.35</span>
        </div>
      </div>

      <div className="card">
        <div className="club-header">
          <span className="club-name">7 Iron</span>
          <span className="badge badge-warn">consistent fault</span>
        </div>
        <div className="stat-row"><span className="stat-label">Avg distance</span><span className="stat-val">132 yds</span></div>
        <div className="stat-row">
          <span className="stat-label">Club path</span>
          <span className="stat-val">−10.1° <span className="up" style={small}>↑ improved from −12.1°</span></span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Club face</span>
          <span className="stat-val">−2.8° <span className="up" style={small}>↑ improved from −5.1°</span></span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Good vs bad gap</span>
          <span className="stat-val down">45 yds, face closes on bad shots</span>
        </div>
        <div className="hcp-row">
          <span className="hcp-pill">Scratch: 1.35+</span>
          <span className="hcp-pill">10 hcp: 1.28+</span>
          <span className="hcp-you">You: 1.20</span>
          <span className="hcp-pill">20+ hcp: 1.18–1.25</span>
        </div>
      </div>

      <div className="card">
        <div className="club-header">
          <span className="club-name">8 Iron</span>
          <span className="badge badge-good">most improved</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Avg distance</span>
          <span className="stat-val">124 yds <span className="up">↑ +7 yds</span></span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Smash factor</span>
          <span className="stat-val">1.21 <span className="up">↑ from 1.13</span></span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Club face</span>
          <span className="stat-val">−2.8° <span className="up">↑ from −11.4°</span></span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Deviation</span>
          <span className="stat-val">−2.7 yds <span className="up">↑ from −20.3 yds</span></span>
        </div>
        <div className="hcp-row">
          <span className="hcp-pill">Scratch: 1.37+</span>
          <span className="hcp-pill">10 hcp: 1.30+</span>
          <span className="hcp-you">You: 1.21</span>
          <span className="hcp-pill">20+ hcp: 1.15–1.25</span>
        </div>
      </div>

      <div className="card">
        <div className="club-header">
          <span className="club-name">Sand Wedge (chipping)</span>
          <span className="badge badge-info">short game</span>
        </div>
        <div className="chipping-note">50 &amp; 30 yard chip shots. Full swing metrics not applicable.</div>
        <div className="stat-row"><span className="stat-label">Avg carry</span><span className="stat-val">27.8 yds (targeting 30–50)</span></div>
        <div className="stat-row"><span className="stat-label">Deviation</span><span className="stat-val">−0.8 yds, very straight</span></div>
        <div className="stat-row"><span className="stat-label">Distance consistency</span><span className="stat-val down">11–51 yds range, inconsistent</span></div>
      </div>

      <hr className="divider" />
      <div className="section-title">Key improvements since last session</div>
      <div className="tip-card good-tip">
        <div className="tip-title">8 Iron: major face fix</div>
        <div className="tip-body">
          Club face improved from −11.4° to −2.8° and face-to-path flipped from −4° to +4.9°.
          Deviation shrunk from 20 yards left to under 3. The best single-club improvement in the data.
        </div>
      </div>
      <div className="tip-card good-tip">
        <div className="tip-title">Path improvement across all irons</div>
        <div className="tip-body">
          Every iron shows a less severe out-to-in path this session. 7 iron moved from −12° to −10°.
          Still outside ±3° ideal but moving in the right direction.
        </div>
      </div>

      <div className="section-title">Priority faults to fix</div>
      <div className="tip-card warn-tip">
        <div className="tip-title">5 Wood &amp; 9 Iron: smash factor too variable</div>
        <div className="tip-body">
          Both clubs show a 70+ yard gap between best and worst shots, driven almost entirely by
          smash factor. Focus on centre contact before adding speed.
        </div>
      </div>
      <div className="tip-card warn-tip">
        <div className="tip-title">Club path still 2–3× outside ideal across all clubs</div>
        <div className="tip-body">
          Ideal path is within ±3°. Your irons are averaging −7° to −10°. A 15-handicapper typically
          averages −5° to −6°; scratch averages ±2°.
        </div>
      </div>

      <div className="section-title">3 swing cues for next session</div>
      <div className="tip-card info-tip">
        <div className="tip-title">1. All irons: &quot;swing to right field&quot;</div>
        <div className="tip-body">
          Your path is consistently too left. Pick a spot 10 yards right of your target and swing
          through it. It will feel extreme, but trust the data.
        </div>
      </div>
      <div className="tip-card info-tip">
        <div className="tip-title">2. 5 Wood: &quot;brush the tee forward&quot;</div>
        <div className="tip-body">
          Your bad 5 wood shots suggest fat contact. Focus on a sweeping motion that brushes an
          imaginary tee out from under the ball.
        </div>
      </div>
      <div className="tip-card info-tip">
        <div className="tip-title">3. Chipping: &quot;same length back and through&quot;</div>
        <div className="tip-body">
          Direction is already good. Keep backswing and follow-through equal in length, and let swing
          length control distance rather than hand speed.
        </div>
      </div>

      <div className="analysis-footer">ShotIQ · Session analysis · 31 March 2026</div>
    </div>
  );
}
