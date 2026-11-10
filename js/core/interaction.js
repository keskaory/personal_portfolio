// Pointer handling for a scene: which artifact is under the pointer, clicks,
// taps, and horizontal drags (used to turn an object in your hand).
// On touch screens the first tap focuses an object and the second opens it.
import * as THREE from "three";

export class Interaction {
  constructor(canvas, camera, hits, handlers) {
    this.canvas = canvas;
    this.camera = camera;
    this.hits = hits;          // invisible meshes with userData.id
    this.h = handlers;         // { hover(id|null), select(id), drag(dx), pointer(x, y), empty() }
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.hovered = null;
    this.down = null;
    this.enabled = true;

    canvas.addEventListener("pointermove", e => this.move(e));
    canvas.addEventListener("pointerdown", e => this.press(e));
    canvas.addEventListener("pointerup", e => this.release(e));
    canvas.addEventListener("pointercancel", () => { this.down = null; });
    canvas.addEventListener("pointerleave", e => {
      if (e.pointerType === "mouse") { this.setHover(null); this.h.pointer?.(0, 0); }
    });
  }

  // which objects can be pointed at (changes with the current stop)
  setHits(hits) {
    this.hits = hits;
    this.setHover(null);
  }

  pick(e) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    return hit ? hit.object.userData.id : null;
  }

  setHover(id) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.canvas.style.cursor = id ? "pointer" : "";
    this.h.hover?.(id);
  }

  move(e) {
    const id = this.pick(e);
    if (e.pointerType === "mouse") this.h.pointer?.(this.ndc.x, this.ndc.y);
    if (this.down && e.pointerId === this.down.id) {
      const dx = e.clientX - this.down.x;
      if (Math.abs(dx) > 3 || this.down.dragging) {
        this.down.dragging = true;
        this.h.drag?.(e.clientX - this.down.lastX);
        this.down.lastX = e.clientX;
        this.canvas.style.cursor = "grabbing";
      }
      return;
    }
    if (!this.enabled || e.pointerType !== "mouse") return;
    this.setHover(id);
  }

  press(e) {
    this.down = { id: e.pointerId, x: e.clientX, lastX: e.clientX, dragging: false };
    this.canvas.setPointerCapture(e.pointerId);
  }

  release(e) {
    const d = this.down;
    this.down = null;
    if (!d) return;
    if (d.dragging) { this.canvas.style.cursor = this.hovered ? "pointer" : ""; return; }
    if (!this.enabled) return;

    const id = this.pick(e);
    if (e.pointerType !== "mouse") {
      // touch: first tap focuses, second tap on the same object opens it
      if (id && id === this.hovered) this.h.select?.(id);
      else if (id) this.setHover(id);
      else { this.setHover(null); this.h.empty?.(); }
      return;
    }
    if (id) this.h.select?.(id);
    else this.h.empty?.();
  }
}
