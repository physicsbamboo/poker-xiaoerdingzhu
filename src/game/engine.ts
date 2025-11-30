import {
  Card,
  Suit,
  Rank,
  GameState,
  GameConfig,
  PlayerState,
  PlayedCard,
  TrickResult,
  HandScores,
  ScoreBreakdown,
  DealWithTwosResult,
  HistoryEvent,
} from './types';
import {
  isTrump,
  cardStrength,
  getCardPoints,
  getLeadingSuit,
  getEffectiveSuit,
  hasTrump,
} from './rules';

/**
 * Create a full 54-card deck
 * Includes: ♠, ♥, ♣, ♦ (each with ranks 2-14) plus 2 jokers
 * Returns a complete deck with all 54 cards
 */
export function createFullDeck(): Card[] {
  const suits: Suit[] = ['♠', '♥', '♣', '♦'];
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const deck: Card[] = [];

  // Add standard suit cards (4 suits × 13 ranks = 52 cards)
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  // Add jokers (2 cards)
  deck.push({ suit: 'JOKER', rank: 'SJ' }); // Small Joker (小王)
  deck.push({ suit: 'JOKER', rank: 'BJ' }); // Big Joker (大王)

  return deck; // Total: 52 + 2 = 54 cards
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 * Returns a new shuffled array without modifying the original
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards to players
 * 
 * @param deck The deck to deal from (should be shuffled)
 * @param numPlayers Number of players (typically 4)
 * @param handSize Number of cards per player
 * @returns Object with hands array and remaining deck
 */
export function dealCards(
  deck: Card[],
  numPlayers: number,
  handSize: number
): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = [];
  for (let i = 0; i < numPlayers; i++) {
    hands.push([]);
  }

  let cardIndex = 0;
  const totalCardsToDeal = numPlayers * handSize;

  // Deal cards round-robin style
  for (let round = 0; round < handSize; round++) {
    for (let player = 0; player < numPlayers; player++) {
      if (cardIndex < deck.length) {
        hands[player].push(deck[cardIndex++]);
      }
    }
  }

  // Remaining cards
  const remainingDeck = deck.slice(cardIndex);

  return { hands, remainingDeck };
}

/**
 * Deal cards and track the first 2 encountered (for 定主)
 * 
 * The first 2 (rank === 2, non-joker) that appears during dealing gives that player
 * the option to 定主 (set trump suit). This function only tracks the candidate,
 * it does not automatically set dealer or trump.
 * 
 * @param deck The deck to deal from (should be shuffled)
 * @param numPlayers Number of players (typically 4)
 * @param handSize Number of cards per player
 * @param numBottom Number of bottom cards
 * @param startingPlayerIndex Starting player index for dealing (default 0)
 * @returns Deal result with hands, bottom cards, and first 2 candidate info
 */
export function dealWithTwos(
  deck: Card[],
  numPlayers: number,
  handSize: number,
  numBottom: number,
  startingPlayerIndex: number = 0
): DealWithTwosResult {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  let firstTwoCandidate: { playerIndex: number; suit: Suit } | null = null;
  let foundFirstTwo = false;

  const totalHandCards = numPlayers * handSize;

  // Deal cards one by one, tracking the first 2
  for (let i = 0; i < totalHandCards; i++) {
    const card = deck[i];
    const playerIndex = (startingPlayerIndex + i) % numPlayers;
    
    // Add card to player's hand
    hands[playerIndex].push(card);

    // Check if this is the first 2 (non-joker)
    if (!foundFirstTwo && card.rank === 2 && card.suit !== 'JOKER') {
      foundFirstTwo = true;
      firstTwoCandidate = {
        playerIndex,
        suit: card.suit as Suit,
      };
    }
  }

  // Get bottom cards
  const bottomCards = deck.slice(totalHandCards, totalHandCards + numBottom);

  return {
    hands,
    bottomCards,
    firstTwoCandidate,
  };
}

/**
 * Create a new game
 * 
 * @param playerIds Array of 4 player IDs
 * @param config Game configuration (trump suit, fan flags)
 * @param dealerIndex Index of the dealer (0-3), defaults to 0
 * @returns Initial game state
 */
export function createNewGame(
  playerIds: string[], 
  config: GameConfig,
  dealerIndex: number = 0
): GameState {
  if (playerIds.length !== 4) {
    throw new Error('Game requires exactly 4 players');
  }

  if (dealerIndex < 0 || dealerIndex > 3) {
    throw new Error('Dealer index must be between 0 and 3');
  }

  // Create and shuffle deck
  const fullDeck = createFullDeck();
  const shuffledDeck = shuffleDeck(fullDeck);

  // Deal cards: 4 players, 12 cards each (remaining 6 cards are 底牌)
  const { hands, remainingDeck } = dealCards(shuffledDeck, 4, 12);

  // Note: remainingDeck (底牌) can be used later for亮牌 logic
  // For now, we don't assign them to any player

  // Create player states
  // Dealer team = dealerIndex and (dealerIndex + 2) % 4
  // Non-dealer team = the other two players
  const dealerTeamIndices = [dealerIndex, (dealerIndex + 2) % 4];
  const players: PlayerState[] = playerIds.map((id, index) => ({
    id,
    hand: hands[index],
    team: dealerTeamIndices.includes(index) ? 'dealer' : 'nonDealer',
  }));

  return {
    players,
    currentPlayerIndex: dealerIndex, // Dealer starts the first trick
    dealerIndex,
    trumpSuit: config.trumpSuit,
    config,
    currentTrick: [],
    tricks: [],
    scores: {
      dealerTeam: 0,
      nonDealerTeam: 0,
    },
    history: [], // Initialize empty history array
    phase: 'DEAL', // Explicit phase: start with DEAL
  };
}

/**
 * Determine the winner of a trick
 * 
 * Rules:
 * 1. First, collect all cards that are trump according to isTrump()
 * 2. If any trump cards are present, the winner is the player who played the strongest trump
 * 3. Only if there are no trump cards, then determine the leading suit and pick the strongest card in that suit
 * 
 * @param trick Array of played cards in the trick
 * @param trumpSuit The trump suit for this hand
 * @param config Game configuration
 * @param leaderIndex Index of the player who led the trick
 * @returns Index of the winning player
 */
export function getTrickWinner(
  trick: PlayedCard[],
  trumpSuit: Suit,
  config: GameConfig,
  leaderIndex: number
): number {
  if (trick.length === 0) {
    throw new Error('Cannot determine winner of empty trick');
  }
  if (trick.length !== 4) {
    throw new Error('Trick must have exactly 4 cards');
  }

  // Step 1: Find all trump cards in the trick
  // This must include BJ, SJ, ♦5, ♠Q, all J, all 2, and any trump-suit cards and 三反/五反 if enabled
  const trumpCards = trick.filter(pc => isTrump(pc.card, trumpSuit, config));
  
  if (trumpCards.length > 0) {
    // Winner is the player with the strongest trump
    let winner = trumpCards[0];
    let maxStrength = cardStrength(winner.card, trumpSuit, config, 0);
    
    for (let i = 1; i < trumpCards.length; i++) {
      const strength = cardStrength(trumpCards[i].card, trumpSuit, config, i);
      if (strength > maxStrength) {
        maxStrength = strength;
        winner = trumpCards[i];
      }
    }
    
    return winner.playerIndex;
  }

  // Step 2: No trump cards - compare only among cards following the leading suit
  const leadingSuit = getLeadingSuit(trick, trumpSuit, config);
  if (!leadingSuit) {
    // If leading card is a trump/joker, but no other trumps were played, fallback to first card
    // This shouldn't happen in normal gameplay, but handle it gracefully
    return leaderIndex;
  }

  // Filter cards that follow the leading suit and are not trump
  const followingCards = trick.filter(
    pc => !isTrump(pc.card, trumpSuit, config) &&
          getEffectiveSuit(pc.card, trumpSuit, config) === leadingSuit
  );

  if (followingCards.length === 0) {
    // Should not happen, but fallback to first card
    return leaderIndex;
  }

  // Find the strongest card among following cards
  let winner = followingCards[0];
  let maxStrength = cardStrength(winner.card, trumpSuit, config, 0);

  for (let i = 1; i < followingCards.length; i++) {
    const strength = cardStrength(followingCards[i].card, trumpSuit, config, i);
    if (strength > maxStrength) {
      maxStrength = strength;
      winner = followingCards[i];
    }
  }

  return winner.playerIndex;
}

/**
 * Validate that a card play is legal
 * 
 * Rules:
 * - If leading suit is non-trump, must follow suit if possible
 * - If leading suit is trump, must play trump if possible
 * - Otherwise can play any card
 */
export function validateCardPlay(
  state: GameState,
  playerId: string,
  card: Card
): { valid: boolean; reason?: string } {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { valid: false, reason: 'Player not found' };
  }

  if (playerIndex !== state.currentPlayerIndex) {
    return { valid: false, reason: 'Not your turn' };
  }

  const player = state.players[playerIndex];
  
  // Check if player has this card
  const cardIndex = player.hand.findIndex(
    c => c.suit === card.suit && c.rank === card.rank
  );
  if (cardIndex === -1) {
    return { valid: false, reason: 'Card not in hand' };
  }

  // If trick is empty, any card is valid (player is leading)
  if (state.currentTrick.length === 0) {
    return { valid: true };
  }

  // Check following suit rules
  const leadingCard = state.currentTrick[0].card;
  const leadingIsTrump = isTrump(leadingCard, state.trumpSuit, state.config);
  const cardIsTrump = isTrump(card, state.trumpSuit, state.config);

  if (leadingIsTrump) {
    // Leading card is trump - must play trump if possible
    if (!cardIsTrump) {
      // Check if player has any other trump card (besides the one being played)
      const hasOtherTrump = player.hand.some(
        c => !(c.suit === card.suit && c.rank === card.rank) && // Exclude the card being played
             isTrump(c, state.trumpSuit, state.config)
      );
      if (hasOtherTrump) {
        return { valid: false, reason: 'Must play trump when leading card is trump' };
      }
    }
    // If player has no other trump, they can play any card
    return { valid: true };
  } else {
    // Leading card is non-trump - must follow suit if possible
    const leadingSuit = getLeadingSuit(state.currentTrick, state.trumpSuit, state.config);
    if (!leadingSuit) {
      // Leading card is a trump/joker but was identified as non-trump (shouldn't happen)
      return { valid: true };
    }

    // Check if player has any non-trump cards of the leading suit
    const hasLeadSuit = player.hand.some(
      c => !isTrump(c, state.trumpSuit, state.config) &&
           getEffectiveSuit(c, state.trumpSuit, state.config) === leadingSuit
    );

    if (hasLeadSuit) {
      // Player MUST play cards of the leading suit - cannot play trump or other suits
      const cardEffectiveSuit = getEffectiveSuit(card, state.trumpSuit, state.config);
      const followsSuit = cardEffectiveSuit === leadingSuit;
      
      if (!followsSuit) {
        // Card doesn't follow suit - reject it
        const suitNames: Record<Suit, string> = {
          '♠': '黑桃',
          '♥': '红桃',
          '♣': '梅花',
          '♦': '方片',
          'JOKER': '王牌',
        };
        return { valid: false, reason: `有${suitNames[leadingSuit]}必须先出${suitNames[leadingSuit]}` };
      }
      // Card follows suit - valid
      return { valid: true };
    } else {
      // Player has no cards of the leading suit - can play trump or any other suit
      return { valid: true };
    }
  }
}

/**
 * Play a card in the current trick
 * 
 * This function:
 * 1. Validates the play
 * 2. Removes card from player's hand
 * 3. Adds card to current trick
 * 4. Advances to next player or completes trick if all 4 cards played
 * 
 * @param state Current game state
 * @param playerId ID of player playing the card
 * @param card Card to play
 * @returns New game state after playing the card
 */
export function playCard(
  state: GameState,
  playerId: string,
  card: Card
): GameState {
  console.log('[ENGINE_PLAY_CARD] start', {
    playerId,
    card: `${card.suit}${card.rank}`,
    currentTrickLength: state.currentTrick.length,
    tricksCount: state.tricks.length,
  });

  // Validate the play
  const validation = validateCardPlay(state, playerId, card);
  if (!validation.valid) {
    console.error('[ENGINE_PLAY_CARD][ERROR] validation failed', validation.reason);
    throw new Error(`Invalid card play: ${validation.reason}`);
  }

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const player = state.players[playerIndex];
  console.log('[ENGINE_PLAY_CARD] player found', {
    playerIndex,
    handSizeBefore: player.hand.length,
  });

  // Remove card from hand
  const cardIndex = player.hand.findIndex(
    c => c.suit === card.suit && c.rank === card.rank
  );
  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);
  console.log('[ENGINE_PLAY_CARD] card removed from hand', {
    handSizeAfter: newHand.length,
    allHandsEmpty: state.players.map((p, idx) => ({
      index: idx,
      handSize: idx === playerIndex ? newHand.length : p.hand.length,
    })),
  });

  // Create new player state
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    hand: newHand,
  };

  // Add card to current trick
  const playedCard: PlayedCard = {
    card,
    playerId,
    playerIndex,
  };
  const newCurrentTrick = [...state.currentTrick, playedCard];
  console.log('[ENGINE_PLAY_CARD] card added to trick', {
    newCurrentTrickLength: newCurrentTrick.length,
  });

  // Check if trick is complete (4 cards played)
  if (newCurrentTrick.length === 4) {
    console.log('[ENGINE_PLAY_CARD] trick complete, resolving');
    // Determine winner
    const leaderIndex = newCurrentTrick[0].playerIndex;
    const winnerIndex = getTrickWinner(
      newCurrentTrick,
      state.trumpSuit,
      state.config,
      leaderIndex
    );
    const winner = newCurrentTrick.find(pc => pc.playerIndex === winnerIndex)!;

    // Calculate points in this trick
    const points = newCurrentTrick.reduce(
      (sum, pc) => sum + getCardPoints(pc.card),
      0
    );

    // Create trick result
    const trickResult: TrickResult = {
      cards: newCurrentTrick,
      winnerIndex,
      winnerId: winner.playerId,
      points,
    };

    // Update scores - determine team based on dealerIndex (not player.team which may be stale)
    const dealerIndex = state.dealerIndex;
    const dealerTeamIndices = [dealerIndex, (dealerIndex + 2) % 4];
    const isDealerTeam = dealerTeamIndices.includes(winnerIndex);
    const newScores = { ...state.scores };
    if (isDealerTeam) {
      newScores.dealerTeam += points;
    } else {
      newScores.nonDealerTeam += points;
    }

    // Start new trick - winner leads next trick
    const finalState = {
      ...state,
      players: newPlayers,
      currentPlayerIndex: winnerIndex,
      currentTrick: [],
      tricks: [...state.tricks, trickResult],
      scores: newScores,
    };
    console.log('[ENGINE_PLAY_CARD] trick resolved, returning state', {
      winnerIndex,
      tricksCount: finalState.tricks.length,
      allHandsEmpty: finalState.players.every(p => p && p.hand && p.hand.length === 0),
      currentPlayerIndex: finalState.currentPlayerIndex,
      currentPlayerHandSize: finalState.players[finalState.currentPlayerIndex]?.hand?.length,
    });
    return finalState;
  }

  // Trick not complete - advance to next player
  const nextPlayerIndex = (playerIndex + 1) % 4;
  console.log('[ENGINE_PLAY_CARD] trick not complete, advancing to next player', {
    nextPlayerIndex,
    allHandsEmpty: newPlayers.every(p => p && p.hand && p.hand.length === 0),
  });

  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex,
    currentTrick: newCurrentTrick,
  };
}

/**
 * Calculate scores for each team based on completed tricks
 * 
 * Scoring rules:
 * - All 5s are worth 5 points each
 * - All 10s and Ks are worth 10 points each
 * - Points go to the team that wins each trick
 * - Returns detailed breakdown including which cards contributed points
 * 
 * @param state Current game state
 * @returns Detailed scores with scoring cards for each team
 */
export function calculateScores(state: GameState): HandScores {
  console.log('[CALCULATE_SCORES] start', {
    tricksCount: state.tricks?.length,
    dealerIndex: state.dealerIndex,
  });

  const dealerTeamCards: Card[] = [];
  const nonDealerTeamCards: Card[] = [];
  let dealerTeamScore = 0;
  let nonDealerTeamScore = 0;

  // Safety check: ensure tricks array exists
  if (!state.tricks || !Array.isArray(state.tricks)) {
    console.log('[CALCULATE_SCORES] no tricks array, returning zero scores');
    return {
      dealerTeam: {
        totalPoints: 0,
        scoringCards: [],
      },
      nonDealerTeam: {
        totalPoints: 0,
        scoringCards: [],
      },
    };
  }

  console.log('[CALCULATE_SCORES] processing tricks', { tricksCount: state.tricks.length });

  // Calculate scores from all completed tricks
  for (let i = 0; i < state.tricks.length; i++) {
    const trick = state.tricks[i];
    console.log('[CALCULATE_SCORES] processing trick', { trickIndex: i, trickExists: !!trick });
    
    // Safety check: ensure trick is valid
    if (!trick || !trick.cards || !Array.isArray(trick.cards)) {
      console.log('[CALCULATE_SCORES] skipping invalid trick', { trickIndex: i });
      continue;
    }
    
    console.log('[CALCULATE_SCORES] trick valid', {
      trickIndex: i,
      cardsCount: trick.cards.length,
      winnerIndex: trick.winnerIndex,
    });
    // Determine dealer team based on game state's dealerIndex
    // Dealer team = dealerIndex and the player sitting opposite (dealerIndex + 2) % 4
    // Non-dealer team = the other two players: (dealerIndex + 1) % 4 and (dealerIndex + 3) % 4
    const dealerIndex = state.dealerIndex;
    const dealerTeamIndices = [dealerIndex, (dealerIndex + 2) % 4];
    const winnerIndex = trick.winnerIndex;
    const isDealerTeam = dealerTeamIndices.includes(winnerIndex);
    
    console.log('[CALCULATE_SCORES] trick team determination', {
      trickIndex: i,
      dealerIndex,
      dealerTeamIndices,
      winnerIndex,
      isDealerTeam,
    });

    // Collect scoring cards and calculate points for this trick
    for (let j = 0; j < trick.cards.length; j++) {
      const playedCard = trick.cards[j];
      // Safety check: ensure playedCard and card exist
      if (!playedCard || !playedCard.card) {
        console.log('[CALCULATE_SCORES] skipping invalid playedCard', { trickIndex: i, cardIndex: j });
        continue;
      }
      
      const card = playedCard.card;
      let cardPoints = 0;
      
      // 5 = 5 points
      if (card.rank === 5) {
        cardPoints = 5;
      }
      // 10 = 10 points
      else if (card.rank === 10) {
        cardPoints = 10;
      }
      // K = 10 points
      else if (card.rank === 13) {
        cardPoints = 10;
      }

      // If this card has points, add it to the winning team's scoring cards
      if (cardPoints > 0) {
        if (isDealerTeam) {
          dealerTeamCards.push(card);
          dealerTeamScore += cardPoints;
        } else {
          nonDealerTeamCards.push(card);
          nonDealerTeamScore += cardPoints;
        }
      }
    }
  }

  const result = {
    dealerTeam: {
      totalPoints: dealerTeamScore,
      scoringCards: dealerTeamCards,
    },
    nonDealerTeam: {
      totalPoints: nonDealerTeamScore,
      scoringCards: nonDealerTeamCards,
    },
  };
  
  console.log('[CALCULATE_SCORES] completed', {
    dealerTeamPoints: result.dealerTeam.totalPoints,
    nonDealerTeamPoints: result.nonDealerTeam.totalPoints,
  });
  
  return result;
}

/**
 * Apply landlord discard (扣底牌) - unified function for both human and bot landlords
 * 
 * This function:
 * 1. Removes the selected cards from the landlord's hand
 * 2. Creates a LANDLORD_DISCARD history event
 * 3. Updates game state with finalBottomCards
 * 4. Sets currentPlayerIndex to dealer for first trick
 * 
 * @param state Current game state
 * @param landlordId ID of the landlord player
 * @param cards Array of 6 cards to discard as bottom cards
 * @returns New game state after applying landlord discard
 */
export function applyLandlordDiscard(
  state: GameState,
  landlordId: string,
  cards: Card[]
): GameState {
  const landlordIndex = state.players.findIndex(p => p.id === landlordId);
  
  if (landlordIndex === -1) {
    console.error('[APPLY_LANDLORD_DISCARD] Landlord not found', { landlordId });
    return state;
  }
  
  if (cards.length !== 6) {
    console.warn('[APPLY_LANDLORD_DISCARD] Expected 6 cards, got', cards.length);
  }
  
  const landlord = state.players[landlordIndex];
  
  // Remove selected cards from landlord's hand
  const remainingHand = landlord.hand.filter(card => {
    return !cards.some(selected => 
      selected.suit === card.suit && selected.rank === card.rank
    );
  });
  
  // Update players array
  const updatedPlayers = state.players.map((player, index) => {
    if (index === landlordIndex) {
      return {
        ...player,
        hand: remainingHand,
      };
    }
    return player;
  });
  
  // Create LANDLORD_DISCARD history event
  const landlordDiscardEvent: HistoryEvent = {
    type: 'LANDLORD_DISCARD',
    landlordId: landlordId,
    landlordIndex: landlordIndex,
    cards: [...cards],
    timestamp: Date.now(),
  };
  
  // Also create BOTTOM_SET event for backward compatibility
  const bottomSetEvent: HistoryEvent = {
    type: 'BOTTOM_SET',
    dealerId: landlordId,
    dealerIndex: landlordIndex,
    cards: [...cards],
    timestamp: Date.now(),
  };
  
  // Update history
  const updatedHistory = state.history 
    ? [...state.history, landlordDiscardEvent, bottomSetEvent]
    : [landlordDiscardEvent, bottomSetEvent];
  
  // Return updated game state
  return {
    ...state,
    players: updatedPlayers,
    finalBottomCards: cards,
    bottomCards: cards, // Also set bottomCards for consistency
    history: updatedHistory,
    currentPlayerIndex: landlordIndex, // Dealer leads first trick
    currentTrick: [], // Ensure trick is empty
  };
}

