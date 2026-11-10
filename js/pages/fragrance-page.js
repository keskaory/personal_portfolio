// Fills fragrance.html from content/fragrances.json using ?id=
const $ = id => document.getElementById(id);
const fade = $("fade");

async function main() {
  const id = new URLSearchParams(location.search).get("id");
  let list = [];
  try {
    const res = await fetch("content/fragrances.json");
    list = (await res.json()).fragrances;
  } catch {
    $("name").textContent = "This page couldn't load";
    $("meta").textContent = "Try reloading, or go back to the window.";
    fade.classList.remove("in");
    return;
  }

  const i = list.findIndex(f => f.id === id);
  if (i === -1) {
    $("name").textContent = "No bottle by that name";
    $("meta").textContent = "It may have been moved. Go back to the window to see the others.";
    document.querySelector(".photo-slot").hidden = true;
    document.querySelectorAll(".fragrance h2, .sibling-nav").forEach(el => (el.hidden = true));
    fade.classList.remove("in");
    return;
  }

  const f = list[i];
  document.title = `${f.name} · Kaory Gatmaitan`;
  $("name").textContent = f.name;
  $("meta").textContent = `${f.size} ml`;
  $("notes").textContent = f.notes;
  $("memory").textContent = f.memory;
  $("wear").textContent = f.wear;
  $("acquired").textContent = f.acquired;
  $("back").href = `index.html?from=${encodeURIComponent(f.id)}`;

  const prev = list[(i - 1 + list.length) % list.length];
  const next = list[(i + 1) % list.length];
  if (list.length > 1) {
    $("prev").href = `fragrance.html?id=${encodeURIComponent(prev.id)}`;
    $("prev").textContent = `Previous: ${prev.name}`;
    $("next").href = `fragrance.html?id=${encodeURIComponent(next.id)}`;
    $("next").textContent = `Next: ${next.name}`;
  } else {
    document.querySelector(".sibling-nav").hidden = true;
  }

  // arrive from black, the same black the scene faded into
  requestAnimationFrame(() => fade.classList.remove("in"));
}

window.addEventListener("pageshow", e => { if (e.persisted) fade.classList.remove("in"); });
main();
