
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

class CacheManager {
  constructor() {
    this.store = new Map();
    this.hitCount = 0;
    this.missCount = 0;
  }

  
  buildKey(jdSignals, section) {
    const roleCluster = this._clusterRole(jdSignals.title || '');
    const seniorityCluster = jdSignals.seniority || 'mid';
    const topSkills = (jdSignals.requiredSkills || [])
      .slice(0, 5)
      .map(s => s.toLowerCase())
      .sort()
      .join(',');
    return `${roleCluster}::${seniorityCluster}::${topSkills}::${section}`;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.store.delete(key);
      this.missCount++;
      return null;
    }
    this.hitCount++;
    return entry.value;
  }

  set(key, value) {
    this.store.set(key, { value, timestamp: Date.now() });
    // Evict oldest if cache grows large
    if (this.store.size > 200) {
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? ((this.hitCount / total) * 100).toFixed(1) + '%' : '0%',
      size: this.store.size,
    };
  }

  clear() {
    this.store.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Cluster job titles into broad families for cache reuse.
   */
  _clusterRole(title) {
    const t = title.toLowerCase();
    if (/engineer|developer|programmer|swe|sde/.test(t)) return 'engineering';
    if (/data|analyst|scientist|ml|ai|machine learning/.test(t)) return 'data';
    if (/product|pm|manager/.test(t)) return 'product';
    if (/design|ux|ui/.test(t)) return 'design';
    if (/market|growth|seo|content/.test(t)) return 'marketing';
    if (/sales|account|revenue/.test(t)) return 'sales';
    if (/finance|accounting|cfo/.test(t)) return 'finance';
    if (/ops|operation|supply/.test(t)) return 'operations';
    return 'general';
  }
}

export const cacheManager = new CacheManager();