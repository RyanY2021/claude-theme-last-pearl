// Places the traced, image-model art in the scene: Claude with the pearl, its rays, glow and beam
// anchored at her raised fingertip, and the golden tree as a frame (trunk up one edge, one long
// bough across the top). The traced layers come from trace.py (art/vector/*.json).
//
// The app's panels cover the backdrop's edges: the session list on the left when it is open, the
// side pane on the right when that is open. A backdrop cannot tell which are open, so the scene
// comes in two placements, and the text below carries @@MARKERS@@ where they differ:
//   right  Claude small in the margin right of the conversation, whole with the session list open
//          or closed; the tree mirrored, its trunk at the left edge (behind the list when open)
//          and its bough reaching across the top to her
//   left   Claude large in the bottom left corner, the trunk on the right: for a closed session list
// places() gives each placement's value for every marker.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const n = v => Math.round(v * 10) / 10

function load(name) {
  return JSON.parse(readFileSync(join(here, 'vector', `${name}.json`), 'utf8'))
}

// The traced paths, bottom to top. The bottom layer of a figure is its whole outline (class
// "sil"): light mode gives it an ink edge, so cream cloth still reads against a cream sky.
function paths(art, edge = 0) {
  return art.layers
    .map(l => `<path${l.sil ? ` class="sil" stroke-width="${n(edge)}"` : ''} fill="${l.fill}" fill-rule="evenodd" d="${l.d}"/>`)
    .join('')
}

// Claude is drawn in a box 1150 units tall; FIG_H is her height from fingertip to boots in it and
// FIG_X her left edge. Which corner the box is pinned to, and what sizes it, is the placement's.
const V = 1150
const FIG_H = 820
const FIG_X = -34
function claude() {
  const art = load('claude')
  const s = FIG_H / art.height
  const x = FIG_X
  const y = V - 10 - FIG_H
  const [px, py, pr] = art.pearl
  return { art, s, x, y, PX: n(x + px * s), PY: n(y + py * s), R: n(Math.max(13, pr * s)) }
}
// The parallax: the scene's planes ride one slow swing from side to side (class "par" in the
// scene's style, build-scene.mjs), as a stage set does when the camera slides past it: the nearer
// a plane, the further it moves. SWAY is how far each goes either way, in its own units (the
// window's points for her, and close to that for the rest).
export const SWAY = { sky: 2, tree: 4.5, clouds: 7, figure: 10 }
export const sway = (far, inner, cls = '') => `<g class="par${cls}" style="--d:${far}">${inner}</g>`

// fig-in lets a narrow (phone) window enlarge her about the bottom right corner in the right placement.
// Her light and she herself are each drawn in this box, so they sway as one and the beam stays on the pearl.
const box = inner => sway(SWAY.figure, `<g class="fig-in"><svg @@BOX@@ overflow="visible">${inner}</svg></g>`)

// In the right placement her box is this share of the window's width, pinned to the right edge.
const RIGHT_SHARE = 17.5

// The label sits right of the beam, clear of the band the beam widens to at a full context, with
// its top `up` above the pearl (negative: below it); `wide` is its width. All in the box's units.
function label(PX, PY, { clear, up, wide }) {
  const eq = load('equation')
  return `translate(${n(PX + clear)} ${n(PY - up)}) scale(${+(wide / eq.width).toFixed(4)})`
}

export function places() {
  const { art, s, x, PX, PY } = claude()
  const figW = art.width * s
  const tree = load('tree')
  return {
    left: {
      BOX: `width="100%" height="100%" viewBox="0 0 ${V} ${V}" preserveAspectRatio="xMinYMax meet"`,
      RAYS: '',
      TREEPAR: 'xMaxYMin slice',
      TREEFLIP: '',
      // here the pearl is up among the tree's fruit, so the label goes just under the glare, in the
      // pocket between her raised arm and her head
      EQ: label(PX, PY, { clear: 44, up: -16, wide: 168 }),
      CSS: '.tree-art{transform-origin:100% 0}.pt{--o:1}',
    },
    right: {
      // a box as wide as she is (hair tips may bleed), so the window's width sets her size;
      // 1150 tall, so she is never taller than in the left placement
      BOX: `x="${100 - RIGHT_SHARE}%" width="${RIGHT_SHARE}%" height="100%" viewBox="${n(x + 10)} 0 ${n(figW - 20)} ${V}" preserveAspectRatio="xMaxYMax meet"`,
      // she is smaller here, so the rays are enlarged about the pearl to keep their reach
      RAYS: ` transform="translate(${PX} ${PY}) scale(1.6) translate(${-PX} ${-PY})"`,
      TREEPAR: 'xMinYMin slice',
      TREEFLIP: ` transform="translate(${tree.width} 0) scale(-1 1)"`,
      // the light is 1.6 times larger here, so the band reaches further, and the strip is narrow
      EQ: label(PX, PY, { clear: 80, up: 124, wide: 190 }),
      CSS: '.tree-art{transform-origin:0 0}.pt{--o:-1}.fig-in{transform-box:view-box;transform-origin:100% 100%}@media (max-width:700px){.fig-in{transform:scale(3.2)}}',
    },
  }
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
// lies over the join.
export function claudeLight() {
  const { PX, PY, R } = claude()
  const rays = []
  for (let i = 0; i < 18; i++) {
    const a0 = (i * 20 - 4) * (Math.PI / 180)
    const a1 = (i * 20 + 6) * (Math.PI / 180)
    const L = 1500
    rays.push(`<path class="${i % 2 ? 'ray-a' : 'ray-b'}" d="M${PX} ${PY}L${n(PX + Math.cos(a0) * L)} ${n(PY + Math.sin(a0) * L)}L${n(PX + Math.cos(a1) * L)} ${n(PY + Math.sin(a1) * L)}Z"/>`)
  }
  const zeros = []
  for (let i = 0; i < 6; i++) {
    // Each dot is a zero-length line with round ends, so its size is its stroke width, which the
    // gauge sets: the dots grow with the session's context. z0 are the larger dots, z1 the smaller.
    zeros.push(`<path class="zero z${i % 2} rise" d="M${PX} ${n(PY - R - 6 - i * 4)}h0" style="animation-delay:-${n(i * 2.7)}s"/>`)
  }
  return box(`<defs>
<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" class="beam0" stop-opacity="1"/><stop offset=".35" class="beam1" stop-opacity=".85"/><stop offset="1" class="beam1" stop-opacity=".25"/></linearGradient>
<linearGradient id="beamw" x1="0" y1="1" x2="0" y2="0"><stop offset="0" class="beam1" stop-opacity=".35"/><stop offset="1" class="beam1" stop-opacity="0"/></linearGradient>
<radialGradient id="cap" gradientUnits="userSpaceOnUse" cx="${PX}" cy="${PY}" r="${CAP}">${CAP_FADE}</radialGradient>
<radialGradient id="glare"><stop offset="0" class="beam0" stop-opacity="1"/><stop offset=".55" class="beam0" stop-opacity=".8"/><stop offset="1" class="beam1" stop-opacity=".35"/></radialGradient>
<radialGradient id="flare"><stop offset="0" class="beam0" stop-opacity=".9"/><stop offset=".45" class="beam1" stop-opacity=".5"/><stop offset="1" class="beam1" stop-opacity="0"/></radialGradient>
<radialGradient id="raysfade"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="raymask" maskUnits="userSpaceOnUse" x="-3000" y="-3000" width="7000" height="7000"><circle cx="${PX}" cy="${PY}" r="950" fill="url(#raysfade)"/></mask>
</defs>
<g@@RAYS@@><g class="rays"><g mask="url(#raymask)" opacity=".9"><g class="spin" style="animation-duration:240s">${rays.join('')}</g></g></g>
<path class="cap" style="transform-origin:${PX}px ${PY}px" fill="url(#cap)" d="M${n(PX - CAP)} ${PY}A${CAP} ${CAP} 0 0 0 ${n(PX + CAP)} ${PY}Z"/>
<g class="beam"><rect class="shimmer" x="${n(PX - 22)}" y="-3000" width="44" height="${n(PY + 3000)}" fill="url(#beamw)"/>
<rect class="shimmer" x="${n(PX - 4)}" y="-3000" width="8" height="${n(PY + 3000)}" fill="url(#beam)" style="animation-duration:5s"/>
<path fill="url(#glare)" d="${spindle(PX, PY, 66, 3.5)}"/></g>
<g class="flare"><ellipse cx="${PX}" cy="${n(PY - 1200)}" rx="95" ry="1300" fill="url(#flare)"/><rect x="${n(PX - 9)}" y="-3000" width="18" height="${n(PY + 3000)}" fill="url(#beam)"/></g>
<g>${zeros.join('')}</g></g>`)
}

// In front of everything: Claude herself, the beam's label, then the pearl and its glow at her
// fingertip. The label is Re(s) = 1/2, the equation of the critical line the beam stands for,
// written in a pen hand by LaTeX and kept as one outline (equation.py), with a thin outline in
// its own colour for a slightly heavier pen; the gauge brightens it with the beam.
export function claudeFigure() {
  const { art, s, x, y, PX, PY, R } = claude()
  const star = (cx, cy, k) =>
    `M${cx} ${n(cy - k)}C${n(cx + 2)} ${n(cy - 2)} ${n(cx + 2)} ${n(cy - 2)} ${n(cx + k)} ${cy}C${n(cx + 2)} ${n(cy + 2)} ${n(cx + 2)} ${n(cy + 2)} ${cx} ${n(cy + k)}C${n(cx - 2)} ${n(cy + 2)} ${n(cx - 2)} ${n(cy + 2)} ${n(cx - k)} ${cy}C${n(cx - 2)} ${n(cy - 2)} ${n(cx - 2)} ${n(cy - 2)} ${cx} ${n(cy - k)}Z`
  return box(`<defs>
<radialGradient id="glow"><stop offset="0" class="glow0" stop-opacity="1"/><stop offset=".18" class="glow1" stop-opacity=".75"/><stop offset=".5" class="glow2" stop-opacity=".22"/><stop offset="1" class="glow2" stop-opacity="0"/></radialGradient>
</defs>
<g class="fig" transform="translate(${n(x)} ${n(y)}) scale(${+s.toFixed(4)})">${paths(art, 2.6 / s)}</g>
<path class="eq" transform="@@EQ@@" d="${load('equation').d}"/>
<g class="pglow"><circle class="pulse" cx="${PX}" cy="${PY}" r="${n(R * 6)}" fill="url(#glow)"/></g>
<circle class="pearl" cx="${PX}" cy="${PY}" r="${R}"/>
<path class="pearl spin" style="animation-duration:30s" opacity=".9" d="${star(PX, PY, n(R * 2.6))}"/>`)
}

// The tree is drawn to cover the window from a top corner, so the bough always runs along the top
// edge and the trunk down one side; a taller or wider window crops the far ends. The placement
// picks the corner and mirrors the tree to match.
// (On a very wide window the scene's style shrinks it toward that corner, or it would fill the sky.)
// The art is cut off at that corner's two edges, so its sway ("pt") is offset by the placement to
// run from rest toward the corner and back, never away from it: the cut edges stay out of the window.
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
  return `<svg width="100%" height="100%" viewBox="0 0 ${art.width} ${art.height}" preserveAspectRatio="@@TREEPAR@@"><defs><radialGradient id="fruitglow"><stop offset="0" stop-color="#ffb24d" stop-opacity="1"/><stop offset=".45" stop-color="#f39a3a" stop-opacity=".55"/><stop offset="1" stop-color="#f39a3a" stop-opacity="0"/></radialGradient></defs>${sway(SWAY.tree, `<g class="tree-art"><g@@TREEFLIP@@><g${shear}>${glows}${paths(art)}${fruit}</g></g></g>`, ' pt')}</svg>`
}
