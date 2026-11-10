// The chapter list along the edge, built from the stops in content/site.json.
// Chapters with more than one stop list them underneath.
import { escapeHTML } from "../lib/content.js";

export function createChapterNav(el, stops, onGo) {
  const chapters = [];
  stops.forEach((s, i) => {
    let c = chapters.find(x => x.name === s.chapter);
    if (!c) chapters.push((c = { name: s.chapter, stops: [] }));
    c.stops.push({ ...s, index: i });
  });

  el.innerHTML = `<ol>${chapters.map(c => `
    <li class="chapter" data-chapter="${escapeHTML(c.name)}">
      <a href="#${escapeHTML(c.stops[0].id)}" data-index="${c.stops[0].index}">${escapeHTML(c.name)}</a>
      ${c.stops.length > 1 ? `<ol>${c.stops.map(s => `<li><a href="#${escapeHTML(s.id)}" data-index="${s.index}">${escapeHTML(s.label)}</a></li>`).join("")}</ol>` : ""}
    </li>`).join("")}</ol>`;

  el.addEventListener("click", e => {
    const a = e.target.closest("a[data-index]");
    if (!a) return;
    e.preventDefault();
    onGo(Number(a.dataset.index));
  });

  return {
    set(index) {
      const stop = stops[index];
      el.querySelectorAll("a").forEach(a => a.removeAttribute("aria-current"));
      el.querySelectorAll(".chapter").forEach(li => li.classList.toggle("current", li.dataset.chapter === stop.chapter));
      el.querySelectorAll(`a[data-index="${index}"]`).forEach(a => a.setAttribute("aria-current", "step"));
    },
  };
}
