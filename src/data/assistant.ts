// Mira, the assistant on the Contact page. She welcomes visitors, finds out
// what they need one question at a time, and collects a short project brief
// for you to follow up on.
//
// Everything she says, and every option she offers, is written here. Edit
// freely, but after changing any line in `lines`, run `npm run voice` to record it.

export const assistantName = "Mira";

// Her voice: a blend of Kokoro voices, and how fast she talks. The blend keeps
// af_heart's clear, bright sound and borrows af_sarah's lively ups and downs;
// a little extra speed makes her sound upbeat. Weights should add up to 1.
// Other female voices: af_bella, af_nicole, af_sky, af_nova, af_aoede, af_kore
// (American), bf_emma, bf_isabella (British). Run `npm run voice` after changing.
export const voice = {
  mix: [["af_heart", 0.6], ["af_sarah", 0.4]] as [string, number][],
  speed: 1.12,
};

// How soon you promise to reply. Mira says this at the end, so keep it true.
export const replyTime = "within one to two working days";

// ---------- The conversation ----------
export type Step = "greeting" | "service" | "project_type" | "stage" | "timeline" | "budget" | "details" | "contact" | "summary" | "done";
export type Mood = "happy" | "excited" | "curious" | "thinking" | "calm";
export type Input = "options" | "text" | "email_or_phone";

// What Mira collects. null = not answered yet. `details` is "" when skipped.
export type Brief = {
  service: string | null;
  project_type: string | null;
  stage: string | null;
  timeline: string | null;
  budget: string | null;
  details: string | null;
  name: string | null;
  contact: string | null;
};
export const emptyBrief: Brief = { service: null, project_type: null, stage: null, timeline: null, budget: null, details: null, name: null, contact: null };

export const steps: Step[] = ["greeting", "service", "project_type", "stage", "timeline", "budget", "details", "contact", "summary", "done"];

export const START = "Start a project";
export const greetingOptions = [START, "See services", "Just browsing"];
export const services = ["Website", "Web app / system", "Mobile app", "UI/UX design", "Something else"];

// The follow-up question for each service. "Something else" has none.
export const projectTypes: Record<string, string[]> = {
  "Website": ["Portfolio", "Business site", "Online store", "Landing page"],
  "Web app / system": ["Booking system", "Inventory / POS", "Management system", "Custom idea"],
  "Mobile app": ["Business app", "Booking app", "Shopping app", "Custom idea"],
  "UI/UX design": ["Website design", "App design", "Redesign", "Not sure yet"],
};

export const stages = ["Just an idea", "Have a design", "Have an existing site", "Need fixes/updates"];
export const timelines = ["ASAP", "Within 1 month", "1 to 3 months", "Flexible"];

// Budget ranges depend on the service. These are typical prices for a solo
// freelancer in Malaysia; change them to your own rates. "Not sure yet" is
// added to the end of each list.
const budgetRanges: Record<string, string[]> = {
  "Website": ["Under RM1,000", "RM1,000 to RM2,500", "RM2,500 to RM5,000", "Above RM5,000"],
  "Web app / system": ["Under RM1,500", "RM1,500 to RM4,000", "RM4,000 to RM8,000", "Above RM8,000"],
  "Mobile app": ["Under RM3,000", "RM3,000 to RM6,000", "RM6,000 to RM12,000", "Above RM12,000"],
  "UI/UX design": ["Under RM500", "RM500 to RM1,500", "RM1,500 to RM3,000", "Above RM3,000"],
  "Something else": ["Under RM1,000", "RM1,000 to RM3,000", "RM3,000 to RM6,000", "Above RM6,000"],
};
export const UNSURE = "Not sure yet";
export const budgetsFor = (service: string | null) => [...(budgetRanges[service ?? ""] ?? budgetRanges["Something else"]), UNSURE];

export const CONFIRM = "Yes, send it";
export const CHANGE = "Change something";

/** The choices shown at a step. Empty when the step is typed. */
export function optionsFor(step: Step, brief: Brief): string[] {
  switch (step) {
    case "greeting": return greetingOptions;
    case "service": return services;
    case "project_type": return projectTypes[brief.service ?? ""] ?? [];
    case "stage": return stages;
    case "timeline": return timelines;
    case "budget": return budgetsFor(brief.service);
    case "summary": return [CONFIRM, CHANGE];
    default: return [];
  }
}

export const inputFor = (step: Step): Input => (step === "details" ? "text" : step === "contact" ? "email_or_phone" : "options");

/** The first question that still needs an answer. */
export function nextStep(brief: Brief): Step {
  if (!brief.service) return "service";
  if (!brief.project_type && projectTypes[brief.service]) return "project_type";
  if (!brief.stage) return "stage";
  if (!brief.timeline) return "timeline";
  if (!brief.budget) return "budget";
  if (brief.details === null) return "details";
  if (!brief.name || !brief.contact) return "contact";
  return "summary";
}

/** Which answer a step fills in. */
export const fieldFor: Partial<Record<Step, keyof Brief>> = {
  service: "service",
  project_type: "project_type",
  stage: "stage",
  timeline: "timeline",
  budget: "budget",
  details: "details",
};

/** Saves an answer. Changing the service clears the answers that depended on it. */
export function withAnswer(brief: Brief, field: keyof Brief, value: string): Brief {
  const next = { ...brief, [field]: value };
  if (field === "service" && value !== brief.service) {
    next.project_type = null;
    next.budget = null;
  }
  return next;
}

/** The question before this one (where the Back button leads), or null when there is none. */
export function previousStep(step: Step, brief: Brief): Step | null {
  switch (step) {
    case "service": return "greeting";
    case "project_type": return "service";
    case "stage": return brief.project_type ? "project_type" : "service"; // "Something else" has no type question
    case "timeline": return "stage";
    case "budget": return "timeline";
    case "details": return "budget";
    case "contact": return "details";
    case "summary": return "contact";
    default: return null;
  }
}

/** Forgets the answer a step collects, and the answers that depend on it, so they are asked again. */
export function withoutAnswer(brief: Brief, step: Step): Brief {
  if (step === "service") return { ...brief, service: null, project_type: null, budget: null };
  if (step === "contact") return { ...brief, name: null, contact: null };
  const field = fieldFor[step];
  return field ? { ...brief, [field]: null } : brief;
}

// ---------- Mira's written lines ----------
// Used whenever AI isn't available, and for the moments that are always the
// same. Every line here is recorded in her voice by `npm run voice`.
export const lines = {
  greeting: "Hi there, I'm Mira! So glad you stopped by. What brings you here today?",
  greetingBack: "Hey, you're back! It's me, Mira. I was hoping you'd come say hi again. What can I help with today?",
  seeServices: "We build websites, web systems and mobile apps, and make sure they look and feel lovely too. Want to start dreaming up yours?",
  browsing: "Of course! Wander around as long as you like. If an idea sparks, just give me a shout. I'll be right here!",
  letsStart: "Yay, this is my favourite part! Let's get started.",

  // The question for each step.
  ask: {
    service: "First things first, what can I help you build?",
    stage: "So, where's the project at right now?",
    timeline: "And when are you hoping to have it ready?",
    budget: "Now the money question, I promise I'll be gentle! Roughly what budget do you have in mind? A ballpark is totally fine.",
    details: "Tell me a little about your idea! A sentence or two is plenty, and you can skip this if you like.",
    // Asked instead when the visitor has looked at your projects.
    detailsSeenWork: "Tell me a little about your idea! I saw you peeking at the past projects. If one is close to what you want, tell me which one.",
    contact: "Almost there! What's your name, and where's the best place to reach you?",
    summary: "Ta-da! Here's everything I've got. Does it all look right?",
    change: "Of course! Which bit should we tweak?",
    // The first question again, after going back to it.
    greeting: "Okay, fresh start! What brings you here today?",
  },
  askType: {
    "Website": "What kind of website are you picturing?",
    "Web app / system": "What kind of system are you dreaming up?",
    "Mobile app": "What kind of app are we making?",
    "UI/UX design": "What would you like us to design?",
  } as Record<string, string>,

  // Her reaction to an answer, said before the next question.
  reactService: {
    "Website": "Ooh, a website! Love it.",
    "Web app / system": "A web system? Ooh, those are some of my favourites to build!",
    "Mobile app": "A mobile app! Your idea in everyone's pocket, how exciting.",
    "UI/UX design": "Design work, yay! Making things look good is my happy place.",
    "Something else": "Ooh, a mystery project! Now I'm really curious.",
  } as Record<string, string>,
  reactType: [
    "Great choice!",
    "Oh, I like that one!",
    "Ooh, good pick!",
    "Nice, I can already picture it!",
    "Love that!",
  ],
  reactStage: {
    "Just an idea": "Every great project starts as an idea, so you're right on track!",
    "Have a design": "A design already? Look at you, ahead of the game!",
    "Have an existing site": "Ooh, something to build on. I love a good glow-up!",
    "Need fixes/updates": "Got it! Let's give it some tender loving care.",
  } as Record<string, string>,
  reactTimeline: "Noted! That really helps us plan.",
  reactBudget: "Perfect, that gives us a great starting point.",
  reactBudgetUnsure: "Totally fine! Lots of people figure that out along the way.",
  reactDetails: "Ooh, I love that! Thanks for sharing.",
  reactSkip: "No worries at all, we can chat about it later.",
  reactContact: "Thank you, lovely to meet you!",

  // Pressing Back, or changing an earlier answer, gets a playful remark before
  // the question is asked again. She alternates between the remark written for
  // that question (`backTo`) and these general ones, taken in turn.
  back: [
    "Ooh, a plot twist! Let's rewind.",
    "Going backwards? Watch me moonwalk.",
    "Don't worry, I pretended not to see that.",
    "Second thoughts are my favourite kind of thoughts.",
    "Rewinding! Beep, beep, beep.",
    "Back we go. I won't tell anyone.",
    "Undo, undo! No harm done.",
    "Changed your mind? That's what I'm here for.",
  ],
  backTo: {
    greeting: "All the way back to the start? Okay, take two!",
    service: "A whole new plan? Ooh, I do love a bit of drama.",
    project_type: "Picking again? Choosing is the fun part anyway.",
    stage: "Wait, did the project just time travel?",
    timeline: "Checking the calendar again? Smart move.",
    budget: "Counting the piggy bank again? Take your time, I'll wait.",
    details: "More to say? I'm all ears. Well, all orb.",
    contact: "A typo in your own name? Happens to the best of us.",
  } as Record<string, string>,
  // When a typed message can't be understood without AI.
  pickOne: "Oops, I didn't quite catch that! Could you pick one of these for me?",

  // Things she notices.
  idle: [
    "Still there? Take your time, I'm right here.",
    "No rush at all! I'll just be here, glowing quietly.",
    "Thinking it over? The best ideas take a moment.",
  ],
  leaving: "Off so soon? Leave your contact before you go, and we'll pick it up from there!",
  // Said when someone clicks or taps the orb.
  pokes: [
    "Hehe, that tickles!",
    "Oh, hi! You found me.",
    "Boop! Ready when you are.",
    "Careful, I'm ticklish!",
    "Hehe, again? Okay, one more.",
  ],

  // The ending. On screen the first two include the visitor's name.
  sending: "Sending it over now…",
  sent: `Thank you so much! Your project details are on their way, and you'll hear back ${replyTime}. I can't wait to see what we build together!`,
  drafted: "All set! Your email app should pop open with everything filled in, so just hit send.",
  failed: "Oh no, that one didn't go through! Want to try again, or send an email instead?",
};

/** Every written line, for recording. */
export const recordedLines: string[] = Object.values(lines).flatMap((entry) =>
  typeof entry === "string" ? [entry] : Array.isArray(entry) ? entry : Object.values(entry),
);