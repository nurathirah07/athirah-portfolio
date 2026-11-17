// Edit everything about you here — the pages read from this file.
import projectData from "./projects.json";

export const site = {
  name: "Nur Athirah Azmi",
  role: "Software Developer",
  tagline: "I build web and mobile systems that real businesses use every day, from stock control to AI that reads food labels.",
  location: "Terengganu, Malaysia",
  email: "athirahazmi77@gmail.com",
  // Links left empty stay hidden on the site until you fill them in.
  links: {
    github: "https://github.com/nurathirah07", // e.g. "https://github.com/your-username"
    linkedin: "http://linkedin.com/in/athirah-azmi-432b65376", // e.g. "http://linkedin.com/in/athirah-azmi-432b65376"
    // The public copy of your resume (phone number and referee details removed).
    resume: "/resume.pdf",
  },
  // Free form service that delivers Mira's enquiries to your inbox. Make a form at
  // formspree.io and paste its ID here (the part after /f/ in its address).
  // Left empty, sending an enquiry opens the visitor's email app instead.
  formspree: "mkjrrgkj",
  // The site's public address, used for link previews and the sitemap. Leave
  // empty on Vercel: its own address is used. Set it if you add a custom
  // domain, e.g. "https://athirahazmi.com".
  url: "",
  heroLine: "Software Developer building web, mobile and AI systems",
  statement: "I build web and mobile software for day-to-day business work, such as stock control, sales and repair tracking.",
  expertiseIntro: "The kinds of work I take on.",
  // `project` is the short name of the project that shows this service (its screenshot
  // appears on hover on the home page; `shot` picks which image, 0 = first).
  // `tools` are the names from `skills` below that are marked for it on the About page.
  services: [
    { name: "Web Applications", detail: "Full-stack systems with Node.js, React, Next.js and Laravel.", project: "rentngo", shot: 0, tools: ["React", "Next.js", "JavaScript", "Tailwind CSS", "Node.js", "Laravel", "PHP", "Java", "MySQL"] },
    { name: "Mobile Apps", detail: "Flutter apps backed by Flask APIs and Firestore.", project: "biteright", shot: 0, tools: ["Flutter", "Python", "Flask", "Firestore"] },
    { name: "UI/UX Design", detail: "Page layouts, user flows and interface design for web and mobile apps.", project: "cozy-crumb", shot: 0, tools: ["Tailwind CSS", "React", "Flutter"] },
    { name: "AI-Powered Features", detail: "OCR, NLP and machine learning features inside an app.", project: "biteright", shot: 3, tools: ["Python", "Flask", "OpenCV", "scikit-learn"] },
    { name: "Database Design", detail: "Data models and queries in MySQL and Firestore.", project: "cozy-crumb", shot: 3, tools: ["MySQL", "Firestore"] },
  ],
  // The About page scrolls through these in order, oldest first.
  journey: [
    {
      short: "Foundation",
      images: [
        { src: "/images/about/dengkil.webp", width: 2400, height: 1350, alt: "Entrance sign of UiTM Dengkil campus", position: "50% 60%" },
      ],
      period: "2022 - 2023",
      org: "Pusat Asasi UiTM",
      role: "Foundation in Science, Dengkil",
      headline: "A foundation in science and maths.",
      body: "My foundation year was built on science and maths. It taught me to break difficult problems into smaller steps and stay disciplined with my time, and it prepared me for a degree in IT.",
      tags: ["Problem Solving", "Analytical Thinking", "Time Management"],
    },
    {
      short: "Degree",
      images: [
        { src: "/images/about/uitm-group.webp", width: 2400, height: 915, alt: "Group photo with classmates at UiTM", position: "50% 40%" },
        { src: "/images/about/uitm-award.webp", width: 1800, height: 2400, alt: "Athirah with the Gold Award for BiteRight", position: "50% 35%" },
      ],
      period: "2023 - 2026",
      org: "Universiti Teknologi MARA (UiTM)",
      role: "Bachelor of Information Technology (Hons.), Machang",
      headline: "A degree in information technology.",
      body: "My degree covered web and mobile development, databases, systems analysis and project management. I put it into practice with projects like RentNGo and Cozy Crumb, then BiteRight, my final-year app that spots allergens on food labels.",
      tags: ["Web & Mobile Development", "Databases", "Systems Analysis", "Project Management"],
    },
    {
      short: "Internship",
      images: [
        { src: "/images/about/intern-manual.webp", width: 1800, height: 2400, alt: "HQ Inventory System user manual on screen", position: "50% 45%" },
        { src: "/images/about/intern-setup.webp", width: 1350, height: 2400, alt: "Laptop, receipt printer and phone set up for POS testing", position: "50% 40%" },
      ],
      period: "Sep 2026 - Now",
      org: "AS Tech Legacy",
      role: "Software Developer Intern, Kuala Terengganu",
      headline: "A software developer internship.",
      body: "I turn client requirements into working features with Node.js, React and Laravel, then test and improve them from client feedback. My main projects are an inventory system with POS integration and a repair tracking system that replaces an older desktop tool.",
      tags: ["Node.js", "React", "Laravel", "Testing & Debugging", "User Guides"],
    },
  ],
  skills: ["Node.js", "React", "Next.js", "Laravel", "PHP", "JavaScript", "Java", "Flutter", "Python", "Flask", "MySQL", "Firestore", "Tailwind CSS", "OpenCV", "scikit-learn"],
};


// `device` says which frame a screenshot goes in. It is only used (and only
// saved) for "both" projects; otherwise the project's platform decides.
export type Shot = { src: string; width: number; height: number; alt: string; device?: Device };

export type Project = {
  slug: string;
  title: string;
  year: string;
  kind: string;
  summary: string;
  tech: string[];
  shots: Shot[]; // screenshots shown on the Work page, the first one largest
  link?: string;
  // How the screenshots are framed: in a browser window, a phone, or each in
  // its own (a website with a mobile app; see `device` on each shot).
  platform: Platform;
};
export type Device = "web" | "mobile";
export type Platform = Device | "both";
export const platforms: Platform[] = ["web", "mobile", "both"];

/** How the platform reads to visitors. */
export const platformName: Record<Platform, string> = { web: "Website", mobile: "Mobile app", both: "Website + mobile app" };

// A shot this much taller than wide reads as a phone screen.
export const isPortrait = (s: { width: number; height: number }) => s.height > s.width * 1.3;

/** Which frame a screenshot is shown in. */
export function deviceOf(shot: Shot, platform: Platform): Device {
  if (platform !== "both") return platform;
  return shot.device ?? (isPortrait(shot) ? "mobile" : "web");
}

/** A project's screenshots for one device, in order. */
export const shotsFor = (p: Pick<Project, "shots" | "platform">, device: Device) => p.shots.filter((s) => deviceOf(s, p.platform) === device);

/** The frame a set of screenshots suggests: phones if most are tall, websites if most are wide, both if mixed. */
export function suggestPlatform(shots: { width: number; height: number }[]): Platform {
  const tall = shots.filter(isPortrait).length;
  if (tall === 0 || shots.length === 0) return "web";
  if (tall === shots.length) return "mobile";
  return "both";
}

// Reads a project from projects.json: fills in the platform for older entries
// (mobile if most shots are portrait), and keeps a shot's frame only when it
// is a real one.
type Stored = Omit<Project, "platform" | "shots"> & { platform?: string; shots: (Omit<Shot, "device"> & { device?: string })[] };
export function normalizeProject(p: Stored): Project {
  const shots: Shot[] = p.shots.map(({ device, ...shot }) => (device === "web" || device === "mobile" ? { ...shot, device } : shot));
  const platform: Platform =
    p.platform === "mobile" || p.platform === "web" || p.platform === "both"
      ? p.platform
      : shots.length > 0 && shots.filter(isPortrait).length * 2 > shots.length
        ? "mobile"
        : "web";
  return { ...p, shots, platform };
}

/** The site's public address: the one set above, else Vercel's, else this computer's. */
export const siteUrl = (
  site.url ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

// Projects are edited through /admin (run `npm run dev`), which saves to projects.json.
export const projects: Project[] = projectData.map(normalizeProject);

// Tiles that pop in and out around the title at the top of the Work page:
// up to 8 landscape-ish screenshots, taken in turn from each project.
export const workTiles: Shot[] = (() => {
  const pools = projects.map((p) => p.shots.filter((s) => s.width >= s.height * 0.9));
  const out: Shot[] = [];
  for (let round = 0; out.length < 8 && pools.some((pool) => pool.length > round); round++) {
    for (const pool of pools) if (pool[round] && out.length < 8) out.push(pool[round]);
  }
  return out;
})();
