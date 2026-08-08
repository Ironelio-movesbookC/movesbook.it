import { cookies } from 'next/headers';
import HtmlPageView from '@/components/helpHtmlPages/HtmlPageView';
import { loadHelpHtmlPageView } from '@/lib/helpHtmlPages/helpHtmlPageService';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ pageName: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseLangId(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pageName } = await params;
  let title = pageName;
  try {
    title = decodeURIComponent(pageName.replace(/\+/g, ' '));
  } catch {
    /* keep raw */
  }
  return { title: `${title} | Movesbook` };
}

export default async function HelpHtmlPage({ params, searchParams }: PageProps) {
  const { pageName } = await params;
  const query = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const langFromQuery =
    firstParam(query.language_id) ?? firstParam(query.lang) ?? firstParam(query.lang_id);
  const langId = langFromQuery
    ? parseLangId(langFromQuery)
    : parseLangId(cookieStore.get('selected_lang_ID')?.value);
  const data = await loadHelpHtmlPageView(pageName, langId);

  return <HtmlPageView data={data} />;
}
