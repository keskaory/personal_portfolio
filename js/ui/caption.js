// The subtitle line at the bottom of the frame.
export function createCaption(el) {
  let timer = null;
  return {
    show(text, { hold } = {}) {
      clearTimeout(timer);
      el.textContent = text;
      el.classList.add("on");
      if (hold) timer = setTimeout(() => el.classList.remove("on"), hold);
    },
    hide() {
      clearTimeout(timer);
      el.classList.remove("on");
    },
  };
}
