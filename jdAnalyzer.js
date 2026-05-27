const SENIORITY_PATTERNS = {
  intern: /intern|internship|co.?op|trainee/i,
  junior: /junior|jr\.?\s|entry.level|0[–-]2\s*year|new grad/i,
  mid: /mid.level|3[–-]5\s*year|2[–-]4\s*year/i,
  senior: /senior|sr\.?\s|5\+\s*year|lead\s+(?!team)/i,
  staff: /staff\s+engineer|principal|architect/i,
  manager: /manager|director|head of|vp|vice president/i,
};

const SKILL_TAXONOMY = {
  languages: /\b(JavaScript|TypeScript|Python|Java|Kotlin|Swift|C#|C\+\+|Go|Rust|Ruby|PHP|Scala|R|MATLAB|Bash|Shell)\b/gi,
  frontend: /\b(React|Vue|Angular|Next\.js|Nuxt|Svelte|HTML|CSS|SCSS|Tailwind|Webpack|Vite)\b/gi,
  backend: /\b(Node\.js|Express|FastAPI|Django|Flask|Spring|Rails|Laravel|GraphQL|REST|gRPC|Microservices)\b/gi,
  data: /\b(SQL|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|Kafka|Spark|Hadoop|dbt|Airflow|Tableau|Power BI)\b/gi,
  cloud: /\b(AWS|GCP|Azure|Heroku|Vercel|Netlify|Docker|Kubernetes|Terraform|CI\/CD|GitHub Actions|Jenkins)\b/gi,
  ml: /\b(TensorFlow|PyTorch|scikit.learn|Pandas|NumPy|LLM|Machine Learning|Deep Learning|NLP|Computer Vision|MLOps)\b/gi,
  soft: /\b(communication|collaboration|leadership|problem.solving|analytical|agile|scrum|cross.functional|mentoring)\b/gi,
};

export function analyzeJD(jdText) {
  const t0 = performance.now();
  const text = jdText.trim();

  const signals = {
    title: extractTitle(text),
    company: extractCompany(text),
    seniority: extractSeniority(text),
    requiredSkills: extractSkills(text, 'required'),
    preferredSkills: extractSkills(text, 'preferred'),
    responsibilities: extractResponsibilities(text),
    keywords: extractKeywords(text),
    tone: detectTone(text),
    _analyzeMs: 0,
  };

  signals._analyzeMs = Math.round(performance.now() - t0);
  return signals;
}

function extractTitle(text) {
  // Look for explicit "Job Title:" or "Position:" labels
  const labeled = text.match(/(?:job title|position|role|title)\s*:?\s*([^\n]{3,60})/i);
  if (labeled) return labeled[1].trim();

  // First short line that looks like a title
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.length < 80 && /engineer|developer|manager|designer|analyst|scientist|lead|architect/i.test(line)) {
      return line.replace(/[^a-zA-Z0-9\s,()/-]/g, '').trim();
    }
  }
  return 'Software Professional';
}

function extractCompany(text) {
  const match = text.match(/(?:at|@|company|employer|organization)\s*:?\s*([A-Z][^\n,]{2,40})/);
  return match ? match[1].trim() : '';
}

function extractSeniority(text) {
  for (const [level, pattern] of Object.entries(SENIORITY_PATTERNS)) {
    if (pattern.test(text)) return level;
  }
  // Fallback: count years of experience mentioned
  const yearsMatch = text.match(/(\d+)\+?\s*years?\s+of\s+experience/i);
  if (yearsMatch) {
    const yrs = parseInt(yearsMatch[1]);
    if (yrs <= 2) return 'junior';
    if (yrs <= 4) return 'mid';
    if (yrs <= 7) return 'senior';
    return 'staff';
  }
  return 'mid';
}

function extractSkills(text, type) {
  // Find required vs preferred sections
  let searchText = text;
  if (type === 'required') {
    const reqSection = text.match(/required[^]*?(?=preferred|nice.to.have|bonus|$)/is);
    if (reqSection) searchText = reqSection[0];
  } else {
    const prefSection = text.match(/(?:preferred|nice.to.have|bonus)[^]*/is);
    if (prefSection) searchText = prefSection[0];
  }

  const found = new Set();
  for (const pattern of Object.values(SKILL_TAXONOMY)) {
    const matches = searchText.match(new RegExp(pattern.source, 'gi')) || [];
    matches.forEach(m => found.add(m.trim()));
  }
  return [...found].slice(0, 20);
}

function extractResponsibilities(text) {
  const bullets = text.match(/^[\s•·▪▸\-*]\s+.{10,120}/gm) || [];
  return bullets
    .map(b => b.replace(/^[\s•·▪▸\-*]+/, '').trim())
    .filter(b => !/(year|degree|bachelor|master|nice to have)/i.test(b))
    .slice(0, 8);
}

function extractKeywords(text) {
  // Extract all skill taxonomy matches from full JD
  const found = new Set();
  for (const pattern of Object.values(SKILL_TAXONOMY)) {
    const matches = text.match(new RegExp(pattern.source, 'gi')) || [];
    matches.forEach(m => found.add(m.trim()));
  }
  // Also grab capitalized multi-word phrases that appear repeatedly
  const phrases = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g) || [];
  const freq = {};
  phrases.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
  Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .forEach(([phrase]) => found.add(phrase));

  return [...found].slice(0, 25);
}

function detectTone(text) {
  const formal = (text.match(/\b(shall|must|required|mandatory|proficiency)\b/gi) || []).length;
  const casual = (text.match(/\b(we're|you'll|you're|love|passion|excited|team)\b/gi) || []).length;
  if (formal > casual * 1.5) return 'formal';
  if (casual > formal) return 'casual';
  return 'professional';
}

export function serializeSignals(signals) {
  return `ROLE: ${signals.title} (${signals.seniority})${signals.company ? ` at ${signals.company}` : ''}
REQUIRED SKILLS: ${signals.requiredSkills.join(', ') || 'not specified'}
PREFERRED SKILLS: ${signals.preferredSkills.join(', ') || 'not specified'}
KEY RESPONSIBILITIES: ${signals.responsibilities.slice(0, 5).join(' | ') || 'not specified'}
IMPORTANT KEYWORDS: ${signals.keywords.slice(0, 15).join(', ')}
TONE: ${signals.tone}`;
}