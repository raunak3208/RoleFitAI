window.__envReady = false;
window.__envPromise = (async function loadEnv() {
  try {
    const res = await fetch('/env');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.MISTRAL_API_KEY) {
      window.MISTRAL_API_KEY = data.MISTRAL_API_KEY;
      window.MISTRAL_MODEL   = data.MISTRAL_MODEL || 'mistral-small-latest';
      console.info('[ResumeAI] API key loaded ✓ (' + data.MISTRAL_API_KEY.slice(0, 8) + '…)');
    } else {
      console.warn('[ResumeAI] /env returned but key is empty — check your .env file');
    }
  } catch (err) {
    console.warn('[ResumeAI] /env fetch failed:', err.message,
      '\nMake sure you started the server with: node server.js');
  } finally {
    window.__envReady = true;
    window.dispatchEvent(new Event('envReady'));
  }
})();