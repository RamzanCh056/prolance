import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  isJumbledOrIncomplete,
  JUMBLED_JOB_MESSAGE,
  JOB_DESCRIPTION_TOO_LONG,
  MAX_JOB_DESCRIPTION_CHARS,
} from "@/lib/job-brief";

const LENGTH_MODES = ["Short", "Standard", "Detailed"] as const;
type LengthMode = (typeof LENGTH_MODES)[number];

const LENGTH_GUIDE: Record<LengthMode, { min: number; max: number; label: string }> = {
  Short: { min: 100, max: 150, label: "100–150 words" },
  Standard: { min: 130, max: 190, label: "130–190 words" },
  Detailed: { min: 170, max: 230, label: "170–230 words" },
};
const ABSOLUTE_MAX_WORDS = 230;

function normalizeParagraphSpacing(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  const signOffRe = /^(best\s+regards|regards|thanks|thank\s+you|sincerely|cheers|warmly),?$/i;
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (prev && signOffRe.test(prev)) {
      out[out.length - 1] = `${prev}\n${line}`;
    } else {
      out.push(line);
    }
  }
  return out.join("\n\n");
}

const CLIENT_TYPES = ["Agency", "Startup", "Small Client", "Corporate", "General"] as const;
type ClientType = (typeof CLIENT_TYPES)[number];

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  skills: string[];
  link?: string | null;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s+#./-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function detectClientType(text: string): { type: ClientType; reason: string } {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has("agency", "agencies", "team of", "multiple projects", "ongoing work", "white label", "white-label"))
    return { type: "Agency", reason: "Mentions agency, team or recurring projects" };
  if (has("enterprise", "corporation", "corporate", "fortune", "compliance", "procurement", "stakeholders"))
    return { type: "Corporate", reason: "Mentions enterprise / structured process" };
  if (has("startup", "mvp", "early stage", "seed", "founder", "launch fast", "ship fast", "pre-launch"))
    return { type: "Startup", reason: "Mentions startup / MVP / fast launch" };
  if (has("small business", "simple", "quick", "one-off", "small project", "solo", "personal"))
    return { type: "Small Client", reason: "Mentions small business or simple scope" };
  return { type: "General", reason: "No strong signals — neutral professional tone" };
}

function toneGuidance(client: ClientType): string {
  switch (client) {
    case "Agency":
      return "Tone: collaborative, scalable, dependable. Emphasize clean handoffs, consistency, and ability to plug into their team or workflow.";
    case "Startup":
      return "Tone: energetic, fast, pragmatic. Emphasize speed, MVP shipping, iteration, and momentum.";
    case "Small Client":
      return "Tone: warm, simple, direct. Avoid jargon. Emphasize easy results and a smooth experience.";
    case "Corporate":
      return "Tone: confident, structured, professional. Emphasize process, reliability, and risk reduction.";
    default:
      return "Tone: confident, warm, professional. Match the client's apparent style.";
  }
}

function matchPortfolio(jobText: string, portfolio: PortfolioItem[], topN = 2): PortfolioItem[] {
  if (!portfolio.length) return [];
  const jobTokens = tokenize(jobText);
  const jobDomains = new Set(detectDomains(jobText).map((d) => d.name));
  const scored = portfolio.map((p) => {
    let score = 0;
    for (const skill of p.skills ?? []) {
      const skillLower = skill.toLowerCase();
      if (jobTokens.has(skillLower)) score += 3;
      for (const part of skillLower.split(/\s+|\//)) {
        if (part.length > 2 && jobTokens.has(part)) score += 2;
      }
    }
    const descTokens = tokenize(`${p.title} ${p.description}`);
    for (const t of descTokens) if (jobTokens.has(t)) score += 1;
    // Domain-aware boost: portfolio item describing same domain as the job gets a lift
    const itemDomains = detectDomains(`${p.title} ${p.description} ${(p.skills ?? []).join(" ")}`);
    for (const d of itemDomains) {
      if (jobDomains.has(d.name)) score += 4;
    }
    return { p, score };
  });
  const MIN_SCORE = 5; // tighter threshold — no loose 1-token matches
  const ranked = scored
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return [];
  // If the top item dominates by a wide margin, only return it
  if (ranked.length === 1 || ranked[0].score >= ranked[1].score * 2) {
    return [ranked[0].p];
  }
  return ranked.slice(0, topN).map((s) => s.p);
}

function enforceWordCap(text: string, cap = ABSOLUTE_MAX_WORDS): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= cap) return text.trim();
  return words.slice(0, cap).join(" ").replace(/[,;:]?\s*$/, "") + "…";
}

// Known tools/software freelancers commonly use — detected verbatim from job description
// Map of canonical name -> regex aliases
const KNOWN_TOOLS: Array<{ name: string; category: string; pattern: RegExp }> = [
  // Design
  { name: "Figma", category: "design", pattern: /\bfigma\b/i },
  { name: "Photoshop", category: "design", pattern: /\b(photoshop|adobe ps|\bps\b)\b/i },
  { name: "Illustrator", category: "design", pattern: /\b(illustrator|adobe ai)\b/i },
  { name: "Adobe XD", category: "design", pattern: /\b(adobe xd|\bxd\b)\b/i },
  { name: "Sketch", category: "design", pattern: /\bsketch\b/i },
  { name: "Canva", category: "design", pattern: /\bcanva\b/i },
  { name: "InDesign", category: "design", pattern: /\bindesign\b/i },
  { name: "Framer", category: "design", pattern: /\bframer\b/i },
  // AI / generative
  { name: "Midjourney", category: "ai", pattern: /\bmidjourney\b/i },
  { name: "Kling", category: "ai", pattern: /\bkling( ai)?\b/i },
  { name: "Runway", category: "ai", pattern: /\brunway( ml)?\b/i },
  { name: "Sora", category: "ai", pattern: /\bsora\b/i },
  { name: "Stable Diffusion", category: "ai", pattern: /\bstable diffusion\b/i },
  { name: "DALL·E", category: "ai", pattern: /\b(dall[\s\-·]?e)\b/i },
  { name: "ChatGPT", category: "ai", pattern: /\b(chatgpt|gpt-?4|gpt-?5)\b/i },
  { name: "Claude", category: "ai", pattern: /\bclaude\b/i },
  { name: "ElevenLabs", category: "ai", pattern: /\belevenlabs\b/i },
  // No-code / web
  { name: "Webflow", category: "web", pattern: /\bwebflow\b/i },
  { name: "Framer", category: "web", pattern: /\bframer\b/i },
  { name: "Wix", category: "web", pattern: /\bwix\b/i },
  { name: "Squarespace", category: "web", pattern: /\bsquarespace\b/i },
  { name: "WordPress", category: "web", pattern: /\bwordpress\b/i },
  { name: "Shopify", category: "web", pattern: /\bshopify\b/i },
  { name: "Bubble", category: "web", pattern: /\bbubble\.io|\bbubble\b/i },
  // Video
  { name: "Premiere Pro", category: "video", pattern: /\b(premiere( pro)?|adobe premiere)\b/i },
  { name: "After Effects", category: "video", pattern: /\b(after effects|\bae\b)\b/i },
  { name: "DaVinci Resolve", category: "video", pattern: /\bdavinci( resolve)?\b/i },
  { name: "CapCut", category: "video", pattern: /\bcapcut\b/i },
  { name: "Final Cut", category: "video", pattern: /\bfinal cut( pro)?\b/i },
  // Dev
  { name: "React", category: "dev", pattern: /\breact(\.js)?\b/i },
  { name: "Next.js", category: "dev", pattern: /\bnext(\.js)?\b/i },
  { name: "Vue", category: "dev", pattern: /\bvue(\.js)?\b/i },
  { name: "Node.js", category: "dev", pattern: /\bnode(\.js)?\b/i },
  { name: "Python", category: "dev", pattern: /\bpython\b/i },
  { name: "Tailwind", category: "dev", pattern: /\btailwind( ?css)?\b/i },
  { name: "Supabase", category: "dev", pattern: /\bsupabase\b/i },
  { name: "Firebase", category: "dev", pattern: /\bfirebase\b/i },
  // Marketing / ops
  { name: "HubSpot", category: "marketing", pattern: /\bhubspot\b/i },
  { name: "Mailchimp", category: "marketing", pattern: /\bmailchimp\b/i },
  { name: "Klaviyo", category: "marketing", pattern: /\bklaviyo\b/i },
  { name: "Notion", category: "ops", pattern: /\bnotion\b/i },
  { name: "Airtable", category: "ops", pattern: /\bairtable\b/i },
  { name: "Zapier", category: "ops", pattern: /\bzapier\b/i },
  { name: "Make", category: "ops", pattern: /\bmake\.com|\bmake (\(integromat\))\b/i },
];

function detectTools(text: string): string[] {
  const found = new Set<string>();
  for (const t of KNOWN_TOOLS) {
    if (t.pattern.test(text)) found.add(t.name);
  }
  return Array.from(found).slice(0, 6);
}

// Domain detection — infer the project type so the proposal speaks the right language
const DOMAIN_DEFS: Array<{
  name: string;
  label: string;
  pattern: RegExp;
  focus: string[];
  guidance: string;
}> = [
  {
    name: "saas_dashboard",
    label: "SaaS / Dashboard",
    pattern: /\b(saas|s\.a\.a\.s|dashboard|admin panel|admin portal|control panel|analytics platform|data platform|crm|erp|internal tool|back[\s-]?office|reporting tool)\b/i,
    focus: ["data clarity", "usability", "user flows", "decision-making experience"],
    guidance:
      "Speak to data clarity, scannable layouts, smart defaults, and reducing cognitive load so users make decisions faster. Mention information hierarchy and clean data display — NOT generic 'modern UI'.",
  },
  {
    name: "ai_product",
    label: "AI Product / Tool",
    pattern: /\b(ai (tool|product|app|assistant|platform|agent|wrapper)|llm|gpt(-?\d)?|generative ai|genai|chatgpt wrapper|ai[-\s]?powered|ai chatbot|prompt[-\s]?based|copilot)\b/i,
    focus: ["trust in AI output", "input clarity", "feedback loops", "controllability", "first-run wow moment"],
    guidance:
      "Speak to trust in model output, clear input affordances, visible feedback while generating, and how users review/edit/regenerate. Mention onboarding to the 'aha' moment — NOT generic 'AI-powered UI'.",
  },
  {
    name: "landing_page",
    label: "Landing Page",
    pattern: /\b(landing page|landing[\s-]?page|sales page|marketing site|one[\s-]?pager|squeeze page|lead[\s-]?gen page|product page|launch page|pre[\s-]?launch page)\b/i,
    focus: ["conversion", "visual hierarchy", "clear messaging", "above-the-fold impact"],
    guidance:
      "Speak to conversion, strong visual hierarchy, hero clarity, and guiding the visitor toward a single action. Mention CTAs, trust signals, and message-market fit — NOT generic 'beautiful design'.",
  },
  {
    name: "mobile_app",
    label: "Mobile App",
    pattern: /\b(mobile app|ios app|android app|react native|flutter|native app|app design|app ui|app ux|app development)\b/i,
    focus: ["user experience", "navigation", "performance", "touch-friendly interactions"],
    guidance:
      "Speak to mobile UX, intuitive navigation patterns, gesture-friendly interactions, and performance on real devices. Mention onboarding and tap targets — NOT generic 'sleek design'.",
  },
  {
    name: "ecommerce",
    label: "E-commerce",
    pattern: /\b(e-?commerce|online store|shopify store|woocommerce|product catalog|checkout flow|cart|storefront)\b/i,
    focus: ["product discovery", "checkout conversion", "trust", "mobile shopping"],
    guidance:
      "Speak to product discovery, smooth checkout, trust signals, and reducing cart abandonment.",
  },
  {
    name: "website",
    label: "Website",
    pattern: /\b(website|web site|company site|portfolio site|business website|corporate site|web design|web redesign|website redesign)\b/i,
    focus: ["brand clarity", "content structure", "responsive design"],
    guidance:
      "Speak to brand alignment, clear content structure, and a polished responsive experience.",
  },
  {
    name: "branding",
    label: "Branding / Logo",
    pattern: /\b(brand identity|branding|logo design|brand guidelines|visual identity|rebrand)\b/i,
    focus: ["brand personality", "memorability", "versatility across touchpoints"],
    guidance:
      "Speak to brand personality, memorability, and how the identity scales across touchpoints.",
  },
  {
    name: "video",
    label: "Video / Motion",
    pattern: /\b(video editing|motion graphics|animation|explainer video|short[\s-]?form video|reels|tiktok video|youtube video)\b/i,
    focus: ["storytelling", "pacing", "platform-native style"],
    guidance:
      "Speak to story arc, pacing, and platform-native style (vertical, hook in first 3 seconds, etc.).",
  },
  {
    name: "writing",
    label: "Writing / Copy",
    pattern: /\b(copywriting|content writing|blog post|article writing|seo content|sales copy|email copy|newsletter)\b/i,
    focus: ["voice", "clarity", "reader engagement"],
    guidance:
      "Speak to brand voice, clarity, hooks that pull the reader in, and writing for the actual audience.",
  },
];

function detectDomains(text: string): Array<{ name: string; label: string; focus: string[]; guidance: string }> {
  const matches: Array<{ d: (typeof DOMAIN_DEFS)[number]; score: number }> = [];
  for (const d of DOMAIN_DEFS) {
    const m = text.match(new RegExp(d.pattern.source, "gi"));
    if (m && m.length > 0) matches.push({ d, score: m.length });
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 2).map(({ d }) => ({
    name: d.name,
    label: d.label,
    focus: d.focus,
    guidance: d.guidance,
  }));
}

const URGENCY_REGEX =
  /\b(urgent|asap|immediately|right away|today|tonight|tomorrow|by (?:end of )?(?:day|week|eod|cob)|tight deadline|short deadline|need (?:it|this) (?:fast|quick|now)|rush|rushed|time[-\s]?sensitive|start (?:right )?away|start immediately|quick turnaround|fast turnaround|deadline (?:is )?(?:soon|near|approaching))\b/i;

function detectUrgency(text: string): boolean {
  return URGENCY_REGEX.test(text);
}

// Lightweight friction signal detector — surfaces the likely core UX problem
// from the brief so the opening hook can name it concretely.
const PROBLEM_SIGNALS: Array<{ phrase: string; pattern: RegExp }> = [
  { phrase: "low conversion", pattern: /\b(low conversion|not converting|conversion (?:is )?(?:low|poor|dropping)|few signups|low signup|poor sales)\b/i },
  { phrase: "user drop-off", pattern: /\b(drop[-\s]?off|drop[-\s]?out|users (?:are )?leaving|losing users|high bounce|abandon(?:ment|ing)?)\b/i },
  { phrase: "confusing navigation", pattern: /\b(confusing|hard to (?:use|navigate|understand)|users (?:get )?lost|unclear navigation|navigation (?:is )?(?:bad|broken|poor))\b/i },
  { phrase: "weak visual hierarchy", pattern: /\b(weak hierarchy|no hierarchy|poor hierarchy|nothing stands out|everything looks the same|flat layout)\b/i },
  { phrase: "cluttered interface", pattern: /\b(cluttered|messy|overwhelming|too much (?:on screen|going on)|crowded ui|busy interface)\b/i },
  { phrase: "slow / clunky flow", pattern: /\b(slow|clunky|laggy|sluggish|too many (?:steps|clicks)|friction)\b/i },
  { phrase: "broken onboarding", pattern: /\b(onboarding (?:is )?(?:broken|weak|confusing|poor)|users (?:don'?t|can'?t) get started|first[-\s]?run experience|activation)\b/i },
  { phrase: "low retention / engagement", pattern: /\b(low retention|low engagement|users (?:don'?t|won'?t) come back|churn|stickiness)\b/i },
  { phrase: "outdated / dated UI", pattern: /\b(outdated|dated|looks old|old[-\s]?fashioned|legacy ui|needs (?:a )?refresh|needs (?:a )?modern look)\b/i },
  { phrase: "needs full redesign", pattern: /\b(redesign|revamp|overhaul|rebuild the ui|new design system|from scratch)\b/i },
  { phrase: "unclear value proposition", pattern: /\b(unclear (?:value|messaging|copy)|don'?t (?:get|understand) what it does|messaging (?:is )?(?:weak|off))\b/i },
  { phrase: "checkout friction", pattern: /\b(checkout (?:is )?(?:broken|slow|confusing)|cart abandonment|payment flow|long checkout)\b/i },
];

function detectCoreProblem(text: string): string {
  for (const sig of PROBLEM_SIGNALS) {
    if (sig.pattern.test(text)) return sig.phrase;
  }
  return "";
}

const inputSchema = z.object({
  jobTitle: z.string().min(1).max(200, { message: "Job title is too long. Please shorten it." }),
  jobDescription: z.string().min(1).max(MAX_JOB_DESCRIPTION_CHARS, { message: JOB_DESCRIPTION_TOO_LONG }),
  clientName: z.string().max(120).optional().default(""),
  freelancerName: z.string().max(120).optional().default(""),
  lengthMode: z.enum(LENGTH_MODES).default("Standard"),
  includePortfolio: z.boolean().optional().default(true),
  portfolio: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        skills: z.array(z.string()),
        link: z.string().nullable().optional(),
      }),
    )
    .max(50)
    .optional()
    .default([]),
});

export const generateProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { jobTitle, jobDescription, clientName, freelancerName, lengthMode, includePortfolio, portfolio } = data;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { error: "Couldn't generate proposal — please try again." } as const;
    }

    if (isJumbledOrIncomplete(jobTitle, jobDescription)) {
      return { error: JUMBLED_JOB_MESSAGE } as const;
    }

    const jobText = `${jobTitle}\n${jobDescription}`;
    const { type: clientType, reason: clientReason } = detectClientType(jobText);
    const matched = includePortfolio ? matchPortfolio(jobText, portfolio, 2) : [];
    const isUrgent = detectUrgency(jobText);
    const cleanClientName = clientName.trim().replace(/[,.\s]+$/, "").slice(0, 60);
    const cleanFreelancerName = freelancerName.trim().slice(0, 60);
    const signOffName = cleanFreelancerName || "[Your Name]";

    const portfolioBlock = matched.length
      ? `\n\nPortfolio to subtly weave in (pick the SINGLE most relevant — do NOT list, mention naturally with a phrase like "I recently shipped..." or "I built something similar..."):\n${matched
          .map(
            (m, i) =>
              `${i + 1}. "${m.title}" — ${m.description} (skills: ${m.skills.join(", ")})`,
          )
          .join("\n")}`
      : "";

    const detectedTools = detectTools(jobText);
    const toolsBlock = detectedTools.length
      ? `\nTools mentioned in the job (detected verbatim — you MUST naturally weave 1–2 of the MOST RELEVANT into the proposal, aligning your experience with them. Do NOT list all of them. Do NOT say generic things like "I use AI tools" or "I'm familiar with many tools" — name them specifically, e.g. "I integrate tools like Midjourney and Figma to..."): ${detectedTools.join(", ")}`
      : `\nTools mentioned in the job: none detected — do NOT invent or name-drop tools the client didn't mention.`;

    const detectedDomains = detectDomains(jobText);
    const domainBlock = detectedDomains.length
      ? `\nDetected project domain(s): ${detectedDomains.map((d) => d.label).join(", ")}.\nDomain focus areas (you MUST reflect at least 2 of these specifically in the Understanding + Solution sections — use the EXACT vocabulary, not generic UI/UX talk):\n${detectedDomains
          .map((d) => `• ${d.label}: focus on ${d.focus.join(", ")}. ${d.guidance}`)
          .join("\n")}\nBANNED generic phrases for this domain: "modern UI", "sleek design", "beautiful interface", "user-friendly", "best practices", "intuitive design" — replace with the specific vocabulary above.`
      : `\nDetected project domain: generic — speak to the SPECIFIC outcomes mentioned in the brief, not to abstract UI/UX.`;

    // Required variables for the mandatory opening hook
    const detectedProjectType =
      detectedDomains[0]?.label?.toLowerCase() || "product";
    const detectedCoreProblem = detectCoreProblem(jobText);
    const coreProblemHint = detectedCoreProblem
      ? detectedCoreProblem
      : "(no obvious signal — infer the most likely friction from the brief, in 3–6 words, e.g. 'confusing onboarding flow', 'weak pricing hierarchy')";

    const len = LENGTH_GUIDE[lengthMode];
    const tone = toneGuidance(clientType);

    const userPrompt = `You are a senior Upwork hiring manager with 10+ years of experience reviewing and writing winning proposals. Write a personalized, high-converting Upwork proposal based on the job post below.

Job Title: ${jobTitle}
Job Description:
${jobDescription}

Client Name (if provided): ${cleanClientName || "(not provided)"}
Freelancer Name (for sign-off): ${signOffName}
Auto-detected Client Type: ${clientType} — ${clientReason}
Urgency Detected: ${isUrgent ? "YES — client wants to start fast" : "no"}
Length target: ${len.label} (HARD cap 230 words, soft floor 100). SHORTER IS BETTER when every word is specific.
${tone}${toolsBlock}${domainBlock}${portfolioBlock}

═══════════════════════════════════════
STEP 1 — SCAN THE JOB POST (think silently, do NOT print labels)
═══════════════════════════════════════
Extract and hold in memory:
1. SECRET WORD / CODE WORD — look for "start your proposal with", "begin with", "write the word", "type X so I know you read", etc. If found, the proposal MUST open with that exact word/phrase on the very first line, before anything else (before any client salutation).
2. PORTFOLIO REQUEST — phrases like "attach examples", "share portfolio", "show previous work", "relevant samples", "attach 1-2". If found, set portfolio_requested = TRUE.
3. DELIVERABLES — every specific deliverable the client listed (file format, dimensions, quantity, color codes, etc.). Mirror these back verbatim in the Approach section.
4. BLACKLIST — anything the client said NOT to do (e.g., "no gradients, no neon, no 3D icons"). These MUST NEVER appear in the proposal.
5. STYLE / TONE WORDS — adjectives the client used ("minimalist", "corporate", "clean", "architectural", etc.). Mirror these exact words in your writing.
6. CORE PAIN POINT — what problem are they trying to solve? What outcome do they want? This is the anchor of the proposal.

═══════════════════════════════════════
STEP 2 — PROPOSAL STRUCTURE (this is what goes into "proposal")
═══════════════════════════════════════

[LINE 1] — SECRET WORD on its own line, if one was detected. Mandatory, no exceptions. Skip if none.

[HOOK — max 2 sentences — MUST BE UNIQUE EVERY TIME]
- FIRST, deeply analyze the job: what is the real business/emotional stake? What SPECIFIC friction or opportunity is buried in the brief? The hook must reflect THAT analysis, not a template.
- Rotate the hook style — do NOT default to "I recently did this for a client…". Pick the ONE style below that best fits THIS brief, and vary across proposals:
    (a) Sharp observation about their product/market/user (e.g. "Most ${detectedProjectType} teams lose users at ${coreProblemHint} because…")
    (b) Reframe their problem in a way they haven't seen ("The real reason ${coreProblemHint} isn't X, it's Y — and it's fixable in the first pass.")
    (c) Contrarian/challenger take that flips an assumption in their brief.
    (d) A concrete micro-insight specific to their domain (${detectedProjectType}) that proves you understand their world.
    (e) Named-outcome from a past project — ONLY if it maps 1:1 to this brief AND you cite a specific metric. Do NOT use this as the default.
- The hook must feel written FOR THIS EXACT JOB — swap the client for any other and it should stop making sense.
- BANNED openers: "I recently…", "I just finished…", "On a recent project…", "I've worked on…", "I am a [role] with…", "I read your job post…", "I came across…", "I'm the perfect fit…", "I have X years…".
- The FIRST word of the hook must NOT be "I". Start with the client, their product, their users, their market, or the problem — never with yourself.

[PROBLEM ACKNOWLEDGEMENT — 2–3 sentences]
- Name the exact pain point. Show you understand WHY it's a problem for their business. Be specific to their industry/product type.
- NO generic "I understand your needs".

[YOUR APPROACH — 3–4 sentences, highly specific]
- Describe exactly what you'll do, step by step.
- Mirror their deliverable specs back (file format, dimensions, quantity, color codes if given).
- Mirror their style words in context (e.g. if they said "minimalist and clean", use those words).
- Briefly mention what you will NOT do (reference their blacklist) to build trust.
- AVOID filler: "information hierarchy", "decision-making experience", "leverage synergies", "cutting-edge solutions", "I am passionate about", "attention to detail".

[PORTFOLIO LINE — INCLUDE ONLY IF portfolio_requested = TRUE]
- One line referencing 1–2 attached examples that match THIS job's style/domain. Example energy: "I've attached 1–2 relevant examples from my portfolio that match your dark-themed, minimalist SaaS style — you'll see how I handle feature call-outs without cluttering the UI."
${matched.length ? `- If used, weave in the SINGLE most relevant portfolio item from this list (do NOT list all): ${matched.map((m) => `"${m.title}"`).join(", ")}. If a link exists, add it inline.` : `- No portfolio items matched — if you must include this line, keep it generic to "attached examples" without inventing project names.`}
- If portfolio was NOT requested, OMIT this section entirely.

[PROCESS QUESTION — exactly 1 sentence]
- One smart, specific question that shows strategic thinking, framed as part of your process.
- Example energy: "To make sure the first mockup lands immediately — are the features to highlight already prioritized, or would you like me to suggest an order based on typical SaaS conversion priorities?"
- NEVER vague ("Can you tell me more?"). NEVER about budget/timeline. ONE question, ends with "?".

[SOFT CLOSE — max 2 sentences]
- Offer something low-commitment to reduce hiring friction. Example: "Happy to put together a quick concept for one screenshot before we begin — no obligation, just so you can see the style in action."
- End with: "Best regards,\\n${signOffName}"

═══════════════════════════════════════
STEP 3 — QUALITY RULES (NON-NEGOTIABLE)
═══════════════════════════════════════
- Total proposal between 100 and 230 words (sign-off included). Absolute hard cap 230. Under 200 is ideal — cut ruthlessly.
- Confident, not arrogant. Specific and direct. Match the client's tone (formal → formal, casual → casual).
- FORMATTING: Every section MUST be separated by a BLANK LINE (two newlines). Do NOT run sections together into one paragraph. Order of paragraphs, each on its own with a blank line between: salutation → hook → problem acknowledgement → approach → (portfolio line if any) → process question → soft close → "Best regards,\\n${signOffName}".
- WINNING BAR (non-negotiable): every sentence must be so specific to THIS job that copy-pasting it into another proposal would obviously not fit. If a sentence could be sent to any client in the same category, DELETE IT and rewrite it with a detail, number, mechanism, or reference pulled from this exact brief. NO generic filler, NO throat-clearing, NO "I hope you're well".
- UNIQUE HOOK IS SACRED: the first non-salutation line MUST be a fresh, job-specific hook that does not start with "I" and does not reuse phrasing from prior proposals. Never open with "I recently…", "I just finished…", "On a recent project…", or any past-work brag. Lead with the client's problem, product, users, or market.
- Max 4 sentences per block; prefer 2–3.
- NO section headings/labels in output ("HOOK:", "APPROACH:", etc.). NO bullet points. NO emojis. NO placeholders like "[insert example here]".
- BANNED words/phrases anywhere: "passionate", "dedicated", "hardworking", "perfect fit", "right person", "extensive experience", "proven track record", "expert", "high-quality", "amazing", "great opportunity", "exciting project", "beautiful", "stunning", "modern UI", "sleek design", "user-friendly", "intuitive design", "robust", "scalable", "best-in-class", "leverage", "synergy", "cutting-edge", "I am excited", "I'm excited", "I hope this finds you", "I came across", "I read your job".
- Only ONE question in the whole proposal (the Process Question).
- Never mention years of experience in the opening.

MIRRORING CHECKLIST (run silently before output):
  ✓ Secret word on line 1 if required
  ✓ Client's exact deliverable specs mentioned
  ✓ Client's style words reflected
  ✓ Blacklisted items avoided
  ✓ Portfolio line included ONLY if requested
  ✓ Zero filler phrases
  ✓ Word count 100–230
${isUrgent ? `  ✓ Weave availability naturally into Approach or Soft Close (e.g. "I can start right away").\n` : ``}
═══════════════════════════════════════
FINAL OUTPUT FORMAT (the "proposal" field)
═══════════════════════════════════════
Plain text, copy-paste ready, no labels. Order:
[secret word line if any]
${cleanClientName ? `${cleanClientName},\n` : ``}[Hook]

[Problem Acknowledgement]

[Your Approach]
${matched.length ? `\n[Portfolio Line — only if requested]\n` : ``}
[Process Question]

[Soft Close]

Best regards,
${signOffName}

═══════════════════════════════════════
BONUS — ALTERNATIVE HOOKS
═══════════════════════════════════════
Produce 2 alternative hook variants, each ≤35 words, following all hook rules:
  • alt_hook_bold: challenger energy — disrupt the client's assumption with a sharp claim.
  • alt_hook_insight: insight-first — name a specific pattern that quietly kills outcomes for their product type.

═══════════════════════════════════════
TOOL CALL
═══════════════════════════════════════
ALWAYS call deliver_proposal with:
- proposal (full text, secret word + salutation + sign-off included)
- hook (the Hook section, verbatim)
- alt_hook_bold, alt_hook_insight
- client_analysis { core_problem, hidden_ux_issue, business_goal } — one line each, max 15 words
- relevant_portfolio (only items actually referenced; empty if portfolio line omitted)
- honest, calibrated score_breakdown
- client_psychology (3 bullets, max 8 words)
- strongest_lines (2–3 verbatim sentences from the proposal)
- improvement_suggestion (one specific tweak)
- weak_proposal_example (60–90 word generic version for contrast)
- why_this_works (3 bullets, max 10 words)
- confidence_level (0–100)
- extracted_deliverables (mirror back the deliverables you detected in Step 1)`;

    const deliverProposalSchema = {
      type: "object",
      properties: {
        proposal: { type: "string" },
        client_type: { type: "string", enum: [...CLIENT_TYPES] },
        client_needs: { type: "array", items: { type: "string" } },
        hook: { type: "string" },
        score_breakdown: {
          type: "object",
          properties: {
            personalization: { type: "integer" },
            relevance: { type: "integer" },
            hook_strength: { type: "integer" },
            portfolio_usage: { type: "integer" },
            clarity: { type: "integer" },
          },
          required: ["personalization", "relevance", "hook_strength", "portfolio_usage", "clarity"],
        },
        score: { type: "integer" },
        score_reason: { type: "string" },
        extracted_skills: { type: "array", items: { type: "string" } },
        extracted_deliverables: { type: "array", items: { type: "string" } },
        referenced_portfolio_titles: { type: "array", items: { type: "string" } },
        client_psychology: { type: "array", items: { type: "string" } },
        strongest_lines: { type: "array", items: { type: "string" } },
        improvement_suggestion: { type: "string" },
        weak_proposal_example: { type: "string" },
        why_this_works: { type: "array", items: { type: "string" } },
        confidence_level: { type: "integer" },
        alt_hook_bold: { type: "string" },
        alt_hook_insight: { type: "string" },
        client_analysis: {
          type: "object",
          properties: {
            core_problem: { type: "string" },
            hidden_ux_issue: { type: "string" },
            business_goal: { type: "string" },
          },
          required: ["core_problem", "hidden_ux_issue", "business_goal"],
        },
        relevant_portfolio: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              one_line_problem_solved: { type: "string" },
              link: { type: "string" },
            },
            required: ["title", "one_line_problem_solved"],
          },
        },
      },
      required: [
        "proposal",
        "client_type",
        "client_needs",
        "hook",
        "score_breakdown",
        "score",
        "score_reason",
        "extracted_skills",
        "extracted_deliverables",
        "referenced_portfolio_titles",
        "client_psychology",
        "strongest_lines",
        "improvement_suggestion",
        "weak_proposal_example",
        "why_this_works",
        "confidence_level",
        "alt_hook_bold",
        "alt_hook_insight",
        "client_analysis",
        "relevant_portfolio",
      ],
    };

    const systemInstruction =
      "You are a senior Upwork hiring manager with 10+ years of experience writing winning proposals. Before writing, deeply analyze the specific job — the client's real stake, buried friction, domain, and desired outcome — and craft a UNIQUE HOOK for THIS brief. The hook is sacred: it NEVER starts with 'I', NEVER opens with 'I recently…' / 'I just finished…' / 'On a recent project…' / any past-work brag, and NEVER reuses phrasing from prior proposals. The first word is about the client, their product, their users, their market, or their problem. Rotate hook styles (sharp observation, reframe, contrarian take, domain micro-insight, or a 1:1 past-result with a specific metric — the last only when it maps exactly). Output ONE tight, personalized proposal between 100 and 230 words (under 200 is ideal) with this exact structure, each section separated by a BLANK LINE: optional SECRET WORD line → salutation → HOOK (unique, job-specific, max 2 sentences, first word not 'I') → PROBLEM ACKNOWLEDGEMENT (1–2 sentences naming the exact pain point) → YOUR APPROACH (2–3 sentences mirroring deliverable specs and style words, briefly noting what you will NOT do per their blacklist) → optional PORTFOLIO LINE (ONLY if the client asked for examples) → ONE smart PROCESS QUESTION (single sentence, ends with '?') → SOFT CLOSE (≤2 sentences, low-commitment offer) → 'Best regards,' + name. Winning bar: every sentence must be so specific to THIS job that pasting it into another proposal would obviously not fit — if a sentence could be sent to any client in the same category, delete it. You MUST call the deliver_proposal function with the proposal plus the two bonus alternative hooks and honest scoring.";

    let resp: Response;
    try {
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "deliver_proposal",
                    description:
                      "Deliver the proposal, an honest score breakdown across 5 axes, extracted requirements, detected client type, and which portfolio items were referenced.",
                    parameters: deliverProposalSchema,
                  },
                ],
              },
            ],
            toolConfig: {
              functionCallingConfig: {
                mode: "ANY",
                allowedFunctionNames: ["deliver_proposal"],
              },
            },
            generationConfig: { temperature: 0.75, topP: 0.95 },
          }),
        },
      );
    } catch (e) {
      console.error("Gemini fetch failed:", e);
      return { error: "Couldn't generate proposal — please try again." } as const;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error("Gemini API error:", resp.status, errText);
      return { error: "Couldn't generate proposal — please try again." } as const;
    }

    const respData = await resp.json().catch(() => null) as any;
    const parts = respData?.candidates?.[0]?.content?.parts ?? [];
    const fnCall = parts.find((p: any) => p?.functionCall)?.functionCall;
    const textFallback = parts.find((p: any) => typeof p?.text === "string")?.text ?? "";
    const call = fnCall
      ? { function: { arguments: JSON.stringify(fnCall.args ?? {}) } }
      : null;
    const choice = { content: textFallback };


    let proposal = "";
    let detected_client_type: ClientType = clientType;
    let client_needs: string[] = [];
    let hook = "";
    let score = 0;
    let score_reason = "";
    let score_breakdown = {
      personalization: 0,
      relevance: 0,
      hook_strength: 0,
      portfolio_usage: 0,
      clarity: 0,
    };
    let extracted_skills: string[] = [];
    let extracted_deliverables: string[] = [];
    let referenced_portfolio_titles: string[] = [];
    let client_psychology: string[] = [];
    let strongest_lines: string[] = [];
    let improvement_suggestion = "";
    let weak_proposal_example = "";
    let why_this_works: string[] = [];
    let confidence_level = 0;
    let alt_hook_bold = "";
    let alt_hook_insight = "";
    let client_analysis: { core_problem: string; hidden_ux_issue: string; business_goal: string } = {
      core_problem: "",
      hidden_ux_issue: "",
      business_goal: "",
    };
    let relevant_portfolio: Array<{ title: string; one_line_problem_solved: string; link?: string }> = [];

    if (call?.function?.arguments) {
      try {
        const parsed = JSON.parse(call.function.arguments);
        proposal = String(parsed.proposal ?? "");
        if (CLIENT_TYPES.includes(parsed.client_type)) detected_client_type = parsed.client_type;
        client_needs = Array.isArray(parsed.client_needs)
          ? parsed.client_needs.slice(0, 5).map(String)
          : [];
        hook = String(parsed.hook ?? "");
        score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));
        score_reason = String(parsed.score_reason ?? "");
        if (parsed.score_breakdown && typeof parsed.score_breakdown === "object") {
          for (const k of Object.keys(score_breakdown) as (keyof typeof score_breakdown)[]) {
            const v = Number(parsed.score_breakdown[k]);
            if (Number.isFinite(v)) score_breakdown[k] = Math.max(0, Math.min(100, Math.round(v)));
          }
        }
        extracted_skills = Array.isArray(parsed.extracted_skills)
          ? parsed.extracted_skills.slice(0, 6).map(String)
          : [];
        extracted_deliverables = Array.isArray(parsed.extracted_deliverables)
          ? parsed.extracted_deliverables.slice(0, 5).map(String)
          : [];
        referenced_portfolio_titles = Array.isArray(parsed.referenced_portfolio_titles)
          ? parsed.referenced_portfolio_titles.map(String)
          : [];
        client_psychology = Array.isArray(parsed.client_psychology)
          ? parsed.client_psychology.slice(0, 3).map(String)
          : [];
        strongest_lines = Array.isArray(parsed.strongest_lines)
          ? parsed.strongest_lines.slice(0, 3).map(String)
          : [];
        improvement_suggestion = String(parsed.improvement_suggestion ?? "");
        weak_proposal_example = String(parsed.weak_proposal_example ?? "");
        why_this_works = Array.isArray(parsed.why_this_works)
          ? parsed.why_this_works.slice(0, 3).map(String)
          : [];
        confidence_level = Math.max(0, Math.min(100, Number(parsed.confidence_level ?? 0)));
        alt_hook_bold = String(parsed.alt_hook_bold ?? "");
        alt_hook_insight = String(parsed.alt_hook_insight ?? "");
        if (parsed.client_analysis && typeof parsed.client_analysis === "object") {
          client_analysis = {
            core_problem: String(parsed.client_analysis.core_problem ?? ""),
            hidden_ux_issue: String(parsed.client_analysis.hidden_ux_issue ?? ""),
            business_goal: String(parsed.client_analysis.business_goal ?? ""),
          };
        }
        if (Array.isArray(parsed.relevant_portfolio)) {
          relevant_portfolio = parsed.relevant_portfolio.slice(0, 4).map((r: any) => ({
            title: String(r?.title ?? ""),
            one_line_problem_solved: String(r?.one_line_problem_solved ?? ""),
            link: r?.link ? String(r.link) : undefined,
          })).filter((r: any) => r.title);
        }
      } catch (e) {
        console.error("Failed to parse tool args", e);
      }
    }
    if (!proposal) proposal = choice?.content ?? "";
    proposal = enforceWordCap(proposal, ABSOLUTE_MAX_WORDS);

    // Safety net 1: prepend client name salutation if missing
    if (cleanClientName) {
      const firstLine = proposal.trim().split(/\r?\n/)[0]?.trim() ?? "";
      const hasSalutation = firstLine.toLowerCase().startsWith(cleanClientName.toLowerCase());
      if (!hasSalutation) {
        proposal = `${cleanClientName},\n\n${proposal.trim()}`;
      }
    }

    // Safety net 2: ensure sign-off
    const signOffRegex = /best\s+regards\s*,\s*\S/i;
    if (!signOffRegex.test(proposal)) {
      proposal = `${proposal.trim()}\n\nBest regards,\n${signOffName}`;
    }

    // Safety net 3: enforce blank line between sections (keep sign-off + name together)
    proposal = normalizeParagraphSpacing(proposal);

    // Filter strongest_lines to those actually present in the proposal
    const proposalLower = proposal.toLowerCase();
    strongest_lines = strongest_lines.filter((l) => l && proposalLower.includes(l.toLowerCase().slice(0, 30)));

    const matchedPortfolio = matched
      .filter((m) =>
        referenced_portfolio_titles.some(
          (t) =>
            t.toLowerCase().includes(m.title.toLowerCase()) ||
            m.title.toLowerCase().includes(t.toLowerCase()),
        ),
      )
      .map((m) => ({ id: m.id, title: m.title, skills: m.skills }));

    const wordCount = proposal.trim().split(/\s+/).filter(Boolean).length;

    // Derive confidence if model didn't provide it
    if (!confidence_level) {
      confidence_level = Math.round(score * 0.6 + (matchedPortfolio.length ? 20 : 0) + (client_needs.length >= 3 ? 15 : 5));
      confidence_level = Math.max(0, Math.min(100, confidence_level));
    }

    return {
      proposal,
      hook,
      client_type: detected_client_type,
      client_type_reason: clientReason,
      client_needs,
      score,
      score_reason,
      score_breakdown,
      extracted_skills,
      extracted_deliverables,
      matched_portfolio: matchedPortfolio.length
        ? matchedPortfolio
        : matched.map((m) => ({ id: m.id, title: m.title, skills: m.skills })),
      length_mode: lengthMode,
      word_count: wordCount,
      is_urgent: isUrgent,
      detected_tools: detectedTools,
      detected_domains: detectedDomains,
      client_psychology,
      strongest_lines,
      improvement_suggestion,
      weak_proposal_example,
      why_this_works,
      confidence_level,
      alt_hook_bold,
      alt_hook_insight,
      client_analysis,
      relevant_portfolio,
    };
  });
