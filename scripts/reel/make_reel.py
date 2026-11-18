"""Makes a short, silent, looping promo reel for a project from its screenshots.

The devices float over the site's dark green glow, chosen by the project's
platform: two browser windows for a website, three phones for a mobile app,
and a browser window with a phone in front for both. Each of three 3-second
beats shows new screens that pan gently down the page, then hand over to the
next. Every movement repeats every 9 seconds, so the last frame flows straight
into the first and the loop has no visible jump.

Writes public/videos/<slug>.mp4, <slug>.webm and <slug>-poster.webp, ready for
the `video` field in src/data/projects.json.

Needs Python with Playwright (`pip install playwright`, then
`python -m playwright install chromium`) and ffmpeg on the PATH.

Usage, from the project root:
  python scripts/reel/make_reel.py cozy-crumb
  python scripts/reel/make_reel.py cozy-crumb --shots 0,1,2,10,3,4   # pick screenshots by position
  python scripts/reel/make_reel.py --all                             # every project
"""
import argparse, json, pathlib, shutil, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

FPS, LOOP = 30, 9
here = pathlib.Path(__file__).parent.resolve()
root = here.parent.parent
public = root / "public"
out_dir = public / "videos"


def is_phone(shot, platform):
    """Whether a screenshot goes in a phone (the same rule as deviceOf in src/data/site.ts)."""
    if platform == "mobile":
        return True
    if platform == "web":
        return False
    return shot.get("device") == "mobile" or (shot.get("device") is None and shot["height"] > shot["width"] * 1.3)


def pick_shots(project, indexes):
    """The layout and the screenshots for it: (layout, website URLs, phone URLs)."""
    platform = project.get("platform", "web")
    shots = project["shots"]
    if indexes:
        shots = [shots[i] for i in indexes if 0 <= i < len(shots)]
    url = lambda s: (public / s["src"].lstrip("/")).as_uri()
    web = [url(s) for s in shots if not is_phone(s, platform) and s["width"] >= s["height"] * 1.2][:6]
    phones = [url(s) for s in shots if is_phone(s, platform)][:9]
    layout = "mobile" if platform == "mobile" else "both" if platform == "both" and web and phones else "web"
    return layout, web, phones


def film(slug, layout, web, phones):
    with tempfile.TemporaryDirectory() as tmp:
        frames = pathlib.Path(tmp)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            page.add_init_script(f"window.LAYOUT = {json.dumps(layout)}; window.SHOTS = {json.dumps(web)}; window.PHONES = {json.dumps(phones)};")
            page.goto((here / "stage.html").as_uri())
            page.evaluate("window.ready")
            for i in range(FPS * LOOP):
                page.evaluate(f"render({i / FPS})")
                page.screenshot(path=str(frames / f"f{i:04d}.jpg"), type="jpeg", quality=92)
            browser.close()

        out_dir.mkdir(parents=True, exist_ok=True)
        # The frames are JPEGs, which use the full colour range. Videos must use the
        # standard ("tv") range: some ffmpeg builds keep the full range, and Chrome
        # then refuses to decode the VP9 and Safari shows the H.264 washed out.
        src = ["-framerate", str(FPS), "-i", str(frames / "f%04d.jpg"), "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-color_range", "tv"]
        jobs = [
            (f"{slug}.mp4", ["-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an"]),
            (f"{slug}.webm", ["-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", "-pix_fmt", "yuv420p", "-an"]),
        ]
        for name, codec in jobs:
            # Write to a temporary name first so a stopped render never leaves a short file behind.
            tmp_out = out_dir / f".tmp-{name}"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *src, *codec, str(tmp_out)], check=True)
            tmp_out.replace(out_dir / name)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(frames / "f0000.jpg"), "-q:v", "80", str(out_dir / f"{slug}-poster.webp")], check=True)
    print(f"{slug} ({layout}): public/videos/{slug}.mp4, .webm and -poster.webp")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--shots", help="comma-separated screenshot positions, e.g. 0,1,2,3,4,5")
    args = ap.parse_args()
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg isn't on the PATH. Install it (e.g. `winget install ffmpeg`) and try again.")

    projects = json.loads((root / "src/data/projects.json").read_text(encoding="utf-8"))
    targets = projects if args.all else [p for p in projects if p["slug"] == args.slug]
    if not targets:
        sys.exit("Give a project slug from src/data/projects.json, or --all.")
    indexes = [int(i) for i in args.shots.split(",")] if args.shots else None

    for project in targets:
        layout, web, phones = pick_shots(project, indexes)
        enough = {"web": len(web) >= 2, "mobile": len(phones) >= 1, "both": len(web) >= 1 and len(phones) >= 1}[layout]
        if not enough:
            print(f"{project['slug']}: skipped, it needs at least 2 website screenshots or 1 phone screenshot.")
            continue
        film(project["slug"], layout, web, phones)


if __name__ == "__main__":
    main()
