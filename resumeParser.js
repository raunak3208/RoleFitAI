export function parseResume(rawText) {
  const t0 = performance.now();

  const cleaned = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);

  const result = {
    raw: cleaned,
    name: extractName(lines),
    contact: extractContact(cleaned),
    summary: extractSection(cleaned, ['summary', 'objective', 'profile', 'about']),
    experience: extractExperience(cleaned),
    education: extractSection(cleaned, ['education', 'academic']),
    skills: extractSkills(cleaned),
    certifications: extractSection(cleaned, ['certification', 'certificate', 'license']),
    projects: extractSection(cleaned, ['project']),
    _parsedAt: Date.now(),
    _parseMs: 0,
  };

  result._parseMs = Math.round(performance.now() - t0);
  return result;
}

function extractName(lines) {
  // First non-empty line is usually the name
  for (const line of lines.slice(0, 5)) {
    if (line.length < 60 && !line.includes('@') && !/^\d/.test(line) && !/http/i.test(line)) {
      return line;
    }
  }
  return '';
}

function extractContact(text) {
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  const phoneMatch = text.match(/[\+\d][\d\s\-().]{7,15}\d/);
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  const locationMatch = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2}(?:\s\d{5})?)/);
  return {
    email: emailMatch?.[0] || '',
    phone: phoneMatch?.[0] || '',
    linkedin: linkedinMatch?.[0] || '',
    location: locationMatch?.[1] || '',
  };
}

function extractSection(text, keywords) {
  const lines = text.split('\n');
  const pattern = new RegExp(`^(${keywords.join('|')})s*:?$`, 'i');
  const stopPattern = /^(experience|education|skills|certification|project|award|publication|volunteer|reference)/i;

  let inSection = false;
  const sectionLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (pattern.test(trimmed)) { inSection = true; continue; }
    if (inSection && stopPattern.test(trimmed) && !pattern.test(trimmed)) break;
    if (inSection && trimmed) sectionLines.push(trimmed);
  }

  return sectionLines.join(' ').trim();
}

function extractExperience(text) {
  const lines = text.split('\n');
  const expStartPattern = /^(experience|work history|employment|professional background)/i;
  const stopPattern = /^(education|skills|certification|project|award|publication|volunteer|reference)/i;

  let inExp = false;
  const expLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (expStartPattern.test(trimmed)) { inExp = true; continue; }
    if (inExp && stopPattern.test(trimmed)) break;
    if (inExp) expLines.push(trimmed);
  }

  // If section extraction failed, grab the middle bulk of the resume
  if (expLines.length === 0) {
    return lines.slice(Math.floor(lines.length * 0.2), Math.floor(lines.length * 0.75)).join('\n').trim();
  }

  return expLines.join('\n').trim();
}

function extractSkills(text) {
  const section = extractSection(text, ['skills', 'technical skills', 'core competencies', 'technologies']);
  const skills = [];

  // Extract from bullet/comma/pipe delimited lists
  const cleaned = section.replace(/[•·▪▸\-]/g, ',');
  const tokens = cleaned.split(/[,|;\/\n]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);

  for (const token of tokens) {
    if (!/^\d/.test(token) && !/[(){}]/.test(token)) {
      skills.push(token);
    }
  }

  // Also scan entire resume for known tech keywords
  const techKeywords = text.match(/\b(JavaScript|TypeScript|Python|Java|C\+\+|Go|Rust|React|Vue|Angular|Node|SQL|AWS|GCP|Azure|Docker|Kubernetes|Git|GraphQL|REST|API|ML|AI|TensorFlow|PyTorch|Agile|Scrum)\b/g) || [];
  const combined = [...new Set([...skills, ...techKeywords])];
  return combined.slice(0, 30);
}