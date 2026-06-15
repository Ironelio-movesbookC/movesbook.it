export type Cke4Instance = {
  getData: () => string;
  setData: (data: string, options?: { internal?: boolean }) => void;
  on: (event: string, callback: () => void) => void;
  destroy: (noUpdate?: boolean) => void;
};

export type Cke4Global = {
  replace: (element: string | HTMLElement, config?: Record<string, unknown>) => Cke4Instance;
  instances: Record<string, Cke4Instance>;
  replaceClass?: string;
};

type Cke4Window = Window & {
  CKEDITOR?: Cke4Global;
  RootURL?: string;
};

export function getCke4Window(): Cke4Window {
  return window as Cke4Window;
}

export function destroyCke4Instance(editorId: string): void {
  const CKEDITOR = getCke4Window().CKEDITOR;
  if (!CKEDITOR?.instances[editorId]) return;
  try {
    CKEDITOR.instances[editorId].destroy(true);
  } catch {
    /* already torn down */
  }
  delete CKEDITOR.instances[editorId];
}
