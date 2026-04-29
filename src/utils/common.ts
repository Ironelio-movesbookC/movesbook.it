import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { ReadonlyURLSearchParams } from 'next/navigation';

export const updateSearchParams = (
  router: AppRouterInstance,
  searchParams: ReadonlyURLSearchParams | null,
  key: string,
  value?: string | string[],
) => {
  const params = new URLSearchParams(searchParams?.toString());
  if (Array.isArray(value)) {
    if (value.length > 0) {
      params.delete(key);
      value.forEach((item) => {
        params.append(key, item);
      });
    } else {
      params.delete(key);
    }
  } else if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
  router.replace(`?${params.toString()}`, { scroll: false });
};