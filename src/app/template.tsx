// Remounts on every page change so entrance animations replay.
// The transition itself is handled by the Curtain component.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
