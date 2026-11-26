/**
 * Shared class strings for the themed controls. Plain strings (not
 * components) so they work on <a>, <Link>, <button> and form buttons alike.
 */

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 font-body text-base transition-[filter,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-60";

/** Dark button on parchment surfaces. */
export const btnPrimary = `${base} h-[50px] bg-table font-extrabold text-parchment hover:brightness-110`;

/** Main call to action on the table (publish). */
export const btnGold = `${base} h-[52px] bg-gold font-extrabold text-ink shadow-[0_3px_0_rgb(4_22_33/0.65)] hover:brightness-105`;

/** Outlined button on parchment surfaces. */
export const btnOutline = `${base} h-[50px] border-[1.5px] border-ink font-bold text-ink hover:bg-ink/5`;

/** Outlined button on the table. */
export const btnOutlineTable = `${base} h-[50px] border-[1.5px] border-outline font-bold text-parchment hover:bg-parchment/5`;

/** Irreversible or destructive confirmation. */
export const btnDanger = `${base} h-[52px] bg-danger font-extrabold text-white hover:brightness-110`;

/** Low-emphasis action ("Volver"). */
export const btnGhost = `${base} h-[50px] font-bold text-ink hover:bg-ink/5`;

/** Text field on parchment. */
export const field =
  "h-[50px] w-full min-w-0 rounded-[10px] border-[1.5px] border-field bg-panel px-3.5 font-body text-base text-ink placeholder:text-muted-ink/80 aria-invalid:border-2 aria-invalid:border-danger";
