// Shared by the reading pages: header links from the data, the fade in from
// black, and small rendering helpers.
import { loadAll, linkOr, escapeHTML } from "../lib/content.js";
import { drawPlaceholder, hashString } from "../lib/placeholder-art.js";

export { escapeHTML };

export async function startPage() {
  const fade = document.getElementById("fade");
  window.addEventListener("pageshow", e => { if (e.persisted && fade) fade.classList.remove("in"); });
  let content;
  try {
    content = await loadAll();
  } catch {
    document.getElementById("page").insertAdjacentHTML("beforeend", "<p>This page couldn't load its content. Try reloading.</p>");
    document.querySelector(".loading")?.remove();
    fade?.classList.remove("in");
    return null;
  }
  const resume = linkOr(content.site.links.resume, "contents.html#resume");
  document.querySelectorAll("[data-resume]").forEach(a => { a.href = resume; if (/\.pdf$/i.test(resume)) { a.target = "_blank"; a.rel = "noopener"; } });
  document.querySelector(".loading")?.remove();
  return {
    content,
    done: () => requestAnimationFrame(() => fade?.classList.remove("in")),
  };
}

export const sampleNote = item => (item.sample ? `<p class="sample-note">Sample content</p>` : "");

// a real image if there is one, otherwise the drawn placeholder
export function figure(preview, id, sample) {
  const fig = document.createElement("figure");
  fig.className = "preview";
  if (preview && preview.image) {
    const img = document.createElement("img");
    img.src = preview.image;
    img.alt = preview.caption || "";
    img.loading = "lazy";
    fig.appendChild(img);
  } else {
    const c = document.createElement("canvas");
    c.width = 1500; c.height = 1000;
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", "Placeholder image");
    drawPlaceholder(c, { format: (preview && preview.format) || "chart", seed: hashString(id), label: sample ? "Sample preview" : "" });
    fig.appendChild(c);
  }
  if (preview && preview.caption) {
    const cap = document.createElement("figcaption");
    cap.textContent = preview.caption;
    fig.appendChild(cap);
  }
  return fig;
}

export const sections = cs =>
  cs && cs.sections ? cs.sections.map(s => `<h2>${escapeHTML(s.heading)}</h2><p>${escapeHTML(s.body)}</p>`).join("") : "";

export const list = items => (items && items.length ? `<ul class="bullets">${items.map(i => `<li>${escapeHTML(i)}</li>`).join("")}</ul>` : "");

export function siblings(items, i, url, label) {
  if (items.length < 2) return "";
  const prev = items[(i - 1 + items.length) % items.length];
  const next = items[(i + 1) % items.length];
  return `<nav class="sibling-nav" aria-label="Other entries">
    <a href="${url(prev.id)}">Previous: ${escapeHTML(label(prev))}</a>
    <a href="${url(next.id)}">Next: ${escapeHTML(label(next))}</a>
  </nav>`;
}

export function notFound(page, what) {
  page.insertAdjacentHTML("beforeend", `<h1>Nothing here</h1><p class="meta">That ${what} may have been renamed or removed. The <a href="contents.html">index</a> lists everything.</p>`);
}
