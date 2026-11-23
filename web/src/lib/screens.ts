// Real screenshots of the app. Add image files to src/assets/screens and they show up here; with none, the section is not shown at all.
export const SCREEN_FILES = import.meta.glob('../assets/screens/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** A real screenshot by file name (for example "hero" finds hero.png), or undefined if it has not been added yet. */
export function findScreen(name: string): string | undefined {
  const hit = Object.entries(SCREEN_FILES).find(([path]) => (path.split('/').pop() ?? '').replace(/\.[a-z]+$/i, '').toLowerCase() === name);
  return hit?.[1];
}
