// The note beside whatever you are holding. One template for every kind of
// object: each artifact describes itself with a small panel model:
//   { title, meta, body, facts: [{ label, value }], list: { heading, items },
//     hint, actions: [{ label, href, page }], sample }
// An action with `page: true` opens with the push-in transition; others are
// ordinary links (GitHub opens in a new tab).
import { escapeHTML } from "../lib/content.js";

export function createExaminePanel(el, { onPage, onBack }) {
  const title = el.querySelector("[data-title]");
  const meta = el.querySelector("[data-meta]");
  const body = el.querySelector("[data-body]");
  const extra = el.querySelector("[data-extra]");
  const hint = el.querySelector("[data-hint]");
  const actions = el.querySelector("[data-actions]");
  const sample = el.querySelector("[data-sample]");
  const back = el.querySelector("[data-back]");
  back.addEventListener("click", () => onBack());

  const setText = (node, text) => { node.textContent = text || ""; node.hidden = !text; };

  return {
    open(model) {
      setText(title, model.title);
      setText(meta, model.meta);
      setText(body, model.body);
      setText(hint, model.hint);
      sample.hidden = !model.sample;

      let html = "";
      if (model.facts && model.facts.length) {
        html += `<dl class="examine-facts">${model.facts.map(f => `<div><dt>${escapeHTML(f.value)}</dt><dd>${escapeHTML(f.label)}</dd></div>`).join("")}</dl>`;
      }
      if (model.list && model.list.items && model.list.items.length) {
        html += `<p class="examine-list-heading">${escapeHTML(model.list.heading)}</p><ul class="examine-list">${model.list.items.map(i => `<li>${escapeHTML(i)}</li>`).join("")}</ul>`;
      }
      extra.innerHTML = html;
      extra.hidden = !html;

      actions.querySelectorAll("a").forEach(a => a.remove());
      (model.actions || []).filter(a => a.href).forEach(a => {
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
        } else {
          link.target = "_blank";
          link.rel = "noopener";
        }
        actions.insertBefore(link, back);
      });

      el.hidden = false;
      requestAnimationFrame(() => el.classList.add("on"));
    },
    close() {
      el.classList.remove("on");
      setTimeout(() => { if (!el.classList.contains("on")) el.hidden = true; }, 500);
    },
    focus() { (actions.querySelector("a") || back).focus({ preventScroll: true }); },
  };
}
