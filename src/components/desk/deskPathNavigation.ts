export type DeskDisplayMode = 'new_label' | 'central_page';

export function resolveDeskItemUrl(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `https://${trimmed}`;
}

function isExternalDeskUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function openDeskItemPath(
  path: string,
  displayMode: DeskDisplayMode | undefined,
  router: { push: (url: string) => void }
) {
  const url = resolveDeskItemUrl(path);
  if (!url) return;

  const mode = displayMode ?? 'new_label';
  if (mode === 'new_label') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  if (isExternalDeskUrl(url)) {
    window.location.assign(url);
    return;
  }

  router.push(url);
}
