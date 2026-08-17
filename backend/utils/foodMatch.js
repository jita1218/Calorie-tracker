// Groups logged food entries that are "the same dish" even when the name was
// typed differently each time — whether it came from a photo scan, a typed
// AI lookup, or a fully manual entry. Two-pass algorithm:
//   1. Normalize each name to a token set (strip filler words/numbers/punctuation,
//      de-pluralize) and bucket exact matches — cheap, catches most repeats.
//   2. Fuzzy-merge the remaining distinct buckets whose token sets overlap
//      enough (Jaccard similarity), using union-find — catches wording drift
//      like "Boiled Egg" vs "2 Eggs (boiled)".

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'with', 'and', 'plain', 'fresh', 'whole',
  'piece', 'pieces', 'cup', 'cups', 'bowl', 'bowls', 'glass', 'glasses',
  'katori', 'plate', 'serving', 'servings', 'portion',
  'medium', 'small', 'large', 'extra', 'half',
  'boiled', 'fried', 'roasted', 'steamed', 'cooked', 'raw', 'grilled',
  'homemade', 'home', 'style',
  'one', 'two', 'three', 'four', 'five', 'six',
]);

function singularize(word) {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

export function normalizeFoodName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .filter((w) => !STOP_WORDS.has(w))
    .sort();
}

export function jaccardSimilarity(tokensA, tokensB) {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

const SIMILARITY_THRESHOLD = 0.6;
const MIN_REPEAT_COUNT = 2;

// logs: array of { id, food_name, portion_desc, calories, protein_g, carbs_g, fat_g }
export function clusterFrequentFoods(logs, { minCount = MIN_REPEAT_COUNT, threshold = SIMILARITY_THRESHOLD } = {}) {
  if (logs.length === 0) return [];

  const withTokens = logs.map((log) => ({ log, tokens: normalizeFoodName(log.food_name) }));

  const keyToEntries = new Map();
  for (const item of withTokens) {
    const key = item.tokens.join(' ');
    if (!keyToEntries.has(key)) keyToEntries.set(key, []);
    keyToEntries.get(key).push(item.log);
  }

  const keys = [...keyToEntries.keys()];
  const keyTokens = keys.map((k) => k.split(' ').filter(Boolean));
  const uf = new UnionFind(keys.length);

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (jaccardSimilarity(keyTokens[i], keyTokens[j]) >= threshold) {
        uf.union(i, j);
      }
    }
  }

  const clusters = new Map();
  keys.forEach((key, i) => {
    const root = uf.find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(...keyToEntries.get(key));
  });

  const results = [];
  for (const entries of clusters.values()) {
    if (entries.length < minCount) continue;
    const mostRecent = entries.reduce((a, b) => (b.id > a.id ? b : a));
    const avg = (field) => Math.round(entries.reduce((sum, e) => sum + e[field], 0) / entries.length);
    results.push({
      food_name: mostRecent.food_name,
      portion_desc: mostRecent.portion_desc,
      calories: avg('calories'),
      protein_g: avg('protein_g'),
      carbs_g: avg('carbs_g'),
      fat_g: avg('fat_g'),
      times: entries.length,
      last_id: mostRecent.id,
    });
  }

  results.sort((a, b) => b.times - a.times || b.last_id - a.last_id);
  return results;
}
