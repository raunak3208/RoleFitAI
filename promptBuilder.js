
import { serializeSignals } from './jdAnalyzer.js';

export function buildSummaryPrompt(parsedResume, jdSignals) {
  const jdBlock = serializeSignals(jdSignals);
  const existingSummary = parsedResume.summary
    ? `EXISTING SUMMARY:\n${parsedResume.summary.slice(0, 500)}`
    : `CANDIDATE BACKGROUND: ${parsedResume.name}, skills: ${parsedResume.skills.slice(0, 10).join(', ')}`;

  return `You are a professional resume writer. Rewrite ONLY the professional summary/objective section.

JOB TARGET:
${jdBlock}

${existingSummary}

RULES:
- 2-4 sentences maximum
- Start with a strong professional identity statement
- Weave in 2-3 of the most critical required skills naturally
- Match the tone: ${jdSignals.tone}
- No buzzwords like "results-driven" or "dynamic"
- No bullet points, pure prose
- Output ONLY the rewritten summary text, nothing else`;
}

export function buildExperiencePrompt(parsedResume, jdSignals) {
  const jdBlock = serializeSignals(jdSignals);
  const expText = parsedResume.experience.slice(0, 1200); // Token budget

  return `You are a professional resume writer. Rewrite ONLY the work experience section.

JOB TARGET:
${jdBlock}

EXISTING EXPERIENCE:
${expText}

RULES:
- Keep all job titles, companies, and dates EXACTLY as-is
- Rewrite bullet points to emphasize impact relevant to the target role
- Use strong action verbs (built, scaled, led, reduced, increased, designed)
- Include metrics where they exist in the original (%, $, time saved)
- Prioritize bullets that match required skills: ${jdSignals.requiredSkills.slice(0, 8).join(', ')}
- 3-5 bullets per role maximum
- Output ONLY the rewritten experience section, preserving the original structure`;
}

export function buildSkillsPrompt(parsedResume, jdSignals) {
  const existingSkills = parsedResume.skills.join(', ');
  const required = jdSignals.requiredSkills.join(', ');
  const preferred = jdSignals.preferredSkills.join(', ');

  return `You are a professional resume writer. Rewrite ONLY the skills section.

TARGET ROLE: ${jdSignals.title} (${jdSignals.seniority})
REQUIRED SKILLS FOR ROLE: ${required}
PREFERRED SKILLS FOR ROLE: ${preferred}
CANDIDATE'S CURRENT SKILLS: ${existingSkills}

RULES:
- Only list skills the candidate actually has (from CANDIDATE'S CURRENT SKILLS)
- Reorder to put the most relevant skills for this role FIRST
- Group into logical categories (Languages, Frameworks, Tools, etc.)
- Do NOT invent skills the candidate doesn't have
- Format as: Category: skill1, skill2, skill3
- Output ONLY the rewritten skills section, nothing else`;
}

export function buildFullResumePrompt(parsedResume, jdSignals) {
  // Fallback single-call prompt if parallel fails
  const jdBlock = serializeSignals(jdSignals);

  return `You are a professional resume writer. Rewrite this resume to target the job below.

JOB TARGET:
${jdBlock}

RESUME:
${parsedResume.raw.slice(0, 2000)}

RULES:
- Keep all contact info, companies, dates, and job titles unchanged
- Rewrite summary, bullet points, and skills to match the job
- Emphasize experience relevant to: ${jdSignals.requiredSkills.slice(0, 6).join(', ')}
- Use action verbs and quantifiable achievements
- Match tone: ${jdSignals.tone}
- Output the complete rewritten resume only`;
}