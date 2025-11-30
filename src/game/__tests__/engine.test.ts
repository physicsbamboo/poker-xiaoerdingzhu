import {
  createNewGame,
  playCard,
  getTrickWinner,
  calculateScores,
  createFullDeck,
  shuffleDeck,
  dealCards,
} from '../engine';
import { Card, GameConfig, PlayedCard, GameState } from '../types';
import { isTrump, cardStrength, getCardPoints, getEffectiveSuit, getLeadingSuit } from '../rules';

/**
 * Helper function to find a valid card to play according to game rules
 * This helps tests play cards that follow the rules
 */
function findValidCard(state: GameState, playerId: string): Card | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.hand.length === 0) {
    return null;
  }

  // If trick is empty, any card is valid
  if (state.currentTrick.length === 0) {
    return player.hand[0];
  }

  const leadingCard = state.currentTrick[0].card;
  const leadingIsTrump = isTrump(leadingCard, state.trumpSuit, state.config);

  if (leadingIsTrump) {
    // Must play trump if possible
    const trumpCard = player.hand.find(c => isTrump(c, state.trumpSuit, state.config));
    return trumpCard || player.hand[0]; // Play trump if available, otherwise any card
  } else {
    // Must follow suit if possible
    const leadingSuit = getLeadingSuit(state.currentTrick, state.trumpSuit, state.config);
    if (leadingSuit) {
      // Try to find a card that follows suit
      const followingCard = player.hand.find(
        c => !isTrump(c, state.trumpSuit, state.config) &&
             getEffectiveSuit(c, state.trumpSuit, state.config) === leadingSuit
      );
      if (followingCard) {
        return followingCard;
      }
    }
    // Can't follow suit, can play any card
    return player.hand[0];
  }
}

describe('Game Engine', () => {
  const playerIds = ['player1', 'player2', 'player3', 'player4'];
  const config: GameConfig = {
    trumpSuit: '♥',
    hasThreeFan: false,
    hasFiveFan: false,
  };

  describe('createNewGame', () => {
    it('should create a game with 4 players', () => {
      const game = createNewGame(playerIds, config);
      
      expect(game.players).toHaveLength(4);
      expect(game.players[0].id).toBe('player1');
      expect(game.players[1].id).toBe('player2');
      expect(game.players[2].id).toBe('player3');
      expect(game.players[3].id).toBe('player4');
    });

    it('should assign teams correctly', () => {
      const game = createNewGame(playerIds, config);
      
      // Players 0 and 2 are dealer team, players 1 and 3 are non-dealer team
      expect(game.players[0].team).toBe('dealer');
      expect(game.players[1].team).toBe('nonDealer');
      expect(game.players[2].team).toBe('dealer');
      expect(game.players[3].team).toBe('nonDealer');
    });

    it('should deal cards correctly', () => {
      const game = createNewGame(playerIds, config);
      
      // Each player should have cards
      game.players.forEach(player => {
        expect(player.hand.length).toBeGreaterThan(0);
      });
      
      // All players should have 12 cards each (new dealing logic)
      game.players.forEach((player) => {
        expect(player.hand.length).toBe(12);
      });
      
      // Total cards dealt: 4 players × 12 cards = 48 cards
      // Remaining: 54 - 48 = 6 cards (底牌)
      const totalCardsDealt = game.players.reduce((sum, p) => sum + p.hand.length, 0);
      expect(totalCardsDealt).toBe(48);
    });

    it('should set dealer as first player', () => {
      const game = createNewGame(playerIds, config);
      
      expect(game.dealerIndex).toBe(0);
      expect(game.currentPlayerIndex).toBe(0); // Dealer starts
    });

    it('should initialize empty trick and tricks array', () => {
      const game = createNewGame(playerIds, config);
      
      expect(game.currentTrick).toHaveLength(0);
      expect(game.tricks).toHaveLength(0);
    });

    it('should initialize scores to zero', () => {
      const game = createNewGame(playerIds, config);
      
      expect(game.scores.dealerTeam).toBe(0);
      expect(game.scores.nonDealerTeam).toBe(0);
    });

    it('should throw error if not exactly 4 players', () => {
      expect(() => createNewGame(['p1', 'p2'], config)).toThrow();
      expect(() => createNewGame(['p1', 'p2', 'p3', 'p4', 'p5'], config)).toThrow();
    });
  });

  describe('Card representation and deck', () => {
    it('should create a full 54-card deck', () => {
      const deck = createFullDeck();
      
      expect(deck).toHaveLength(54);
      
      // Check for jokers
      const jokers = deck.filter(c => c.suit === 'JOKER');
      expect(jokers).toHaveLength(2);
      expect(jokers.some(c => c.rank === 'SJ')).toBe(true);
      expect(jokers.some(c => c.rank === 'BJ')).toBe(true);
      
      // Check for standard suits
      const suits = ['♠', '♥', '♣', '♦'];
      suits.forEach(suit => {
        const suitCards = deck.filter(c => c.suit === suit);
        expect(suitCards).toHaveLength(13); // 2-14 (13 cards)
      });
    });

    it('should shuffle deck correctly', () => {
      const deck = createFullDeck();
      const shuffled = shuffleDeck(deck);
      
      expect(shuffled).toHaveLength(54);
      // Very unlikely that shuffled deck equals original (but not impossible)
      // Just check that all cards are present
      expect(shuffled.length).toBe(deck.length);
    });

    it('should deal cards correctly for 4 players with 12 cards each', () => {
      const deck = createFullDeck();
      const shuffled = shuffleDeck(deck);
      const { hands, remainingDeck } = dealCards(shuffled, 4, 12);
      
      expect(hands).toHaveLength(4);
      hands.forEach(hand => {
        expect(hand).toHaveLength(12);
      });
      
      // 54 total cards - (4 players × 12 cards) = 6 remaining cards
      expect(remainingDeck).toHaveLength(6);
      
      // Verify no duplicate cards
      const allDealtCards = hands.flat();
      const allCards = [...allDealtCards, ...remainingDeck];
      expect(allCards.length).toBe(54);
      
      // Check that all cards from original deck are present
      const dealtCardKeys = allCards.map(c => `${c.suit}-${c.rank}`).sort();
      const originalCardKeys = shuffled.map(c => `${c.suit}-${c.rank}`).sort();
      expect(dealtCardKeys).toEqual(originalCardKeys);
    });
  });

  describe('Trump determination', () => {
    it('should identify fixed trumps correctly', () => {
      const trumpSuit: '♥' = '♥';
      const testConfig: GameConfig = {
        trumpSuit,
        hasThreeFan: false,
        hasFiveFan: false,
      };
      
      // ♦5 is fixed trump
      expect(isTrump({ suit: '♦', rank: 5 }, trumpSuit, testConfig)).toBe(true);
      
      // Big Joker is fixed trump
      expect(isTrump({ suit: 'JOKER', rank: 'BJ' }, trumpSuit, testConfig)).toBe(true);
      
      // Small Joker is fixed trump
      expect(isTrump({ suit: 'JOKER', rank: 'SJ' }, trumpSuit, testConfig)).toBe(true);
      
      // ♠Q is fixed trump
      expect(isTrump({ suit: '♠', rank: 12 }, trumpSuit, testConfig)).toBe(true);
    });

    it('should identify J trumps correctly', () => {
      const trumpSuit: '♥' = '♥';
      const testConfig: GameConfig = {
        trumpSuit,
        hasThreeFan: false,
        hasFiveFan: false,
      };
      
      // All J's are trump
      expect(isTrump({ suit: '♠', rank: 11 }, trumpSuit, testConfig)).toBe(true);
      expect(isTrump({ suit: '♥', rank: 11 }, trumpSuit, testConfig)).toBe(true);
      expect(isTrump({ suit: '♣', rank: 11 }, trumpSuit, testConfig)).toBe(true);
      expect(isTrump({ suit: '♦', rank: 11 }, trumpSuit, testConfig)).toBe(true);
    });

    it('should identify 2 trumps correctly', () => {
      const trumpSuit: '♥' = '♥';
      const testConfig: GameConfig = {
        trumpSuit,
        hasThreeFan: false,
        hasFiveFan: false,
      };
      
      // All 2's are trump
      expect(isTrump({ suit: '♠', rank: 2 }, trumpSuit, testConfig)).toBe(true);
      expect(isTrump({ suit: '♥', rank: 2 }, trumpSuit, testConfig)).toBe(true);
      expect(isTrump({ suit: '♣', rank: 2 }, trumpSuit, testConfig)).toBe(true);
      expect(isTrump({ suit: '♦', rank: 2 }, trumpSuit, testConfig)).toBe(true);
    });

    it('should identify trump suit cards correctly', () => {
      const trumpSuit: '♥' = '♥';
      const testConfig: GameConfig = {
        trumpSuit,
        hasThreeFan: false,
        hasFiveFan: false,
      };
      
      // Cards of trump suit are trump
      expect(isTrump({ suit: '♥', rank: 14 }, trumpSuit, testConfig)).toBe(true);
      expect(isTrump({ suit: '♥', rank: 10 }, trumpSuit, testConfig)).toBe(true);
      expect(isTrump({ suit: '♥', rank: 7 }, trumpSuit, testConfig)).toBe(true);
      
      // Cards of other suits are not trump (unless fixed trump)
      expect(isTrump({ suit: '♠', rank: 14 }, trumpSuit, testConfig)).toBe(false);
      expect(isTrump({ suit: '♣', rank: 10 }, trumpSuit, testConfig)).toBe(false);
    });

    it('should identify fan trumps when enabled', () => {
      const trumpSuit: '♥' = '♥';
      const configWithFiveFan: GameConfig = {
        trumpSuit,
        hasThreeFan: false,
        hasFiveFan: true,
      };
      
      const configWithThreeFan: GameConfig = {
        trumpSuit,
        hasThreeFan: true,
        hasFiveFan: false,
      };
      
      // 五反: three of rank 5 (not ♦5)
      expect(isTrump({ suit: '♠', rank: 5 }, trumpSuit, configWithFiveFan)).toBe(true);
      expect(isTrump({ suit: '♥', rank: 5 }, trumpSuit, configWithFiveFan)).toBe(true);
      expect(isTrump({ suit: '♣', rank: 5 }, trumpSuit, configWithFiveFan)).toBe(true);
      
      // 三反: three of rank 3
      expect(isTrump({ suit: '♠', rank: 3 }, trumpSuit, configWithThreeFan)).toBe(true);
      expect(isTrump({ suit: '♥', rank: 3 }, trumpSuit, configWithThreeFan)).toBe(true);
    });
  });

  describe('Card strength', () => {
    const trumpSuit: '♥' = '♥';
    const testConfig: GameConfig = {
      trumpSuit,
      hasThreeFan: false,
      hasFiveFan: false,
    };

    it('should rank ♦5 as highest trump', () => {
      const diamond5 = cardStrength({ suit: '♦', rank: 5 }, trumpSuit, testConfig);
      const bigJoker = cardStrength({ suit: 'JOKER', rank: 'BJ' }, trumpSuit, testConfig);
      
      expect(diamond5).toBeGreaterThan(bigJoker);
    });

    it('should rank Big Joker higher than Small Joker', () => {
      const bigJoker = cardStrength({ suit: 'JOKER', rank: 'BJ' }, trumpSuit, testConfig);
      const smallJoker = cardStrength({ suit: 'JOKER', rank: 'SJ' }, trumpSuit, testConfig);
      
      expect(bigJoker).toBeGreaterThan(smallJoker);
    });

    it('should rank trump J higher than trump 2', () => {
      const trumpJ = cardStrength({ suit: '♥', rank: 11 }, trumpSuit, testConfig);
      const trump2 = cardStrength({ suit: '♥', rank: 2 }, trumpSuit, testConfig);
      
      expect(trumpJ).toBeGreaterThan(trump2);
    });

    it('should rank non-trump A higher than K', () => {
      const ace = cardStrength({ suit: '♠', rank: 14 }, trumpSuit, testConfig);
      const king = cardStrength({ suit: '♠', rank: 13 }, trumpSuit, testConfig);
      
      expect(ace).toBeGreaterThan(king);
    });

    it('should rank any trump higher than non-trump', () => {
      const lowestTrump = cardStrength({ suit: '♥', rank: 3 }, trumpSuit, testConfig);
      const highestNonTrump = cardStrength({ suit: '♠', rank: 14 }, trumpSuit, testConfig);
      
      expect(lowestTrump).toBeGreaterThan(highestNonTrump);
    });
  });

  describe('playCard', () => {
    it('should play a card and advance to next player', () => {
      const game = createNewGame(playerIds, config);
      const player = game.players[0];
      const cardToPlay = player.hand[0];
      
      const newGame = playCard(game, player.id, cardToPlay);
      
      expect(newGame.currentTrick).toHaveLength(1);
      expect(newGame.currentTrick[0].card).toEqual(cardToPlay);
      expect(newGame.currentTrick[0].playerId).toBe(player.id);
      expect(newGame.currentPlayerIndex).toBe(1); // Next player
      expect(newGame.players[0].hand).not.toContainEqual(cardToPlay);
    });

    it('should complete trick when 4 cards are played', () => {
      const game = createNewGame(playerIds, config);
      
      // Play 4 cards (one from each player), choosing valid cards according to rules
      let currentGame = game;
      for (let i = 0; i < 4; i++) {
        const player = currentGame.players[currentGame.currentPlayerIndex];
        const cardToPlay = findValidCard(currentGame, player.id);
        if (!cardToPlay) {
          throw new Error('No valid card found');
        }
        currentGame = playCard(currentGame, player.id, cardToPlay);
      }
      
      expect(currentGame.currentTrick).toHaveLength(0); // Trick completed
      expect(currentGame.tricks).toHaveLength(1); // One completed trick
      expect(currentGame.tricks[0].cards).toHaveLength(4);
    });

    it('should throw error if player tries to play card not in hand', () => {
      const game = createNewGame(playerIds, config);
      const player = game.players[0];
      const fakeCard: Card = { suit: '♠', rank: 14 };
      
      // Make sure player doesn't have this exact card
      const hasCard = player.hand.some(
        c => c.suit === fakeCard.suit && c.rank === fakeCard.rank
      );
      
      if (!hasCard) {
        expect(() => playCard(game, player.id, fakeCard)).toThrow();
      }
    });

    it('should throw error if not player\'s turn', () => {
      const game = createNewGame(playerIds, config);
      const wrongPlayer = game.players[1]; // Not current player
      const cardToPlay = wrongPlayer.hand[0];
      
      expect(() => playCard(game, wrongPlayer.id, cardToPlay)).toThrow();
    });
  });

  describe('getTrickWinner', () => {
    const trumpSuit: '♥' = '♥';
    const testConfig: GameConfig = {
      trumpSuit,
      hasThreeFan: false,
      hasFiveFan: false,
    };

    it('should choose strongest trump when trumps are played', () => {
      const trick: PlayedCard[] = [
        { card: { suit: '♠' as const, rank: 14 }, playerId: 'p1', playerIndex: 0 },
        { card: { suit: 'JOKER' as const, rank: 'BJ' as const }, playerId: 'p2', playerIndex: 1 },
        { card: { suit: '♠' as const, rank: 13 }, playerId: 'p3', playerIndex: 2 },
        { card: { suit: '♠' as const, rank: 12 }, playerId: 'p4', playerIndex: 3 },
      ];
      
      const winner = getTrickWinner(trick, trumpSuit, testConfig, 0);
      expect(winner).toBe(1); // Big Joker wins
    });

    it('should choose strongest card in leading suit when no trumps', () => {
      const trick: PlayedCard[] = [
        { card: { suit: '♠' as const, rank: 10 }, playerId: 'p1', playerIndex: 0 },
        { card: { suit: '♠' as const, rank: 13 }, playerId: 'p2', playerIndex: 1 },
        { card: { suit: '♠' as const, rank: 7 }, playerId: 'p3', playerIndex: 2 },
        { card: { suit: '♠' as const, rank: 14 }, playerId: 'p4', playerIndex: 3 },
      ];
      
      const winner = getTrickWinner(trick, trumpSuit, testConfig, 0);
      expect(winner).toBe(3); // Ace of spades wins
    });

    it('should choose ♦5 over Big Joker', () => {
      const trick: PlayedCard[] = [
        { card: { suit: '♠' as const, rank: 10 }, playerId: 'p1', playerIndex: 0 },
        { card: { suit: '♦' as const, rank: 5 }, playerId: 'p2', playerIndex: 1 },
        { card: { suit: '♠' as const, rank: 13 }, playerId: 'p3', playerIndex: 2 },
        { card: { suit: 'JOKER' as const, rank: 'BJ' as const }, playerId: 'p4', playerIndex: 3 },
      ];
      
      const winner = getTrickWinner(trick, trumpSuit, testConfig, 0);
      expect(winner).toBe(1); // ♦5 wins
    });

    it('should choose Big Joker over non-trump cards even when leading suit is followed', () => {
      // This is the bug scenario: BJ should win even though other players followed suit
      const trick: PlayedCard[] = [
        { card: { suit: '♣' as const, rank: 13 }, playerId: 'p1', playerIndex: 0 }, // ♣K (club King, non-trump)
        { card: { suit: '♣' as const, rank: 14 }, playerId: 'p2', playerIndex: 1 }, // ♣A (club Ace)
        { card: { suit: '♣' as const, rank: 10 }, playerId: 'p3', playerIndex: 2 }, // ♣10
        { card: { suit: 'JOKER' as const, rank: 'BJ' as const }, playerId: 'p4', playerIndex: 3 }, // BJ (Big Joker, 常主)
      ];
      
      const winner = getTrickWinner(trick, trumpSuit, testConfig, 0);
      // BJ is a trump card and should win over all non-trump cards
      expect(winner).toBe(3); // Player 4 (BJ) wins, not Player 2 (♣A)
    });
  });

  describe('Scoring', () => {
    it('should calculate card points correctly', () => {
      expect(getCardPoints({ suit: '♠', rank: 5 })).toBe(5);
      expect(getCardPoints({ suit: '♥', rank: 10 })).toBe(10);
      expect(getCardPoints({ suit: '♣', rank: 13 })).toBe(10); // K
      expect(getCardPoints({ suit: '♦', rank: 14 })).toBe(0); // A
      expect(getCardPoints({ suit: '♠', rank: 7 })).toBe(0);
    });

    it('should track scores as tricks are completed', () => {
      const game = createNewGame(playerIds, config);
      
      // Create a simple trick with point cards
      // We'll manually construct a trick result for testing
      // In real gameplay, scores are updated automatically when tricks complete
      
      // Play a full round to complete a trick, choosing valid cards according to rules
      let currentGame = game;
      for (let i = 0; i < 4; i++) {
        const player = currentGame.players[currentGame.currentPlayerIndex];
        const cardToPlay = findValidCard(currentGame, player.id);
        if (!cardToPlay) {
          throw new Error('No valid card found');
        }
        currentGame = playCard(currentGame, player.id, cardToPlay);
      }
      
      // Scores should be updated (may be 0 if no point cards were played)
      expect(currentGame.scores.dealerTeam).toBeGreaterThanOrEqual(0);
      expect(currentGame.scores.nonDealerTeam).toBeGreaterThanOrEqual(0);
    });

    it('should calculate final scores correctly', () => {
      const game = createNewGame(playerIds, config);
      
      const scores = calculateScores(game);
      // Check that scores have the correct structure
      expect(scores.dealerTeam).toHaveProperty('totalPoints');
      expect(scores.dealerTeam).toHaveProperty('scoringCards');
      expect(scores.nonDealerTeam).toHaveProperty('totalPoints');
      expect(scores.nonDealerTeam).toHaveProperty('scoringCards');
      
      expect(scores.dealerTeam.totalPoints).toBe(0); // No tricks completed yet
      expect(scores.nonDealerTeam.totalPoints).toBe(0);
      expect(scores.dealerTeam.scoringCards).toEqual([]);
      expect(scores.nonDealerTeam.scoringCards).toEqual([]);
    });
  });

  describe('Integration test: full trick with known cards', () => {
    it('should play a complete trick and determine winner correctly', () => {
      // Create a game and manually set up a specific scenario
      // This is a simplified test - in practice, you'd need to control the deck
      const game = createNewGame(playerIds, config);
      
      // Play through one complete trick
      let currentGame = game;
      const initialHandSizes = currentGame.players.map(p => p.hand.length);
      
      // Play 4 cards, choosing valid cards according to rules
      for (let i = 0; i < 4; i++) {
        const player = currentGame.players[currentGame.currentPlayerIndex];
        const cardToPlay = findValidCard(currentGame, player.id);
        if (!cardToPlay) {
          throw new Error('No valid card found');
        }
        currentGame = playCard(currentGame, player.id, cardToPlay);
      }
      
      // Verify trick was completed
      expect(currentGame.tricks).toHaveLength(1);
      expect(currentGame.currentTrick).toHaveLength(0);
      
      // Verify cards were removed from hands
      currentGame.players.forEach((player, index) => {
        expect(player.hand.length).toBe(initialHandSizes[index] - 1);
      });
      
      // Verify winner is set
      expect(currentGame.tricks[0].winnerIndex).toBeGreaterThanOrEqual(0);
      expect(currentGame.tricks[0].winnerIndex).toBeLessThan(4);
    });
  });

  describe('Last card of game scenario', () => {
    it('should not crash when the last player plays the last card of the game', () => {
      // Create a minimal game state where each player has only 1 card
      // This simulates the last trick of the game
      const config: GameConfig = {
        trumpSuit: '♥',
        hasThreeFan: false,
        hasFiveFan: false,
      };

      // Create a game state manually with minimal cards
      const state: GameState = {
        players: [
          { id: 'player1', hand: [{ suit: '♠', rank: 2 }], team: 'dealer' },
          { id: 'player2', hand: [{ suit: '♠', rank: 3 }], team: 'nonDealer' },
          { id: 'player3', hand: [{ suit: '♠', rank: 4 }], team: 'dealer' },
          { id: 'player4', hand: [{ suit: '♠', rank: 5 }], team: 'nonDealer' },
        ],
        currentPlayerIndex: 0,
        dealerIndex: 0,
        trumpSuit: '♥',
        config,
        currentTrick: [],
        tricks: [],
        scores: {
          dealerTeam: 0,
          nonDealerTeam: 0,
        },
      };

      // Play cards in order: player1, player2, player3, player4 (last card)
      let currentState = state;
      
      // First card
      currentState = playCard(currentState, 'player1', currentState.players[0].hand[0]);
      expect(currentState.players[0].hand.length).toBe(0);
      expect(currentState.currentTrick.length).toBe(1);
      
      // Second card
      currentState = playCard(currentState, 'player2', currentState.players[1].hand[0]);
      expect(currentState.players[1].hand.length).toBe(0);
      expect(currentState.currentTrick.length).toBe(2);
      
      // Third card
      currentState = playCard(currentState, 'player3', currentState.players[2].hand[0]);
      expect(currentState.players[2].hand.length).toBe(0);
      expect(currentState.currentTrick.length).toBe(3);
      
      // Last card - this should complete the trick and the game
      // This should NOT crash even though all hands are now empty
      expect(() => {
        currentState = playCard(currentState, 'player4', currentState.players[3].hand[0]);
      }).not.toThrow();
      
      // Verify final state
      expect(currentState.players[3].hand.length).toBe(0);
      expect(currentState.currentTrick.length).toBe(0); // Trick completed
      expect(currentState.tricks.length).toBe(1); // One completed trick
      
      // Verify all players have empty hands
      currentState.players.forEach(player => {
        expect(player.hand.length).toBe(0);
      });
      
      // Verify scores can be calculated without crashing
      expect(() => {
        const scores = calculateScores(currentState);
        expect(scores).toBeDefined();
        expect(scores.dealerTeam).toBeDefined();
        expect(scores.nonDealerTeam).toBeDefined();
      }).not.toThrow();
    });

    it('should handle game end when last trick completes with all empty hands', () => {
      const config: GameConfig = {
        trumpSuit: '♣',
        hasThreeFan: false,
        hasFiveFan: false,
      };

      // Create state where last trick is about to complete
      const state: GameState = {
        players: [
          { id: 'p1', hand: [{ suit: '♦', rank: 10 }], team: 'dealer' },
          { id: 'p2', hand: [{ suit: '♦', rank: 11 }], team: 'nonDealer' },
          { id: 'p3', hand: [{ suit: '♦', rank: 12 }], team: 'dealer' },
          { id: 'p4', hand: [{ suit: '♦', rank: 13 }], team: 'nonDealer' },
        ],
        currentPlayerIndex: 0,
        dealerIndex: 0,
        trumpSuit: '♣',
        config,
        currentTrick: [],
        tricks: [],
        scores: {
          dealerTeam: 0,
          nonDealerTeam: 0,
        },
      };

      // Play all 4 cards to complete the trick
      let currentState = state;
      currentState = playCard(currentState, 'p1', currentState.players[0].hand[0]);
      currentState = playCard(currentState, 'p2', currentState.players[1].hand[0]);
      currentState = playCard(currentState, 'p3', currentState.players[2].hand[0]);
      
      // Last card should complete trick and game
      expect(() => {
        currentState = playCard(currentState, 'p4', currentState.players[3].hand[0]);
      }).not.toThrow();
      
      // All hands should be empty
      expect(currentState.players.every(p => p.hand.length === 0)).toBe(true);
      
      // Trick should be completed
      expect(currentState.currentTrick.length).toBe(0);
      expect(currentState.tricks.length).toBe(1);
      
      // Should be able to calculate scores
      const scores = calculateScores(currentState);
      expect(scores).toBeDefined();
    });
  });
});

