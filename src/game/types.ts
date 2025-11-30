/**
 * Card suit types
 * JOKER represents both jokers (大王 and 小王)
 */
export type Suit = '♠' | '♥' | '♣' | '♦' | 'JOKER';

/**
 * Card rank types
 * Numeric ranks: 2-10, 11=J, 12=Q, 13=K, 14=A
 * Special ranks: 'SJ' = Small Joker (小王), 'BJ' = Big Joker (大王)
 */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 'SJ' | 'BJ';

/**
 * Represents a single playing card
 */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/**
 * Configuration for a game hand
 * This will be extended later to include亮牌 (revealing cards) logic
 */
export interface GameConfig {
  /** The trump suit for this hand (excluding jokers and fixed trumps) */
  trumpSuit: Suit;
  /** Whether 三反 (three of rank 3) is active as trump */
  hasThreeFan: boolean;
  /** Whether 五反 (three of rank 5) is active as trump */
  hasFiveFan: boolean;
}

/**
 * Represents a card played in a trick, with the player who played it
 */
export interface PlayedCard {
  card: Card;
  playerId: string;
  playerIndex: number;
}

/**
 * Result of a completed trick
 */
export interface TrickResult {
  cards: PlayedCard[];
  winnerIndex: number;
  winnerId: string;
  points: number; // Points captured in this trick
}

/**
 * State of a single player
 */
export interface PlayerState {
  id: string;
  hand: Card[]; // Cards remaining in hand
  team: 'dealer' | 'nonDealer'; // Which team this player belongs to
}

/**
 * Score breakdown for a team
 */
export interface ScoreBreakdown {
  totalPoints: number;
  scoringCards: Card[]; // All 5, 10, K that contributed to the score
}

/**
 * Hand scores with detailed breakdown
 */
export interface HandScores {
  dealerTeam: ScoreBreakdown;
  nonDealerTeam: ScoreBreakdown;
}

/**
 * Result of dealing with first 2 candidate tracking
 */
export interface DealWithTwosResult {
  hands: Card[][];
  bottomCards: Card[];
  firstTwoCandidate: { playerIndex: number; suit: Suit } | null;
}

/**
 * Game phase types
 */
export type Phase = 'DEAL' | 'CHOOSE_TRUMP' | 'CONFIRM_LANDLORD' | 'DISCARD_BOTTOM' | 'PLAY_TRICK' | 'ROUND_END';

/**
 * @deprecated Use Phase instead
 */
export type GamePhase = Phase;

/**
 * History event types
 */
export type HistoryEventType = 'BOTTOM_SET' | 'TRICK_COMPLETE' | 'CARD_PLAYED' | 'LANDLORD_DISCARD';

/**
 * History event for game actions
 */
export interface HistoryEvent {
  type: HistoryEventType;
  timestamp: number;
  dealerId?: string; // For BOTTOM_SET events
  dealerIndex?: number; // For BOTTOM_SET events
  cards?: Card[]; // For BOTTOM_SET and LANDLORD_DISCARD events
  playerId?: string; // For CARD_PLAYED events
  playerIndex?: number; // For CARD_PLAYED events
  trickIndex?: number; // For TRICK_COMPLETE events
  landlordId?: string; // For LANDLORD_DISCARD events
  landlordIndex?: number; // For LANDLORD_DISCARD events
}

/**
 * Complete game state
 */
export interface GameState {
  players: PlayerState[];
  currentPlayerIndex: number; // Who should play next
  dealerIndex: number; // Index of the dealer (庄家)
  trumpSuit: Suit;
  config: GameConfig;
  currentTrick: PlayedCard[]; // Cards played in the current trick (0-4 cards)
  tricks: TrickResult[]; // Completed tricks
  scores: {
    dealerTeam: number;
    nonDealerTeam: number;
  };
  finalBottomCards?: Card[]; // Cards chosen by dealer to put back as bottom (扣底牌)
  bottomCards?: Card[]; // Shared bottom cards field (same as finalBottomCards, for consistency)
  history?: HistoryEvent[]; // Game history events (optional for backward compatibility)
  phase: Phase; // Current game phase (REQUIRED - explicit phase system)
  landlordId?: string | null; // ID of the landlord (庄家) - explicit field
  landlordDiscardSelection?: Card[]; // Cards selected for discarding (during DISCARD_BOTTOM phase)
}

