// Places the traced, image-model art in the scene: Claude with the pearl, its rays, glow and beam
// anchored at her raised fingertip, and the golden tree as a frame (trunk up one edge, one long
// bough across the top). The traced layers come from trace.py (art/vector/*.json).
//
// Claude stands large and half-length in the bottom right corner, her raised arm and the pearl
// right of the conversation. The tree is mirrored: its trunk at the left edge (behind the session
// list when that is open) and its bough reaching across the top to her. The app's side pane, on
// the right while it is open, covers her; a backdrop is not told which panels are open.
// (Until 2026-11-25 a second placement, /last-pearl left, stood her whole in the bottom left corner.)
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const n = v => Math.round(v * 10) / 10

function load(name) {
  return JSON.parse(readFileSync(join(here, 'vector', `${name}.json`), 'utf8'))
}

// The traced paths, bottom to top (the tree; and a traced figure, art/old/whole-figure). The bottom
// layer of a traced figure is its whole outline (class "sil"): light mode gives it an ink edge, so
// cream cloth still reads against a cream sky. A trace may carry that edge on inside the figure too
// (art.edge, open curves: trace.py --edge).
function paths(art, edge = 0) {
  const inner = art.edge ? `<path class="sil" fill="none" stroke-width="${n(edge)}" stroke-linecap="round" d="${art.edge}"/>` : ''
  return art.layers
    .map(l => `<path${l.sil ? ` class="sil" stroke-width="${n(edge)}"` : ''} fill="${l.fill}" fill-rule="evenodd" d="${l.d}"/>`)
    .join('') + inner
}

// Claude herself: GPT's vector drawing of her, fitted by figure_svg.py (art.defs and art.parts, in
// the original picture's pixels). Light mode gives her an ink edge (class "sil"): her whole outline
// (art.sil), drawn under her and twice `edge` wide so `edge` of it shows outside her; and where her
// raised sleeve lies over her hair and the cape's lining, the sleeve's own edge (art.arm, open
// curves), drawn over everything a little wider than `edge`, so the arm reads as one shape.
function drawn(art, edge) {
  const arm = art.arm ? `<path class="sil" fill="none" stroke-width="${n(1.2 * edge)}" stroke-linecap="round" d="${art.arm}"/>` : ''
  const sil = art.sil ? `<path class="sil" fill="none" stroke-width="${n(2 * edge)}" d="${art.sil}"/>` : ''
  return `${art.defs}${sil}${art.parts.join('')}${arm}`
}

// Claude is drawn in a box 1150 units tall (V), her height FIG_H in it and her left edge FIG_X; the
// window shows the part of that box her view (below) chooses. u is the box's units to one pixel of
// her original picture.
const V = 1150
const FIG_H = 820
const FIG_X = -34
function claude(name) {
  const art = load(name)
  const s = FIG_H / art.height
  const x = FIG_X
  const y = V - 10 - FIG_H
  const [px, py, pr] = art.pearl
  return { art, s, u: s * art.scale, x, y, PX: n(x + px * s), PY: n(y + py * s), R: n(Math.max(13, pr * s)) }
}
// The parallax: the scene's planes ride one slow swing from side to side (class "par" in the
// scene's style, build-scene.mjs), as a stage set does when the camera slides past it: the nearer
// a plane, the further it moves. SWAY is how far each goes either way, in its own units (the
// window's points for her, and close to that for the rest).
export const SWAY = { sky: 2, tree: 4.5, clouds: 7, figure: 10 }
export const sway = (far, inner, cls = '') => `<g class="par${cls}" style="--d:${far}">${inner}</g>`

// Light mode and dark mode show her differently. A backdrop is not told which mode is showing, so
// the scene carries both figures, each with its own light, and its style shows one (LAYOUT_CSS).
//   light  standing, a half-length portrait as large as a companion beside the conversation,
//          raising the pearl: cut off by the window's foot (at her skirt's bows) and by its right
//          edge (her far sleeve and the book), the beam rising through the upper third of the
//          window (claude.json: GPT's SVG of claude-gpt-3.png, with the raised hand redrawn)
//   dark   seated, whole, facing left toward the conversation, the pearl cupped in her hand in
//          front of her knees and its beam rising from there (claude-seated.json: GPT's SVG of
//          claude-seated-2.png)
// Each one's view, all but `aspect` and `phone` in pixels of her original picture:
//   size    the height of a 1440 by 900 (16:10) window, so she is drawn at 900/size points to
//           its pixel there (larger makes her smaller, about the bottom right corner)
//   foot    how far below the pearl the window's foot is (her drawing must reach a little further:
//           its --keep box, if it has one)
//   pearl   how far left of the window's right edge the pearl is held (the drawing must reach past
//           that edge by more than her sway)
//   aspect  the narrowest window (width over height) that shows her at that full size; a narrower
//           one, the usual Mac window among them, shrinks her by its width about the bottom right
//           corner, so the pearl stays clear of the conversation column
//   phone   how much a phone, whose width would make her small, enlarges her about that corner
//   edge    how far her light-mode ink edge shows outside her (light mode's figure only)
//   label   where the beam's label sits, in the window's points: its left edge `clear` right of the
//           pearl, its top `up` above it (negative: below), `wide` its width
//   star, glow  the pearl's breathing star and its glow, as multiples of the pearl's radius
//   front   for a pearl held down among the clouds at the scene's foot: so many points of the beam,
//           from the pearl up, drawn again in front of the clouds (and behind her), fading out at the
//           top into the beam behind the tree and the clouds
const FIGURES = {
  light: { name: 'claude', size: 1406, foot: 894, pearl: 269, aspect: 1.6, phone: 2.25, edge: 2.5,
    // just under the glare, in the pocket between her raised arm and her head
    label: { clear: 36, up: -12, wide: 108 }, star: 2.6, glow: 6 },
  // cut off by the window's foot across her skirt, below the bow at her hip (chosen 2026-11-25 from a
  // line drawn on a screenshot; 865 shows her whole, her boots just above the foot, perched over the
  // clouds)
  dark: { name: 'claude-seated', size: 1909, foot: 345, pearl: 540, aspect: 1.8, phone: 2.3, edge: 0, front: 160,
    // right of the beam, in the open sky above her lifted face and below the bough's fruit
    label: { clear: 26, up: 292, wide: 72 }, star: 1.9, glow: 4.2 },
}

// The window's view of her box: its height is VH of the box's units, its foot `foot` below the
// pearl and its right edge `pearl` right of it, pinned to the window's bottom right corner (the
// window's height sets her size, and a window narrower than `aspect` its width). The rays were drawn
// to reach across a window V units high, so they are scaled by VH / V about the pearl; the beam was
// drawn for light mode's view, so in another it is scaled by VH over that one's VH, to look the same.
function view(mode) {
  const f = FIGURES[mode]
  const c = claude(f.name)
  const { u, PX, PY } = c
  const VH = f.size * u
  const top = PY + f.foot * u - VH
  const VW = f.aspect * VH
  const left = PX + f.pearl * u - VW
  const k = +(VH / V).toFixed(4)
  const lightVH = FIGURES.light.size * claude(FIGURES.light.name).u
  const b = +(VH / lightVH).toFixed(4)
  const about = q => `translate(${PX} ${PY}) scale(${q}) translate(${-PX} ${-PY})`
  return {
    f,
    c,
    // the window's points, at 900 high, in the box's units
    pt: v => (v * VH) / 900,
    BOX: `width="100%" height="100%" viewBox="${n(left)} ${n(top)} ${n(VW)} ${n(VH)}" preserveAspectRatio="xMaxYMax meet"`,
    RAYS: ` transform="${about(k)}"`,
    BEAM: b === 1 ? '' : ` transform="${about(b)}"`,
    b,
    // light mode's ids stay as they were; dark mode's carry a suffix, as both are in one scene
    id: mode === 'light' ? '' : '-d',
  }
}

// fig-in lets a phone enlarge her about the window's bottom right corner. Her light and she
// herself are each drawn in this box, so they sway as one and the beam stays on the pearl; "m-"
// and the mode name it after the one mode that shows it.
const box = (mode, BOX, inner) => sway(SWAY.figure, `<g class="fig-in"><svg ${BOX} overflow="visible">${inner}</svg></g>`, ` m-${mode}`)

// The style that goes with this layout: each mode shows its own figure and light (the media query
// is written as the scene's own, which art/preview.mjs relies on), the tree's sway runs from rest
// toward its trunk's corner (top left) and back (see treeLayer), and a phone enlarges her.
export const LAYOUT_CSS = `.m-light{display:none}@media (prefers-color-scheme: light){.m-dark{display:none}.m-light{display:inline}}.tree-art{transform-origin:0 0}.pt{--o:-1}.fig-in{transform-box:view-box;transform-origin:100% 100%}@media (max-width:700px){${Object.keys(FIGURES).map(m => `.m-${m} .fig-in{transform:scale(${FIGURES[m].phone})}`).join('')}}`

// The beam's label, placed by the view's `label` in the window's points.
function label({ PX, PY }, pt, { clear, up, wide }) {
  const eq = load('equation')
  return `translate(${n(PX + pt(clear))} ${n(PY - pt(up))}) scale(${+(pt(wide) / eq.width).toFixed(4)})`
}

// The radius of the half disc that ends the beam's outer band below the pearl: a little over the
// band's half width.
const CAP = 26
// Its fade from the pearl outward: quick at first, then a long faint tail (ease-out quart, the
// brightness falling as the fourth power of what is left of the radius), from the band's own .35.
const CAP_FADE = [0, 0.08, 0.18, 0.3, 0.45, 0.65, 1]
  .map(at => `<stop offset="${at}" class="beam1" stop-opacity="${Math.round(0.35 * (1 - at) ** 4 * 1000) / 1000}"/>`)
  .join('')
// The horizontal glare across the pearl: a thin spindle, pointed at both ends, `half` long each
// way and `thick` at its middle.
const spindle = (cx, cy, half, thick) =>
  `M${n(cx - half)} ${cy}Q${cx} ${n(cy - 2 * thick)} ${n(cx + half)} ${cy}Q${cx} ${n(cy + 2 * thick)} ${n(cx - half)} ${cy}Z`

// Behind the tree: the pearl's slow rays, the beam rising from it and the dots that climb it.
// "rays", "beam", "flare" and the dots' size are the gauge's to set (hooks/gauge.ts); the flare
// lies under the dots and stays unseen until the session's context is high. Below the pearl the
// beam's pale outer band ends in "cap", a half disc that fades outward in every direction (the gauge
// scales it with the band's width), and a thin horizontal glare across the pearl (part of "beam")
// lies over the join. The glare breathes with the pearl's star (class "sh", build-scene.mjs).
// What both modes' lights and figures share, drawn once at the top of the scene and placed by <use>:
// the pearl's rays, around the origin, and the beam's label, Re(s) = 1/2.
export function sharedDefs() {
  const rays = []
  for (let i = 0; i < 18; i++) {
    const a0 = (i * 20 - 4) * (Math.PI / 180)
    const a1 = (i * 20 + 6) * (Math.PI / 180)
    const L = 1500
    rays.push(`<path class="${i % 2 ? 'ray-a' : 'ray-b'}" d="M0 0L${n(Math.cos(a0) * L)} ${n(Math.sin(a0) * L)}L${n(Math.cos(a1) * L)} ${n(Math.sin(a1) * L)}Z"/>`)
  }
  return `<defs><g id="rayset">${rays.join('')}</g><path id="eqpath" d="${load('equation').d}"/></defs>`
}

export function claudeLight(mode) {
  const { c, BOX, RAYS, BEAM, id } = view(mode)
  const { PX, PY, R } = c
  const zeros = []
  for (let i = 0; i < 6; i++) {
    // Each dot is a zero-length line with round ends, so its size is its stroke width, which the
    // gauge sets: the dots grow with the session's context. z0 are the larger dots, z1 the smaller.
    zeros.push(`<path class="zero z${i % 2} rise" d="M${PX} ${n(PY - R - 6 - i * 4)}h0" style="animation-delay:-${n(i * 2.7)}s"/>`)
  }
  return box(mode, BOX, `<defs>
<linearGradient id="beam${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" class="beam0" stop-opacity="1"/><stop offset=".35" class="beam1" stop-opacity=".85"/><stop offset="1" class="beam1" stop-opacity=".25"/></linearGradient>
<linearGradient id="beamw${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" class="beam1" stop-opacity=".35"/><stop offset="1" class="beam1" stop-opacity="0"/></linearGradient>
<radialGradient id="cap${id}" gradientUnits="userSpaceOnUse" cx="${PX}" cy="${PY}" r="${CAP}">${CAP_FADE}</radialGradient>
<radialGradient id="glare${id}"><stop offset="0" class="beam0" stop-opacity="1"/><stop offset=".55" class="beam0" stop-opacity=".8"/><stop offset="1" class="beam1" stop-opacity=".35"/></radialGradient>
<radialGradient id="flare${id}"><stop offset="0" class="beam0" stop-opacity=".9"/><stop offset=".45" class="beam1" stop-opacity=".5"/><stop offset="1" class="beam1" stop-opacity="0"/></radialGradient>
<radialGradient id="raysfade${id}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="raymask${id}" maskUnits="userSpaceOnUse" x="-3000" y="-3000" width="7000" height="7000"><circle cx="${PX}" cy="${PY}" r="950" fill="url(#raysfade${id})"/></mask>
</defs>
<g${RAYS}><g class="rays"><g mask="url(#raymask${id})" opacity=".9"><g class="spin" style="animation-duration:240s"><use href="#rayset" transform="translate(${PX} ${PY})"/></g></g></g>
<g${BEAM}><path class="cap" style="transform-origin:${PX}px ${PY}px" fill="url(#cap${id})" d="M${n(PX - CAP)} ${PY}A${CAP} ${CAP} 0 0 0 ${n(PX + CAP)} ${PY}Z"/>
<g class="beam"><rect class="shimmer" x="${n(PX - 22)}" y="-3000" width="44" height="${n(PY + 3000)}" fill="url(#beamw${id})"/>
<rect class="shimmer" x="${n(PX - 4)}" y="-3000" width="8" height="${n(PY + 3000)}" fill="url(#beam${id})" style="animation-duration:5s"/>
<g class="sh"><path fill="url(#glare${id})" d="${spindle(PX, PY, 66, 3.5)}"/></g></g>
<g class="flare"><ellipse cx="${PX}" cy="${n(PY - 1200)}" rx="95" ry="1300" fill="url(#flare${id})"/><rect x="${n(PX - 9)}" y="-3000" width="18" height="${n(PY + 3000)}" fill="url(#beam${id})"/></g>
<g>${zeros.join('')}</g></g></g>`)
}

// In front of everything: Claude herself, the beam's label, then the pearl and its glow. The label
// is Re(s) = 1/2, the equation of the critical line the beam stands for, written in a pen hand by
// LaTeX and kept as one outline (equation.py), with a thin outline in its own colour for a slightly
// heavier pen; the gauge brightens it with the beam.
export function claudeFigure(mode) {
  const { f, c, pt, BOX, BEAM, b, id } = view(mode)
  const { art, s, x, y, PX, PY, R } = c
  // the beam's foot in front of the clouds: the same beam (as tall, so its shading matches), seen
  // through a mask that keeps `front` points of it above the pearl, fading out over the top 60%
  const H = n(pt(f.front ?? 0) / b)
  const front = f.front
    ? `<defs><linearGradient id="fade${id}" x1="0" y1="1" x2="0" y2="0"><stop offset=".4" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="front${id}" maskUnits="userSpaceOnUse" x="${n(PX - 200)}" y="${n(PY - H)}" width="400" height="${H}"><rect x="${n(PX - 200)}" y="${n(PY - H)}" width="400" height="${H}" fill="url(#fade${id})"/></mask></defs>` +
      `<g${BEAM}><g mask="url(#front${id})"><g class="beam"><rect class="shimmer" x="${n(PX - 22)}" y="-3000" width="44" height="${n(PY + 3000)}" fill="url(#beamw${id})"/><rect class="shimmer" x="${n(PX - 4)}" y="-3000" width="8" height="${n(PY + 3000)}" fill="url(#beam${id})" style="animation-duration:5s"/></g><g class="flare"><rect x="${n(PX - 9)}" y="-3000" width="18" height="${n(PY + 3000)}" fill="url(#beam${id})"/></g></g><g class="beam"><g class="sh"><path fill="url(#glare${id})" d="${spindle(PX, PY, 66, 3.5)}"/></g></g></g>`
    : ''
  const EQ = label(c, pt, f.label)
  const edge = f.edge * art.scale
  const star = (cx, cy, k) =>
    `M${cx} ${n(cy - k)}C${n(cx + 2)} ${n(cy - 2)} ${n(cx + 2)} ${n(cy - 2)} ${n(cx + k)} ${cy}C${n(cx + 2)} ${n(cy + 2)} ${n(cx + 2)} ${n(cy + 2)} ${cx} ${n(cy + k)}C${n(cx - 2)} ${n(cy + 2)} ${n(cx - 2)} ${n(cy + 2)} ${n(cx - k)} ${cy}C${n(cx - 2)} ${n(cy - 2)} ${n(cx - 2)} ${n(cy - 2)} ${cx} ${n(cy - k)}Z`
  return box(mode, BOX, `<defs>
<radialGradient id="glow${id}"><stop offset="0" class="glow0" stop-opacity="1"/><stop offset=".18" class="glow1" stop-opacity=".75"/><stop offset=".5" class="glow2" stop-opacity=".22"/><stop offset="1" class="glow2" stop-opacity="0"/></radialGradient>
</defs>${front}
<g class="fig" transform="translate(${n(x)} ${n(y)}) scale(${+s.toFixed(4)})">${art.parts ? drawn(art, edge) : paths(art, edge)}</g>
<use class="eq" href="#eqpath" transform="${EQ}"/>
<g class="pglow"><circle class="pulse" cx="${PX}" cy="${PY}" r="${n(R * f.glow)}" fill="url(#glow${id})"/></g>
<circle class="pearl" cx="${PX}" cy="${PY}" r="${R}"/>
<g class="sh"><path class="pearl spin" style="animation-duration:30s" opacity=".9" d="${star(PX, PY, n(R * f.star))}"/></g>`)
}

// The tree is drawn to cover the window from its top left corner, so the bough always runs along
// the top edge and the trunk down the left side; a taller or wider window crops the far ends. The
// art has its trunk on the right, so it is mirrored.
// (On a very wide window the scene's style shrinks it toward that corner, or it would fill the sky.)
// The art is cut off at that corner's two edges, so its sway ("pt") is offset (LAYOUT_CSS) to run
// from rest toward the corner and back, never away from it: the cut edges stay out of the window.
function treeFruit(art) {
  if (!art.fruitFill) throw new Error('trace the tree with --blobs and --round-fruit: the scene draws and ripens its fruit')
  const far = ([fx, fy]) => Math.hypot(art.width - fx, art.height - fy)
  return [...art.fruits].sort((p, q) => far(p) - far(q))
}
export const fruitCount = () => treeFruit(load('tree')).length

// Degrees of shear for a tree whose bough was drawn level; 0 for one whose bough already climbs.
const TREE_SHEAR = 0
export function treeLayer() {
  const art = load('tree')
  // TREE_SHEAR shears the tree about the right edge: the trunk and the fruit stems stay upright while the bough
  // climbs toward the top left corner, leaving the sky above Claude's hand open for the pearl
  const lift = Math.tan((TREE_SHEAR * Math.PI) / 180) * art.width
  const shear = TREE_SHEAR ? ` transform="translate(0 ${n(-lift)}) skewY(${TREE_SHEAR})"` : ''
  // Fruit are numbered outward from the foot of the trunk (the art's bottom right corner), the
  // order they ripen in as the session's context fills (hooks/gauge.ts): classes f0, f1, ... on
  // the fruit, g0, g1, ... on their glows. Each is a true circle (trace.py --round-fruit leaves
  // them out of the trace) and starts unripe and unlit in the scene's own style.
  const order = treeFruit(art)
  const fruit = order.map(([fx, fy, fr], i) => `<circle class="fr f${i}" cx="${fx}" cy="${fy}" r="${fr}"/>`).join('')
  // each ripe fruit glows softly on its own slow beat
  const glows = order
    .map(([fx, fy, fr], i) => `<circle class="glowf gl g${i}" fill="url(#fruitglow)" style="animation-delay:-${n((i * 1.7) % 8)}s" cx="${fx}" cy="${fy}" r="${n(fr * 2.6)}"/>`)
    .join('')
  return `<svg width="100%" height="100%" viewBox="0 0 ${art.width} ${art.height}" preserveAspectRatio="xMinYMin slice"><defs><radialGradient id="fruitglow"><stop offset="0" stop-color="#ffb24d" stop-opacity="1"/><stop offset=".45" stop-color="#f39a3a" stop-opacity=".55"/><stop offset="1" stop-color="#f39a3a" stop-opacity="0"/></radialGradient></defs>${sway(SWAY.tree, `<g class="tree-art"><g transform="translate(${art.width} 0) scale(-1 1)"><g${shear}>${glows}${paths(art)}${fruit}</g></g></g>`, ' pt')}</svg>`
}
