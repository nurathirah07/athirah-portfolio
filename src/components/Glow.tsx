// Fixed backdrop: soft colour washes from the palette under a film of grain.
export default function Glow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="aura absolute inset-0" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
