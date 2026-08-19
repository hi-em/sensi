import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import SensiAvatar from "../components/SensiAvatar.jsx";
import { SC } from "../lib/constants.js";
import { EASE } from "../lib/motion.js";

// What a hovered sense means to Wren, in her register (the drawer's IMPLICATIONS
// speak to "you", the persona owner; here we are describing her).
const WREN_PEEKS = {
  thermal:   "a cold room registers before anything else; warmth is her baseline, not a bonus.",
  visual:    "soft, diffused daylight; glare and harsh contrast pull her out of a room.",
  acoustic:  "sound bleed and echo wear on her; a calm background is part of comfort.",
  spatial:   "she'd take a snug corner over an open plan; scale reads as intimacy, not size.",
  olfactory: "stale air and kitchen smells travel; she notices before anyone else does.",
  tactile:   "surfaces matter: linen, wool, warm wood. nothing cold or slick to the hand.",
};
const BOARD_PEEK = "her palette: soft daylight, honeyed wood, clay walls, linen and wool, big leafy plants.";

// Entry page — the front door of the public demo. One breath of story (what Sensi
// is, the three-act journey), then the choice as a persona select: explore as the
// curated guest, or sign in with Google and build a persona of your own.
// The Wren card answers curiosity in place: hovering a sense chip or the moodboard
// reveals one line about her in a fixed peek strip (no layout jumps). Choosing her
// is a straight cut — the page settles out and the shape space rises in.
// A signed-in visitor arriving here (via the wordmark) sees their own card on the
// right and a continue door; the guest door asks them to sign out first.
export default function EntryScreen({ persona, clientId, user = null,
  onGuest, onGoogleCredential, onContinue, callout = false }) {
  const gsiRef = useRef(null);
  const [gsiFailed, setGsiFailed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [peek, setPeek] = useState(null); // "board" | a sense key | null
  const name = persona?.name || "Wren";
  const senses = (persona?.sensory_sensitivities || []).slice(0, 3);
  const board = (persona?.moodboard_urls || []).slice(0, 4);

  const beginGuest = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onGuest, 340);
  };

  // Google's own button (GIS, dark theme, English to match the page) — Google
  // checks the password on its page and hands back a signed ID token; Sensi
  // never sees credentials.
  useEffect(() => {
    if (!clientId || user || !gsiRef.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.google?.accounts?.id || !gsiRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => resp?.credential && onGoogleCredential(resp.credential),
          use_fedcm_for_button: true,
        });
        window.google.accounts.id.renderButton(gsiRef.current, {
          theme: "filled_black", shape: "pill", text: "continue_with",
          width: 240, logo_alignment: "center", locale: "en",
        });
      } catch {
        setGsiFailed(true);
      }
    };
    if (window.google?.accounts?.id) { render(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = render;
    s.onerror = () => setGsiFailed(true);
    document.head.appendChild(s);
    return () => { cancelled = true; };
  }, [clientId, user, onGoogleCredential]);

  const peekText = peek === "board" ? BOARD_PEEK : (peek ? WREN_PEEKS[peek] : null);

  return (
    <motion.div className="entry-screen"
      animate={leaving ? { opacity: 0, y: -8, scale: 0.985 } : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: EASE.out }}>
      <div className="entry-hero">
        <SensiAvatar size={44} className="" strokeWidth={0.9} centerR={1.4} centerOpacity={0.85} />
        <p className="entry-wordmark">sensi</p>
        <p className="entry-tag">every floor plan feels different to every body.</p>
        <p className="entry-sub">
          You don't walk into a room and average your experience: the glare, the echo,
          the cold draft on the back of your neck. Sensi scores a plan sense by sense,
          for one person at a time, then helps you push back.
        </p>
        <div className="entry-steps">
          <span className="entry-step">1 · a comfort persona</span>
          <span className="entry-step-arrow">→</span>
          <span className="entry-step">2 · shape the layout</span>
          <span className="entry-step-arrow">→</span>
          <span className="entry-step">3 · understand why</span>
        </div>
      </div>

      <div className="entry-cards">
        <div className="entry-card entry-card--wren">
          <div className="entry-avatar">{name.charAt(0).toUpperCase()}</div>
          <p className="entry-name">{name}</p>
          <p className="entry-bio">
            {name} goes first. Warmth, soft light, a snug corner over an open plan:
            that's her brief. Borrow her senses and watch what the plan does to her.
          </p>
          {senses.length > 0 && (
            <div className="entry-chips">
              {senses.map((s) => (
                <span key={s}
                  className={"entry-chip" + (peek === s ? " is-peeked" : "")}
                  style={peek === s ? { borderColor: SC[s], color: SC[s] } : undefined}
                  onMouseEnter={() => setPeek(s)} onMouseLeave={() => setPeek(null)}>
                  {s}
                </span>
              ))}
            </div>
          )}
          {board.length > 0 && (
            <div className="entry-board"
              onMouseEnter={() => setPeek("board")} onMouseLeave={() => setPeek(null)}>
              {board.map((url) => <img key={url} src={url} alt="" loading="lazy" />)}
            </div>
          )}
          <div className="entry-peek" aria-live="polite">
            <span className={"entry-peek-text" + (peekText ? " is-on" : "")}
              style={peek && peek !== "board" ? { color: SC[peek] } : undefined}>
              {peekText || "hover a sense, or her board"}
            </span>
          </div>
          {user
            ? <p className="entry-note" style={{ marginTop: "auto" }}>sign out (in your profile) to explore as {name}</p>
            : <>
                <button className="entry-cta" onClick={beginGuest}>explore as {name}</button>
                <p className="entry-note">instant, no account. a shared demo, read-only profile.</p>
              </>}
        </div>

        <div className={"entry-card entry-card--you" + (callout ? " is-called" : "")}>
          {user ? (
            <>
              <div className="entry-avatar">{(user.name || user.email || "?").charAt(0).toUpperCase()}</div>
              <p className="entry-name">{user.name || "you"}</p>
              <p className="entry-bio">signed in as {user.email}</p>
              <div className="entry-you-spacer" />
              <button className="entry-cta" onClick={onContinue}>continue as {user.name || "you"}</button>
              <p className="entry-note">your comfort persona is saved to your account</p>
            </>
          ) : (
            <>
              <div className="entry-avatar entry-avatar--empty">+</div>
              <p className="entry-name">you</p>
              <p className="entry-bio">
                or be the person the plan is scored for: a short onboarding, your
                habits, your non-negotiable.
              </p>
              <div className="entry-you-spacer" />
              {clientId && !gsiFailed
                ? <div className="entry-gsi" ref={gsiRef} />
                : <p className="entry-note">sign-in isn't available right now: explore as {name} instead</p>}
              <p className="entry-note">saved to your account. it's here when you return.</p>
            </>
          )}
        </div>
      </div>

      <p className="entry-footer">persona → shape the layout → understand why</p>
    </motion.div>
  );
}
