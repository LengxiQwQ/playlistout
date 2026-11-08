/**
 * One source of truth for the v4 UI enlargement.
 *
 * The film still renders at 1920x1080. The UI is authored against a smaller
 * logical viewport and then laid out at this scale, so text, paddings, rows,
 * buttons and icons grow together instead of only font-size being bumped.
 *
 * Main film titles do not use this scale.
 */
export const UI_SCALE = 1.75;

export const u = (n: number) => Math.round(n * UI_SCALE * 10) / 10;

/** Readability targets, measured at 1920x1080. */
export const UI_TYPE = {
  pageTitle: u(22),
  sectionTitle: u(20),
  cardTitle: u(23),
  body: u(16),
  secondary: u(14),
  meta: u(12),
  micro: u(10),
  button: u(19),
  terminal: u(17),
} as const;

/** Phone widths used for the visual check. */
export const PHONE_WIDTHS = [844, 693] as const;
