// contents.html: the whole site as plain links, for anyone in a hurry.
// Built entirely from the content files.
import { startPage, escapeHTML } from "./common.js";
import { urls, linkOr } from "../lib/content.js";

const ready = await startPage();
if (ready) {
  const { site, projects, experience, fragrances, collections } = ready.content;
  const { person, links } = site;
  const sample = flag => (flag ? ` <span class="tag">Sample</span>` : "");
  const contact = [
    linkOr(links.email, "") && `<a href="mailto:${escapeHTML(links.email)}">${escapeHTML(links.email)}</a>`,
    linkOr(links.linkedin, "") && `<a href="${escapeHTML(links.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`,
    linkOr(links.github, "") && `<a href="${escapeHTML(links.github)}" target="_blank" rel="noopener">GitHub</a>`,
  ].filter(Boolean);

  document.getElementById("page").insertAdjacentHTML("beforeend", `
    <p class="meta">${escapeHTML(person.school)}. ${escapeHTML(person.graduation)}.</p>

    <h2 id="about">Who I am</h2>
    <p>${escapeHTML(person.line)}</p>
    ${(person.bio || []).map(p => `<p>${escapeHTML(p)}</p>`).join("")}

    <h2 id="projects">Projects</h2>
    <ul class="index-list">${projects.map(p => `<li>
      <a href="${p.caseStudy ? urls.project(p.id) : `index.html#${encodeURIComponent(p.id)}`}">${escapeHTML(p.title)}</a>${sample(p.sample)}
      <span class="index-sub">${escapeHTML(p.summary)} ${p.stack && p.stack.length ? `<span class="index-stack">${escapeHTML(p.stack.join(" · "))}</span>` : ""}</span>
    </li>`).join("")}</ul>

    <h2 id="experience">Experience</h2>
    <ul class="index-list">${experience.map(e => `<li>
      <a href="${urls.experience(e.id)}">${escapeHTML(e.organization)}</a>${sample(e.sample)}
      <span class="index-sub">${escapeHTML(e.role)}, ${escapeHTML(e.dates)}</span>
    </li>`).join("")}</ul>

    <h2 id="resume">Resume</h2>
    <p>${linkOr(links.resume, "") ? `<a href="${escapeHTML(links.resume)}">Download the resume (PDF)</a>` : "The resume PDF isn't linked yet. Add it in content/site.json under links.resume."}</p>

    <h2 id="contact">Contact</h2>
    <p>${contact.length ? contact.join(" · ") : "Contact details aren't added yet. Add them in content/site.json under links."}</p>

    <h2 id="beyond">Beyond the work</h2>
    <ul class="index-list">${fragrances.map(f => `<li><a href="${urls.fragrance(f.id)}">${escapeHTML(f.name)}</a>${sample(f.sample)} <span class="index-sub">${escapeHTML(String(f.size))} ml</span></li>`).join("")}</ul>
    ${Object.entries(collections || {}).filter(([k]) => !k.startsWith("_")).map(([, c]) => `
      <h3 class="index-h3">${escapeHTML(c.title)}${sample(c.sample)}</h3>
      ${c.intro ? `<p class="index-sub">${escapeHTML(c.intro)}</p>` : ""}
      ${c.items && c.items.length ? `<ul class="index-list compact">${c.items.map(i => `<li>${escapeHTML(typeof i === "string" ? i : i.title)}</li>`).join("")}</ul>` : ""}`).join("")}
  `);
  ready.done();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}
