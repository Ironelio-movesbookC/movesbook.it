'use client';

import Link from 'next/link';
import type { HelpHtmlPageViewModel } from '@/lib/helpHtmlPages/types';

type HtmlPageViewProps = {
  data: HelpHtmlPageViewModel;
};

function formatNewsDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function encodeNewsId(id: number): string {
  return btoa(String(id));
}

export default function HtmlPageView({ data }: HtmlPageViewProps) {
  const { page, newsPosts, languages, langId, pageName } = data;

  const onLanguageChange = (nextLangId: string) => {
    document.cookie = `selected_lang_ID=${nextLangId}; path=/; max-age=31536000`;
    window.location.reload();
  };

  if (!page) {
    return (
      <div className="htmlpage-wrap">
        <div className="htmlpage-empty">
          <p>Page not found: {pageName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="htmlpage-wrap">
      <div
        className="opp-editor-content htmlpage-content"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />

      <input type="hidden" value={String(langId)} id="langId" readOnly />
      <div className="sp-line" />

      <div className="select-version mtop10">
        <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td>
                <div>Related Post</div>
                <div className="listbox mtop5 htmlpage-related-list">
                  {newsPosts.length === 0 ? (
                    <div className="htmlpage-muted">No related posts</div>
                  ) : (
                    newsPosts.map((post) => (
                      <div key={post.id} className="htmlpage-related-row">
                        <Link
                          href={`/news/newspost/${encodeNewsId(post.id)}/${encodeURIComponent(pageName)}`}
                          target="_blank"
                          className="htmlpage-related-link"
                        >
                          {post.title}
                        </Link>
                        <span className="htmlpage-related-date">{formatNewsDate(post.created)}</span>
                      </div>
                    ))
                  )}
                </div>
              </td>
              <td className="htmlpage-get-col">
                <div className="getmovesbook">GET MOVESBOOK</div>
                <div className="text-center">
                  <Link href="/users/home" className="btn-light-gray">
                    Register yourself
                  </Link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="clear" />
      <div id="htmlpgHiddenID" style={{ display: 'none' }}>
        {page.id}
      </div>
      <input type="hidden" id="html_page_id" value={String(page.id)} readOnly />

      <div className="opp-comment">
        <div className="opp-comment-toprow">
          <div className="opp-comment-title-top">
            <div>Comments</div>
          </div>
          <div className="opp-follow-us">
            {languages.length > 0 ? (
              <div className="custom-select htmlpage-lang-select">
                <select
                  value={String(langId)}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  aria-label="Comment language"
                >
                  {languages.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <span style={{ lineHeight: '30px' }}>Follow Us</span>
          </div>
          <div className="clear" />
        </div>

        <div className="opp-load-more">
          <Link href="/">First Login to give comment</Link>
        </div>
        <div className="opp-load-more">
          <span>Total comments (0)</span>
        </div>
      </div>
    </div>
  );
}
