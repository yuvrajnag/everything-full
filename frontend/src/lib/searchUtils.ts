import { products as localProducts } from "@/data/products";

export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => 
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function normalize(str: string): string {
  return (str || "").toLowerCase().replace(/[\s\-_.,;'"!]/g, "");
}

export function normalizeWithSpaces(str: string): string {
  return (str || "").toLowerCase().replace(/[\-_.,;'"!]/g, " ").replace(/\s+/g, " ").trim();
}

const isPrefixMatch = (target: string, query: string) => {
  const norm = normalizeWithSpaces(target);
  const qNorm = normalizeWithSpaces(query);
  if (!qNorm) return false;
  return norm.split(' ').some(word => word.startsWith(qNorm));
};

export function performSearch(query: string, backendProducts: any[]) {
  if (!query.trim() || !Array.isArray(backendProducts)) {
    return [];
  }
  const q = normalize(query);

  const enrichedProducts = backendProducts.map(p => {
    const local = localProducts.find(lp => lp.id === p.id);
    return { ...p, keywords: local?.keywords || [], rating: local?.rating || 5.0, brand: local?.brand || p.brand || "" };
  });

  const scoredResults = enrichedProducts.map(p => {
    let score = -1;
    
    const normTitle = normalize(p.title);
    
    // 1. Exact product name match
    if (normTitle === q) {
      score = 100;
    } 
    // 2. Exact keyword match or brand match
    else if (p.keywords.some((k: string) => normalize(k) === q) || normalize(p.brand) === q) {
      score = 80;
    }
    // 3. Partial match (in title, keywords, category, or description)
    else if (
      isPrefixMatch(p.title, query) || 
      p.keywords.some((k: string) => isPrefixMatch(k, query)) ||
      isPrefixMatch(p.category, query) ||
      isPrefixMatch(p.description, query) ||
      isPrefixMatch(p.brand, query)
    ) {
      score = 60;
    }
    // 4. Fuzzy match (Levenshtein dist 1-2 on any keyword or title)
    else {
      const checkFuzzy = (target: string) => {
        const normTarget = normalize(target);
        if (Math.abs(normTarget.length - q.length) > 2) return false;
        return levenshtein(q, normTarget) <= 2;
      };
      
      if (checkFuzzy(p.title) || p.keywords.some((k: string) => checkFuzzy(k))) {
        score = 40;
      }
    }
    
    return { product: p, score };
  }).filter(res => res.score > 0);

  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults.map(res => res.product);
}
