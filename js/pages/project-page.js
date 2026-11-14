// project.html?id=  A case study page, built from content/projects.json.
import { startPage, escapeHTML, sampleNote, figure, sections, siblings, notFound } from "./common.js";
import { urls, linkOr } from "../lib/content.js";

const ready = await startPage();
if (ready) {
  const { projects } = ready.content;
  const id = new URLSearchParams(location.search).get("id");
  const i = projects.findIndex(p => p.id === id);
  const page = document.getElementById("page");
  const back = document.getElementById("back");
  back.textContent = "Back to projects";

  if (i === -1) {
    back.href = "index.html#projects";
    notFound(page, "project");
  } else {
    const p = projects[i];
    document.title = `${p.title} · Kaory Gatmaitan`;
    back.href = urls.back(p.id);
    const github = linkOr(p.github, "");
    page.insertAdjacentHTML("beforeend", `
      <h1>${escapeHTML(p.title)}</h1>
      <p class="meta">${escapeHTML((p.stack || []).join(" · "))}</p>
      ${sampleNote(p)}
      <div class="detail-body">
        <div class="detail-text">
          <p class="lede">${escapeHTML(p.description)}</p>
          ${p.results && p.results.length ? `<h2>Results</h2><dl class="results">${p.results.map(r => `<div><dt>${escapeHTML(r.value)}</dt><dd>${escapeHTML(r.label)}</dd></div>`).join("")}</dl>` : ""}
          ${sections(p.caseStudy) || `<p class="meta">There is no longer write-up for this project yet.</p>`}
          ${github ? `<p class="links"><a href="${escapeHTML(github)}" target="_blank" rel="noopener">Code on GitHub</a></p>` : ""}
        </div>
        <div class="detail-side" id="side"></div>
      </div>
      ${siblings(projects, i, urls.project, x => x.title)}`);
    document.getElementById("side").appendChild(figure(p.preview, p.id, p.sample));
  }
  ready.done();
}
