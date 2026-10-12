export const MAX_EMAIL_LENGTH = 254

/**
 * Email shape check that always runs in linear time. The "@" is the only anchor in the local part,
 * and the domain is dot-separated parts that cannot themselves contain dots, so there is nothing
 * for the regex engine to backtrack over. The length cap bounds the work for any input.
 */
export const isEmail = (value: string): boolean =>
  value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value)
