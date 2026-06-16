import { cookies } from 'next/headers';
import HtmlPageView from '@/components/helpHtmlPages/HtmlPageView';
import { loadHelpHtmlPageView } from '@/lib/helpHtmlPages/helpHtmlPageService';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ pageName: string }>;
};

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

export default async function HelpHtmlPage({ params }: PageProps) {
  const { pageName } = await params;
  const cookieStore = await cookies();
  const langId = parseLangId(cookieStore.get('selected_lang_ID')?.value);
  const data = await loadHelpHtmlPageView(pageName, langId);

  return <HtmlPageView data={data} />;
}
