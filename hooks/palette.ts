// The Last Pearl palette: night navy and candle gold, with Claude's orange as the accent.
// Dark mode is the night sky of the film; light mode is the 1859 manuscript parchment.
import type { ThemeColors } from 'claude-code'

import { checkColors, makeColors } from './make-colors.js'

const made = makeColors({
  label: 'The Last Pearl',
  roles: {
    accent: '#e0782f', // Claude's hair and ribbons
    danger: '#c8443c',
    success: '#3e9a84', // the teal aurora ribbon
    warning: '#d6ae2c', // candle and fruit gold
    pro: '#9583d6', // the lavender ribbon
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#eee2c9',
        'surface-1': '#f4ead5',
        'surface-2': '#faf4e6',
        'text-primary': '#221c33',
        'text-secondary': '#463c55',
        'text-muted': '#62576a',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#11162f',
        'surface-1': '#161c39',
        'surface-2': '#1b2242',
        'surface-3': '#1f2747',
        'text-primary': '#f4ead6',
        'text-secondary': '#d8cbb1',
        'text-muted': '#aaa08e',
      },
    },
  },
})

// The four message colors go straight into the inputs, after makeColors.
const MESSAGE_COLORS = {
  light: {
    'bg-user-message': '#f1dcbc',
    'text-user-message': '#221c33',
    'bg-assistant-message': '#fbf6ea',
    'text-assistant-message': '#221c33',
  },
  dark: {
    'bg-user-message': '#2a2654',
    'text-user-message': '#f6ecd8',
    'bg-assistant-message': '#141a35',
    'text-assistant-message': '#f1e7d3',
  },
} as const

// In light mode the design system's warning fill is a pale gold, close to the parchment page: the
// app's subscription usage ring, drawn in it once usage is high, was hard to make out (1.4:1). These two
// steps are set deeper by hand: 2.5:1 on the page, and the dark text the app sets on the fill still
// reads at 5:1. checkColors below confirms the result paints.
const WARNING_FILL = {
  light: {
    'role-warning-fill': '#b8860b',
    'role-warning-fill-hover': '#c69320',
  },
} as const

const inputs = made.theme.inputs as Record<'light' | 'dark', Record<string, string>>

export const COLORS: ThemeColors = {
  ...made.theme,
  inputs: {
    ...made.theme.inputs,
    light: { ...inputs.light, ...MESSAGE_COLORS.light, ...WARNING_FILL.light },
    dark: { ...inputs.dark, ...MESSAGE_COLORS.dark },
  },
} as ThemeColors

export const COLOR_PROBLEMS = checkColors(COLORS)
