// lib/fetchWithRetry.js
// Retry helper with exponential backoff for API overload errors (529/429)

export async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 529 || response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log('API overloaded (' + response.status + '), retrying in ' + waitTime + 'ms (attempt ' + (attempt + 1) + '/' + maxRetries + ')');
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw lastError || new Error('API temporarily unavailable. Please try again in a moment.');
}
