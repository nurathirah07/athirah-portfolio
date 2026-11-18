import Image from "next/image";
import type { Shot } from "@/data/site";

// Bezel as a share of the phone's height (top/bottom) and width (left/right).
// They give an even bezel on a ~1:2 phone.
const BEZEL_Y = 0.02;
const BEZEL_X = 0.042;

// A phone drawn after the mobile template: black body, thin blue rim,
// teardrop notch, two side buttons and a soft floor shadow. It is sized by its
// height; the width follows the screenshot so the screen is never cropped.
export function Phone({ shot, className = "", style }: { shot: Shot; className?: string; style?: React.CSSProperties }) {
  const ratio = (shot.width / shot.height) * ((1 - 2 * BEZEL_Y) / (1 - 2 * BEZEL_X));

  return (
    <div className={`relative ${className}`} style={{ aspectRatio: ratio, ...style }}>
      {/* floor shadow */}
      <div aria-hidden className="absolute -bottom-[3.5%] left-[12%] right-[12%] h-[3%] rounded-[50%] bg-black/70 blur-md" />
      {/* side buttons: volume, then power */}
      <span aria-hidden className="absolute -right-[1.6%] top-[19%] h-[8%] w-[2%] rounded-r-sm bg-[#0e1a33]" />
      <span aria-hidden className="absolute -right-[1.6%] top-[30%] h-[12%] w-[2%] rounded-r-sm bg-[#0e1a33]" />

      <div className="absolute inset-0 rounded-[15%/7.5%] bg-[#050608] shadow-[0_0_0_1.5px_#1f3463,0_0_0_3px_#06080d,0_40px_70px_-30px_rgb(0_0_0/0.95)]">
        <div
          className="absolute overflow-hidden rounded-[11%/5.2%] bg-ink"
          style={{ inset: `${BEZEL_Y * 100}% ${BEZEL_X * 100}%` }}
        >
          <Image src={shot.src} alt={shot.alt} fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover object-top" />
          {/* glass reflection */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.14)_0%,transparent_32%,transparent_70%,rgb(255_255_255/0.05)_100%)]" />
        </div>
        {/* teardrop notch with camera */}
        <div aria-hidden className="absolute left-1/2 top-[2%] h-[2.6%] w-[11%] -translate-x-1/2 rounded-b-full bg-[#050608]">
          <span className="absolute left-1/2 top-[22%] aspect-square w-[34%] -translate-x-1/2 rounded-full bg-[#14213f] ring-1 ring-[#2b3f6e]" />
        </div>
      </div>
    </div>
  );
}

// A slim browser window for website screenshots.
export function Browser({ shot, className = "", fill = false }: { shot: Shot; className?: string; fill?: boolean }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-cream/15 bg-[#0a1d14] shadow-[0_30px_60px_-25px_rgb(0_0_0/0.9)] ${className}`}>
      <div aria-hidden className="flex shrink-0 items-center gap-1.5 border-b border-cream/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-flame/80" />
        <span className="h-2 w-2 rounded-full bg-gold/80" />
        <span className="h-2 w-2 rounded-full bg-spruce" />
        <span className="ml-2 h-2 flex-1 rounded-full bg-cream/8" />
      </div>
      {fill ? (
        <div className="relative min-h-0 flex-1">
          <Image src={shot.src} alt={shot.alt} fill sizes="(min-width: 768px) 50vw, 90vw" className="object-cover object-top" />
        </div>
      ) : (
        <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(min-width: 768px) 55vw, 90vw" className="h-auto w-full" />
      )}
    </div>
  );
}
