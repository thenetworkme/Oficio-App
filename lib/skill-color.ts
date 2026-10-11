/** Resolves a skill's stored color into a usable CSS color value. Skills
 * created before a custom palette picker existed (or the first three
 * defaults) may store the role name instead of a hex, so both work. */
export function resolveSkillColor(color: string): string {
  if (color === "accent" || color === "a2" || color === "a3") return `var(--${color})`;
  return color;
}
