import { Card, Suit, GameConfig, TrickResult } from './types';
import { isTrump } from './rules';

/**
 * Validate if selected cards are valid for 甩牌 (Rui-pai)
 * 
 * Rule: You can only throw multiple cards if all stronger cards of that suit are either:
 * - In your selection (selectedRanks)
 * - Already played in previous tricks (playedRanks)
 * - NOT in ANY player's hand (including other players)
 * 
 * This prevents "skipping" stronger cards when throwing lower cards.
 * 
 * CRITICAL: This checks ALL players' hands, not just the current player's hand.
 * If ANY player still holds a higher card of the same suit, the 甩牌 is invalid.
 */
export function validateRuiPaiSelection(
  cards: Card[], 
  playerHand: Card[],
  trumpSuit: Suit,
  config: GameConfig,
  tricks: TrickResult[] = [], // Previous tricks to check played cards
  allPlayersHands?: Card[][] // All players' hands - if provided, checks ALL hands; otherwise only checks playerHand
): { valid: boolean; message?: string } {
  // Basic checks: k >= 2
  if (cards.length < 2) {
    return { valid: false, message: '至少选择两张牌才能甩牌' };
  }
  
  // Basic checks: same suit, non-trump
  const firstCard = cards[0];
  const ruiSuit = firstCard.suit;
  
  // Check if ruiSuit is the trump suit
  if (ruiSuit === trumpSuit) {
    return { valid: false, message: '不能甩主牌，请改为单张出牌。' };
  }
  
  // Check if ruiSuit is JOKER
  if (ruiSuit === 'JOKER') {
    return { valid: false, message: '甩牌不能包含王牌' };
  }
  
  // Check all selected cards have the same suit and are non-trump
  for (const card of cards) {
    if (card.suit !== ruiSuit) {
      return { valid: false, message: '甩牌的所有牌必须是同一花色' };
    }
    if (isTrump(card, trumpSuit, config)) {
      return { valid: false, message: '不能甩主牌，请改为单张出牌。' };
    }
  }
  
  // Step 1: Find minRank (weakest rank in selected cards)
  const selectedRanks = new Set<number>();
  let minRank: number | null = null;
  
  for (const card of cards) {
    if (typeof card.rank === 'number') {
      selectedRanks.add(card.rank);
      // Find minRank (weakest rank)
      // 副牌 order: A(14) > K(13) > Q(12) > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
      if (minRank === null || card.rank < minRank) {
        minRank = card.rank;
      }
    }
  }
  
  if (minRank === null) {
    return { valid: false, message: '甩牌失败：无效的牌组。' };
  }
  
  // Step 2: Build playedRanks - all non-trump ranks of suit S that have been played
  const playedRanks = new Set<number>();
  for (const trick of tricks) {
    if (!trick || !trick.cards) continue;
    for (const playedCard of trick.cards) {
      if (!playedCard || !playedCard.card) continue;
      const card = playedCard.card;
      if (card.suit === ruiSuit && 
          !isTrump(card, trumpSuit, config) && 
          typeof card.rank === 'number') {
        playedRanks.add(card.rank);
      }
    }
  }
  
  // Step 3: Build allHandsNonTrumpRanks - all non-trump ranks of suit S currently in ALL players' hands
  // CRITICAL: Check ALL players' hands, not just the current player's hand
  const allHandsNonTrumpRanks = new Set<number>();
  
  // If allPlayersHands is provided, check all players; otherwise only check playerHand (backward compatibility)
  const handsToCheck = allPlayersHands || [playerHand];
  
  for (const hand of handsToCheck) {
    if (!hand || !Array.isArray(hand)) continue;
    for (const card of hand) {
      if (card.suit === ruiSuit && 
          !isTrump(card, trumpSuit, config) && 
          typeof card.rank === 'number') {
        allHandsNonTrumpRanks.add(card.rank);
      }
    }
  }
  
  // Step 4: Check all ranks stronger than minRank
  // For each rank R stronger than minRank:
  //   If R exists in ANY player's hand, it MUST be selected or played
  //   If R doesn't exist in any hand, we don't need to check it (it was already played or never existed)
  const validNonTrumpRanks = [14, 13, 12, 10, 9, 8, 7, 6, 5, 4, 3]; // A, K, Q, 10, 9, 8, 7, 6, 5, 4, 3
  
  for (const rank of validNonTrumpRanks) {
    if (rank > minRank) {
      // Check if this rank exists in ANY player's hand as non-trump
      // If rank doesn't exist in any hand, skip (it was already played or never existed)
      if (allHandsNonTrumpRanks.has(rank)) {
        const isSelected = selectedRanks.has(rank);
        const isPlayed = playedRanks.has(rank);
        
        // If this rank exists in ANY player's hand but is NOT selected AND NOT played, invalid
        if (!isSelected && !isPlayed) {
          return { valid: false, message: '甩牌失败：还有更大的同花色牌未出。' };
        }
      }
    }
  }
  
  // All stronger ranks that exist in hand are either selected or played - valid
  return { valid: true };
}
