# Game Engine Module

This module implements the core game logic for 「小二定主」 (Xiao Er Ding Zhu), a Chinese trick-taking card game.

## Structure

- `types.ts` - Type definitions for cards, game state, and configuration
- `rules.ts` - Card ordering rules, trump determination, and scoring constants
- `engine.ts` - Core game logic (create game, play cards, determine winners)
- `index.ts` - Module exports

## Quick Start

### Creating a Game

```typescript
import { createNewGame, GameConfig } from '@/src/game';

const config: GameConfig = {
  trumpSuit: '♥',        // Trump suit for this hand
  hasThreeFan: false,    // 三反 (three of rank 3 as trump)
  hasFiveFan: false,     // 五反 (three of rank 5 as trump)
};

const playerIds = ['player1', 'player2', 'player3', 'player4'];
const game = createNewGame(playerIds, config);
```

### Playing a Card

```typescript
import { playCard } from '@/src/game';

// Get the current player
const currentPlayer = game.players[game.currentPlayerIndex];

// Play a card from their hand
const cardToPlay = currentPlayer.hand[0];
const newGame = playCard(game, currentPlayer.id, cardToPlay);
```

### Checking Game State

```typescript
// Check whose turn it is
const currentPlayer = game.players[game.currentPlayerIndex];

// Check current trick
const trickCards = game.currentTrick;

// Check completed tricks
const completedTricks = game.tricks;

// Check scores
const scores = game.scores;
```

### Calculating Scores

```typescript
import { calculateScores } from '@/src/game';

const scores = calculateScores(game);
console.log(`Dealer team: ${scores.dealerTeam}`);
console.log(`Non-dealer team: ${scores.nonDealerTeam}`);
```

## Card Representation

Cards are represented as:

```typescript
interface Card {
  suit: '♠' | '♥' | '♣' | '♦' | 'JOKER';
  rank: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 'SJ' | 'BJ';
}
```

Where:
- `11` = J, `12` = Q, `13` = K, `14` = A
- `'SJ'` = Small Joker (小王)
- `'BJ'` = Big Joker (大王)

## Trump Cards (主牌)

### Fixed Trumps (常主)
Always trump regardless of suit:
- ♦5 (方片5) - Highest trump
- Big Joker (大王, BJ)
- Small Joker (小王, SJ)
- ♠Q (黑桃Q)

### Rank-based Trumps
- All J's (all four J cards)
- All 2's (all four 2 cards)

### Trump Suit (花色主)
All cards of the declared trump suit (except fixed trumps already counted)

### Fan Trumps (反)
When enabled:
- 五反: Three of rank 5 (except ♦5)
- 三反: Three of rank 3

## Testing

Run tests with:

```bash
npm test
```

Tests are located in `src/game/__tests__/engine.test.ts`.

## Future Extensions

This engine is designed to be extended with:
- 杠 (gang) - Playing multiple cards of the same rank
- 甩牌 (shuai pai) - Playing multiple cards at once
- 进贡/还贡 (jin gong/huan gong) - Tribute system
- 亮牌 & 断电 (liang pai/duan dian) - Card revealing and power cut logic
- 轮庄 (lun zhuang) - Dealer rotation



