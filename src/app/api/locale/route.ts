import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/lib/i18n/dictionaries';

export async function POST(req: Request) {
  const body = (await req.json()) as { locale?: string };
  const locale = body.locale;

  if (!locale || !(LOCALES as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale as Locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  });

  return NextResponse.json({ locale });
}
