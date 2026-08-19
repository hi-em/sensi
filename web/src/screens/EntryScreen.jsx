import { useEffect, useRef, useState } from "react";
import SensiAvatar from "../components/SensiAvatar.jsx";

// Entry page — the front door of the public demo. One breath of story (what Sensi
// is, the three-act journey), then the choice as a persona select: explore as the
// curated guest, or sign in with Google and build a persona of your own.
// Replaces the earlier one-shot GuestIntro overlay; App remembers the guest choice
// in localStorage so returning visitors walk straight in.
export default function EntryScreen({ persona, clientId, onGuest, onGoogleCredential }) {
  const gsiRef = useRef(null);
  const [gsiFailed, setGsiFailed] = useState(false);
  const name = persona?.name || "our guest";
  const senses = (persona?.sensory_sensitivities || []).slice(0, 3);
  const board = (persona?.moodboard_urls || []).slice(0, 4);

  // Google's own button (GIS, dark theme) — Google checks the password on its
  // page and hands back a signed ID token; Sensi never sees credentials.
  useEffect(() => {
    if (!clientId || !gsiRef.current) return;
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
          width: 230, logo_alignment: "center",
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
  }, [clientId, onGoogleCredential]);

  return (
    <div className="entry-screen">
      <div className="entry-hero">
        <SensiAvatar size={44} className="" strokeWidth={0.9} centerR={1.4} centerOpacity={0.85} />
        <p className="entry-wordmark">sensi</p>
        <p className="entry-tag">every floor plan feels different to every body.</p>
        <p className="entry-sub">
          Sensi reads rooms through six senses — thermal, visual, acoustic, spatial,
          olfactory, tactile — for a specific person, then helps you reshape the plan.
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
            {persona?.description ||
              "the resident guest — craves warmth and soft light, would take a snug corner over an open plan any day."}
          </p>
          {senses.length > 0 && (
            <div className="entry-chips">
              {senses.map((s) => <span key={s} className="entry-chip">{s}</span>)}
            </div>
          )}
          {board.length > 0 && (
            <div className="entry-board">
              {board.map((url) => <img key={url} src={url} alt="" loading="lazy" />)}
            </div>
          )}
          <button className="entry-cta" onClick={onGuest} autoFocus>explore as {name}</button>
          <p className="entry-note">instant, no account — a shared demo, read-only profile</p>
        </div>

        <div className="entry-card entry-card--you">
          <div className="entry-avatar entry-avatar--empty">+</div>
          <p className="entry-name">you</p>
          <p className="entry-bio">
            a short onboarding turns your habits and sensitivities into a comfort
            persona of your own.
          </p>
          <div className="entry-you-spacer" />
          {clientId && !gsiFailed
            ? <div className="entry-gsi" ref={gsiRef} />
            : <p className="entry-note">sign-in isn't available right now — explore as {name} instead</p>}
          <p className="entry-note">saved to your account — it's here when you return</p>
        </div>
      </div>

      <p className="entry-footer">persona → shape the layout → understand why</p>
    </div>
  );
}
