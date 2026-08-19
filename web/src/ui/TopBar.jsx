import SensiAvatar from "../components/SensiAvatar.jsx";

// Shared top-bar shell — the brand pill (avatar + "sensi") was repeated in all
// five screens. TopBar renders that shell; each screen passes its own trailing
// content (step pill, layout picker + status group, section label) as children.
// With onHome the brand becomes the way back to the front door (logo-goes-home).
export default function TopBar({ wide = false, onHome = null, children }) {
  const brand = (
    <>
      <SensiAvatar size={26} />
      <span className="top-bar-label">sensi</span>
    </>
  );
  return (
    <div className="top-bar">
      <div className={"top-bar-pill" + (wide ? " top-bar-pill--wide" : "")}>
        {onHome
          ? <button className="top-bar-home" onClick={onHome}
              title="back to the front door" aria-label="back to the front door">{brand}</button>
          : brand}
        {children}
      </div>
    </div>
  );
}
