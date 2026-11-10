// experience.html?id=  Built from content/experience.json.
import { startPage, escapeHTML, sampleNote, sections, list, siblings, notFound } from "./common.js";
import { urls } from "../lib/content.js";

const ready = await startPage();
if (ready) {
  const { experience } = ready.content;
  const id = new URLSearchParams(location.search).get("id");
  const i = experience.findIndex(e => e.id === id);
  const page = document.getElementById("page");
  const back = document.getElementById("back");
  back.textContent = "Back to the case files";

  if (i === -1) {
    back.href = "index.html#experience";
    notFound(page, "entry");
  } else {
    const e = experience[i];
    document.title = `${e.organization} · Kaory Gatmaitan`;
    back.href = urls.back(e.id);
    const meta = [e.role, e.dates, e.location].filter(Boolean).join(" · ");
    page.insertAdjacentHTML("beforeend", `
      <h1>${escapeHTML(e.organization)}</h1>
      <p class="meta">${escapeHTML(meta)}</p>
      ${sampleNote(e)}
      <div class="detail-body single">
        <div class="detail-text">
          <p class="lede">${escapeHTML(e.summary)}</p>
          ${e.responsibilities && e.responsibilities.length ? `<h2>Responsibilities</h2>${list(e.responsibilities)}` : ""}
          ${e.contributions && e.contributions.length ? `<h2>What I contributed</h2>${list(e.contributions)}` : ""}
          ${sections(e.caseStudy)}
        </div>
      </div>
      ${siblings(experience, i, urls.experience, x => x.organization)}`);
  }
  ready.done();
}
