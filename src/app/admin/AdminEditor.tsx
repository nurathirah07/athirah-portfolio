"use client";
/* eslint-disable @next/next/no-img-element -- previews of local, just-picked files */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deviceOf, isPortrait, suggestPlatform, type Device, type Platform, type Project, type Shot } from "@/data/site";
import { activity, type Activity, type ActivityEvent, type Task } from "@/lib/admin/activityMachine";
import { useMachine } from "@/lib/useMachine";
import { deleteProject, moveProject, saveProject, type FormState } from "./actions";

const NEW = "__new__";
const blank: Project = { slug: "", title: "", year: String(new Date().getFullYear()), kind: "", summary: "", tech: [], shots: [], platform: "web" };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const input =
  "mt-2 w-full rounded-xl border border-cream/15 bg-ink/50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-cream/30 focus:border-gold aria-invalid:border-flame";

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-accent text-[11px] text-cream/60">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-flame">{error}</span> : hint && <span className="mt-1.5 block text-xs text-cream/45">{hint}</span>}
    </label>
  );
}

const WORKING: Record<Exclude<Task, "saving">, string> = { moving: "Saving the new order…", deleting: "Deleting…" };

export default function AdminEditor({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(projects[0]?.slug ?? NEW);
  // Saving, reordering and deleting: one at a time (see lib/admin/activityMachine.ts).
  const [now, admin] = useMachine<Activity, ActivityEvent>({ name: "idle", notice: null }, activity);
  const task = now.name === "busy" ? now.task : null;
  const busy = task !== null;
  const notice = now.name === "idle" ? now.notice : null;
  const [, startTransition] = useTransition();

  const project = projects.find((p) => p.slug === selected);
  const editing = selected === NEW ? blank : project;

  // Choosing another project hides the last notice, which was about this one.
  const choose = (slug: string) => {
    admin.send({ type: "CLEAR" });
    setSelected(slug);
  };

  // Runs one change to the project list, unless another is still running.
  // A save's problems show beside its fields (errorsInline) rather than at the top.
  const run = (next: Task, work: () => Promise<FormState>, after?: (r: FormState) => void, { errorsInline = false } = {}) => {
    if (!admin.send({ type: "START", task: next })) return;
    startTransition(async () => {
      let result: FormState;
      try {
        result = await work();
      } catch {
        // Usually an expired session: the action refuses to run.
        result = { error: "That didn't go through. You may have been signed out: reload the page and try again." };
      }
      const text = result.error && errorsInline ? undefined : (result.error ?? result.message);
      admin.send({ type: "FINISH", notice: text ? { tone: result.error ? "error" : "done", text } : null });
      after?.(result);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]" data-phase={now.name} data-task={task ?? undefined}>
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <h1 className="font-display text-3xl">Projects</h1>
        <p className="mt-2 text-xs text-cream/50">The order here is the order on the Work page.</p>

        <button
          type="button"
          onClick={() => choose(NEW)}
          disabled={busy}
          className={`mt-6 w-full rounded-2xl border border-dashed px-4 py-3 text-left font-accent text-xs transition-colors disabled:opacity-50 ${selected === NEW ? "border-gold text-gold" : "border-cream/25 text-cream/70 hover:border-gold hover:text-gold"}`}
        >
          + New project
        </button>

        <ol className="mt-3 space-y-2">
          {projects.map((p, i) => (
            <li key={p.slug} className={`group flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors ${p.slug === selected ? "border-gold/60 bg-gold/10" : "border-cream/10 hover:border-cream/30"}`}>
              <button type="button" onClick={() => choose(p.slug)} disabled={busy} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {p.shots[0] ? (
                  <img src={p.shots[0].src} alt="" className="h-9 w-12 shrink-0 rounded-md object-cover object-top" />
                ) : (
                  <span className="grid h-9 w-12 shrink-0 place-items-center rounded-md bg-spruce/30 font-accent text-[9px] text-cream/50">No img</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.title}</span>
                  <span className="block font-accent text-[10px] text-cream/45">{p.year} · {p.kind}</span>
                </span>
              </button>
              <span className="flex flex-col">
                <button type="button" aria-label={`Move ${p.title} up`} disabled={i === 0 || busy} onClick={() => run("moving", () => moveProject(p.slug, -1))} className="px-1 text-xs text-cream/50 hover:text-gold disabled:opacity-20">▲</button>
                <button type="button" aria-label={`Move ${p.title} down`} disabled={i === projects.length - 1 || busy} onClick={() => run("moving", () => moveProject(p.slug, 1))} className="px-1 text-xs text-cream/50 hover:text-gold disabled:opacity-20">▼</button>
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <section className="glass rounded-3xl p-6 md:p-8">
        {task && task !== "saving" && (
          <p role="status" className="mb-6 rounded-xl border border-cream/15 px-4 py-3 text-sm text-cream/70">
            {WORKING[task]}
          </p>
        )}
        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-flame/40 bg-flame/10 text-flame" : "border-gold/30 bg-gold/10 text-gold"}`}
          >
            {notice.text}
          </p>
        )}
        {editing ? (
          <ProjectForm
            key={selected}
            project={editing}
            isNew={selected === NEW}
            task={task}
            onSave={(form, done) =>
              run(
                "saving",
                () => saveProject({}, form),
                (r) => {
                  done(r);
                  if (r.ok && r.slug) setSelected(r.slug);
                },
                { errorsInline: true },
              )
            }
            onDelete={() => {
              if (!project || busy || !window.confirm(`Delete "${project.title}"? This can't be undone.`)) return;
              run("deleting", () => deleteProject(project.slug), (r) => {
                if (r.ok) setSelected(projects.find((p) => p.slug !== project.slug)?.slug ?? NEW);
              });
            }}
          />
        ) : (
          <p className="text-cream/60">Choose a project on the left.</p>
        )}
      </section>
    </div>
  );
}

function ProjectForm({
  project,
  isNew,
  task,
  onSave,
  onDelete,
}: {
  project: Project;
  isNew: boolean;
  /** What the editor is busy with, if anything: every button waits for it. */
  task: Task | null;
  /** Saves the form; `done` receives the result (field errors, or success). */
  onSave: (form: FormData, done: (r: FormState) => void) => void;
  onDelete: () => void;
}) {
  const [state, setState] = useState<FormState>({}); // the last save's result
  const [title, setTitle] = useState(project.title);
  const [slug, setSlug] = useState(project.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [shots, setShots] = useState<Shot[]>(project.shots);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [platform, setPlatform] = useState<Platform>(project.platform);
  const [platformTouched, setPlatformTouched] = useState(!isNew);
  // Sizes of new images, read from their previews once loaded.
  const [newDims, setNewDims] = useState<Record<string, { width: number; height: number }>>({});
  // For "both": the frame chosen for each new image, by preview URL. Until one
  // is chosen, the image's shape decides.
  const [newDevices, setNewDevices] = useState<Record<string, Device>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const err = state.fields ?? {};

  // Every image whose size is known: saved shots, plus new files once previewed.
  const sized = [...shots, ...previews.flatMap((u) => (newDims[u] ? [newDims[u]] : []))];
  const portrait = sized.filter(isPortrait).length;
  // Images whose shape doesn't suit a single-frame choice (none for "both": each picks its own).
  const mismatched = platform === "mobile" ? sized.length - portrait : platform === "web" ? portrait : 0;
  const onPreviewLoad = (url: string, img: HTMLImageElement) => {
    const dims = { width: img.naturalWidth, height: img.naturalHeight };
    setNewDims((d) => ({ ...d, [url]: dims }));
    // Until a choice is made, suggest the frame from the images themselves:
    // all tall = mobile, all wide = website, a mix = both.
    if (!platformTouched) setPlatform(suggestPlatform([...sized, dims]));
  };
  // Which frame an image goes in (for "both", its own; otherwise the project's).
  const savedDevice = (shot: Shot) => deviceOf(shot, platform);
  const newDevice = (url: string): Device =>
    platform !== "both" ? platform : (newDevices[url] ?? (newDims[url] && isPortrait(newDims[url]) ? "mobile" : "web"));
  const thumbFor = (device: Device) => (device === "mobile" ? "aspect-[3/4] object-contain bg-ink/70" : "aspect-video object-cover object-top");
  // For "both", how many images each frame has, and the first of each (shown first on the site).
  const devices = [...shots.map(savedDevice), ...previews.map(newDevice)];
  const counts = { web: devices.filter((d) => d === "web").length, mobile: devices.filter((d) => d === "mobile").length };
  const firstOf = (device: Device) => devices.indexOf(device);
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    // Copy now: the browser empties the list once the picker is reset.
    const picked = Array.from(list).filter((x) => x.type.startsWith("image/"));
    setFiles((f) => [...f, ...picked]);
  };
  const move = <T,>(arr: T[], i: number, d: number) => {
    const next = [...arr];
    const j = i + d;
    if (j < 0 || j >= next.length) return arr;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  return (
    <form
      // A submit handler (not the action prop) so React doesn't clear the
      // fields when a save fails validation.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.delete("files");
        files.forEach((f) => fd.append("files", f));
        fd.set("shots", JSON.stringify(shots.map((shot) => ({ src: shot.src, alt: shot.alt, device: savedDevice(shot) }))));
        fd.set("fileDevices", JSON.stringify(previews.map(newDevice)));
        onSave(fd, setState);
      }}
      className="space-y-6"
    >
      <input type="hidden" name="originalSlug" value={isNew ? "" : project.slug} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl md:text-3xl">{isNew ? "New project" : project.title}</h2>
        {!isNew && (
          <button type="button" onClick={onDelete} disabled={task !== null} className="rounded-full border border-flame/40 px-4 py-2 font-accent text-[11px] text-flame transition-colors hover:bg-flame hover:text-ink disabled:opacity-50">
            {task === "deleting" ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title" error={err.title}>
          <input
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
            maxLength={80}
            aria-invalid={!!err.title}
            className={input}
            placeholder="e.g. HQ Inventory System"
          />
        </Field>
        <Field label="Short name for the link" hint="Lowercase and dashes, e.g. hq-inventory" error={err.slug}>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            required
            aria-invalid={!!err.slug}
            className={input}
          />
        </Field>
        <Field label="Type" hint="e.g. Internship, Academic Project, Freelance" error={err.kind}>
          <input name="kind" defaultValue={project.kind} required aria-invalid={!!err.kind} className={input} />
        </Field>
        <Field label="Year" error={err.year}>
          <input name="year" defaultValue={project.year} required inputMode="numeric" maxLength={4} aria-invalid={!!err.year} className={input} />
        </Field>
      </div>

      <Field label="Description" hint="One or two sentences. Shown on the project card." error={err.summary}>
        <textarea name="summary" defaultValue={project.summary} required rows={3} maxLength={400} aria-invalid={!!err.summary} className={`${input} resize-y`} />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Tools used" hint="Separate with commas, e.g. React, Laravel, MySQL" error={err.tech}>
          <input name="tech" defaultValue={project.tech.join(", ")} required aria-invalid={!!err.tech} className={input} />
        </Field>
        <Field label="Live link (optional)" hint="Full address, e.g. https://example.com" error={err.link}>
          <input name="link" type="url" defaultValue={project.link ?? ""} aria-invalid={!!err.link} className={input} />
        </Field>
      </div>

      <fieldset>
        <legend className="font-accent text-[11px] text-cream/60">Shown as</legend>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          {(
            [
              ["web", "Website", "Screenshots sit in a browser window. Best for wide, landscape screens."],
              ["mobile", "Mobile app", "Screenshots sit in a phone frame. Best for tall, portrait screens."],
              ["both", "Website + mobile", "Each image picks its own frame, so a website and its app show side by side."],
            ] as const
          ).map(([value, name, about]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-gold ${platform === value ? "border-gold bg-gold/10" : "border-cream/15 hover:border-cream/35"}`}
            >
              <input
                type="radio"
                name="platform"
                value={value}
                checked={platform === value}
                onChange={() => {
                  setPlatform(value);
                  setPlatformTouched(true);
                }}
                className="sr-only"
              />
              <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center">
                {value === "web" ? (
                  <BrowserIcon />
                ) : value === "mobile" ? (
                  <PhoneIcon />
                ) : (
                  <span className="relative h-12 w-12">
                    <span className="absolute left-0 top-1"><BrowserIcon small /></span>
                    <span className="absolute bottom-0 right-0 rounded-md bg-ink"><PhoneIcon small /></span>
                  </span>
                )}
              </span>
              <span>
                <span className="block text-sm font-medium">{name}</span>
                <span className="mt-0.5 block text-xs text-cream/50">{about}</span>
              </span>
            </label>
          ))}
        </div>
        {err.platform ? (
          <p className="mt-1.5 text-xs text-flame">{err.platform}</p>
        ) : (
          mismatched > 0 && (
            <p className="mt-2 text-xs text-gold">
              {mismatched} of {sized.length} images {mismatched === 1 ? "is" : "are"} {platform === "mobile" ? "wide" : "tall"}, so{" "}
              {platform === "mobile" ? "the phone frame will crop them" : "they may suit the phone frame better"}. Or choose Website + mobile to frame each one on its own.
            </p>
          )
        )}
        {platform === "both" && devices.length > 0 && (
          <p className="mt-2 text-xs text-cream/60">
            {counts.web} in a browser window, {counts.mobile} in a phone.
            {(counts.web === 0 || counts.mobile === 0) && devices.length > 1 && <span className="text-gold"> Mark at least one image as each, or pick just one frame above.</span>}
          </p>
        )}
      </fieldset>

      <div>
        <p className="font-accent text-[11px] text-cream/60">Images</p>
        <p className="mt-1 text-xs text-cream/45">
          {platform === "mobile"
            ? "The first three are shown in phones, the first one in front. Phone screenshots look best around 9:19 (e.g. 1080 × 2340)."
            : platform === "both"
              ? "Set each image to Website or Mobile. The first of each is the main one: the website sits behind, with the phone in front. Wide screenshots look best around 16:9, phone ones around 9:19."
              : "The first image is shown largest. Wide screenshots around 16:9 (e.g. 1600 × 900) look best."}{" "}
          Use the arrows to reorder. Up to 12 images, 8 MB each.
        </p>

        {(shots.length > 0 || files.length > 0) && (
          <ul className={`mt-4 grid gap-3 ${platform === "mobile" ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5" : platform === "both" ? "grid-cols-2 items-start sm:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
            {shots.map((s, i) => (
              <li key={s.src} className="flex flex-col rounded-2xl border border-cream/10 bg-ink/40 p-2">
                <div className="relative">
                  <img src={s.src} alt="" className={`w-full rounded-xl ${thumbFor(savedDevice(s))}`} />
                  {(platform === "both" ? firstOf(savedDevice(s)) === i : i === 0) && (
                    <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 font-accent text-[9px] text-ink">
                      Main{platform === "both" && (savedDevice(s) === "web" ? " website" : " phone")}
                    </span>
                  )}
                </div>
                {platform === "both" && (
                  <DeviceToggle value={savedDevice(s)} onChange={(device) => setShots((all) => all.map((x, k) => (k === i ? { ...x, device } : x)))} />
                )}
                <input
                  aria-label="Image description"
                  value={s.alt}
                  onChange={(e) => setShots((all) => all.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))}
                  className="mt-2 w-full rounded-lg border border-cream/10 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-gold"
                  placeholder="Describe the image"
                />
                <div className="mt-auto flex items-center justify-between pt-2 text-xs">
                  <span className="flex gap-1">
                    <button type="button" aria-label="Move image earlier" onClick={() => setShots((a) => move(a, i, -1))} disabled={i === 0} className="rounded px-2 py-1 hover:text-gold disabled:opacity-20">←</button>
                    <button type="button" aria-label="Move image later" onClick={() => setShots((a) => move(a, i, 1))} disabled={i === shots.length - 1} className="rounded px-2 py-1 hover:text-gold disabled:opacity-20">→</button>
                  </span>
                  <button type="button" onClick={() => setShots((a) => a.filter((_, k) => k !== i))} className="font-accent text-[10px] text-cream/50 hover:text-flame">Remove</button>
                </div>
              </li>
            ))}
            {files.map((f, i) => (
              <li key={previews[i]} className="flex flex-col rounded-2xl border border-gold/30 bg-gold/5 p-2">
                <div className="relative">
                  <img src={previews[i]} alt="" onLoad={(e) => onPreviewLoad(previews[i], e.currentTarget)} className={`w-full rounded-xl ${thumbFor(newDevice(previews[i]))}`} />
                  {platform === "both" && firstOf(newDevice(previews[i])) === shots.length + i && (
                    <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 font-accent text-[9px] text-ink">Main {newDevice(previews[i]) === "web" ? "website" : "phone"}</span>
                  )}
                </div>
                {platform === "both" && (
                  <DeviceToggle value={newDevice(previews[i])} onChange={(device) => setNewDevices((d) => ({ ...d, [previews[i]]: device }))} />
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs">
                  <span className="truncate text-cream/60">New · {f.name}</span>
                  <button type="button" onClick={() => setFiles((a) => a.filter((_, k) => k !== i))} className="shrink-0 font-accent text-[10px] text-cream/50 hover:text-flame">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`mt-4 rounded-2xl border border-dashed p-6 text-center transition-colors ${dragging ? "border-gold bg-gold/10" : "border-cream/25"}`}
        >
          <p className="text-sm text-cream/70">Drag images here, or</p>
          <button type="button" onClick={() => fileInput.current?.click()} className="mt-2 rounded-full border border-cream/25 px-4 py-2 font-accent text-[11px] hover:border-gold hover:text-gold">
            Choose files
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {err.files && <p className="mt-3 text-xs text-flame">{err.files}</p>}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-accent text-[11px] text-cream/60">Story (optional)</legend>
        <p className="text-xs text-cream/45">Three short lines for the project page, facts only. Fill in all three or none.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["storyProblem", "The problem", "What wasn't working, and for whom", project.story?.problem],
              ["storyBuilt", "What I built", "The thing itself, in one line", project.story?.built],
              ["storyOutcome", "What happened", "It went live, who uses it, what's next", project.story?.outcome],
            ] as const
          ).map(([name, label, placeholder, value]) => (
            <Field key={name} label={label}>
              <textarea name={name} defaultValue={value ?? ""} rows={3} maxLength={300} placeholder={placeholder} className={`${input} resize-y`} />
            </Field>
          ))}
        </div>
        {err.story && <p className="text-xs text-flame">{err.story}</p>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-accent text-[11px] text-cream/60">Video (optional)</legend>
        <p className="text-xs text-cream/45">
          A short silent loop, shown wherever the project appears large. Make one from the screenshots with{" "}
          <code className="text-cream/70">python scripts/reel/make_reel.py {project.slug || "your-project"}</code>, or upload your own: MP4 (and optionally WebM), 8 MB each, plus a poster image of the first frame.
        </p>
        {project.video && (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-cream/10 bg-ink/40 p-3">
            <img src={project.video.poster} alt="" className="h-16 w-28 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-xs text-cream/60">{project.video.mp4}</span>
            <label className="flex items-center gap-2 text-xs text-cream/70">
              <input type="checkbox" name="removeVideo" className="accent-flame" /> Remove video
            </label>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={project.video ? "Replace MP4" : "MP4"}>
            <input type="file" name="videoMp4" accept="video/mp4" className="block w-full text-xs text-cream/70 file:mr-3 file:rounded-full file:border-0 file:bg-cream/10 file:px-3 file:py-1.5 file:text-cream" />
          </Field>
          <Field label="WebM (optional)">
            <input type="file" name="videoWebm" accept="video/webm" className="block w-full text-xs text-cream/70 file:mr-3 file:rounded-full file:border-0 file:bg-cream/10 file:px-3 file:py-1.5 file:text-cream" />
          </Field>
          <Field label={project.video ? "Replace poster" : "Poster"}>
            <input type="file" name="videoPoster" accept="image/png,image/jpeg,image/webp" className="block w-full text-xs text-cream/70 file:mr-3 file:rounded-full file:border-0 file:bg-cream/10 file:px-3 file:py-1.5 file:text-cream" />
          </Field>
        </div>
        {err.video && <p className="text-xs text-flame">{err.video}</p>}
      </fieldset>

      {state.error && !state.ok && <p role="alert" className="text-sm text-flame">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-4 border-t border-cream/10 pt-6">
        <button type="submit" disabled={task !== null} className="roll-plain btn-gloss rounded-full px-7 py-3 font-accent text-sm disabled:opacity-60">
          {task === "saving" ? "Saving…" : isNew ? "Add project" : "Save changes"}
        </button>
        <span className="text-xs text-cream/45">Saves to src/data/projects.json. Rebuild the site to publish.</span>
      </div>
    </form>
  );
}

// Website / Mobile switch shown on each image of a "both" project.
function DeviceToggle({ value, onChange }: { value: Device; onChange: (device: Device) => void }) {
  return (
    <div role="radiogroup" aria-label="Frame for this image" className="mt-2 grid grid-cols-2 gap-1 rounded-full border border-cream/15 p-0.5 font-accent text-[9px]">
      {(["web", "mobile"] as const).map((device) => (
        <button
          key={device}
          type="button"
          role="radio"
          aria-checked={value === device}
          onClick={() => onChange(device)}
          className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 transition-colors ${value === device ? "bg-gold text-ink" : "text-cream/60 hover:text-gold"}`}
        >
          {device === "web" ? <BrowserIcon tiny /> : <PhoneIcon tiny />}
          {device === "web" ? "Website" : "Mobile"}
        </button>
      ))}
    </div>
  );
}

function BrowserIcon({ small = false, tiny = false }: { small?: boolean; tiny?: boolean }) {
  const size = tiny ? "h-2 w-3 rounded-[2px]" : small ? "h-6 w-9 rounded" : "h-8 w-12 rounded-md";
  return (
    <span aria-hidden className={`flex flex-col overflow-hidden border border-current ${size}`}>
      <span className={`${tiny ? "h-0.5" : "h-1.5"} border-b border-current`} />
    </span>
  );
}

function PhoneIcon({ small = false, tiny = false }: { small?: boolean; tiny?: boolean }) {
  const size = tiny ? "h-3 w-1.5 rounded-[2px]" : small ? "h-7 w-4 rounded" : "h-12 w-6.5 rounded-md";
  return (
    <span aria-hidden className={`relative block border border-current ${size}`}>
      {!tiny && <span className="absolute left-1/2 top-0.5 h-0.5 w-1.5 -translate-x-1/2 rounded-b-full bg-current" />}
    </span>
  );
}
