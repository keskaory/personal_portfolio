// The reading bar under the open menu: where you are, the spread's
// links (as real links), previous / next, and a way to close it. The
// spread's text is also kept here for screen readers.
import { escapeHTML } from "../lib/content.js";

export function createReader(el, { onPage, onTurn, onClose }) {
  const where = el.querySelector("[data-where]");
  const title = el.querySelector("[data-title]");
  const actions = el.querySelector("[data-actions]");
  const sample = el.querySelector("[data-sample]");
  const prev = el.querySelector("[data-prev]");
  const next = el.querySelector("[data-next]");
  const readable = el.querySelector("[data-readable]");
  const summary = el.querySelector("[data-summary]");
  el.querySelector("[data-close]").addEventListener("click", () => onClose());
  prev.addEventListener("click", () => onTurn(-1));
  next.addEventListener("click", () => onTurn(1));

  let mag = null;
  function render(i) {
    const s = mag.spreads[i];
    const inSection = mag.spreads.filter(x => x.section === s.section);
    const k = inSection.indexOf(s) + 1;
    where.textContent = inSection.length > 1 ? `${s.section} · ${k} of ${inSection.length}` : s.section;
    title.textContent = s.title;
    sample.hidden = !s.sample;
    actions.innerHTML = "";
    (s.actions || []).forEach(a => {
      const link = document.createElement("a");
      link.href = a.href;
      link.textContent = a.label;
      if (a.page) {
        link.className = "primary";
        link.addEventListener("click", e => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onPage(a.href);
        });
      } else { link.target = "_blank"; link.rel = "noopener"; }
      actions.appendChild(link);
    });
    readable.textContent = s.readable || s.title;
    summary.textContent = s.summary || "";
    prev.disabled = i === 0;
    next.disabled = i === mag.spreads.length - 1;
  }

  return {
    open(m) {
      if (mag !== m) { mag = m; mag.onChange(i => { if (!el.hidden) render(i); }); }
      render(mag.index);
      el.hidden = false;
      requestAnimationFrame(() => el.classList.add("on"));
    },
    close() {
      el.classList.remove("on");
      setTimeout(() => { if (!el.classList.contains("on")) el.hidden = true; }, 400);
    },
  };
}

export const escape = escapeHTML;
