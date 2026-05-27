import { parseResume } from './resumeParser.js';
import { analyzeJD } from './jdAnalyzer.js';
import { rewriteParallel } from './parallelRewriter.js';

export class ResumeRewriter {
  constructor() {
    this.parsedResume = null;
    this.jdSignals = null;
    this.apiKey = '';
    this.abortController = null;
    this.timing = {};
  }

  setApiKey(key) {
    this.apiKey = key.trim();
  }

  loadResume(rawText) {
    const t0 = performance.now();
    this.parsedResume = parseResume(rawText);
    this.timing.parse = Math.round(performance.now() - t0);
    console.log(`[Resume parsed] ${this.timing.parse}ms`, this.parsedResume);
    return this.parsedResume;
  }


  analyzeJobDescription(jdText) {
    const t0 = performance.now();
    this.jdSignals = analyzeJD(jdText);
    this.timing.jdAnalysis = Math.round(performance.now() - t0);
    console.log(`[JD analyzed] ${this.timing.jdAnalysis}ms`, this.jdSignals);
    return this.jdSignals;
  }

  
  async rewrite(callbacks) {
    if (!this.parsedResume) throw new Error('No resume loaded. Call loadResume() first.');
    if (!this.jdSignals) throw new Error('No job description. Call analyzeJobDescription() first.');
    if (!this.apiKey) throw new Error('No Mistral API key set.');

    // Cancel any in-flight rewrite
    this.abortController?.abort();
    this.abortController = new AbortController();

    const t0 = performance.now();
    this.timing.rewriteStart = Date.now();

    callbacks.onStart?.();

    try {
      const results = await rewriteParallel(
        this.parsedResume,
        this.jdSignals,
        this.apiKey,
        callbacks,
        this.abortController.signal
      );
      this.timing.totalRewrite = Math.round(performance.now() - t0);
      return results;
    } catch (err) {
      if (err.name === 'AbortError') {
        callbacks.onAbort?.();
        return null;
      }
      callbacks.onError?.(err);
      throw err;
    }
  }

  cancel() {
    this.abortController?.abort();
  }

  getResumeInfo() {
    return this.parsedResume
      ? {
          name: this.parsedResume.name,
          skillCount: this.parsedResume.skills.length,
          hasExperience: !!this.parsedResume.experience,
          hasSummary: !!this.parsedResume.summary,
          parseMs: this.parsedResume._parseMs,
        }
      : null;
  }

  getJDInfo() {
    return this.jdSignals
      ? {
          title: this.jdSignals.title,
          seniority: this.jdSignals.seniority,
          company: this.jdSignals.company,
          requiredCount: this.jdSignals.requiredSkills.length,
          analyzeMs: this.jdSignals._analyzeMs,
        }
      : null;
  }
}