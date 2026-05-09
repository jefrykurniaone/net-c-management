import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from './dictionaries';

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (locale && (LOCALES as readonly string[]).includes(locale)) {
    return locale as Locale;
  }
  return DEFAULT_LOCALE;
}
