import { fetchLongTextTranslation } from './infoRepsLongText';

export const SUGGEST_MOVESBOOK_INTRO_KEY = 'SuggestMovesbookIntro';

export const SUGGEST_MOVESBOOK_INTRO_EN =
  'Invite friends to Movesbook and you both benefit. When someone registers with your promocode they get a discount on their subscription, and you earn credits each time a friend — or a friend of a friend — completes registration. Share by email, WhatsApp or Telegram. If your promocode allows it, you can also create your own promocodes to grow your network.';

export async function fetchSuggestMovesbookIntroText(language: string): Promise<string> {
  return fetchLongTextTranslation(
    SUGGEST_MOVESBOOK_INTRO_KEY,
    language,
    SUGGEST_MOVESBOOK_INTRO_EN
  );
}
