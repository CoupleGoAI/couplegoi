// Deterministic redaction applied to any text that will be sent to an LLM
// or persisted into a derived memory row. Extracted from the original
// coupleMemory.ts pipeline so the same patterns apply to solo memory and to
// any future summariser.

const MAX_TURN_CHARS = 800;

// Words that are commonly capitalised mid-sentence but are NOT personal names.
// Anything in this set passes through the name-redaction step unchanged.
// Organised by category for easier auditing and future expansion.
const NON_NAME_WORDS: ReadonlyArray<string> = [
  // ── Days ────────────────────────────────────────────────────────────────
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",

  // ── Months ──────────────────────────────────────────────────────────────
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",

  // ── Seasons / time periods ───────────────────────────────────────────────
  "spring", "summer", "autumn", "fall", "winter",
  "christmas", "easter", "halloween", "thanksgiving", "hanukkah", "diwali",
  "ramadan", "eid", "passover", "kwanzaa", "new year",

  // ── Countries ────────────────────────────────────────────────────────────
  "afghanistan", "albania", "algeria", "andorra", "angola", "argentina",
  "armenia", "australia", "austria", "azerbaijan", "bahamas", "bahrain",
  "bangladesh", "barbados", "belarus", "belgium", "belize", "benin",
  "bhutan", "bolivia", "botswana", "brazil", "brunei", "bulgaria",
  "burkina", "burundi", "cambodia", "cameroon", "canada", "chad", "chile",
  "china", "colombia", "comoros", "congo", "croatia", "cuba", "cyprus",
  "czechia", "denmark", "djibouti", "dominica", "ecuador", "egypt",
  "eritrea", "estonia", "ethiopia", "fiji", "finland", "france", "gabon",
  "gambia", "georgia", "germany", "ghana", "greece", "grenada", "guatemala",
  "guinea", "guyana", "haiti", "honduras", "hungary", "iceland", "india",
  "indonesia", "iran", "iraq", "ireland", "israel", "italy", "jamaica",
  "japan", "jordan", "kazakhstan", "kenya", "kiribati", "kosovo", "kuwait",
  "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia", "libya",
  "liechtenstein", "lithuania", "luxembourg", "madagascar", "malawi",
  "malaysia", "maldives", "mali", "malta", "mauritania", "mauritius",
  "mexico", "micronesia", "moldova", "monaco", "mongolia", "montenegro",
  "morocco", "mozambique", "myanmar", "namibia", "nauru", "nepal",
  "netherlands", "nicaragua", "niger", "nigeria", "norway", "oman",
  "pakistan", "palau", "panama", "paraguay", "peru", "philippines", "poland",
  "portugal", "qatar", "romania", "russia", "rwanda", "samoa", "senegal",
  "serbia", "seychelles", "singapore", "slovakia", "slovenia", "somalia",
  "spain", "sudan", "suriname", "sweden", "switzerland", "syria", "taiwan",
  "tajikistan", "tanzania", "thailand", "togo", "tonga", "tunisia", "turkey",
  "turkmenistan", "tuvalu", "uganda", "ukraine", "uruguay", "uzbekistan",
  "vanuatu", "venezuela", "vietnam", "yemen", "zambia", "zimbabwe",
  // common short-forms / adjectives
  "american", "australian", "british", "canadian", "chinese", "dutch",
  "european", "french", "german", "greek", "indian", "iranian", "iraqi",
  "irish", "israeli", "italian", "japanese", "korean", "mexican", "russian",
  "spanish", "swedish", "swiss", "turkish", "ukrainian",

  // ── Major cities ─────────────────────────────────────────────────────────
  "amsterdam", "ankara", "athens", "atlanta", "auckland", "bangkok",
  "barcelona", "beijing", "berlin", "bogota", "brussels", "budapest",
  "buenos", "cairo", "cape", "chicago", "copenhagen", "dallas", "delhi",
  "denver", "dhaka", "dubai", "dublin", "edinburgh", "frankfurt", "geneva",
  "guadalajara", "guangzhou", "hanoi", "havana", "helsinki", "hong",
  "houston", "istanbul", "jakarta", "johannesburg", "karachi", "kathmandu",
  "kiev", "kuala", "lagos", "lima", "lisbon", "london", "los", "lumpur",
  "madrid", "manila", "melbourne", "mexico", "miami", "milan", "montreal",
  "moscow", "mumbai", "munich", "nairobi", "new", "oslo", "paris", "prague",
  "riyadh", "rome", "santiago", "paulo", "seattle", "seoul", "shanghai",
  "singapore", "stockholm", "sydney", "taipei", "tehran", "tokyo", "toronto",
  "tunis", "vienna", "warsaw", "washington", "york", "zurich",
  // US states
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
  "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "hampshire", "jersey",
  "mexico", "carolina", "dakota", "ohio", "oklahoma", "oregon",
  "pennsylvania", "rhode", "tennessee", "texas", "utah", "vermont",
  "virginia", "washington", "wisconsin", "wyoming",
  // UK regions / countries
  "england", "scotland", "wales",

  // ── Languages ────────────────────────────────────────────────────────────
  "arabic", "bengali", "chinese", "danish", "english", "farsi", "finnish",
  "french", "german", "greek", "hebrew", "hindi", "hungarian", "indonesian",
  "italian", "japanese", "korean", "latin", "malay", "mandarin", "norwegian",
  "polish", "portuguese", "punjabi", "romanian", "russian", "serbian",
  "spanish", "swahili", "swedish", "tagalog", "tamil", "thai", "turkish",
  "ukrainian", "urdu", "vietnamese",

  // ── Religions / belief systems ───────────────────────────────────────────
  "buddhism", "buddhist", "catholicism", "catholic", "christianity",
  "christian", "hinduism", "hindu", "islam", "islamic", "judaism", "jewish",
  "protestant", "sikhism", "sikh", "atheism", "atheist", "agnostic",

  // ── Technology — platforms, frameworks, tools ────────────────────────────
  "android", "angular", "ansible", "apache", "apple", "aws", "azure",
  "bitcoin", "bluetooth", "bootstrap", "chrome", "claude", "cloudflare",
  "css", "debian", "docker", "dropbox", "elasticsearch", "ethereum",
  "expo", "facebook", "figma", "firefox", "flutter", "gcp", "git", "github",
  "gitlab", "gmail", "google", "graphql", "heroku", "html", "instagram",
  "ios", "javascript", "jenkins", "jest", "jira", "kafka", "kotlin",
  "kubernetes", "linux", "macos", "meta", "microsoft", "mongodb", "mysql",
  "netflix", "nginx", "nodejs", "notion", "npm", "openai", "oracle",
  "paypal", "postgres", "postgresql", "postman", "python", "react", "redis",
  "rust", "safari", "shopify", "slack", "snowflake", "spotify", "sql",
  "sqlite", "stripe", "supabase", "swift", "tailwind", "telegram", "tiktok",
  "typescript", "ubuntu", "vercel", "vim", "vscode", "webpack", "whatsapp",
  "windows", "wordpress", "xcode", "youtube", "zoom",

  // ── Consumer brands ──────────────────────────────────────────────────────
  "adidas", "airbnb", "alibaba", "amazon", "bmw", "boeing", "chanel",
  "cisco", "coca", "cola", "disney", "ford", "gucci", "honda", "hyundai",
  "intel", "lego", "lexus", "louis", "mcdonald", "nasa", "netflix", "nike",
  "nintendo", "pepsi", "porsche", "samsung", "sony", "starbucks", "tesla",
  "toyota", "uber", "vuitton", "volkswagen", "volvo", "walmart", "xiaomi",

  // ── Academic / professional disciplines ──────────────────────────────────
  "algebra", "anthropology", "astronomy", "biology", "chemistry",
  "economics", "engineering", "geography", "geology", "geometry", "history",
  "linguistics", "literature", "mathematics", "medicine", "neuroscience",
  "philosophy", "physics", "psychology", "sociology", "statistics",
  "theology",

  // ── Medical / mental health terms (often capitalised in context) ──────────
  "adhd", "anxiety", "autism", "bipolar", "borderline", "depression",
  "diabetes", "dyslexia", "epilepsy", "ocd", "ptsd", "schizophrenia",

  // ── Relationship / therapy terms ─────────────────────────────────────────
  "cognitive", "behavioral", "therapy", "therapist", "counseling",
  "counselor", "psychologist", "psychiatrist", "attachment",

  // ── Common title / role words (not names) ────────────────────────────────
  "doctor", "professor", "president", "minister", "senator", "director",
  "manager", "officer", "engineer", "attorney", "general",

  // ── Directional / geographical adjectives ────────────────────────────────
  "northern", "southern", "eastern", "western", "central", "northeastern",
  "northwestern", "southeastern", "southwestern", "middle", "eastern",
  "pacific", "atlantic", "arctic", "antarctic", "mediterranean",

  // ── Miscellaneous commonly-capitalised non-names ──────────────────────────
  "internet", "web", "app", "email", "wifi", "gps", "api", "sdk", "uid",
  "monday", "friday", "weekend", "today", "tomorrow", "yesterday",
  "january", "december", // (duplicates fine — set dedupes)
  "world", "earth", "moon", "sun", "universe", "galaxy",
  "university", "college", "school", "institute", "academy",
  "hospital", "clinic", "pharmacy", "airport", "station", "stadium",
  "parliament", "congress", "senate", "court", "embassy",
];
const NON_NAME_WORDS_SET = new Set(NON_NAME_WORDS);

const REDACT_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  // emails
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: "[redacted]" },
  // urls
  { re: /https?:\/\/\S+/gi, replacement: "[redacted]" },
  // IPv4
  { re: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: "[redacted]" },
  // long hex / api-key-like tokens
  { re: /\b(?:sk|pk|rk)_[A-Za-z0-9_-]{8,}\b/g, replacement: "[redacted]" },
  { re: /\b[A-Fa-f0-9]{20,}\b/g, replacement: "[redacted]" },
  // IBAN-ish (country code + 13+ alphanumerics)
  { re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, replacement: "[redacted]" },
  // phone (loose: 7+ digits with optional separators / leading +)
  { re: /\+?\d[\d\s().-]{7,}\d/g, replacement: "[redacted]" },
  // long bare digit runs (account numbers, card-like)
  { re: /\b\d{9,}\b/g, replacement: "[redacted]" },
];

export interface RedactResult {
  text: string;
  droppedAnything: boolean;
}

export function redact(
  text: string,
  knownNames: ReadonlyArray<string> = [],
): RedactResult {
  let out = text.length > MAX_TURN_CHARS ? text.slice(0, MAX_TURN_CHARS) : text;
  let dropped = out.length !== text.length;

  for (const { re, replacement } of REDACT_PATTERNS) {
    if (re.test(out)) {
      dropped = true;
      out = out.replace(re, replacement);
    }
  }

  // Mask third-party personal names: mid-sentence Capitalized words that are
  // not in the exclusion set (days, months, places, brands, tech terms, etc.)
  // and not in the caller-supplied knownNames allowlist.
  const allowedNames = new Set(
    knownNames
      .filter((n): n is string => typeof n === "string" && n.length > 0)
      .map((n) => n.toLowerCase()),
  );
  out = out.replace(/(?<=\S\s)([A-Z][a-z]{2,})/g, (match) => {
    const normalized = match.toLowerCase();
    if (NON_NAME_WORDS_SET.has(normalized) || allowedNames.has(normalized)) {
      return match;
    }
    dropped = true;
    return "someone";
  });

  return { text: out, droppedAnything: dropped };
}
