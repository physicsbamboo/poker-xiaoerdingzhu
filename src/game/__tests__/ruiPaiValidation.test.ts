import { validateRuiPaiSelection } from '../ruiPaiValidation';
import { Card, GameConfig, TrickResult } from '../types';

describe('validateRuiPaiSelection', () => {
  const trumpSuit: '♣' = '♣';
  const config: GameConfig = {
    trumpSuit,
    hasThreeFan: false,
    hasFiveFan: false,
  };

  describe('Basic validation', () => {
    it('should reject selections with less than 2 cards', () => {
      const cards: Card[] = [{ suit: '♥', rank: 13 }]; // Only K
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('至少选择两张牌才能甩牌');
    });

    it('should reject trump suit cards', () => {
      const cards: Card[] = [
        { suit: '♣', rank: 13 }, // ♣K (trump suit)
        { suit: '♣', rank: 12 },
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('不能甩主牌，请改为单张出牌。');
    });

    it('should reject jokers', () => {
      const cards: Card[] = [
        { suit: 'JOKER', rank: 'BJ' },
        { suit: 'JOKER', rank: 'SJ' },
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('甩牌不能包含王牌');
    });

    it('should reject cards of different suits', () => {
      const cards: Card[] = [
        { suit: '♥', rank: 13 },
        { suit: '♠', rank: 12 },
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('甩牌的所有牌必须是同一花色');
    });

    it('should reject trump cards (fixed trumps)', () => {
      const cards: Card[] = [
        { suit: '♦', rank: 5 }, // ♦5 is fixed trump
        { suit: '♥', rank: 13 },
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('不能甩主牌，请改为单张出牌。');
    });
  });

  describe('Rui-pai eligibility: stronger ranks check', () => {
    it('should reject when stronger ranks are not selected or played', () => {
      // Test case from requirements:
      // trumpSuit = ♣
      // History played in ♥: none (playedRanks = {})
      // Player0 selects ♥K, ♥Q, ♥4
      // Expected: rui-pai INVALID, because ♥10, ♥9, ♥8, ♥7, ♥6, ♥5 are stronger than 4
      // and none of them are in selectedRanks or playedRanks

      const cards: Card[] = [
        { suit: '♥', rank: 13 }, // K
        { suit: '♥', rank: 12 }, // Q
        { suit: '♥', rank: 4 },  // 4 (minRank)
      ];
      const playerHand: Card[] = []; // Not used in new algorithm
      const tricks: TrickResult[] = []; // No history

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('甩牌失败：还有更大的同花色牌未出。');
    });

    it('should accept when all stronger ranks are selected', () => {
      // Select ♥A, ♥K, ♥Q, ♥10, ♥9, ♥8, ♥7, ♥6, ♥5, ♥4
      // minRank = 4, all stronger ranks (5,6,7,8,9,10,12,13,14) are selected
      const cards: Card[] = [
        { suit: '♥', rank: 14 }, // A
        { suit: '♥', rank: 13 }, // K
        { suit: '♥', rank: 12 }, // Q
        { suit: '♥', rank: 10 },
        { suit: '♥', rank: 9 },
        { suit: '♥', rank: 8 },
        { suit: '♥', rank: 7 },
        { suit: '♥', rank: 6 },
        { suit: '♥', rank: 5 },
        { suit: '♥', rank: 4 }, // minRank
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(true);
    });

    it('should accept when stronger ranks are played in history', () => {
      // Select ♥K, ♥Q, ♥4
      // But ♥10, ♥9, ♥8, ♥7, ♥6, ♥5 are played in history
      const cards: Card[] = [
        { suit: '♥', rank: 13 }, // K
        { suit: '♥', rank: 12 }, // Q
        { suit: '♥', rank: 4 },  // 4 (minRank)
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [
        {
          cards: [
            { card: { suit: '♥', rank: 10 }, playerId: 'p1', playerIndex: 0 },
            { card: { suit: '♥', rank: 9 }, playerId: 'p2', playerIndex: 1 },
            { card: { suit: '♥', rank: 8 }, playerId: 'p3', playerIndex: 2 },
            { card: { suit: '♥', rank: 7 }, playerId: 'p4', playerIndex: 3 },
          ],
          winnerIndex: 0,
          winnerId: 'p1',
          points: 0,
        },
        {
          cards: [
            { card: { suit: '♥', rank: 6 }, playerId: 'p1', playerIndex: 0 },
            { card: { suit: '♥', rank: 5 }, playerId: 'p2', playerIndex: 1 },
            { card: { suit: '♠', rank: 10 }, playerId: 'p3', playerIndex: 2 },
            { card: { suit: '♠', rank: 9 }, playerId: 'p4', playerIndex: 3 },
          ],
          winnerIndex: 0,
          winnerId: 'p1',
          points: 0,
        },
      ];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(true);
    });

    it('should accept when stronger ranks are partially selected and partially played', () => {
      // Select ♥K, ♥Q, ♥10, ♥4
      // ♥9, ♥8, ♥7, ♥6, ♥5 are played in history
      const cards: Card[] = [
        { suit: '♥', rank: 13 }, // K
        { suit: '♥', rank: 12 }, // Q
        { suit: '♥', rank: 10 },
        { suit: '♥', rank: 4 },  // 4 (minRank)
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [
        {
          cards: [
            { card: { suit: '♥', rank: 9 }, playerId: 'p1', playerIndex: 0 },
            { card: { suit: '♥', rank: 8 }, playerId: 'p2', playerIndex: 1 },
            { card: { suit: '♥', rank: 7 }, playerId: 'p3', playerIndex: 2 },
            { card: { suit: '♥', rank: 6 }, playerId: 'p4', playerIndex: 3 },
          ],
          winnerIndex: 0,
          winnerId: 'p1',
          points: 0,
        },
        {
          cards: [
            { card: { suit: '♥', rank: 5 }, playerId: 'p1', playerIndex: 0 },
            { card: { suit: '♠', rank: 10 }, playerId: 'p2', playerIndex: 1 },
            { card: { suit: '♠', rank: 9 }, playerId: 'p3', playerIndex: 2 },
            { card: { suit: '♠', rank: 8 }, playerId: 'p4', playerIndex: 3 },
          ],
          winnerIndex: 0,
          winnerId: 'p1',
          points: 0,
        },
      ];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(true);
    });

    it('should reject when some stronger ranks are missing', () => {
      // Select ♥K, ♥Q, ♥10, ♥4
      // But ♥9, ♥8, ♥7, ♥6, ♥5 are NOT selected and NOT played
      const cards: Card[] = [
        { suit: '♥', rank: 13 }, // K
        { suit: '♥', rank: 12 }, // Q
        { suit: '♥', rank: 10 },
        { suit: '♥', rank: 4 },  // 4 (minRank)
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = []; // No history

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('甩牌失败：还有更大的同花色牌未出。');
    });

    it('should handle A correctly (highest rank)', () => {
      // Select ♥A, ♥K, ♥Q
      // minRank = 12 (Q), stronger ranks are 13 (K) and 14 (A), both selected
      const cards: Card[] = [
        { suit: '♥', rank: 14 }, // A
        { suit: '♥', rank: 13 }, // K
        { suit: '♥', rank: 12 }, // Q (minRank)
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [];

      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(true);
    });

    it('should ignore trump cards in history when checking playedRanks', () => {
      // Select ♥K, ♥Q, ♥4
      // History has ♥10 (non-trump, should count) and ♣10 (trump, should ignore)
      const cards: Card[] = [
        { suit: '♥', rank: 13 }, // K
        { suit: '♥', rank: 12 }, // Q
        { suit: '♥', rank: 4 },  // 4 (minRank)
      ];
      const playerHand: Card[] = [];
      const tricks: TrickResult[] = [
        {
          cards: [
            { card: { suit: '♥', rank: 10 }, playerId: 'p1', playerIndex: 0 }, // Non-trump, should count
            { card: { suit: '♣', rank: 10 }, playerId: 'p2', playerIndex: 1 }, // Trump, should ignore
            { card: { suit: '♠', rank: 10 }, playerId: 'p3', playerIndex: 2 },
            { card: { suit: '♠', rank: 9 }, playerId: 'p4', playerIndex: 3 },
          ],
          winnerIndex: 0,
          winnerId: 'p1',
          points: 0,
        },
      ];

      // Still invalid because 9, 8, 7, 6, 5 are missing
      const result = validateRuiPaiSelection(cards, playerHand, trumpSuit, config, tricks);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('甩牌失败：还有更大的同花色牌未出。');
    });
  });

  describe('Multi-player validation: check ALL players\' hands', () => {
    it('should reject when another player holds higher cards of the same suit', () => {
      // Test case: Player 1 tries to 甩 [10♠, 5♠]
      // Player 2 still holds [A♠, K♠]
      // Expected: INVALID - cannot 甩 lower cards when higher cards exist in ANY player's hand
      
      const cards: Card[] = [
        { suit: '♠', rank: 10 },
        { suit: '♠', rank: 5 }, // minRank = 5
      ];
      const playerHand: Card[] = [
        { suit: '♠', rank: 10 },
        { suit: '♠', rank: 5 },
        { suit: '♥', rank: 13 }, // Other cards
      ];
      
      // Player 2's hand contains A♠ and K♠
      const allPlayersHands: Card[][] = [
        playerHand, // Player 1's hand
        [
          { suit: '♠', rank: 14 }, // A♠ - higher than 5!
          { suit: '♠', rank: 13 }, // K♠ - higher than 5!
          { suit: '♥', rank: 10 },
        ], // Player 2's hand
        [{ suit: '♣', rank: 10 }], // Player 3's hand
        [{ suit: '♦', rank: 10 }], // Player 4's hand
      ];
      
      const tricks: TrickResult[] = []; // No history
      
      const result = validateRuiPaiSelection(
        cards, 
        playerHand, 
        trumpSuit, 
        config, 
        tricks,
        allPlayersHands
      );
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('甩牌失败：还有更大的同花色牌未出。');
    });

    it('should accept when no player holds higher cards of the same suit', () => {
      // Test case: Player 1 tries to 甩 [10♠, 5♠]
      // All A♠, K♠, Q♠ have already been played
      // Expected: VALID - no higher cards exist in any player's hand
      
      const cards: Card[] = [
        { suit: '♠', rank: 10 },
        { suit: '♠', rank: 5 }, // minRank = 5
      ];
      const playerHand: Card[] = [
        { suit: '♠', rank: 10 },
        { suit: '♠', rank: 5 },
        { suit: '♥', rank: 13 },
      ];
      
      // No player holds A♠, K♠, Q♠ (they've been played)
      const allPlayersHands: Card[][] = [
        playerHand, // Player 1's hand
        [
          { suit: '♠', rank: 9 }, // Lower than 10, but higher than 5 - but 9 is not in validNonTrumpRanks check
          { suit: '♠', rank: 4 }, // Lower than 5
          { suit: '♥', rank: 10 },
        ], // Player 2's hand
        [{ suit: '♣', rank: 10 }], // Player 3's hand
        [{ suit: '♦', rank: 10 }], // Player 4's hand
      ];
      
      // A♠, K♠, Q♠ have been played in previous tricks
      const tricks: TrickResult[] = [
        {
          cards: [
            { card: { suit: '♠', rank: 14 }, playerId: 'p1', playerIndex: 0 }, // A♠ played
            { card: { suit: '♠', rank: 13 }, playerId: 'p2', playerIndex: 1 }, // K♠ played
            { card: { suit: '♠', rank: 12 }, playerId: 'p3', playerIndex: 2 }, // Q♠ played
            { card: { suit: '♥', rank: 10 }, playerId: 'p4', playerIndex: 3 },
          ],
          winnerIndex: 0,
          winnerId: 'p1',
          points: 0,
        },
      ];
      
      const result = validateRuiPaiSelection(
        cards, 
        playerHand, 
        trumpSuit, 
        config, 
        tricks,
        allPlayersHands
      );
      
      expect(result.valid).toBe(true);
    });

    it('should reject when current player holds higher cards but tries to 甩 lower cards', () => {
      // Test case: Player 1 tries to 甩 [10♠, 5♠]
      // But Player 1's own hand contains [A♠, K♠] that are not selected
      // Expected: INVALID - cannot skip own higher cards
      
      const cards: Card[] = [
        { suit: '♠', rank: 10 },
        { suit: '♠', rank: 5 }, // minRank = 5
      ];
      const playerHand: Card[] = [
        { suit: '♠', rank: 14 }, // A♠ - NOT selected!
        { suit: '♠', rank: 13 }, // K♠ - NOT selected!
        { suit: '♠', rank: 10 }, // Selected
        { suit: '♠', rank: 5 },  // Selected
        { suit: '♥', rank: 13 },
      ];
      
      const allPlayersHands: Card[][] = [
        playerHand, // Player 1's hand
        [{ suit: '♣', rank: 10 }], // Player 2's hand
        [{ suit: '♦', rank: 10 }], // Player 3's hand
        [{ suit: '♥', rank: 10 }], // Player 4's hand
      ];
      
      const tricks: TrickResult[] = []; // No history
      
      const result = validateRuiPaiSelection(
        cards, 
        playerHand, 
        trumpSuit, 
        config, 
        tricks,
        allPlayersHands
      );
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('甩牌失败：还有更大的同花色牌未出。');
    });
  });
});

