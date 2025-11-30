import { Card, Suit, Rank, GameConfig } from './types';

/**
 * Constants for card point values
 * Cards with points: 5 = 5 points, 10 = 10 points, K = 10 points
 */
export const CARD_POINTS: Record<Rank, number> = {
  2: 0,
  3: 0,
  4: 0,
  5: 5,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 10,
  11: 0, // J
  12: 0, // Q
  13: 10, // K
  14: 0, // A
  SJ: 0, // Small Joker
  BJ: 0, // Big Joker
};

/**
 * Get the point value of a card
 */
export function getCardPoints(card: Card): number {
  return CARD_POINTS[card.rank];
}

/**
 * Check if a card is a fixed trump (常主)
 * Fixed trumps are always trump regardless of suit:
 * - ♦5 (方片5)
 * - Big Joker (大王, BJ)
 * - Small Joker (小王, SJ)
 * - ♠Q (黑桃Q)
 */
export function isFixedTrump(card: Card): boolean {
  // ♦5
  if (card.suit === '♦' && card.rank === 5) {
    return true;
  }
  // Big Joker
  if (card.suit === 'JOKER' && card.rank === 'BJ') {
    return true;
  }
  // Small Joker
  if (card.suit === 'JOKER' && card.rank === 'SJ') {
    return true;
  }
  // ♠Q
  if (card.suit === '♠' && card.rank === 12) {
    return true;
  }
  return false;
}

/**
 * Check if a card is a special fan trump (三反 or 五反)
 * These are trump cards when hasThreeFan or hasFiveFan is true
 */
export function isFanTrump(card: Card, config: GameConfig): boolean {
  // 五反: three of rank 5 (but not ♦5 which is fixed trump)
  if (config.hasFiveFan && card.rank === 5 && card.suit !== '♦') {
    return true;
  }
  // 三反: three of rank 3
  if (config.hasThreeFan && card.rank === 3) {
    return true;
  }
  return false;
}

/**
 * Check if a card is a J trump
 * All J's are trump, with trump suit J being strongest
 */
export function isJTrump(card: Card, trumpSuit: Suit): boolean {
  return card.rank === 11; // All J's are trump
}

/**
 * Check if a card is a 2 trump
 * All 2's are trump, with trump suit 2 being strongest
 */
export function is2Trump(card: Card, trumpSuit: Suit): boolean {
  return card.rank === 2;
}

/**
 * Check if a card is trump (主牌)
 * A card is trump if it's:
 * - Fixed trump (常主)
 * - Fan trump (三反/五反)
 * - J trump (all J's)
 * - 2 trump (all 2's)
 * - Of the trump suit (花色主)
 */
export function isTrump(card: Card, trumpSuit: Suit, config: GameConfig): boolean {
  // Fixed trumps
  if (isFixedTrump(card)) {
    return true;
  }
  // Fan trumps (三反/五反)
  if (isFanTrump(card, config)) {
    return true;
  }
  // All J's are trump
  if (isJTrump(card, trumpSuit)) {
    return true;
  }
  // All 2's are trump
  if (is2Trump(card, trumpSuit)) {
    return true;
  }
  // Trump suit cards (花色主)
  // Fixed trumps (♦5, ♠Q) are already handled above, so we don't need to check again
  if (card.suit === trumpSuit && card.suit !== 'JOKER') {
    return true;
  }
  return false;
}

/**
 * Get the strength of a card for comparison
 * Higher number = stronger card
 * 
 * Trump strength order (high to low):
 * 1. ♦5 (highest, strength ~1000)
 * 2. 五反 (if hasFiveFan, strength ~900)
 * 3. 三反 (if hasThreeFan, strength ~800)
 * 4. Big Joker (BJ, strength ~700)
 * 5. Small Joker (SJ, strength ~600)
 * 6. ♠Q (strength ~500)
 * 7. J of trump suit (strength ~400)
 * 8. Other J's (strength ~300-350, depends on suit order)
 * 9. 2 of trump suit (strength ~200)
 * 10. Other 2's (strength ~100-150)
 * 11. Other trump suit cards (strength based on rank)
 * 
 * Non-trump strength (within same suit):
 * A(14) > K(13) > Q(12) > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
 */
export function cardStrength(
  card: Card,
  trumpSuit: Suit,
  config: GameConfig,
  playOrder?: number // For breaking ties when multiple J's or 2's are played
): number {
  const isCardTrump = isTrump(card, trumpSuit, config);
  
  if (!isCardTrump) {
    // Non-trump: strength based on rank within suit
    // Lower strength = weaker card
    // A = 14, K = 13, Q = 12, 10 = 10, etc.
    if (typeof card.rank === 'number') {
      return card.rank;
    }
    return 0; // Should not happen for non-trump
  }
  
  // Trump cards - assign high strength values
  
  // ♦5 is the highest trump
  if (card.suit === '♦' && card.rank === 5) {
    return 1000;
  }
  
  // 五反 (three of rank 5, not ♦5)
  if (config.hasFiveFan && card.rank === 5 && card.suit !== '♦') {
    return 900;
  }
  
  // 三反 (three of rank 3)
  if (config.hasThreeFan && card.rank === 3) {
    return 800;
  }
  
  // Big Joker
  if (card.suit === 'JOKER' && card.rank === 'BJ') {
    return 700;
  }
  
  // Small Joker
  if (card.suit === 'JOKER' && card.rank === 'SJ') {
    return 600;
  }
  
  // ♠Q
  if (card.suit === '♠' && card.rank === 12) {
    return 500;
  }
  
  // All J's are trump
  if (card.rank === 11) {
    // J of trump suit is strongest
    if (card.suit === trumpSuit) {
      return 400;
    }
    // Other J's: use suit order to break ties, earlier play order wins
    // Note: J's can't be JOKER suit, so we can safely check
    if (card.suit === 'JOKER') {
      return 300; // Should not happen, but handle gracefully
    }
    const suitOrder: Record<'♠' | '♥' | '♣' | '♦', number> = { '♠': 0.3, '♥': 0.2, '♣': 0.1, '♦': 0 };
    const baseStrength = 300;
    const suitBonus = suitOrder[card.suit as '♠' | '♥' | '♣' | '♦'] || 0;
    const playBonus = playOrder !== undefined ? (1 - playOrder * 0.01) : 0;
    return baseStrength + suitBonus + playBonus;
  }
  
  // All 2's are trump
  if (card.rank === 2) {
    // 2 of trump suit is strongest
    if (card.suit === trumpSuit) {
      return 200;
    }
    // Other 2's: use suit order to break ties
    // Note: 2's can't be JOKER suit, so we can safely check
    if (card.suit === 'JOKER') {
      return 100; // Should not happen, but handle gracefully
    }
    const suitOrder: Record<'♠' | '♥' | '♣' | '♦', number> = { '♠': 0.3, '♥': 0.2, '♣': 0.1, '♦': 0 };
    const baseStrength = 100;
    const suitBonus = suitOrder[card.suit as '♠' | '♥' | '♣' | '♦'] || 0;
    const playBonus = playOrder !== undefined ? (1 - playOrder * 0.01) : 0;
    return baseStrength + suitBonus + playBonus;
  }
  
  // Other trump suit cards (花色主)
  if (card.suit === trumpSuit && card.suit !== 'JOKER') {
    // Use rank as strength, but add base trump strength
    if (typeof card.rank === 'number') {
      return 50 + card.rank; // Base 50 + rank
    }
  }
  
  // Should not reach here, but return a low value
  return 0;
}

/**
 * Get the effective suit of a card for "follow suit" logic
 * Returns 'JOKER' or 'NONE' for jokers and constant trump that don't belong to a normal suit
 * Returns the underlying suit for normal副牌 cards
 * This is only used for "follow suit" logic when no trump is present
 */
export function getEffectiveSuit(card: Card, trumpSuit: Suit, config: GameConfig): Suit | 'NONE' {
  // Jokers don't have an effective suit
  if (card.suit === 'JOKER') {
    return 'NONE';
  }
  
  // Fixed trumps (♦5, ♠Q) don't have an effective suit for follow-suit purposes
  if (isFixedTrump(card)) {
    return 'NONE';
  }
  
  // Fan trumps don't have an effective suit
  if (isFanTrump(card, config)) {
    return 'NONE';
  }
  
  // All J's and 2's are trump, so they don't have an effective suit
  if (isJTrump(card, trumpSuit) || is2Trump(card, trumpSuit)) {
    return 'NONE';
  }
  
  // Normal cards return their suit
  return card.suit;
}

/**
 * Get the leading suit of a trick
 * Returns the effective suit of the first card played, or null if trick is empty
 * This is used for determining which suit to follow when no trump is present
 */
export function getLeadingSuit(trick: { card: Card }[], trumpSuit: Suit, config: GameConfig): Suit | null {
  if (trick.length === 0) {
    return null;
  }
  const effectiveSuit = getEffectiveSuit(trick[0].card, trumpSuit, config);
  return effectiveSuit === 'NONE' ? null : effectiveSuit;
}

/**
 * Check if a player can follow suit
 * Returns true if player has any cards of the leading suit that are non-trump
 */
export function canFollowSuit(
  playerHand: Card[],
  leadingSuit: Suit,
  trumpSuit: Suit,
  config: GameConfig
): boolean {
  return playerHand.some(
    card => card.suit === leadingSuit && !isTrump(card, trumpSuit, config)
  );
}

/**
 * Check if a player has any trump cards
 */
export function hasTrump(playerHand: Card[], trumpSuit: Suit, config: GameConfig): boolean {
  return playerHand.some(card => isTrump(card, trumpSuit, config));
}

