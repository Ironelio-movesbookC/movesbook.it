/**
 * Sport Icons Utility
 * Provides both emoji and image icons for sports based on user settings
 */

// Emoji mapping for sports
const SPORT_EMOJIS: Record<string, string> = {
  'SWIM': '🏊',
  'BIKE': '🚴',
  'RUN': '🏃',
  'BODY_BUILDING': '💪',
  'ROWING': '🚣',
  'SKATE': '⛸️',
  'GYMNASTIC': '🤸',
  'STRETCHING': '🧘',
  'PILATES': '🧘‍♀️',
  'YOGA': '🧘‍♂️',
  'SKI': '⛷️',
  'SNOWBOARD': '🏂',
  'TECHNICAL_MOVES': '⚙️',
  'FREE_MOVES': '🤾',
  'SOCCER': '⚽',
  'BASKETBALL': '🏀',
  'TENNIS': '🎾',
  'VOLLEYBALL': '🏐',
  'GOLF': '⛳',
  'BOXING': '🥊',
  'MARTIAL_ARTS': '🥋',
  'CLIMBING': '🧗',
  'HIKING': '🥾',
  'WALKING': '🚶',
  'DANCING': '💃',
  'CROSSFIT': '🏋️',
  'TRIATHLON': '🏊‍♂️',
  'TRACK_FIELD': '🏃‍♀️',
  'SURFING': '🏄',
  'BASEBALL': '⚾',
  'ICE_HOCKEY': '🏒',
  'RUGBY': '🏉',
  'AMERICAN_FOOTBALL': '🏈',
  'ARCHERY': '🏹',
  'ARTISTIC_GYMNASTICS': '🤸‍♀️',
  'ATHLETICS': '🏃‍♂️',
  'BADMINTON': '🏸',
  'BILLIARDS': '🎱',
  'BOATING': '⛵',
  'BOWLING': '🎳',
  'CANOEING': '🛶',
  'CANOE': '🛶',
  'CLASSIC_DANCE': '💃',
  'CRICKET': '🏏',
  'CROSS_COUNTRY_SKIING': '⛷️',
  'CYCLOCROSS': '🚵',
  'DANCE': '💃',
  'DIPS': '💪',
  'DIVING': '🤿',
  'DOWNHILL_SKIING': '⛷️',
  'FENCING': '🤺',
  'FIELD_HOCKEY': '🏑',
  'FISHING': '🎣',
  'FREESTYLE_WRESTLING': '🤼',
  'HANDBALL': '🤾',
  'HANG_GLIDING': '🪂',
  'HORSE_RACING': '🏇',
  'ICE_SKATING': '⛸️',
  'JUMPS': '🏃‍♂️',
  'KAYAK': '🛶',
  'KICKBOXING': '🥊',
  'LIFTING': '🏋️',
  'MODERN_DANCE': '💃',
  'MOTORING': '🏎️',
  'MOUNTAIN_BIKE': '🚵',
  'MOUNTAIN_CLIMBING': '🧗',
  'MTB': '🚵',
  'PING_PONG': '🏓',
  'POLO': '🏇',
  'POWERLIFTING': '🏋️',
  'RACQUETBALL': '🎾',
  'RHYTHMIC_GYMNASTICS': '🤸‍♀️',
  'SAILING': '⛵',
  'SHOT_PUT': '🏋️',
  'SKATEBOARD': '🛹',
  'SKI_JUMP': '🎿',
  'SKI_SLALOM': '⛷️',
  'SNORKELING': '🤿',
  'SPARTAN': '🏃‍♂️',
  'SPINNING': '🚴',
  'TANGO': '💃',
  'TECHNICAL': '⚙️',
  'THROWS': '🏋️',
  'TREKKING': '🥾',
  'WATER_POLO': '🤽',
  'WATER_SKI': '🎿',
  'WINDSURF': '🏄',
  'CYCLING_TOURISM': '🚴',
  'CALISTENIC': '💪'
};

// Image path mapping for sports
const SPORT_IMAGES: Record<string, string> = {
  'SWIM': '/icons/swimming.png',
  'BIKE': '/icons/cycling.png',
  'RUN': '/icons/running.png',
  'BODY_BUILDING': '/icons/weights.png',
  'ROWING': '/icons/rowing.png',
  'SKATE': '/icons/skating.png',
  'GYMNASTIC': '/icons/gymnastic.png',
  'STRETCHING': '/icons/stretching.png',
  'PILATES': '/icons/pilaters.png',
  'YOGA': '/icons/yoga.png',
  'SKI': '/icons/ski.png',
  'SNOWBOARD': '/icons/snowboard.png',
  'TECHNICAL_MOVES': '/icons/technical.png',
  'FREE_MOVES': '/icons/gymnastic.png',
  'SOCCER': '/icons/soccer.png',
  'BASKETBALL': '/icons/basketball.png',
  'TENNIS': '/icons/tennis.png',
  'VOLLEYBALL': '/icons/volley.png',
  'GOLF': '/icons/golf.png',
  'BOXING': '/icons/boxe.png',
  'MARTIAL_ARTS': '/icons/martial arts.png',
  'CLIMBING': '/icons/mountain climbing.png',
  'HIKING': '/icons/hiking.png',
  'WALKING': '/icons/walking.png',
  'DANCING': '/icons/dance.png',
  'CROSSFIT': '/icons/crossfit.png',
  'TRIATHLON': '/icons/triathlon.png',
  'TRACK_FIELD': '/icons/athletic.png',
  'SURFING': '/icons/surf.png',
  'BASEBALL': '/icons/baseball.png',
  'ICE_HOCKEY': '/icons/hockey.png',
  'RUGBY': '/icons/rugby.png',
  'AMERICAN_FOOTBALL': '/icons/american football.png',
  'ARCHERY': '/icons/arch.png',
  'ARTISTIC_GYMNASTICS': '/icons/artistic gymnastics.png',
  'ATHLETICS': '/icons/athletic.png',
  'BADMINTON': '/icons/badminton.png',
  'BILLIARDS': '/icons/billiards.png',
  'BOATING': '/icons/boating.png',
  'BOWLING': '/icons/bowling.png',
  'CANOEING': '/icons/canoe.png',
  'CANOE': '/icons/canoe.png',
  'CLASSIC_DANCE': '/icons/classic dance.png',
  'CRICKET': '/icons/cricket.png',
  'CROSS_COUNTRY_SKIING': '/icons/cross-country skiing.png',
  'CYCLOCROSS': '/icons/cyclocross.png',
  'DANCE': '/icons/dance.png',
  'DIPS': '/icons/dips.png',
  'DIVING': '/icons/diving.png',
  'DOWNHILL_SKIING': '/icons/downhill skiing.png',
  'FENCING': '/icons/fancing.png',
  'FIELD_HOCKEY': '/icons/field hockey.png',
  'FISHING': '/icons/fishing.png',
  'FREESTYLE_WRESTLING': '/icons/freestyle wrestling.png',
  'HANDBALL': '/icons/handball.png',
  'HANG_GLIDING': '/icons/hang gliding.png',
  'HORSE_RACING': '/icons/horse racing.png',
  'ICE_SKATING': '/icons/ice skating.png',
  'JUMPS': '/icons/jumps.png',
  'KAYAK': '/icons/kayak.png',
  'KICKBOXING': '/icons/kick boxing.png',
  'LIFTING': '/icons/lifting.png',
  'MODERN_DANCE': '/icons/modern_dance.png',
  'MOTORING': '/icons/Motoring.png',
  'MOUNTAIN_BIKE': '/icons/mountain bike.png',
  'MOUNTAIN_CLIMBING': '/icons/mountain climbing.png',
  'MTB': '/icons/MTB.png',
  'PING_PONG': '/icons/ping pong.png',
  'POLO': '/icons/polo.png',
  'POWERLIFTING': '/icons/power_lifting.png',
  'RACQUETBALL': '/icons/raquetball.png',
  'RHYTHMIC_GYMNASTICS': '/icons/rhythmic gymnastics.png',
  'SAILING': '/icons/sailing.png',
  'SHOT_PUT': '/icons/shot.png',
  'SKATEBOARD': '/icons/skateboard.png',
  'SKI_JUMP': '/icons/ski jump.png',
  'SKI_SLALOM': '/icons/ski slalom.png',
  'SNORKELING': '/icons/snorkeling.png',
  'SPARTAN': '/icons/spartan.png',
  'SPINNING': '/icons/spining.png',
  'TANGO': '/icons/tango.png',
  'TECHNICAL': '/icons/technical.png',
  'THROWS': '/icons/throwes.png',
  'TREKKING': '/icons/trekking.png',
  'WATER_POLO': '/icons/water polo.png',
  'WATER_SKI': '/icons/waterl ski.png',
  'WINDSURF': '/icons/windsurf.png',
  'CYCLING_TOURISM': '/icons/cicloturism.png',
  'CALISTENIC': '/icons/calistenic.png'
};

/**
 * Get sport emoji icon
 */
export function getSportEmoji(sport: string): string {
  return SPORT_EMOJIS[sport] || '🏋️';
}

/**
 * Get sport image path
 */
export function getSportImagePath(sport: string): string {
  return SPORT_IMAGES[sport] || '/icons/running.png';
}

/**
 * Get sport icon based on type (emoji or image)
 * @param sport - Sport code (e.g., 'SWIM', 'RUN')
 * @param iconType - 'emoji' or 'icon'
 * @returns Emoji string or image path
 */
export function getSportIcon(sport: string, iconType: 'emoji' | 'icon' = 'emoji'): string {
  if (iconType === 'icon') {
    return getSportImagePath(sport);
  }
  return getSportEmoji(sport);
}

/**
 * Check if icon type is image
 */
export function isImageIcon(iconType: string): boolean {
  return iconType === 'icon' || iconType === 'image';
}

