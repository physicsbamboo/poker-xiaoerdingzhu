# Playground Screen Setup

## Files Created/Modified

### 1. `src/screens/PlaygroundScreen.tsx`
Main playground screen that allows interaction with the game engine.

**Features:**
- Displays current player's hand as tappable card buttons
- Shows current trick cards
- Displays game info (current player, trump suit, scores)
- Shows winner message when trick completes
- Handles card play validation and error messages

### 2. `src/screens/HomeScreen.tsx`
Home screen with navigation button to playground.

**Features:**
- Simple welcome screen
- "Go to Playground" button that navigates to the playground

### 3. `app/playground.tsx`
Expo Router route file for the playground screen.

### 4. `app/(tabs)/index.tsx`
Updated to use the HomeScreen component.

## How It Works

### Navigation Flow
1. App starts → Shows HomeScreen (via tabs/index.tsx)
2. User taps "Go to Playground" → Navigates to `/playground`
3. PlaygroundScreen loads → Initializes game with test hands

### Game Initialization
- Creates a new game with 4 players: `['p1', 'p2', 'p3', 'p4']`
- Config: `{ trumpSuit: '♦', hasThreeFan: false, hasFiveFan: false }`
- Deals test hands (5 cards per player) using `dealTestHands()` helper

### Card Display Format
- `♠A` → Spade Ace
- `♦5` → Diamond 5
- `BJ` → Big Joker (大王)
- `SJ` → Small Joker (小王)
- Standard format: `{suit}{rank}` (e.g., `♥10`, `♣K`)

### User Interaction
1. **Tap a card**: Calls `playCard()` engine function
2. **Card validation**: Engine validates the move (following suit rules)
3. **Error handling**: Shows alert if move is invalid
4. **Trick completion**: When 4 cards are played:
   - Shows winner message
   - Displays "Next Trick" button
   - Updates scores automatically

## Test Hands

Each player gets 5 cards:

**Player 1:**
- ♠A, ♠K, ♥10, ♦5 (trump), 大王

**Player 2:**
- ♠Q, ♥J, ♣10, ♦K, ♠5

**Player 3:**
- ♥A, ♣K, ♦10, 小王, ♠J

**Player 4:**
- ♣A, ♥K, ♠10, ♦J, ♥5

## Usage

1. Start the app: `npm start`
2. Navigate to Home tab
3. Tap "Go to Playground"
4. Tap cards from your hand to play them
5. Watch the trick progress and see who wins

## Next Steps

To extend this playground:
- Add AI players (automatically play cards)
- Add card animations
- Improve card visual design
- Add sound effects
- Implement full game flow (multiple tricks, scoring, etc.)



