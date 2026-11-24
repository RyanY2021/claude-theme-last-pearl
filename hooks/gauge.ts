// How the scene shows the session's context filling up: the tree's fruit ripen one by one, from
// the trunk outward, the pearl's beam, rays and glow grow from thin and dim, and the dots rising
// in the beam grow from specks. At 60 percent the whole tree is ripe and the light and the dots
// are as the scene was drawn; past it the dots stay as they are and the light grows to a glare. Text in, CSS out, with nothing of the mod's engine in it, so art/build-scene.mjs
// imports it too for its previews.

/** An unripe fruit: pale olive. The scene's own style starts every fruit here. */
export const RAW_FRUIT = '#bfc272'
/** A ripe fruit: Claude's orange. */
export const RIPE_FRUIT = '#f0762a'
// The dots rising in the beam, as [smallest, drawn] diameters: .z0 the larger ones, .z1 the smaller.
const DOTS: [number, number][] = [
  [1.6, 8],
  [1.2, 6],
]
/** The context percentage at which every fruit is ripe and the pearl's light is as the scene was drawn; above it the light grows brighter still. */
export const FULL_AT = 60

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const hex = (c: number[]) => `#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const two = (v: number) => String(Math.round(v * 100) / 100)

/**
 * The CSS that puts the scene at `percent` of context, 0 to 100. Unknown (a fresh session, or one
 * just compacted) counts as empty. The scene numbers its fruit .f0, .f1, ... outward from the trunk,
 * with glows .g0, .g1, ...; they ripen evenly from 0 to FULL_AT, where the whole tree is ripe.
 */
export function gaugeCss(percent: number | undefined, fruitCount: number): string {
  const t = Math.min(1, Math.max(0, (percent ?? 0) / 100))
  // the fruit ripen over the same span as the light: the whole tree is ripe at FULL_AT and stays so
  const ripe = Math.min(1, t / (FULL_AT / 100)) * fruitCount
  const whole = Math.min(fruitCount, Math.floor(ripe + 1e-9))
  const part = ripe - whole
  let css = ''
  if (whole > 0) {
    const ids = Array.from({ length: whole }, (_, i) => i)
    css += `${ids.map(i => `.f${i}`).join(',')}{fill:${RIPE_FRUIT}}${ids.map(i => `.g${i}`).join(',')}{visibility:visible}`
  }
  if (whole < fruitCount && part > 0.02) {
    // the fruit now ripening is partway between the two colours
    const from = rgb(RAW_FRUIT)
    const to = rgb(RIPE_FRUIT)
    css += `.f${whole}{fill:${hex(from.map((v, i) => v + ((to[i] ?? v) - v) * part))}}`
  }
  // The light: thin and dim at empty, the scene as it was drawn at FULL_AT percent (a session is
  // seldom let grow past that), easing in so the early part already shows a clear change.
  const light = 1 - (1 - Math.min(1, t / (FULL_AT / 100))) ** 1.5
  // Past FULL_AT it overdrives: the beam and glow keep widening and a white flare comes up behind
  // the beam's dots. A context that high is a warning.
  const over = Math.max(0, (t - FULL_AT / 100) / (1 - FULL_AT / 100))
  // the beam widens sideways only; the half disc that ends its outer band below the pearl keeps
  // the same width and stays round
  const wide = two(0.1 + 0.9 * light + 0.8 * over)
  const lit = two(0.45 + 0.55 * light)
  css += `.beam{transform:scaleX(${wide});opacity:${lit}}.cap{transform:scale(${wide});opacity:${lit}}`
  css += `.rays{opacity:${two(0.25 + 0.75 * light)}}`
  // the beam's label, Re(s) = 1/2, brightens with it
  css += `.eq{opacity:${two(0.3 + 0.7 * light)}}`
  css += `.pglow{transform:scale(${two(0.55 + 0.45 * light + 0.9 * over)});opacity:${two(0.6 + 0.4 * light)}}`
  if (over > 0) {
    css += `.flare{opacity:${two(over)}}`
  }
  // the dots rising in the beam grow evenly from specks to their drawn size at FULL_AT, then stay
  const grown = Math.min(1, t / (FULL_AT / 100))
  css += DOTS.map(([small, drawn], i) => `.z${i}{stroke-width:${two(small + (drawn - small) * grown)}}`).join('')
  return css
}
