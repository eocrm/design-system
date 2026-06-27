// emojiData.ts — a curated, common-first emoji dataset for <EmojiPicker>. Plain data
// (not a UI library): a focused set covering reactions + everyday input, NOT the full
// ~1900-emoji Unicode set (YAGNI for v1; expandable). Each `char` is one
// user-perceived emoji; `name` + `keywords` are the English search corpus. Category
// labels are localized by the component (via the `id` → `emojiPicker.category.<id>`
// i18n key), so this file carries ids, not labels.

/** One emoji and its search metadata. */
export interface EmojiEntry {
  /** The unicode character to insert / pass to `onSelect` (e.g. `"👍"`). */
  char: string;
  /** Human name — the emoji button's accessible label + part of the search corpus. */
  name: string;
  /** Extra search terms (synonyms) matched alongside `name`. */
  keywords: string[];
}

/** Stable category identifier — maps to the `emojiPicker.category.<id>` i18n label. */
export type EmojiCategoryId =
  | 'smileys'
  | 'gestures'
  | 'people'
  | 'animals'
  | 'food'
  | 'activities'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags';

/** A category section: its id + the emojis it contains, in display order. */
export interface EmojiCategory {
  id: EmojiCategoryId;
  emojis: EmojiEntry[];
}

/** The curated category sections, in display order (reaction-friendly first). */
export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    emojis: [
      { char: '😀', name: 'grinning face', keywords: ['smile', 'happy'] },
      { char: '😄', name: 'grinning face with smiling eyes', keywords: ['happy', 'joy'] },
      { char: '😁', name: 'beaming face', keywords: ['grin', 'happy'] },
      { char: '😂', name: 'face with tears of joy', keywords: ['lol', 'laugh', 'funny'] },
      { char: '🤣', name: 'rolling on the floor laughing', keywords: ['rofl', 'lol', 'laugh'] },
      { char: '🙂', name: 'slightly smiling face', keywords: ['smile'] },
      { char: '😉', name: 'winking face', keywords: ['wink'] },
      { char: '😊', name: 'smiling face with smiling eyes', keywords: ['blush', 'happy'] },
      { char: '😍', name: 'smiling face with heart-eyes', keywords: ['love', 'crush'] },
      { char: '😘', name: 'face blowing a kiss', keywords: ['kiss', 'love'] },
      { char: '😎', name: 'smiling face with sunglasses', keywords: ['cool'] },
      { char: '🤔', name: 'thinking face', keywords: ['hmm', 'consider'] },
      { char: '😐', name: 'neutral face', keywords: ['meh'] },
      { char: '🙄', name: 'face with rolling eyes', keywords: ['eyeroll', 'annoyed'] },
      { char: '😴', name: 'sleeping face', keywords: ['sleep', 'zzz', 'tired'] },
      { char: '😢', name: 'crying face', keywords: ['sad', 'tear'] },
      { char: '😭', name: 'loudly crying face', keywords: ['sob', 'sad', 'cry'] },
      { char: '😡', name: 'enraged face', keywords: ['angry', 'mad'] },
      { char: '😱', name: 'face screaming in fear', keywords: ['scared', 'shock', 'omg'] },
      { char: '🤯', name: 'exploding head', keywords: ['mind blown', 'shock'] },
      { char: '🥳', name: 'partying face', keywords: ['celebrate', 'party'] },
      { char: '😬', name: 'grimacing face', keywords: ['awkward', 'yikes'] },
      { char: '🤗', name: 'hugging face', keywords: ['hug'] },
      { char: '😅', name: 'grinning face with sweat', keywords: ['phew', 'relief', 'nervous'] },
    ],
  },
  {
    id: 'gestures',
    emojis: [
      { char: '👍', name: 'thumbs up', keywords: ['yes', 'approve', 'like', '+1'] },
      { char: '👎', name: 'thumbs down', keywords: ['no', 'disapprove', 'dislike', '-1'] },
      { char: '👏', name: 'clapping hands', keywords: ['applause', 'bravo'] },
      { char: '🙌', name: 'raising hands', keywords: ['celebrate', 'praise'] },
      { char: '🙏', name: 'folded hands', keywords: ['please', 'thanks', 'pray'] },
      { char: '👌', name: 'OK hand', keywords: ['ok', 'perfect'] },
      { char: '🤝', name: 'handshake', keywords: ['deal', 'agree'] },
      { char: '✌️', name: 'victory hand', keywords: ['peace'] },
      { char: '🤞', name: 'crossed fingers', keywords: ['luck', 'hopeful'] },
      { char: '👋', name: 'waving hand', keywords: ['hello', 'hi', 'bye'] },
      { char: '💪', name: 'flexed biceps', keywords: ['strong', 'muscle'] },
      { char: '🤙', name: 'call me hand', keywords: ['shaka'] },
      { char: '👇', name: 'backhand index pointing down', keywords: ['point', 'below'] },
      { char: '👉', name: 'backhand index pointing right', keywords: ['point'] },
      { char: '✋', name: 'raised hand', keywords: ['stop', 'high five'] },
    ],
  },
  {
    id: 'people',
    emojis: [
      { char: '🧑', name: 'person', keywords: ['adult', 'someone'] },
      { char: '👩', name: 'woman', keywords: ['female'] },
      { char: '👨', name: 'man', keywords: ['male'] },
      { char: '🧒', name: 'child', keywords: ['kid'] },
      { char: '👶', name: 'baby', keywords: ['infant'] },
      { char: '🧓', name: 'older person', keywords: ['elder', 'senior'] },
      { char: '👮', name: 'police officer', keywords: ['cop'] },
      { char: '🕵️', name: 'detective', keywords: ['spy', 'investigate'] },
      { char: '👩‍💻', name: 'woman technologist', keywords: ['developer', 'coder', 'engineer'] },
      { char: '👨‍💻', name: 'man technologist', keywords: ['developer', 'coder', 'engineer'] },
      { char: '🦸', name: 'superhero', keywords: ['hero'] },
      { char: '🧑‍🚀', name: 'astronaut', keywords: ['space'] },
      { char: '👤', name: 'silhouette', keywords: ['user', 'profile', 'anonymous'] },
    ],
  },
  {
    id: 'animals',
    emojis: [
      { char: '🐶', name: 'dog face', keywords: ['puppy'] },
      { char: '🐱', name: 'cat face', keywords: ['kitten'] },
      { char: '🐭', name: 'mouse face', keywords: ['rodent'] },
      { char: '🐹', name: 'hamster', keywords: ['pet'] },
      { char: '🐰', name: 'rabbit face', keywords: ['bunny'] },
      { char: '🦊', name: 'fox', keywords: [] },
      { char: '🐻', name: 'bear', keywords: [] },
      { char: '🐼', name: 'panda', keywords: [] },
      { char: '🦁', name: 'lion', keywords: [] },
      { char: '🐮', name: 'cow face', keywords: [] },
      { char: '🐷', name: 'pig face', keywords: [] },
      { char: '🐵', name: 'monkey face', keywords: [] },
      { char: '🐔', name: 'chicken', keywords: ['hen'] },
      { char: '🐧', name: 'penguin', keywords: [] },
      { char: '🐦', name: 'bird', keywords: [] },
      { char: '🦄', name: 'unicorn', keywords: ['magic'] },
      { char: '🐝', name: 'honeybee', keywords: ['bee'] },
      { char: '🦋', name: 'butterfly', keywords: [] },
    ],
  },
  {
    id: 'food',
    emojis: [
      { char: '🍎', name: 'red apple', keywords: ['fruit'] },
      { char: '🍌', name: 'banana', keywords: ['fruit'] },
      { char: '🍓', name: 'strawberry', keywords: ['fruit', 'berry'] },
      { char: '🍕', name: 'pizza', keywords: ['food', 'slice'] },
      { char: '🍔', name: 'hamburger', keywords: ['burger', 'food'] },
      { char: '🍟', name: 'french fries', keywords: ['fries', 'chips'] },
      { char: '🌮', name: 'taco', keywords: ['food', 'mexican'] },
      { char: '🍣', name: 'sushi', keywords: ['food', 'japanese'] },
      { char: '🍩', name: 'doughnut', keywords: ['donut', 'sweet'] },
      { char: '🍪', name: 'cookie', keywords: ['sweet', 'biscuit'] },
      { char: '🎂', name: 'birthday cake', keywords: ['cake', 'celebrate'] },
      { char: '☕', name: 'hot beverage', keywords: ['coffee', 'tea'] },
      { char: '🍺', name: 'beer mug', keywords: ['drink', 'cheers'] },
      { char: '🍷', name: 'wine glass', keywords: ['drink'] },
      { char: '🥂', name: 'clinking glasses', keywords: ['cheers', 'celebrate', 'toast'] },
    ],
  },
  {
    id: 'activities',
    emojis: [
      { char: '⚽', name: 'soccer ball', keywords: ['football', 'sport'] },
      { char: '🏀', name: 'basketball', keywords: ['sport'] },
      { char: '🏈', name: 'american football', keywords: ['sport'] },
      { char: '⚾', name: 'baseball', keywords: ['sport'] },
      { char: '🎾', name: 'tennis', keywords: ['sport'] },
      { char: '🏆', name: 'trophy', keywords: ['win', 'award', 'champion'] },
      { char: '🥇', name: 'first place medal', keywords: ['gold', 'win', 'medal'] },
      { char: '🎯', name: 'direct hit', keywords: ['target', 'bullseye', 'goal'] },
      { char: '🎮', name: 'video game', keywords: ['game', 'controller', 'gaming'] },
      { char: '🎲', name: 'game die', keywords: ['dice', 'random'] },
      { char: '🎉', name: 'party popper', keywords: ['celebrate', 'tada', 'congrats'] },
      { char: '🎊', name: 'confetti ball', keywords: ['celebrate', 'party'] },
      { char: '🎁', name: 'wrapped gift', keywords: ['present', 'gift'] },
      { char: '🎈', name: 'balloon', keywords: ['party'] },
      { char: '🎵', name: 'musical note', keywords: ['music', 'song'] },
    ],
  },
  {
    id: 'travel',
    emojis: [
      { char: '🚗', name: 'car', keywords: ['auto', 'vehicle'] },
      { char: '✈️', name: 'airplane', keywords: ['flight', 'travel'] },
      { char: '🚀', name: 'rocket', keywords: ['launch', 'ship', 'space', 'fast'] },
      { char: '🚲', name: 'bicycle', keywords: ['bike'] },
      { char: '🚆', name: 'train', keywords: ['rail'] },
      { char: '🚕', name: 'taxi', keywords: ['cab'] },
      { char: '⛵', name: 'sailboat', keywords: ['boat'] },
      { char: '🏠', name: 'house', keywords: ['home'] },
      { char: '🏢', name: 'office building', keywords: ['work', 'company'] },
      { char: '🗺️', name: 'world map', keywords: ['map', 'travel'] },
      { char: '🏖️', name: 'beach with umbrella', keywords: ['vacation', 'holiday'] },
      { char: '🗻', name: 'mount fuji', keywords: ['fuji', 'mountain'] },
      { char: '🌍', name: 'globe showing europe-africa', keywords: ['earth', 'world'] },
      { char: '⛰️', name: 'mountain', keywords: ['hill', 'peak'] },
    ],
  },
  {
    id: 'objects',
    emojis: [
      { char: '💻', name: 'laptop', keywords: ['computer', 'work'] },
      { char: '🖥️', name: 'desktop computer', keywords: ['monitor', 'pc'] },
      { char: '📱', name: 'mobile phone', keywords: ['cell', 'smartphone'] },
      { char: '⌨️', name: 'keyboard', keywords: ['type'] },
      { char: '🖱️', name: 'computer mouse', keywords: ['click'] },
      { char: '💾', name: 'floppy disk', keywords: ['save', 'disk'] },
      { char: '📎', name: 'paperclip', keywords: ['attach', 'attachment'] },
      { char: '📌', name: 'pushpin', keywords: ['pin'] },
      { char: '📅', name: 'calendar', keywords: ['date', 'schedule'] },
      { char: '📊', name: 'bar chart', keywords: ['graph', 'stats', 'analytics'] },
      { char: '📈', name: 'chart increasing', keywords: ['growth', 'up', 'trend'] },
      { char: '📉', name: 'chart decreasing', keywords: ['decline', 'down', 'trend'] },
      { char: '💡', name: 'light bulb', keywords: ['idea', 'tip'] },
      { char: '🔒', name: 'locked', keywords: ['secure', 'lock', 'private'] },
      { char: '🔑', name: 'key', keywords: ['unlock', 'password'] },
      { char: '📞', name: 'telephone receiver', keywords: ['call', 'phone'] },
      { char: '✉️', name: 'envelope', keywords: ['email', 'mail', 'message'] },
      { char: '📝', name: 'memo', keywords: ['note', 'write', 'edit'] },
    ],
  },
  {
    id: 'symbols',
    emojis: [
      { char: '❤️', name: 'red heart', keywords: ['love', 'like'] },
      { char: '🧡', name: 'orange heart', keywords: ['love'] },
      { char: '💛', name: 'yellow heart', keywords: ['love'] },
      { char: '💚', name: 'green heart', keywords: ['love'] },
      { char: '💙', name: 'blue heart', keywords: ['love'] },
      { char: '💜', name: 'purple heart', keywords: ['love'] },
      { char: '🖤', name: 'black heart', keywords: ['love'] },
      { char: '💔', name: 'broken heart', keywords: ['sad', 'heartbreak'] },
      { char: '🔥', name: 'fire', keywords: ['lit', 'hot', 'flame'] },
      { char: '⭐', name: 'star', keywords: ['favorite', 'rating'] },
      { char: '✨', name: 'sparkles', keywords: ['shiny', 'clean', 'magic'] },
      { char: '💯', name: 'hundred points', keywords: ['100', 'perfect', 'score'] },
      { char: '✅', name: 'check mark button', keywords: ['done', 'yes', 'approve', 'check'] },
      { char: '❌', name: 'cross mark', keywords: ['no', 'wrong', 'cancel', 'x'] },
      { char: '⚠️', name: 'warning', keywords: ['caution', 'alert'] },
      { char: '❓', name: 'question mark', keywords: ['help', 'why'] },
      { char: '❗', name: 'exclamation mark', keywords: ['important', 'alert'] },
      { char: '➕', name: 'plus', keywords: ['add', 'new'] },
      { char: '👀', name: 'eyes', keywords: ['look', 'watching', 'see'] },
    ],
  },
  {
    id: 'flags',
    emojis: [
      { char: '🏁', name: 'chequered flag', keywords: ['race', 'finish'] },
      { char: '🚩', name: 'triangular flag', keywords: ['flag', 'mark'] },
      { char: '🏳️', name: 'white flag', keywords: ['surrender'] },
      { char: '🏴', name: 'black flag', keywords: [] },
      { char: '🏳️‍🌈', name: 'rainbow flag', keywords: ['pride', 'lgbt'] },
    ],
  },
];
