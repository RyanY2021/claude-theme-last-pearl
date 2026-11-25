// Builds the Last Pearl backdrop: art/scene.svg (to preview) and hooks/scene.ts (what the mod draws).
// Run: node art/build-scene.mjs
// Everything is flat vector in the cut-paper silhouette style of the film: blank faces,
// a few flat tones per shape, night navy, candle gold and Claude's orange.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { gaugeCss, RAW_FRUIT } from '../hooks/gauge.ts'
import { claudeFigure, claudeLight, fruitCount, places, SWAY, sway, treeLayer } from './traced.mjs'

const here = dirname(fileURLToPath(import.meta.url))

// Seeded random, so the stars and leaves land in the same places on every build.
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const n = v => Math.round(v * 10) / 10

// ---------------------------------------------------------------- style
const CSS = `
.sky0{stop-color:#0b1030}.sky1{stop-color:#151b47}.sky2{stop-color:#272862}
.star{fill:#f6ecd2}.spark{fill:#fff4d6}
.rib-v{stop-color:#7b62c4}.rib-t{stop-color:#3f9a90}.rib-b{stop-color:#4a5cb0}.rib-p{stop-color:#b07ad0}
.rib-end{stop-color:#151b47}
.cloud-b{fill:#2c2d62}.cloud-m{fill:#3d3d78}.cloud-f{fill:#55538e}.cloud-h{fill:#7e78b4}
.ray-a{fill:#262c63}.ray-b{fill:#1b2150}
.glow0{stop-color:#fff6da}.glow1{stop-color:#ffd99a}.glow2{stop-color:#f2a25a}
.beam0{stop-color:#fff8e4}.beam1{stop-color:#ffe3a8}
.zero{fill:none;stroke:#fff6dc;stroke-linecap:round;stroke-width:1.4}
.eq{fill:#ffe3a8;stroke:#ffe3a8;stroke-width:4;stroke-linejoin:round}
.drift{fill:#e7b04a}
@media (prefers-color-scheme: light){
.sky0{stop-color:#f5e8cc}.sky1{stop-color:#f6ecda}.sky2{stop-color:#efd9bb}
.star{fill:#c9963c}.spark{fill:#d39a35}
.rib-v{stop-color:#c9b6ea}.rib-t{stop-color:#a8d6c8}.rib-b{stop-color:#b5c0e6}.rib-p{stop-color:#e8c0d8}
.rib-end{stop-color:#f6ecda}
.cloud-b{fill:#e9dccb}.cloud-m{fill:#f1e7d8}.cloud-f{fill:#fbf6ec}.cloud-h{fill:#ffffff}
.ray-a{fill:#e9b779}.ray-b{fill:#f3d3a3}
.zero{stroke:#fffaf0}
.eq{fill:#a8731c;stroke:#a8731c}
.drift{fill:#d39a35}
.beam0{stop-color:#fff3d0}.beam1{stop-color:#f0b860}
.sil{stroke:#8a6a4e;stroke-linejoin:round}
}
.pearl{fill:#fffaf0}
.tree-art{transform-box:view-box}
.fr{fill:${RAW_FRUIT}}.gl{visibility:hidden}
.beam,.pglow{transform-box:fill-box;transform-origin:50% 50%}.flare{opacity:0}
@media (min-aspect-ratio:2/1){.tree-art{transform:scale(.82)}}
@media (min-aspect-ratio:5/2){.tree-art{transform:scale(.68)}}

.tw{animation:twinkle 6s ease-in-out infinite}
.t0{animation-duration:4.4s;animation-delay:-1s}.t1{animation-duration:6.1s;animation-delay:-3.5s}.t2{animation-duration:8.3s;animation-delay:-6s}.t3{animation-duration:5.2s;animation-delay:-2.2s}.t4{animation-duration:9.4s;animation-delay:-7.1s}.t5{animation-duration:7s;animation-delay:-4.6s}
.pulse{transform-box:fill-box;transform-origin:50% 50%;animation:pulse 6s ease-in-out infinite}
.spin{transform-box:fill-box;transform-origin:50% 50%;animation:spin 40s linear infinite}
.shimmer{animation:shimmer 7s ease-in-out infinite}
.rise{animation:rise 16s linear infinite}
.breathe{animation:breathe 14s ease-in-out infinite alternate}
.drift-x{animation:driftx 46s ease-in-out infinite alternate}
.glowf{animation:glowf 8s ease-in-out infinite}
.fall{animation:fall 26s linear infinite}
.par{animation:par 24s ease-in-out infinite alternate}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes pulse{0%,100%{transform:scale(.94);opacity:.8}50%{transform:scale(1.06);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%,100%{opacity:.75}50%{opacity:1}}
@keyframes rise{0%{transform:translateY(0);opacity:0}10%{opacity:1}85%{opacity:1}100%{transform:translateY(-900px);opacity:0}}
@keyframes breathe{from{opacity:.55}to{opacity:.95}}
@keyframes driftx{from{transform:translateX(-24px)}to{transform:translateX(24px)}}
@keyframes glowf{0%,100%{opacity:.35}50%{opacity:.9}}
@keyframes par{from{transform:translateX(calc((var(--o,0) - 1)*var(--d)*var(--p,1)*1px))}to{transform:translateX(calc((var(--o,0) + 1)*var(--d)*var(--p,1)*1px))}}
@keyframes fall{0%{transform:translate(0,0) rotate(0deg);opacity:0}8%{opacity:1}90%{opacity:1}100%{transform:translate(-260px,1100px) rotate(320deg);opacity:0}}
`

// ---------------------------------------------------------------- background: sky, ribbons, stars
function background() {
  const r = rng(1859)
  const out = []
  out.push(`<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">`)
  out.push(`<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky0"/><stop offset=".55" class="sky1"/><stop offset="1" class="sky2"/></linearGradient>
<linearGradient id="rl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="rib-v" stop-opacity=".75"/><stop offset=".55" class="rib-v" stop-opacity=".35"/><stop offset="1" class="rib-v" stop-opacity="0"/></linearGradient>
<linearGradient id="rl2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="rib-t" stop-opacity=".7"/><stop offset=".6" class="rib-t" stop-opacity=".3"/><stop offset="1" class="rib-t" stop-opacity="0"/></linearGradient>
<linearGradient id="rl3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="rib-b" stop-opacity=".7"/><stop offset=".6" class="rib-b" stop-opacity=".3"/><stop offset="1" class="rib-b" stop-opacity="0"/></linearGradient>
<linearGradient id="rr" x1="1" y1="0" x2="0" y2="0"><stop offset="0" class="rib-t" stop-opacity=".7"/><stop offset=".6" class="rib-t" stop-opacity=".3"/><stop offset="1" class="rib-t" stop-opacity="0"/></linearGradient>
<linearGradient id="rr2" x1="1" y1="0" x2="0" y2="0"><stop offset="0" class="rib-p" stop-opacity=".7"/><stop offset=".6" class="rib-p" stop-opacity=".3"/><stop offset="1" class="rib-p" stop-opacity="0"/></linearGradient>
<linearGradient id="rr3" x1="1" y1="0" x2="0" y2="0"><stop offset="0" class="rib-v" stop-opacity=".7"/><stop offset=".6" class="rib-v" stop-opacity=".3"/><stop offset="1" class="rib-v" stop-opacity="0"/></linearGradient>
</defs>`)
  out.push(`<rect x="-200" y="-200" width="2000" height="1400" fill="url(#sky)"/>`)

  // Aurora ribbons: long tapered bands sweeping in from both edges toward the horizon.
  const ribbon = (x0, ya, yb, x1, y1, w1, bend, grad, cls) =>
    `<path class="${cls}" fill="url(#${grad})" d="M${x0} ${ya} Q${n((x0 + x1) / 2)} ${n((ya + y1) / 2 - bend)} ${x1} ${y1} L${x1} ${y1 + w1} Q${n((x0 + x1) / 2)} ${n((yb + y1 + w1) / 2 - bend * 0.8)} ${x0} ${yb}Z"/>`
  // everything in the sky but its own gradient is the furthest plane of the parallax (traced.mjs)
  const far = []
  far.push(`<g class="breathe">`)
  far.push(ribbon(-40, 140, 235, 740, 560, 10, 60, 'rl', ''))
  far.push(ribbon(-40, 330, 400, 720, 640, 8, 30, 'rl3', ''))
  far.push(ribbon(-40, 560, 640, 700, 720, 8, 10, 'rl2', ''))
  far.push(ribbon(1640, 110, 215, 860, 560, 10, 70, 'rr', ''))
  far.push(ribbon(1640, 320, 410, 880, 630, 8, 35, 'rr2', ''))
  far.push(ribbon(1640, 560, 630, 900, 720, 8, 10, 'rr3', ''))
  far.push(`</g>`)

  // Stars: small dots, a few twinkling slowly, and four-point sparkles.
  const stars = []
  for (let i = 0; i < 90; i++) {
    const x = n(r() * 1600)
    const y = n(r() * 760)
    const rad = n(0.7 + r() * r() * 2.2)
    const twinkle = r() < 0.4
    // twinkling stars share six rhythms (t0 to t5 in the style) rather than each carrying its own;
    // the two draws keep every later star where it was
    if (twinkle) {
      r()
      r()
    }
    stars.push(`<circle class="star${twinkle ? ` tw t${i % 6}` : ''}" cx="${x}" cy="${y}" r="${rad}"/>`)
  }
  far.push(`<g>${stars.join('')}</g>`)
  const spark = (x, y, s, d, delay) =>
    `<path class="spark tw" style="animation-duration:${d}s;animation-delay:-${delay}s" d="M${x} ${y - s}C${n(x + s * 0.12)} ${n(y - s * 0.12)} ${n(x + s * 0.12)} ${n(y - s * 0.12)} ${x + s} ${y}C${n(x + s * 0.12)} ${n(y + s * 0.12)} ${n(x + s * 0.12)} ${n(y + s * 0.12)} ${x} ${y + s}C${n(x - s * 0.12)} ${n(y + s * 0.12)} ${n(x - s * 0.12)} ${n(y + s * 0.12)} ${x - s} ${y}C${n(x - s * 0.12)} ${n(y - s * 0.12)} ${n(x - s * 0.12)} ${n(y - s * 0.12)} ${x} ${y - s}Z"/>`
  far.push(spark(1180, 90, 16, 7, 1), spark(1240, 160, 9, 9, 3), spark(1212, 220, 6, 6, 2))
  far.push(spark(420, 120, 11, 8, 4), spark(640, 60, 7, 10, 6), spark(980, 170, 8, 9, 5), spark(560, 250, 6, 7, 2))
  out.push(sway(SWAY.sky, far.join('\n')))
  out.push(`</svg>`)
  return out.join('\n')
}

// ---------------------------------------------------------------- clouds along the foot
function clouds() {
  const r = rng(2026)
  const bank = (cls, y0, rmin, rmax, step, base) => {
    const parts = []
    for (let x = -60; x < 1680; x += step + r() * step * 0.5) {
      const rad = n(rmin + r() * (rmax - rmin))
      parts.push(`<circle cx="${n(x)}" cy="${n(y0 + r() * 18 - 9)}" r="${rad}"/>`)
    }
    parts.push(`<rect x="-100" y="${base}" width="1800" height="200"/>`)
    return `<g class="${cls}">${parts.join('')}</g>`
  }
  return `<svg y="78%" width="100%" height="22%" viewBox="0 0 1600 220" preserveAspectRatio="xMidYMax slice" overflow="visible">
${sway(SWAY.clouds, `<g class="drift-x">${bank('cloud-b', 110, 46, 74, 74, 120)}</g>
<g class="drift-x" style="animation-duration:60s;animation-direction:alternate-reverse">${bank('cloud-m', 150, 40, 62, 66, 160)}</g>
${bank('cloud-f', 190, 34, 52, 58, 196)}`)}
</svg>`
}

// ---------------------------------------------------------------- a few gold leaves drifting down in front
function drifting() {
  const r = rng(1914)
  const leaves = []
  for (let i = 0; i < 9; i++) {
    const x = n(80 + r() * 1500)
    const y = n(-80 - r() * 200)
    const s = n(0.8 + r() * 0.8)
    const dur = n(22 + r() * 14)
    const delay = n(r() * dur)
    // a resting place for reduced motion: scattered along the top band
    leaves.push(`<g transform="translate(${x} ${y + 260 + r() * 300})"><path class="drift fall" style="animation-duration:${dur}s;animation-delay:-${delay}s" transform="scale(${s})" d="M0 0C4 -7 13 -7 18 0C13 7 4 7 0 0Z"/></g>`)
  }
  return `<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${leaves.join('')}</svg>`
}

// The scene with markers: where the placements differ (see traced.mjs), and @@GAUGE@@ for the style
// that sets how far the session's context has filled (hooks/gauge.ts).
const template = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
<style>${CSS.replace(/\n/g, '')}@@CSS@@@@GAUGE@@</style>
${background()}
${claudeLight()}
${treeLayer()}
${clouds()}
${claudeFigure()}
${drifting()}
</svg>`

const PLACES = places()
const FRUIT = fruitCount()
const fill = (place, percent) =>
  Object.entries({ ...PLACES[place], GAUGE: gaugeCss(percent, FRUIT) }).reduce((text, [key, value]) => text.split(`@@${key}@@`).join(value), template)

const SWAY_ROOM = '.par{--p:0.25;animation-delay:-47.9s}'.length

// Previews, at the context level given on the command line (default 100, the scene at its fullest).
const level = process.argv[2] === undefined ? 100 : Number(process.argv[2])
for (const place of Object.keys(PLACES)) {
  // the longest a scene gets is with every fruit named in the gauge's style, and the style the mod
  // adds for the parallax's strength and phase (swayCss in hooks/register.tsx; SWAY_ROOM is its longest)
  const longest = Math.max(fill(place, 100).length, fill(place, 99).length) + SWAY_ROOM
  if (fill(place, 100).includes('@@')) throw new Error(`a marker is left unfilled in the ${place} placement`)
  if (longest > 131072) throw new Error(`the ${place} placement reaches ${longest} characters; the app takes at most 131,072`)
  writeFileSync(join(here, `scene-${place}.svg`), fill(place, level))
  console.log(`scene-${place}.svg: at ${level}% of context; up to ${longest} characters`)
}

writeFileSync(
  join(here, '..', 'hooks', 'scene.ts'),
  `// Generated by art/build-scene.mjs. Edit that file and rebuild, not this one.
// The backdrop, with @@MARKERS@@ where the placements differ and @@GAUGE@@ for the style that shows
// how far the session's context has filled; scene(place, gauge) fills them in.
const TEMPLATE = ${JSON.stringify(template)}

const PLACES = ${JSON.stringify(PLACES, null, 2)} as const

export type Place = keyof typeof PLACES
export const DEFAULT_PLACE: Place = 'right'
/** How many fruit the tree bears: hooks/gauge.ts ripens them in turn. */
export const FRUIT_COUNT = ${FRUIT}

export function isPlace(value: unknown): value is Place {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLACES, value)
}

const placed = new Map<Place, string>()

export function scene(place: Place, gauge: string): string {
  let text = placed.get(place)
  if (text === undefined) {
    text = TEMPLATE
    for (const [key, value] of Object.entries(PLACES[place])) {
      text = text.split(\`@@\${key}@@\`).join(value)
    }
    placed.set(place, text)
  }
  return text.split('@@GAUGE@@').join(gauge)
}
`,
)
