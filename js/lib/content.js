// Every page reads its content through here, so titles, dates and links
// live only in the files under content/.
const cache = {};

async function load(name) {
  if (!cache[name]) {
    cache[name] = fetch(`content/${name}.json`).then(r => {
      if (!r.ok) throw new Error(`Could not load content/${name}.json`);
      return r.json();
    });
  }
  return cache[name];
}

export async function loadAll() {
  const [site, p, e, f, collections] = await Promise.all([load("site"), load("projects"), load("experience"), load("fragrances"), load("collections")]);
  return { site, projects: p.projects, experience: e.experience, fragrances: f.fragrances, collections };
}

export const urls = {
  project: id => `project.html?id=${encodeURIComponent(id)}`,
  experience: id => `experience.html?id=${encodeURIComponent(id)}`,
  fragrance: id => `fragrance.html?id=${encodeURIComponent(id)}`,
  back: id => `index.html?from=${encodeURIComponent(id)}`,
};

// a link that has not been filled in yet falls back to the matching part of the index
export function linkOr(value, fallback) {
  return value && value.trim() ? value : fallback;
}

export function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
