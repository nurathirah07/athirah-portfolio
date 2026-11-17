// Text that rolls up to a copy of itself when its parent link is hovered.
export default function RollText({ children }: { children: string }) {
  return (
    <span className="roll">
      <span className="roll-inner" data-text={children}>{children}</span>
    </span>
  );
}
