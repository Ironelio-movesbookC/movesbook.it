import type { MainTab } from '@/components/messages/StaffMessagesExperience';
import type { SupportCategory } from '@/lib/messages/userThreads';

export type FeedbackScope = 'community' | 'mine';

export type FeedbackPageParams = {
  tab?: MainTab;
  category?: SupportCategory;
  scope?: FeedbackScope;
  mine?: boolean;
  recent?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
};

const VALID_CATEGORIES = ['feedback', 'question', 'suggestion', 'problem'] as const;

export function isSupportCategory(value: string): value is SupportCategory {
  return VALID_CATEGORIES.includes(value as SupportCategory);
}

export function feedbackPageUrl(params: FeedbackPageParams = {}): string {
  const qs = new URLSearchParams();
  if (params.tab && params.tab !== 'support') qs.set('tab', params.tab === 'review' ? 'reviews' : params.tab);
  if (params.category) qs.set('category', params.category);
  if (params.scope) qs.set('scope', params.scope);
  if (params.mine) qs.set('mine', '1');
  if (params.recent) qs.set('recent', '1');
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== 5) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return query ? `/assistance/feedback?${query}` : '/assistance/feedback';
}

export function parseFeedbackSearchParams(searchParams: URLSearchParams): FeedbackPageParams {
  const tabRaw = searchParams.get('tab');
  const tab: MainTab =
    tabRaw === 'reviews' ? 'review' : tabRaw === 'version' ? 'version' : 'support';
  const categoryRaw = searchParams.get('category') || '';
  const category = isSupportCategory(categoryRaw) ? categoryRaw : undefined;
  const scopeRaw = searchParams.get('scope');
  const scope: FeedbackScope | undefined =
    scopeRaw === 'community' || scopeRaw === 'mine' ? scopeRaw : undefined;
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get('pageSize') || '5') || 5));
  return {
    tab,
    category: category || 'feedback',
    scope,
    mine: searchParams.get('mine') === '1' || scope === 'mine',
    recent: searchParams.get('recent') === '1',
    q: searchParams.get('q') || '',
    page,
    pageSize,
  };
}

export function legacyUserBugProblemUrl(
  userId: string,
  category: SupportCategory = 'feedback',
): string {
  return `/assistance/user_bug_problem/all/${category}/${userId}`;
}

export function parseLegacyUserBugProblem(segments: string[]): FeedbackPageParams & {
  legacyUserId?: string;
} {
  if (!segments.length) {
    return { tab: 'support', category: 'feedback', scope: 'community' };
  }

  const [pageType, subpage, userId] = segments;

  if (pageType === 'post_by_me') {
    return {
      tab: 'support',
      category: isSupportCategory(subpage || '') ? (subpage as SupportCategory) : 'feedback',
      scope: 'mine',
      mine: true,
      legacyUserId: userId,
    };
  }

  if (pageType === 'recent') {
    return {
      tab: 'support',
      category: isSupportCategory(subpage || '') ? (subpage as SupportCategory) : 'feedback',
      scope: 'community',
      recent: true,
      legacyUserId: userId,
    };
  }

  if (isSupportCategory(pageType)) {
    return {
      tab: 'support',
      category: pageType,
      scope: 'community',
      legacyUserId: userId,
    };
  }

  const category = isSupportCategory(subpage || '')
    ? (subpage as SupportCategory)
    : 'feedback';

  if (pageType === 'all' || pageType === 'default' || pageType === 'feedback') {
    return {
      tab: 'support',
      category,
      scope: 'community',
      legacyUserId: userId,
    };
  }

  return {
    tab: 'support',
    category: 'feedback',
    scope: 'community',
    legacyUserId: userId,
  };
}

/** Legacy PHP: assistance/my_user_bug_problem/... */
export function parseLegacyMyUserBugProblem(segments: string[]): FeedbackPageParams {
  const [pageType, subpage] = segments;
  if (subpage === 'question' || pageType === 'question') {
    return { tab: 'support', category: 'question', scope: 'mine', mine: true };
  }
  if (subpage === 'suggestion' || pageType === 'suggestion') {
    return { tab: 'support', category: 'suggestion', scope: 'mine', mine: true };
  }
  if (pageType === 'problem' || subpage === 'problem') {
    return { tab: 'support', category: 'problem', scope: 'mine', mine: true };
  }
  return { tab: 'support', category: 'feedback', scope: 'mine', mine: true };
}

export function legacyCommunityContributionLinks(userId: string) {
  return [
    { labelKey: 'fast_menu_review_articles', href: feedbackPageUrl({ tab: 'review', scope: 'community' }), icon: 'file' as const },
    { labelKey: 'fast_menu_queries', href: legacyUserBugProblemUrl(userId, 'question'), icon: 'question' as const },
    { labelKey: 'fast_menu_suggestions', href: legacyUserBugProblemUrl(userId, 'suggestion'), icon: 'suggestion' as const },
    { labelKey: 'fast_menu_problems_bugs', href: legacyUserBugProblemUrl(userId, 'problem'), icon: 'bug' as const },
    { labelKey: 'fast_menu_read_feedbacks', href: legacyUserBugProblemUrl(userId, 'feedback'), icon: 'exchange' as const },
  ];
}

export const COMMUNITY_CONTRIBUTION_LINKS = [
  { labelKey: 'fast_menu_review_articles', href: '/assistance/feedback?tab=reviews&scope=community', icon: 'file' as const },
  { labelKey: 'fast_menu_queries', href: '/assistance/user_bug_problem/all/question', icon: 'question' as const },
  { labelKey: 'fast_menu_suggestions', href: '/assistance/user_bug_problem/all/suggestion', icon: 'suggestion' as const },
  { labelKey: 'fast_menu_problems_bugs', href: '/assistance/user_bug_problem/all/problem', icon: 'bug' as const },
  { labelKey: 'fast_menu_read_feedbacks', href: '/assistance/user_bug_problem/all/feedback', icon: 'exchange' as const },
] as const;

export function legacyMyContributionLinks(userId: string) {
  return [
    { labelKey: 'fast_menu_review_articles', href: feedbackPageUrl({ tab: 'review', scope: 'mine', mine: true }), icon: 'file' as const },
    { labelKey: 'fast_menu_queries', href: feedbackPageUrl({ category: 'question', scope: 'mine', mine: true }), icon: 'question' as const },
    { labelKey: 'fast_menu_suggestion', href: feedbackPageUrl({ category: 'suggestion', scope: 'mine', mine: true }), icon: 'suggestion' as const },
    { labelKey: 'fast_menu_problems_bugs', href: feedbackPageUrl({ category: 'problem', scope: 'mine', mine: true }), icon: 'bug' as const },
    { labelKey: 'sidebar_my_feedbacks_staff', href: legacyUserBugProblemUrl(userId, 'feedback'), icon: 'exchange' as const },
    { labelKey: 'fast_menu_feedbacks', href: feedbackPageUrl({ category: 'feedback', scope: 'mine', mine: true }), icon: 'exchange' as const },
  ];
}

export const MY_CONTRIBUTION_LINKS = [
  { labelKey: 'fast_menu_review_articles', href: feedbackPageUrl({ tab: 'review', scope: 'mine', mine: true }), icon: 'file' as const },
  { labelKey: 'fast_menu_queries', href: feedbackPageUrl({ category: 'question', scope: 'mine', mine: true }), icon: 'question' as const },
  { labelKey: 'fast_menu_suggestion', href: feedbackPageUrl({ category: 'suggestion', scope: 'mine', mine: true }), icon: 'suggestion' as const },
  { labelKey: 'fast_menu_problems_bugs', href: feedbackPageUrl({ category: 'problem', scope: 'mine', mine: true }), icon: 'bug' as const },
  { labelKey: 'fast_menu_feedbacks', href: feedbackPageUrl({ category: 'feedback', scope: 'mine', mine: true }), icon: 'exchange' as const },
] as const;
