import { streamCompletion } from './mistralClient.js';
import {
  buildSummaryPrompt,
  buildExperiencePrompt,
  buildSkillsPrompt,
} from './promptBuilder.js';
import { cacheManager } from './cacheManager.js';

/**
 * Rewrite all resume sections in parallel with streaming.
 *
 * @param {object} parsedResume - Output from resumeParser.parseResume()
 * @param {object} jdSignals - Output from jdAnalyzer.analyzeJD()
 * @param {string} apiKey - Mistral API key
 * @param {object} callbacks - Per-section streaming callbacks
 *   callbacks.summary.onToken(delta, full)
 *   callbacks.summary.onDone(full, timing)
 *   callbacks.experience.onToken / onDone
 *   callbacks.skills.onToken / onDone
 *   callbacks.onAllDone({ summary, experience, skills }, timing)
 * @param {AbortSignal} abortSignal
 */
export async function rewriteParallel(parsedResume, jdSignals, apiKey, callbacks, abortSignal) {
  const t0 = performance.now();

  const sections = [
    {
      name: 'summary',
      prompt: buildSummaryPrompt(parsedResume, jdSignals),
      cbs: callbacks.summary || {},
    },
    {
      name: 'experience',
      prompt: buildExperiencePrompt(parsedResume, jdSignals),
      cbs: callbacks.experience || {},
    },
    {
      name: 'skills',
      prompt: buildSkillsPrompt(parsedResume, jdSignals),
      cbs: callbacks.skills || {},
    },
  ];

  const results = {};

  // Launch all 3 concurrently
  const promises = sections.map(async ({ name, prompt, cbs }) => {
    // Check cache first
    const cacheKey = cacheManager.buildKey(jdSignals, name);
    const cached = cacheManager.get(cacheKey);

    if (cached) {
      console.log(`[Cache HIT] ${name}`);
      // Simulate streaming for UX consistency
      const words = cached.split(' ');
      for (const word of words) {
        if (abortSignal?.aborted) break;
        const chunk = word + ' ';
        cbs.onToken?.(chunk, cached);
        await sleep(8); // ~125 words/sec simulated
      }
      cbs.onDone?.(cached, { firstTokenMs: 5, totalMs: words.length * 8, cached: true });
      results[name] = cached;
      return;
    }

    // Cache miss — call Mistral
    const text = await streamCompletion(
      prompt,
      apiKey,
      (delta, full) => cbs.onToken?.(delta, full),
      (full, timing) => {
        cacheManager.set(cacheKey, full);
        cbs.onDone?.(full, { ...timing, cached: false });
      },
      abortSignal
    );
    results[name] = text;
  });

  await Promise.allSettled(promises);

  const totalMs = Math.round(performance.now() - t0);
  callbacks.onAllDone?.(results, { totalMs, cacheStats: cacheManager.getStats() });

  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}