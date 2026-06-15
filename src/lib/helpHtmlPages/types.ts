export type HelpHtmlPageRecord = {
  id: number;
  pageTitle: string;
  content: string;
  langId: number;
};

export type HelpHtmlPageNewsPost = {
  id: number;
  title: string;
  created: string | null;
};

export type HelpHtmlPageLanguage = {
  id: number;
  name: string;
};

export type HelpHtmlPageViewModel = {
  page: HelpHtmlPageRecord | null;
  newsPosts: HelpHtmlPageNewsPost[];
  languages: HelpHtmlPageLanguage[];
  langId: number;
  pageName: string;
};
