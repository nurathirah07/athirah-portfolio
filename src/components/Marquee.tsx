// An endless ticker on a glossy amethyst band, set at a slight angle. The
// second copy makes the loop seamless; hovering pauses it.
export default function Marquee({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center">
      {items.map((item) => (
        <li key={item} className="flex items-center">
          <span className="font-display text-4xl md:text-6xl">{item}</span>
          <span aria-hidden className="mx-6 h-2.5 w-2.5 rotate-45 bg-gold md:mx-10" />
        </li>
      ))}
    </ul>
  );

  return (
    // Wider than the page so the tilted ends stay off-screen.
    <div className="marquee band-gloss -mx-[3%] -rotate-[1.5deg] overflow-hidden py-6 md:py-8">
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
