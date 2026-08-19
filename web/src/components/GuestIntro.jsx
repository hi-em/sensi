import SensiAvatar from "./SensiAvatar.jsx";

// First-touch card for the public demo: introduces the shared guest persona.
// Shown once per browser (App gates on localStorage) and only when the server
// reports demo mode, so local installs with a personal persona never see it.
export default function GuestIntro({ persona, onClose }) {
  const name = persona?.name || "our guest";
  const description = persona?.description ||
    "A curated comfort profile, ready to explore.";
  return (
    <div className="guest-intro-backdrop" onClick={onClose}>
      <div className="guest-intro-card" onClick={(e) => e.stopPropagation()}>
        <SensiAvatar size={40} className="" strokeWidth={0.9} centerR={1.4} centerOpacity={0.85} />
        <p className="guest-intro-kicker">welcome to sensi</p>
        <h2 className="guest-intro-title">you're exploring as {name}</h2>
        <p className="guest-intro-body">{description}</p>
        <p className="guest-intro-body">
          Sensi reads floor plans through {name}'s senses — look around, move
          things, ask why. This is a shared demo, so nothing you try is saved.
        </p>
        <button className="btn-action" onClick={onClose}>start exploring</button>
      </div>
    </div>
  );
}
