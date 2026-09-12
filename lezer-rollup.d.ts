declare module '@lezer/generator/rollup' {
  import type { Plugin } from 'vite'
  export function lezer(config?: { exportName?: string }): Plugin
}
