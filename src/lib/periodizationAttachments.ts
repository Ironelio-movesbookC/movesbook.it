export type PeriodizationAttachmentMeta = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export const MAX_PERIOD_ATTACHMENTS = 10;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
