/** Client-safe quick register constants and types (no Node/server imports). */

export const QUICK_REGISTER_SUCCESS_MESSAGE =
  'You have successfully registered. You will receive an email with your username and the password you chose.';

export type RegistrationStatus = {
  type: 'new' | 'renewal';
  detail: 'new' | 'renewal_expired' | 'renewal_active';
  label: string;
  has_active_subscription: boolean;
  subscription_end_date?: string;
  existing_username?: string;
};
