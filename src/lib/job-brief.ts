export const MAX_JOB_DESCRIPTION_CHARS = 4000;
export const JOB_DESCRIPTION_TOO_LONG =
  "Description is too big. Kindly paste only the useful description from the job.";

export const JUMBLED_JOB_MESSAGE =
  "It looks like that message was jumbled or incomplete!\nPlease paste the Job Title and Job Description here, and I'll immediately craft a high-converting, tailored Upwork proposal for you using.";

/** Markdown, arrows, bullets, and other punctuation — ignored when judging the brief. */
function stripSymbols(text: string): string {
  return text
    .replace(/->|=>|←|→/g, " ")
    .replace(/[#*_~`>|•·]/g, " ")
    .replace(/[!"$%&'()+,\-./:;<=>?@[\\\]^_{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lettersOnly(text: string): string {
  return text.replace(/[^a-zA-Z]/g, "");
}

function looksLikeRealWord(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 3) return false;
  if (!/[aeiouy]/.test(w)) return false;
  if (/(.)\1{2,}/.test(w)) return false;
  return true;
}

/** True when title+description look like keyboard smash or too thin to write a proposal. */
export function isJumbledOrIncomplete(jobTitle: string, jobDescription: string): boolean {
  const title = stripSymbols(jobTitle);
  const description = stripSymbols(jobDescription);
  const combined = `${title} ${description}`.replace(/\s+/g, " ").trim();
  const words = combined.toLowerCase().split(/\s+/).filter(Boolean);
  const letters = lettersOnly(combined);

  // Non-Latin briefs (e.g. Arabic/CJK) can have few English letters — don't treat as smash.
  const raw = `${jobTitle} ${jobDescription}`;
  const nonLatin = raw.replace(/[\s\d!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~a-zA-Z]/g, "");
  if (nonLatin.length >= 12 && letters.length < 8) return false;

  if (combined.length < 24) return true;
  if (description.length < 12) return true;
  if (words.length < 4) return true;

  // Repeated letters only (jkjjjjj) — not ####, ****, ----, or ->
  if (/(.)\1{3,}/i.test(letters)) return true;

  const unique = new Set(letters.toLowerCase());
  if (letters.length >= 8 && unique.size <= 4) return true;

  const vowels = (letters.match(/[aeiouy]/gi) ?? []).length;
  if (letters.length >= 10 && vowels / letters.length < 0.18) return true;

  const realWords = words.filter(looksLikeRealWord);
  if (realWords.length < 3) return true;

  const junkRatio = words.filter((w) => !looksLikeRealWord(w)).length / words.length;
  if (words.length >= 2 && junkRatio >= 0.7) return true;

  return false;
}
