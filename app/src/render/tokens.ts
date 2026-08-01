// P2 render tokens — one TOKENS constant mirroring app/src/app.css custom
// properties (NFR-6: canvas mirrors one TOKENS constant; DESIGN.md is the single
// theme authority). No new colors beyond the app.css grammar.
//
// NOTE: the designer lane owns this file and will overwrite it with their
// authored version. This is a minimal integration-time fallback that mirrors
// app.css values so the render layer can compile and run today. Keep the
// exported shape below stable — desk.ts and art.ts consume it.

export const TOKENS = {
  colors: {
    groundVoid: '#071016',
    groundDeep: '#0b1922',
    groundAsphalt: '#102733',
    groundWet: '#173743',
    panelInk: '#0d1d26',
    panelSteel: '#1d3945',
    steel: '#6f9198',
    steelLight: '#a9c1c2',
    ivory: '#edf0df',
    ivoryMuted: '#bec8bd',
    ink: '#071016',
    move: '#4de4df', // neon cyan — movement only
    moveLight: '#b5fff3',
    action: '#f4b544', // neon amber — attack/playable/active transport only
    actionLight: '#ffdda0',
    signalRed: '#b7373c', // damage/debt/defeat/foreclosure only
    signalRedLight: '#f17a72',
    balloon: '#b7373c', // alias of signal-red — death/danger motif only
    bowl: '#4de4df', // alias of move — victory/sanctuary motif only
    success: '#83c99a',
  },
  fonts: {
    display: '"Trebuchet MS", "Segoe UI", sans-serif',
    work: '"Segoe UI", "Helvetica Neue", sans-serif',
    readout: '"Consolas", "Liberation Mono", monospace',
  },
  radius: {
    tight: 6,
    panel: 10,
  },
} as const;

export type Tokens = typeof TOKENS;
