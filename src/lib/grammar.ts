/**
 * Grammar helpers — singular/plural agreement for spoken & displayed counts.
 *
 * Prompts read "${n} ${noun}" where the noun is usually stored in PLURAL form
 * ("butterflies", "apples"). When n === 1 that must read "1 butterfly", so these
 * turn a plural noun back into its singular, handling the common English cases.
 *
 * Shared by both the practice chapters (src/components/game) and the lesson kit
 * (src/components/lessons/_kit re-exports these).
 */

// Words whose singular the rules below would get wrong (e.g. the -ies→-y rule
// would turn "cookies" into "cooky"). Keyed by the lowercase plural.
const IRREGULAR: Record<string, string> = {
  cookies: 'cookie', brownies: 'brownie', movies: 'movie',
}

export function singular(plural: string): string {
  const exact = IRREGULAR[plural.toLowerCase()]
  if (exact) return exact
  if (/ies$/i.test(plural)) return plural.replace(/ies$/i, 'y')           // bunnies → bunny
  if (/(s|x|z|ch|sh)es$/i.test(plural)) return plural.replace(/es$/i, '') // foxes → fox, dishes → dish
  if (/ss$/i.test(plural)) return plural                                  // glass → glass
  if (/s$/i.test(plural)) return plural.replace(/s$/i, '')                // apples → apple
  return plural                                                          // fish → fish
}

/** The right noun for a count: pass the PLURAL form; returns singular when n === 1. */
export function nounFor(n: number, pluralNoun: string): string {
  return n === 1 ? singular(pluralNoun) : pluralNoun
}

/** "3 apples" / "1 apple" — pass the plural form. */
export function countNoun(n: number, pluralNoun: string): string {
  return `${n} ${nounFor(n, pluralNoun)}`
}
