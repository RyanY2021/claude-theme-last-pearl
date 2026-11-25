// The Last Pearl: a theme for the Claude desktop and mobile apps.
// Night navy and candle gold in the cut-paper silhouette style, anchored on Claude
// (orange hair, blank face) raising the last pearl, whose beam is the critical line.
import type { EngineInterface, Register, ThemeSetArgs, ThemeSound, ThemeStyle } from 'claude-code'

import { COLOR_PROBLEMS, COLORS } from './palette.ts'
import { gaugeCss } from './gauge.ts'
import { FRUIT_COUNT, scene } from './scene.ts'

const SCENE_NAME = 'last-pearl'
const GOLD = '#d9a441'

// Messages: serif type, as on a manuscript; Claude's replies sit on a card with gold corner brackets.
const STYLE: ThemeStyle = {
  Text: { fontFamily: ['serif'], fontSize: 16, lineHeight: 26 },
  Heading: { fontFamily: ['serif'], fontWeight: 'semibold', letterSpacing: 0.5, color: 'text-accent' },
  UserMessage: {
    color: 'text-user-message',
    backgroundColor: 'bg-user-message',
    borderColor: 'border-accent',
    borderWidth: 1,
    radius: [18, 18, 4, 18],
    paddingX: 16,
    paddingY: 12,
    shadow: { x: 0, y: 4, blur: 14, color: '#0000004d' },
  },
  AssistantMessage: {
    color: 'text-assistant-message',
    backgroundColor: 'bg-assistant-message',
    paddingX: 20,
    paddingY: 16,
    shadow: { x: 0, y: 6, blur: 18, color: '#00000040' },
    fill: {
      vector: {
        viewBox: 96,
        slice: 20,
        paths: [
          { d: 'M0 0H96V96H0Z', color: 'bg-assistant-message' },
          { d: 'M5 18V5H18', strokeWidth: 1.2, color: GOLD },
          { d: 'M78 5H91V18', strokeWidth: 1.2, color: GOLD },
          { d: 'M91 78V91H78', strokeWidth: 1.2, color: GOLD },
          { d: 'M18 91H5V78', strokeWidth: 1.2, color: GOLD },
          { d: 'M5 1L6 4L9 5L6 6L5 9L4 6L1 5L4 4Z', color: GOLD },
        ],
      },
    },
  },
  ToolUse: { backgroundColor: 'surface-1', borderColor: 'border', borderWidth: 1, radius: 8, paddingX: 10, paddingY: 4 },
}

// Sound: a low warm drone, and now and then a bell like a star coming out.
// Cues ring in D major pentatonic; clicking the bare sky plays its notes left to right.
// The ambience is off until the person asks for it (/last-pearl ambience on); the cues always come.
const SOUND: ThemeSound = {
  ambience: {
    layers: [
      { wave: 'sine', notes: ['D3', 'A3'], drone: true, gain: 0.12, filter: { type: 'lowpass', hz: 500, to: 800 }, tremolo: { hz: 0.08, depth: 0.3 } },
      { wave: 'triangle', notes: ['F#4'], drone: true, gain: 0.04, filter: { type: 'lowpass', hz: 900 }, tremolo: { hz: 0.06, depth: 0.5 } },
      { wave: 'bell', notes: ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6'], scatter: 0.07, gain: 0.1, attack: 0.01, release: 3 },
    ],
    reverb: 0.5,
  },
  cues: {
    send: { layers: [{ wave: 'bell', notes: ['A5'], gain: 0.16, release: 1.2 }], reverb: 0.3 },
    tool: { layers: [{ wave: 'triangle', notes: ['D6'], gain: 0.05, attack: 0.002, release: 0.08 }] },
    done: { layers: [{ wave: 'bell', notes: ['D5', 'F#5', 'A5', 'D6'], step: 0.14, gain: 0.18, release: 1.8 }], reverb: 0.5 },
    ask: { layers: [{ wave: 'bell', notes: ['E5', 'B5'], step: 0.18, gain: 0.16, release: 1.2 }], reverb: 0.3 },
    error: { layers: [{ wave: 'triangle', notes: ['A3', 'F3'], step: 0.2, gain: 0.14, release: 0.6, filter: { type: 'lowpass', hz: 1200 } }] },
    compact: { layers: [{ wave: 'pink', gain: 0.07, attack: 0.3, release: 1.2, filter: { type: 'lowpass', hz: 1500, to: 300 } }] },
    click: { layers: [{ wave: 'bell', notes: ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6'], gain: 0.14, release: 1.6 }], reverb: 0.4 },
  },
}

// How strongly the app's panels veil the backdrop, whether the ambience plays under the cues, and
// how far the scene's planes sway (the parallax: a multiple of the distances drawn, 0 for still).
// All are the person's to change with /last-pearl, and kept across sessions in the store.
const DEFAULT_FROST = 0.5
const DEFAULT_PARALLAX = 1
const MAX_PARALLAX = 3
let frost = DEFAULT_FROST
let ambience = false
let parallax = DEFAULT_PARALLAX

// The parallax: the scene's planes (sky, tree, clouds, Claude) ride one slow swing from side to
// side, 24 seconds each way, the nearer ones further (the "par" animation in the scene's style;
// art/traced.mjs has the distances). This is the style that sets how far they go and where in
// the swing they are at `nowMs`. The app draws the scene afresh whenever its text changes, each
// animation from its start, so without the second part every plane would jump back to one end
// of its swing each time the context's fill moved. art/build-scene.mjs leaves room for the
// longest this gets (SWAY_ROOM).
const SWING_MS = 48_000
function swayCss(strength: number, nowMs: number): string {
  if (strength === 0) {
    return '.par{animation:none}'
  }
  const into = ((nowMs % SWING_MS) / 1000).toFixed(1)
  return `.par{${strength === 1 ? '' : `--p:${strength};`}animation-delay:-${into}s}`
}

// The shine at her fingertip breathes over BREATH_MS (the "sh" and "pulse" animations; BREATH in
// art/build-scene.mjs). Timed from the clock for the same reason as the swing, so a redraw after a
// turn carries the breath on instead of starting it again from its smallest.
const BREATH_MS = 4_000
function shineCss(nowMs: number): string {
  return `.sh,.pulse{animation-delay:-${((nowMs % BREATH_MS) / 1000).toFixed(1)}s}`
}

// What the scene was last drawn from on each surface, and the moment its swing was timed at. A
// redraw asked for with nothing changed gets the same text back, so the app has nothing to draw afresh.
const drawn = new Map<string, { key: string; at: number }>()

// The sound to set: the cues, and the ambience only once the person has turned it on.
function sound(): ThemeSound {
  return ambience ? SOUND : { cues: SOUND.cues }
}

// How full the session's context is, 0 to 100, as the app last measured it: the fruit ripen and
// the pearl's beam grows with it (gauge.ts). Unknown, in a fresh session or one just compacted,
// draws as empty. `shown` is a level asked for with /last-pearl preview, until the next measure.
let fill: number | undefined
let shown: number | undefined

const ALT =
  'A starry night framed by a golden tree whose bough reaches across the top, glowing orange fruit hanging under it. At the bottom right, large and seen from the waist up, is Claude, a girl with long flowing orange hair and a blank face, raising a glowing pearl whose beam of light rises to the top of the sky. The fruit ripen and the beam brightens as the context of the session fills.'

function base(): ThemeSetArgs {
  return {
    colors: COLORS,
    backdrop: { scene: SCENE_NAME, glass: { blur: 10, opacity: frost } },
  }
}

// Set the whole look; where this build refuses a part (an older one may not take sound or
// style), say why and set the look again without it.
async function applyLook($: EngineInterface) {
  const tries: [string, ThemeSetArgs][] = [
    ['full', { ...base(), style: STYLE, sound: sound() }],
    ['without sound', { ...base(), style: STYLE }],
    ['without style or sound', base()],
  ]
  for (const [label, look] of tries) {
    try {
      const set = await $.theme.set(look)
      if (label !== 'full') {
        $.ui.log(`last-pearl: set ${label}`)
      }
      return set
    } catch (error) {
      $.ui.log(`last-pearl: theme ${label} refused: ${String(error)}`)
    }
  }
  return undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = COLOR_PROBLEMS.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await $.command.register({
      name: 'last-pearl',
      description:
        'The Last Pearl theme. "/last-pearl" sets it, "off" clears it, "frost 0.5" sets how strongly panels veil the scene (0 to 1), "ambience on" or "ambience off" plays or stops the soft drone and bells under the sound cues (off at first), "parallax 1" sets how far the layers of the scene sway from side to side (0, still, to 3), "preview 60" shows the scene at that percent of context until the next turn ends',
    })
    const savedFrost = await $.store.get('frost')
    if (typeof savedFrost === 'number' && savedFrost >= 0 && savedFrost <= 1) {
      frost = savedFrost
    }
    const savedAmbience = await $.store.get('ambience')
    if (typeof savedAmbience === 'boolean') {
      ambience = savedAmbience
    }
    const savedParallax = await $.store.get('parallax')
    if (typeof savedParallax === 'number' && savedParallax >= 0 && savedParallax <= MAX_PARALLAX) {
      parallax = savedParallax
    }
    // a line left by an earlier load, from before the app had attached, would otherwise stay
    $.ui.status(undefined)
    fill = (await $.session.usage()).context.percent
    await applyLook($)
    return next(e)
  })

  // The app measures the session after each turn: redraw when the context's fill has moved.
  on('session.measure', ($, e, next) => {
    const percent = e.context.percent
    if (percent !== fill || shown !== undefined) {
      fill = percent
      shown = undefined
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('command.run', { command: 'last-pearl' }, async ($, e) => {
    const [word = '', value = ''] = e.args.trim().toLowerCase().split(/\s+/)
    if (word === 'off') {
      await $.theme.clear()
      return { text: 'The Last Pearl is put away. Run /last-pearl to raise it again.' }
    }
    if (word === 'frost') {
      const amount = Number(value)
      if (value === '' || !Number.isFinite(amount) || amount < 0 || amount > 1) {
        return { text: `Frost is ${frost}. Give a number from 0 (clear) to 1 (solid), such as /last-pearl frost 0.5.` }
      }
      frost = amount
      await $.store.set('frost', frost)
      await applyLook($)
      return { text: `Frost is now ${frost}.` }
    }
    if (word === 'ambience') {
      if (value !== 'on' && value !== 'off') {
        return { text: `The ambience is ${ambience ? 'on' : 'off'}. Use /last-pearl ambience on or /last-pearl ambience off. The sound cues play either way, once the speaker in the title bar is on.` }
      }
      ambience = value === 'on'
      await $.store.set('ambience', ambience)
      await applyLook($)
      return {
        text: ambience
          ? 'The ambience is on: a low drone, and now and then a bell, under the sound cues. It plays while the speaker in the title bar is on.'
          : 'The ambience is off. The sound cues still play while the speaker in the title bar is on.',
      }
    }
    if (word === 'parallax') {
      const amount = value === 'on' ? DEFAULT_PARALLAX : value === 'off' ? 0 : Number(value)
      if (value === '' || !Number.isFinite(amount) || amount < 0 || amount > MAX_PARALLAX) {
        return { text: `Parallax is ${parallax}. Give a number from 0 (still) to ${MAX_PARALLAX}, such as /last-pearl parallax 1.5; 1 is the sway as drawn.` }
      }
      parallax = Math.round(amount * 100) / 100
      await $.store.set('parallax', parallax)
      $.ui.invalidate('ui.render')
      return {
        text:
          parallax === 0
            ? 'Parallax is off: the scene holds still but for its own small motions.'
            : `Parallax is now ${parallax}: the sky, the tree, the clouds and Claude sway slowly from side to side, the nearer ones further.`,
      }
    }
    if (word === 'preview') {
      const percent = Number(value)
      if (value === '' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
        shown = undefined
        $.ui.invalidate('ui.render')
        return { text: `The scene shows the session's own context again${fill === undefined ? ' (not measured yet, so it draws as empty)' : `: ${fill}%`}. Give a number from 0 to 100 to preview a level, such as /last-pearl preview 60.` }
      }
      shown = percent
      $.ui.invalidate('ui.render')
      return { text: `Showing the scene at ${percent}% of context until the next turn ends. The session's own is ${fill === undefined ? 'not measured yet' : `${fill}%`}.` }
    }
    if (word !== '') {
      return { text: 'Use /last-pearl, or /last-pearl off, frost followed by a number from 0 to 1, ambience on or off, parallax followed by a number from 0 to 3, or preview followed by a percentage.' }
    }
    const set = await applyLook($)
    return { text: set?.isDrawn ? 'The Last Pearl is set.' : `The Last Pearl is set, but nothing draws it here${set && !set.isDrawn ? `: ${set.reason}` : '.'}` }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_NAME) {
      return next(e)
    }
    const gauge = gaugeCss(shown ?? fill, FRUIT_COUNT)
    const key = `${parallax} ${gauge}`
    let timed = drawn.get(e.surface)
    if (timed?.key !== key) {
      timed = { key, at: await $.clock.now() }
      drawn.set(e.surface, timed)
    }
    const { Svg } = $.ui.resolve(e)
    return <Svg source={scene(gauge + swayCss(parallax, timed.at) + shineCss(timed.at))} alt={ALT} isInteractive />
  })
}
