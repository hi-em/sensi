import { useEffect, useState } from "react";
import SensiAvatar from "../components/SensiAvatar.jsx";
import "../styles/mobile-gate.css";

// Phone front door. Not an error page and not a redirect: the visitor gets the
// real entry page's opening (the mark, the tagline, the three acts), a silent
// loop of the desktop build going through score, ripple, galaxy and the vision,
// and one honest band explaining why the app itself is not here yet. The app is
// never mounted on this path, so there is no half-working shape space behind it
// to stumble into, and no /api/init spent on a visitor who cannot use it.
export default function MobileGate() {
  const [still, setStill] = useState(false);

  // Respect reduced motion: fall back to the poster frame rather than looping.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e) => setStill(e.matches);
    setStill(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return (
    <div className="mg-root">
      <div className="mg-scroll">
        <SensiAvatar size={44} className="" strokeWidth={0.9} centerR={1.4} centerOpacity={0.85} />
        <p className="mg-wordmark">sensi</p>
        <p className="mg-tag">every floor plan feels different to every body.</p>
        <p className="mg-sub">
          You don't walk into a room and average your experience: the glare, the echo,
          the cold draft on the back of your neck. Sensi scores a plan sense by sense,
          for one person at a time, then helps you push back.
        </p>

        {/* The three acts run DOWN on a phone. Laid across, the full labels wrap
            to three ragged lines and stop reading as one sequence; shortening
            them to fit would cost the words. The landscape rule in the
            stylesheet turns the same markup back into a row, arrow and all. */}
        <div className="mg-steps">
          <span className="mg-step">1 · a comfort persona</span>
          <span className="mg-step-arrow">↓</span>
          <span className="mg-step">2 · shape the layout</span>
          <span className="mg-step-arrow">↓</span>
          <span className="mg-step">3 · understand why</span>
        </div>

        <div className="mg-film">
          {still
            ? <img src="/gate-poster.jpg" alt="Sensi scoring a floor plan across six senses." />
            : <video src="/gate-loop.mp4" poster="/gate-poster.jpg"
                autoPlay muted loop playsInline preload="metadata"
                aria-label="The desktop build: scoring a plan, following the ripple an edit sends through the other senses, the relationship galaxy, and the before and after vision." />}
        </div>
        <p className="mg-caption">
          the desktop build: scoring, the ripple, the galaxy, the vision
        </p>
      </div>

      <div className="mg-band">
        <div className="mg-band-inner">
          <div className="mg-band-copy">
            {/* "Open it on a desktop" is text, not a button: a link to the page
                you are already on is a dead control. It sits inside the honest
                line rather than on its own row, because a fourth row pushed the
                band to 22% of the screen and hid the film's caption behind it. */}
            <p className="mg-band-line">
              Sensi needs more width than a hand gives it, so the phone build is still
              in progress. Open it on a desktop to try it. Six senses, one column: how?
            </p>
            <p className="mg-band-joke">n.b. lmao open your laptop.</p>
          </div>
          <a className="mg-cta" href="https://emiliechidiac.com/work/sensi">read the project ↗</a>
        </div>
      </div>
    </div>
  );
}
