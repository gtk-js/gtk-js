/**
 * A mnemonic label's text as GTK shows it while mnemonics are hidden (until
 * Alt is held): the underscore before a character is dropped, and `__` is a
 * literal underscore (strip_ulines() in gtklabel.c).
 */
export function stripMnemonic(label: string): string {
  return label.replace(/_(.)/gsu, "$1");
}
