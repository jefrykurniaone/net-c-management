import 'server-only';
import { cookies } from 'next/headers';
import { id as dateFnsId, enUS as dateFnsEnUS } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from './dictionaries';

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (locale && (LOCALES as readonly string[]).includes(locale)) {
    return locale as Locale;
  }
  return DEFAULT_LOCALE;
}

/** Maps the app's `Locale` to the matching date-fns locale for `format()` calls. */
export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return locale === 'id' ? dateFnsId : dateFnsEnUS;
}
