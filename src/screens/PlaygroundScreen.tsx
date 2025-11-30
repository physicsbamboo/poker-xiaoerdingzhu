import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Alert,
  Modal,
  useWindowDimensions,
  Animated,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { 
  createNewGame, 
  playCard, 
  GameState, 
  Card, 
  calculateScores,
  createFullDeck,
  shuffleDeck,
  dealCards,
  dealWithTwos,
  getTrickWinner,
  PlayedCard,
  validateCardPlay,
  applyLandlordDiscard,
} from '@/src/game';
import { isTrump, getEffectiveSuit, getLeadingSuit, cardStrength, getCardPoints, isFixedTrump, isFanTrump, isJTrump, is2Trump } from '@/src/game/rules';
import { Suit, GameConfig, HandScores, TrickResult, GamePhase, HistoryEvent } from '@/src/game/types';
import { validateRuiPaiSelection } from '@/src/game/ruiPaiValidation';
import CardView from '@/src/components/CardView';

// Rules text constant
const RULES_CN_TEXT = `

牌的大小顺序

1、主牌从大至小依次为（以下牌均为常主）：

方片5＞大王＞小王＞黑桃Q＞四个J(主J最大，先出的最大)＞四个2(主2最大,先出的最大)。

2、副牌从大至小依次为：

A＞K＞Q(除黑桃)＞10＞......＞5（除方片）＞4＞3＞2。 [1]

杠的构成

1、假杠的构成：黑桃Q加三张一样数字的牌可构成假杠，如：Q666、Q777等，首家出假杠时，其余家有副牌只能添副牌，如果没有副牌才能贴主牌.如果有真杠可以选择用真杠大过假杠。

2、真杠的构成：四张一样数字的牌构成真杠，如:4444、8888或9999等，首家出真杠时，其余家有主牌只能添主牌，没有主牌时才可以添副牌，也可以用更大的真杠大过首家的真杠。

3、在所有真杠中，A真杠最大，2真杠最小；假杠无大小之分；4条Q可为真杠可为假杠。

4、所有由于进贡还贡获得的牌不可以用于构成真假杠，包括黑桃Q。

亮牌规则

1、亮牌：在首局发牌过程中,谁先亮2谁就是主家，称为抢亮，同时同花色为主牌。其他局亮2的仅仅是同花色为主牌。

2、亮三五反:在主家扣完底牌之前，起到三个3或者三个5,可以亮为三反或五反，亮成三五反的牌成为小于方片五而大于大王的主牌,如果不亮就不是主,但是亮了之后的3或者5不能用于构成真假杠。五反大于三反。有三五反的一方可以免掉向主家进贡的惩罚。由于进贡还贡获得的牌不能用于构成三五反。

3、断电：若发牌结束仍无人亮牌，则由不做庄的一方从底牌中随机抽出的花色即为主牌花色。断电之后不做庄的一方可以免掉向庄家进贡的处罚。再抽底牌时，大王算作红桃，小王算作黑桃。

出牌规则

1、出牌，由上轮出最大牌的人开始新一轮出牌，然后依次出牌。第一轮出牌需由庄家开始。 其余家依次走同花色的牌，如果是出副牌时，当没有同花色的牌时，可以选择用主牌大过这些副牌，称为"毙牌"，同样也可以选择用其他花色的副牌来添牌。当有相同花色的牌时，不能添其他花色的牌。定为主牌的牌和常主算作同花色。

2、甩牌 ，首家出牌时，可以将同花色中最大的几张牌一起扔出，称之为甩牌，甩牌时必须保证构成甩牌的所有牌均为同花色保留牌中的最大牌，如首家有红桃K,Q,9,如果红桃A和红桃10已经出过，则可以一次性将红桃K.Q.9甩出。否则甩牌失败，如首家手中有黑桃K，10，8，黑桃A已经出过，黑桃Q为常主，但是黑桃9还在手牌中，如果首家误将黑桃K,10,8甩出，则为甩牌失败，需要重新出误甩牌中最小的那张牌，即黑桃8。甩牌同样可以被毙牌，毙甩牌时必须同时满足两个条件：1.手中没有同花色的牌；2.用于毙牌的牌必须全部为主牌。

3、盖毙，在出现多家同时毙牌时，以构成毙牌的最大单张牌来比较大小。称之为盖毙。

轮庄规则

1、开局中，双方争庄，先亮者为庄家。

2、闲家上台时，下一副牌由此副牌的庄家的下家当庄家。

扣牌规则

底牌不能扣分。

计分和进贡

计分方法

1、有分值的牌为所有的5,10,K,其中，5算作5分，10和K算作10分。

2、结算时如果闲家得分为 0 ，闲家方（两方）双进贡庄家方（两方）；得分高于等于40 ，庄家下台；得分大于等于 60小于 80 ，庄家进贡上庄人；如果得分大于等于 80 ，庄家方（两方）双进贡给闲家（两方）

3、一局结束，庄家赢的话，庄家（两方）各得10分，闲家（两方）各得-10分，庄家下台的话，庄家（两方）各得-10分，闲家（两方）各得10分。 中途一方逃跑，则扣10分。

进贡与还贡

1、进贡必须是手上最大的牌；还贡可以还所得贡牌和有分值的牌之外的任意牌。

2、亮三五反的一方，可以免受进贡的处罚。

`;

/**
 * Simple markdown renderer for rules content
 * Converts markdown to React Native Text components
 */
function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Empty line
    if (line.trim() === '') {
      elements.push(<Text key={key++}>{'\n'}</Text>);
      continue;
    }

    // H1 (# Title)
    if (line.startsWith('# ')) {
      const text = line.substring(2).trim();
      elements.push(
        <Text key={key++} style={{ color: '#ffd700', fontSize: 22, fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>
          {text}
        </Text>
      );
      continue;
    }

    // H2 (## Title)
    if (line.startsWith('## ')) {
      const text = line.substring(3).trim();
      elements.push(
        <Text key={key++} style={{ color: '#ffd700', fontSize: 18, fontWeight: 'bold', marginTop: 14, marginBottom: 6 }}>
          {text}
        </Text>
      );
      continue;
    }

    // H3 (### Title)
    if (line.startsWith('### ')) {
      const text = line.substring(4).trim();
      elements.push(
        <Text key={key++} style={{ color: '#ffd700', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>
          {text}
        </Text>
      );
      continue;
    }

    // H4 (#### Title)
    if (line.startsWith('#### ')) {
      const text = line.substring(5).trim();
      elements.push(
        <Text key={key++} style={{ color: '#ffd700', fontSize: 15, fontWeight: 'bold', marginTop: 10, marginBottom: 4 }}>
          {text}
        </Text>
      );
      continue;
    }

    // Numbered list (1. item)
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '').trim();
      elements.push(
        <Text key={key++} style={{ color: '#fff', fontSize: 14, lineHeight: 22, marginLeft: 20, marginTop: 4 }}>
          {renderBoldText(text)}
        </Text>
      );
      continue;
    }

    // Bullet list (- item)
    if (line.startsWith('- ')) {
      const text = line.substring(2).trim();
      elements.push(
        <Text key={key++} style={{ color: '#fff', fontSize: 14, lineHeight: 22, marginLeft: 20, marginTop: 4 }}>
          • {renderBoldText(text)}
        </Text>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <Text key={key++} style={{ color: '#fff', fontSize: 14, lineHeight: 22, marginTop: 4 }}>
        {renderBoldText(line)}
      </Text>
    );
  }

  return <>{elements}</>;
}

/**
 * Render text with bold formatting (**text**)
 */
function renderBoldText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before bold
    if (match.index > lastIndex) {
      parts.push(<Text key={key++}>{text.substring(lastIndex, match.index)}</Text>);
    }
    // Add bold text
    parts.push(
      <Text key={key++} style={{ fontWeight: 'bold', color: '#ffd700' }}>
        {match[1]}
      </Text>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<Text key={key++}>{text.substring(lastIndex)}</Text>);
  }

  return parts.length > 0 ? parts : [<Text key={0}>{text}</Text>];
}

// Rules content is now imported from rulesCnText.ts

/**
 * Match state tracking across multiple hands
 */
interface MatchState {
  matchDealerIndex: number | null; // null before the very first hand
  dealerTeamTotal: number;        // total points for dealer team across hands
  nonDealerTeamTotal: number;     // total points for non-dealer team across hands
  handNumber: number;             // 1, 2, 3, ...
}

/**
 * Format a card for display
 */
function formatCard(card: Card): string {
  if (card.suit === 'JOKER') {
    if (card.rank === 'BJ') return '大王';
    if (card.rank === 'SJ') return '小王';
    return 'JOKER';
  }

  const suitSymbol = card.suit;
  let rankStr: string;

  if (typeof card.rank === 'number') {
    if (card.rank === 11) rankStr = 'J';
    else if (card.rank === 12) rankStr = 'Q';
    else if (card.rank === 13) rankStr = 'K';
    else if (card.rank === 14) rankStr = 'A';
    else rankStr = card.rank.toString();
  } else {
    rankStr = card.rank;
  }

  return `${suitSymbol}${rankStr}`;
}

/**
 * Detect if current trick is a rui-pai (multi-card) trick
 * Returns: { isRuiPai: boolean, leaderCards: Card[], leaderSuit: Suit | null, cardCount: number }
 */
function detectRuiPaiTrick(currentTrick: PlayedCard[], state: GameState): {
  isRuiPai: boolean;
  leaderCards: Card[];
  leaderSuit: Suit | null;
  cardCount: number;
} {
  if (currentTrick.length === 0) {
    return { isRuiPai: false, leaderCards: [], leaderSuit: null, cardCount: 0 };
  }

  // Group cards by player index
  const cardsByPlayer: { [playerIndex: number]: Card[] } = {};
  currentTrick.forEach(pc => {
    if (!cardsByPlayer[pc.playerIndex]) {
      cardsByPlayer[pc.playerIndex] = [];
    }
    cardsByPlayer[pc.playerIndex].push(pc.card);
  });

  // Check if leader (first player) has multiple cards
  const leaderIndex = currentTrick[0].playerIndex;
  const leaderCards = cardsByPlayer[leaderIndex] || [];
  const isRuiPai = leaderCards.length > 1;

  if (!isRuiPai) {
    return { isRuiPai: false, leaderCards: leaderCards, leaderSuit: null, cardCount: 1 };
  }

  // Determine leader suit (the suit of the leader's cards)
  // All leader cards should be the same suit for valid rui-pai
  // Use the effective suit of the first leader card
  const leaderSuit = getEffectiveSuit(leaderCards[0], state.trumpSuit, state.config);

  return {
    isRuiPai: true,
    leaderCards,
    leaderSuit: leaderSuit as Suit | null,
    cardCount: leaderCards.length,
  };
}

/**
 * Find valid card group for AI players to follow in a rui-pai trick
 * Returns an array of N cards according to rui-pai follow rules
 */
function findValidCardGroupForRuiPai(
  state: GameState,
  playerId: string,
  leaderSuit: Suit,
  requiredCount: number
): Card[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.hand.length === 0) {
    return [];
  }

  if (player.hand.length < requiredCount) {
    // Not enough cards - return all cards (shouldn't happen in normal play)
    return [...player.hand];
  }

  // Count cards of leader suit in player's hand
  const suitCards = player.hand.filter(card => {
    const effectiveSuit = getEffectiveSuit(card, state.trumpSuit, state.config);
    return effectiveSuit === leaderSuit && !isTrump(card, state.trumpSuit, state.config);
  });

  const suitCount = suitCards.length;

  // CASE 1: Follower has 0 cards of suit S
  if (suitCount === 0) {
    // Strategy: Try to win with trumps, otherwise play non-trump cards (will lose)
    const trumpCards = player.hand.filter(c => isTrump(c, state.trumpSuit, state.config));
    
    if (trumpCards.length >= requiredCount) {
      // Play N trump cards (sorted by strength, highest first for winning chance)
      return trumpCards
        .sort((a, b) => cardStrength(b, state.trumpSuit, state.config) - cardStrength(a, state.trumpSuit, state.config))
        .slice(0, requiredCount);
    } else {
      // Not enough trumps - play N non-trump cards (will lose)
      const nonTrumpCards = player.hand.filter(c => !isTrump(c, state.trumpSuit, state.config));
      if (nonTrumpCards.length >= requiredCount) {
        return nonTrumpCards.slice(0, requiredCount);
      } else {
        // Fill with any cards
        return player.hand.slice(0, requiredCount);
      }
    }
  }

  // CASE 2: Follower has 1 to N-1 cards of suit S
  // According to strict follow-suit rule: if hasLeadSuit is true, MUST play only leadSuit cards
  // However, rui-pai requires all players to play the same count, so we must play all suit cards
  // and fill remaining slots (this violates strict rule but is necessary for game mechanics)
  // Note: This group will ALWAYS lose (cannot win if not fully following suit)
  if (suitCount > 0 && suitCount < requiredCount) {
    // Must play ALL suit S cards + fill remaining slots to meet required count
    const remainingCount = requiredCount - suitCount;
    
    // Sort suit cards by rank (lowest first)
    const sortedSuitCards = [...suitCards].sort((a, b) => {
      const rankA = typeof a.rank === 'number' ? a.rank : 0;
      const rankB = typeof b.rank === 'number' ? b.rank : 0;
      return rankA - rankB;
    });
    
    // Fill remaining slots with other cards (prefer non-trump to avoid wasting trumps)
    // Note: This is a violation of strict follow-suit rule, but necessary for game mechanics
    const otherCards = player.hand.filter(card => {
      const effectiveSuit = getEffectiveSuit(card, state.trumpSuit, state.config);
      return effectiveSuit !== leaderSuit || isTrump(card, state.trumpSuit, state.config);
    });
    
    const fillers = otherCards.slice(0, remainingCount);
    
    return [...sortedSuitCards, ...fillers];
  }

  // CASE 3: Follower has ≥N cards of suit S
  // Must play exactly N cards from suit S (lowest N cards)
  const sortedSuitCards = [...suitCards].sort((a, b) => {
    const rankA = typeof a.rank === 'number' ? a.rank : 0;
    const rankB = typeof b.rank === 'number' ? b.rank : 0;
    return rankA - rankB; // Lowest first
  });
  
  return sortedSuitCards.slice(0, requiredCount);
}

/**
 * Find a valid card for AI players to play (single card or rui-pai group)
 */
function findValidCard(state: GameState, playerId: string): Card | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.hand.length === 0) {
    return null;
  }

  // If trick is empty, any card is valid
  if (state.currentTrick.length === 0) {
    // Safety check: ensure hand is not empty
    if (!player.hand || player.hand.length === 0) {
      return null;
    }
    return player.hand[0];
  }

  // Check if this is a rui-pai trick
  const ruiPaiInfo = detectRuiPaiTrick(state.currentTrick, state);
  
  if (ruiPaiInfo.isRuiPai && ruiPaiInfo.leaderSuit && ruiPaiInfo.cardCount > 1) {
    // This is a rui-pai trick - need to play multiple cards
    // For now, return the first card of the group (will be handled separately)
    const cardGroup = findValidCardGroupForRuiPai(
      state,
      playerId,
      ruiPaiInfo.leaderSuit,
      ruiPaiInfo.cardCount
    );
    // Safety check: ensure hand is not empty
    if (!player.hand || player.hand.length === 0) {
      return null;
    }
    return cardGroup.length > 0 ? cardGroup[0] : player.hand[0];
  }

  // Normal single-card trick
  // Safety check: ensure currentTrick is not empty
  if (!state.currentTrick || state.currentTrick.length === 0) {
    if (!player.hand || player.hand.length === 0) {
      return null;
    }
    return player.hand[0];
  }
  
  const leadingCard = state.currentTrick[0].card;
  const leadingIsTrump = isTrump(leadingCard, state.trumpSuit, state.config);

  if (leadingIsTrump) {
    // Must play trump if possible
    const trumpCard = player.hand.find(c => isTrump(c, state.trumpSuit, state.config));
    // Safety check: ensure hand is not empty
    if (!player.hand || player.hand.length === 0) {
      return null;
    }
    return trumpCard || player.hand[0];
  } else {
    // Must follow suit if possible
    const leadingSuit = getLeadingSuit(state.currentTrick, state.trumpSuit, state.config);
    if (leadingSuit) {
      const followingCard = player.hand.find(
        c => !isTrump(c, state.trumpSuit, state.config) &&
             getEffectiveSuit(c, state.trumpSuit, state.config) === leadingSuit
      );
      if (followingCard) {
        return followingCard;
      }
    }
    // Can't follow suit, can play any card
    // Safety check: ensure hand is not empty
    if (!player.hand || player.hand.length === 0) {
      return null;
    }
    return player.hand[0];
  }
}

/**
 * Find valid card group for AI players (handles both single and rui-pai)
 */
function findValidCardGroup(state: GameState, playerId: string): Card[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.hand || player.hand.length === 0) {
    return [];
  }

  // If trick is empty, return single card
  if (state.currentTrick.length === 0) {
    // Safety check: ensure hand is not empty
    if (!player.hand || player.hand.length === 0) {
      return [];
    }
    return [player.hand[0]];
  }

  // Check if this is a rui-pai trick
  const ruiPaiInfo = detectRuiPaiTrick(state.currentTrick, state);
  
  if (ruiPaiInfo.isRuiPai && ruiPaiInfo.leaderSuit && ruiPaiInfo.cardCount > 1) {
    // This is a rui-pai trick - return card group
    return findValidCardGroupForRuiPai(
      state,
      playerId,
      ruiPaiInfo.leaderSuit,
      ruiPaiInfo.cardCount
    );
  }

  // Normal single-card trick
  const singleCard = findValidCard(state, playerId);
  return singleCard ? [singleCard] : [];
}

/**
 * Determine winner for a trick (handles both single-card and rui-pai multi-card tricks)
 * For rui-pai: applies special rules - followers who don't fully follow suit cannot win
 */
function determineTrickWinner(
  currentTrick: PlayedCard[],
  state: GameState,
  leaderIndex: number
): number {
  // Group cards by player
  const cardsByPlayer: { [playerIndex: number]: Card[] } = {};
  currentTrick.forEach(pc => {
    if (!cardsByPlayer[pc.playerIndex]) {
      cardsByPlayer[pc.playerIndex] = [];
    }
    cardsByPlayer[pc.playerIndex].push(pc.card);
  });

  // Check if this is a rui-pai trick (leader has multiple cards)
  const leaderCards = cardsByPlayer[leaderIndex] || [];
  const isRuiPai = leaderCards.length > 1;

  if (!isRuiPai) {
    // Normal single-card trick - use existing logic
    if (currentTrick.length === 4) {
      return getTrickWinner(currentTrick, state.trumpSuit, state.config, leaderIndex);
    }
    return leaderIndex;
  }

  // Rui-pai trick: apply special winner rules
  // Determine leader suit (must be non-trump for valid rui-pai)
  const leaderSuit = getEffectiveSuit(leaderCards[0], state.trumpSuit, state.config);
  const requiredCount = leaderCards.length;

  // Find leader's strongest card
  let leaderStrongestCard = leaderCards[0];
  let leaderMaxStrength = cardStrength(leaderStrongestCard, state.trumpSuit, state.config);
  for (let i = 1; i < leaderCards.length; i++) {
    const strength = cardStrength(leaderCards[i], state.trumpSuit, state.config);
    if (strength > leaderMaxStrength) {
      leaderMaxStrength = strength;
      leaderStrongestCard = leaderCards[i];
    }
  }

  let winnerIndex = leaderIndex;
  let winnerMaxStrength = leaderMaxStrength;

  // Check each follower
  for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
    if (playerIndex === leaderIndex) continue;

    const followerCards = cardsByPlayer[playerIndex] || [];
    if (followerCards.length === 0) continue;

    // Count how many cards of leader suit the follower has
    const followerSuitCards = followerCards.filter(card => {
      const effectiveSuit = getEffectiveSuit(card, state.trumpSuit, state.config);
      return effectiveSuit === leaderSuit && !isTrump(card, state.trumpSuit, state.config);
    });
    const followerSuitCount = followerSuitCards.length;

    // Check if follower played all trump cards
    const allTrumps = followerCards.every(c => isTrump(c, state.trumpSuit, state.config));

    // Rule: If follower fails to fully follow suit (has <k suit cards), they CANNOT win
    // Exception: If follower has 0 suit cards AND plays all-trump group, they may win
    if (followerSuitCount > 0 && followerSuitCount < requiredCount) {
      // Mixed suits (e.g., 1 suit + 1 trump) ALWAYS lose
      continue;
    }

    // Find follower's strongest card
    let followerStrongestCard = followerCards[0];
    let followerMaxStrength = cardStrength(followerStrongestCard, state.trumpSuit, state.config);
    for (let i = 1; i < followerCards.length; i++) {
      const strength = cardStrength(followerCards[i], state.trumpSuit, state.config);
      if (strength > followerMaxStrength) {
        followerMaxStrength = strength;
        followerStrongestCard = followerCards[i];
      }
    }

    // Compare: follower can only win if:
    // 1. They fully followed suit (followerSuitCount === requiredCount), OR
    // 2. They have 0 suit cards AND played all-trump group
    if (followerSuitCount === requiredCount) {
      // Fully followed suit - compare strongest cards
      if (followerMaxStrength > winnerMaxStrength) {
        winnerIndex = playerIndex;
        winnerMaxStrength = followerMaxStrength;
      }
    } else if (followerSuitCount === 0 && allTrumps) {
      // 0 suit cards + all-trump group - can beat leader
      if (followerMaxStrength > winnerMaxStrength) {
        winnerIndex = playerIndex;
        winnerMaxStrength = followerMaxStrength;
      }
    }
    // Otherwise: follower loses (already handled by continue above)
  }

  return winnerIndex;
}

export default function PlaygroundScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  // Lock orientation to landscape when component mounts
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    
    // Unlock when component unmounts
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bottomCards, setBottomCards] = useState<Card[]>([]);
  const [trickWinner, setTrickWinner] = useState<string | null>(null);
  const [showNextTrickButton, setShowNextTrickButton] = useState(false);
  // CRITICAL: Initialize all end-of-hand states to false to prevent crashes on startup
  const [handFinished, setHandFinished] = useState(false);
  const [isTrickComplete, setIsTrickComplete] = useState(false);
  const [lastTrickWinnerIndex, setLastTrickWinnerIndex] = useState<number | null>(null);
  const [isHandFinished, setIsHandFinished] = useState(false);
  const [finalScores, setFinalScores] = useState<HandScores | null>(null);
  
  // End-of-hand handling: centralized guard to prevent crashes
  const hasHandledEndOfHandRef = useRef(false);
  
  // Pre-fan phase state
  const [isPreFanPhase, setIsPreFanPhase] = useState(true);
  const [canThreeFan, setCanThreeFan] = useState(false);
  const [canFiveFan, setCanFiveFan] = useState(false);
  const [revealedFanCards, setRevealedFanCards] = useState<Card[]>([]); // Cards that are "亮出来"
  
  // History state
  const [showHistory, setShowHistory] = useState(false);
  
  // Rules modal state
  const [showRules, setShowRules] = useState(false);
  
  // Auto-play (托管) state for player 0
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  
  // Ding-zhu toast notification state
  const [dingZhuToastVisible, setDingZhuToastVisible] = useState(false);
  const [dingZhuToastMessage, setDingZhuToastMessage] = useState<string>('');
  
  // Dealing animation state
  const [isDealing, setIsDealing] = useState(false);
  const [dealingIndex, setDealingIndex] = useState(0);
  const [dealingDeck, setDealingDeck] = useState<Card[]>([]); // Full shuffled deck for dealing
  const [dealingHands, setDealingHands] = useState<Card[][]>([[], [], [], []]); // Hands being built during dealing
  const [flyingCard, setFlyingCard] = useState<{ card: Card; playerIndex: number; animValue: Animated.ValueXY } | null>(null);
  const [hasGameState, setHasGameState] = useState(false); // Track if gameState is ready (not just loading)
  
  // Store initializeGame parameters in refs to avoid stale closures
  const initializeGameParamsRef = useRef<{ explicitDealerIndex?: number; tributePairs?: Array<{ from: number; to: number }> }>({});
  
  // 定主 phase state
  const [isDingZhuPhase, setIsDingZhuPhase] = useState(false);
  const [firstTwoCandidate, setFirstTwoCandidate] = useState<{ playerIndex: number; suit: Suit } | null>(null);
  const [isFirstGame, setIsFirstGame] = useState(true); // Track if this is the first game
  
  // Mid-dealing DingZhu state
  const [hasTrumpBeenChosen, setHasTrumpBeenChosen] = useState(false);
  const [dingZhuDeclinedPlayers, setDingZhuDeclinedPlayers] = useState<Set<number>>(new Set());
  const [pendingDingZhuPlayerId, setPendingDingZhuPlayerId] = useState<number | null>(null);
  const [pendingDingZhuCard, setPendingDingZhuCard] = useState<Card | null>(null);
  const [highlightDingZhuCard, setHighlightDingZhuCard] = useState<{ playerId: number; cardId: string } | null>(null);
  
  // Bottom card selection phase state
  const [isBottomSelectionPhase, setIsBottomSelectionPhase] = useState(false);
  const [selectedBottomCards, setSelectedBottomCards] = useState<Card[]>([]);
  const [isBottomRevealPhase, setIsBottomRevealPhase] = useState(false); // Show bottom cards in center before normal play
  
  // 甩牌 (Rui Pai) multi-selection state
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  
  // Pending tribute pairs (to be performed after trump suit is determined)
  const [pendingTributePairs, setPendingTributePairs] = useState<Array<{ from: number; to: number }>>([]);
  
  // Tribute visualization state
  const [nextHandTributeType, setNextHandTributeType] = useState<'none' | 'single' | 'double'>('none');
  const [showTributeVisualization, setShowTributeVisualization] = useState(false);
  const [tributeVisualizationData, setTributeVisualizationData] = useState<Array<{
    from: number;
    to: number;
    fromCard: Card;
    toCard: Card;
  }>>([]);
  
  // Score details visibility state
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  
  // Match state (multi-hand)
  const [matchState, setMatchState] = useState<MatchState>({
    matchDealerIndex: null,
    dealerTeamTotal: 0,
    nonDealerTeamTotal: 0,
    handNumber: 1,
  });

  // Note: Screen orientation is now controlled by app.json (portrait mode)
  // Removed manual locking to allow natural portrait orientation

  // Initialize game on mount with automatic 定主
  useEffect(() => {
    initializeGame();
  }, []);

  // Dealing animation effect - deals cards one by one
  useEffect(() => {
    if (!isDealing || dealingDeck.length === 0) return;

    const HAND_SIZE = 12;
    const TOTAL_HAND_CARDS = 4 * HAND_SIZE; // 48 cards to deal
    const DEAL_INTERVAL_MS = 120; // 120ms per card for smooth animation

    if (dealingIndex >= TOTAL_HAND_CARDS) {
      // Dealing complete - process the final hands
      const finalHands = dealingHands;
      
      // Extract bottom cards (last 6 cards from deck)
      const bottomCards = dealingDeck.slice(TOTAL_HAND_CARDS, TOTAL_HAND_CARDS + 6);
      
      // If no one chose trump during dealing, check for fallback
      if (!hasTrumpBeenChosen) {
        console.log("[DINGZHU] No one chose trump during dealing, using fallback");
        
        // Find first 2 candidate as fallback
        let fallbackCandidate: { playerIndex: number; suit: Suit } | null = null;
        for (let i = 0; i < TOTAL_HAND_CARDS && !fallbackCandidate; i++) {
          const card = dealingDeck[i];
          if (card.rank === 2 && card.suit !== 'JOKER') {
            const playerIndex = i % 4;
            fallbackCandidate = {
              playerIndex,
              suit: card.suit as Suit,
            };
          }
        }
        
        setFirstTwoCandidate(fallbackCandidate);
        
        // If we have a candidate and it's player 0, show DingZhu UI
        if (fallbackCandidate && fallbackCandidate.playerIndex === 0) {
          setIsDingZhuPhase(true);
          setPendingDingZhuPlayerId(0);
          setPendingDingZhuCard({ suit: fallbackCandidate.suit, rank: 2 });
        }
      }

      // Store bottom cards
      setBottomCards(bottomCards);

      // Determine dealer and trump based on match state
      let dealerIndex = 0;
      let trumpSuit: Suit = '♦';
      let needsDingZhuChoice = false;
      
      const isFirstHand = matchState.matchDealerIndex === null;

      if (isFirstHand) {
        // First hand: use ding-zhu logic
        if (firstTwoCandidate) {
          if (firstTwoCandidate.playerIndex === 0) {
            // Player 0 (human) - show UI to choose
            needsDingZhuChoice = true;
            dealerIndex = 0;
            trumpSuit = '♦';
          } else {
            // AI player - automatically choose to 定主
            trumpSuit = firstTwoCandidate.suit;
            dealerIndex = firstTwoCandidate.playerIndex;
            needsDingZhuChoice = false;
            
            // Update match dealer
            setMatchState(prev => ({
              ...prev,
              matchDealerIndex: dealerIndex,
            }));
          }
        } else {
          // No first 2 candidate - simplified 断电
          const suits: Suit[] = ['♠', '♥', '♣', '♦'];
          trumpSuit = suits[Math.floor(Math.random() * suits.length)];
          dealerIndex = 0;
          needsDingZhuChoice = false;
          
          setMatchState(prev => ({
            ...prev,
            matchDealerIndex: dealerIndex,
          }));
        }
      } else {
        // Later hands: use explicit dealerIndex if provided, otherwise use match dealer
        const params = initializeGameParamsRef.current;
        dealerIndex = params.explicitDealerIndex !== undefined ? params.explicitDealerIndex : matchState.matchDealerIndex!;
        
        if (firstTwoCandidate) {
          if (firstTwoCandidate.playerIndex === 0) {
            // Player 0 (human) - show UI to choose trump (but dealer stays the same)
            needsDingZhuChoice = true;
            trumpSuit = '♦';
          } else {
            // AI player - automatically choose to 定主 (trump only, dealer unchanged)
            trumpSuit = firstTwoCandidate.suit;
            needsDingZhuChoice = false;
            
            // Show toast notification for AI ding-zhu
            setDingZhuToastMessage(`玩家${firstTwoCandidate.playerIndex + 1} 用 ${firstTwoCandidate.suit}2 定了主`);
            setDingZhuToastVisible(true);
            setTimeout(() => {
              setDingZhuToastVisible(false);
            }, 2500);
          }
        } else {
          // No first 2 candidate - simplified 断电
          const suits: Suit[] = ['♠', '♥', '♣', '♦'];
          trumpSuit = suits[Math.floor(Math.random() * suits.length)];
          needsDingZhuChoice = false;
        }
      }

      // Create game state with determined trump suit and dealer
      const initialGame = createNewGame(
        ['p1', 'p2', 'p3', 'p4'],
        { trumpSuit, hasThreeFan: false, hasFiveFan: false },
        dealerIndex
      );

      // Replace player hands with dealt hands
      // IMPORTANT: Add bottom cards to dealer's hand
      let newPlayers = initialGame.players.map((player, index) => {
        if (index === dealerIndex) {
          // Dealer picks up bottom cards into their hand
          return {
            ...player,
            hand: [...finalHands[index], ...bottomCards],
          };
        }
        return {
          ...player,
          hand: finalHands[index],
        };
      });

      // Store tribute pairs if provided
      const params = initializeGameParamsRef.current;
      if (params.tributePairs) {
        setPendingTributePairs(params.tributePairs);
      } else {
        setPendingTributePairs([]);
      }

      // Perform tribute (进贡) if needed - must happen after trump suit is determined
      if (params.tributePairs && params.tributePairs.length > 0 && !needsDingZhuChoice) {
        // Collect tribute visualization data
        const visualizationData: Array<{ from: number; to: number; fromCard: Card; toCard: Card }> = [];
        
        for (const pair of tributePairs) {
          const aTrumps = newPlayers[pair.from].hand.filter(card => isTrump(card, trumpSuit, initialGame.config));
          const bTrumps = newPlayers[pair.to].hand.filter(card => isTrump(card, trumpSuit, initialGame.config));
          
          if (aTrumps.length > 0 && bTrumps.length > 0) {
            let highestTrumpA = aTrumps[0];
            let maxStrengthA = cardStrength(highestTrumpA, trumpSuit, initialGame.config, 0);
            for (let i = 1; i < aTrumps.length; i++) {
              const strength = cardStrength(aTrumps[i], trumpSuit, initialGame.config, i);
              if (strength > maxStrengthA) {
                maxStrengthA = strength;
                highestTrumpA = aTrumps[i];
              }
            }
            
            let lowestTrumpB = bTrumps[0];
            let minStrengthB = cardStrength(lowestTrumpB, trumpSuit, initialGame.config, 0);
            for (let i = 1; i < bTrumps.length; i++) {
              const strength = cardStrength(bTrumps[i], trumpSuit, initialGame.config, i);
              if (strength < minStrengthB) {
                minStrengthB = strength;
                lowestTrumpB = bTrumps[i];
              }
            }
            
            visualizationData.push({
              from: pair.from,
              to: pair.to,
              fromCard: highestTrumpA,
              toCard: lowestTrumpB,
            });
          }
        }
        
        if (visualizationData.length > 0) {
          setTributeVisualizationData(visualizationData);
          setShowTributeVisualization(true);
          
          setTimeout(() => {
            setShowTributeVisualization(false);
            setTributeVisualizationData([]);
          }, 2000);
        }
        
        // Perform actual tribute
        for (const pair of params.tributePairs) {
          const tributeResult = performTribute(
            newPlayers[pair.from].hand,
            newPlayers[pair.to].hand,
            trumpSuit,
            initialGame.config
          );
          
          if (tributeResult) {
            newPlayers = newPlayers.map((player, index) => {
              if (index === pair.from) {
                return { ...player, hand: tributeResult.newAHand };
              }
              if (index === pair.to) {
                return { ...player, hand: tributeResult.newBHand };
              }
              return player;
            });
          }
        }
        setPendingTributePairs([]);
      }

      // Update game state
      const updatedGame: GameState = {
        ...initialGame,
        players: newPlayers,
        trumpSuit,
        dealerIndex,
        config: {
          ...initialGame.config,
          trumpSuit,
        },
        finalBottomCards: [],
      };

      setGameState(updatedGame);
      setHasGameState(true); // Mark that gameState is ready
      setIsDealing(false);
      setIsDingZhuPhase(needsDingZhuChoice);
      
      // CRITICAL: If AI player is dealer, set bottom selection phase so they can discard bottom cards
      // This ensures AI dealers go through bottom card discard step
      if (!needsDingZhuChoice && dealerIndex !== 0) {
        setIsBottomSelectionPhase(true);
        console.log("[DEALING_COMPLETE] AI dealer detected, setting isBottomSelectionPhase=true", {
          dealerIndex,
          trumpSuit,
        });
      }
      
      console.log("[DEALING_COMPLETE] gameState created, isDealing=false, isDingZhuPhase=", needsDingZhuChoice);
      
      return;
    }

    // Deal next card
    const timer = setTimeout(() => {
      const card = dealingDeck[dealingIndex];
      const playerIndex = dealingIndex % 4;
      
      // Add card to the appropriate player's hand
      const newHands = [...dealingHands];
      newHands[playerIndex] = [...newHands[playerIndex], card];
      
      setDealingHands(newHands);
      
      // Check for 三反/五反 eligibility during dealing (only for player 0, before bottom discard)
      // Rule: 在主家扣完底牌之前，起到三个3或者三个5,可以亮为三反或五反
      if (playerIndex === 0 && !isBottomSelectionPhase) {
        const player0Hand = newHands[0];
        const rank3Count = player0Hand.filter(c => c.rank === 3).length;
        const rank5Count = player0Hand.filter(c => c.rank === 5 && c.suit !== '♦').length; // Exclude ♦5
        
        // Update fan eligibility
        setCanThreeFan(rank3Count >= 3);
        setCanFiveFan(rank5Count >= 3);
        
        // If player has enough cards for fan, show pre-fan phase
        // But only if we're still in dealing phase (before bottom selection)
        if ((rank3Count >= 3 || rank5Count >= 3) && isDealing) {
          setIsPreFanPhase(true);
        }
      }
      
      // Check if this card is a DingZhu candidate (rank 2, non-joker)
      const isDingZhuCandidate = card.rank === 2 && card.suit !== 'JOKER';
      
      // Early return: if trump has already been chosen, ignore all subsequent "2" cards
      if (hasTrumpBeenChosen) {
        // Trump already chosen: do NOT trigger any DingZhu/highlight anymore.
        // Just proceed to next card.
        setDealingIndex(prev => prev + 1);
        return;
      }
      
      // Check if we should trigger DingZhu
      if (
        isDingZhuCandidate &&
        !dingZhuDeclinedPlayers.has(playerIndex)
      ) {
        // Update gameState with current hands first
        if (gameState) {
          const updatedPlayers = gameState.players.map((player, idx) => ({
            ...player,
            hand: newHands[idx],
          }));
          setGameState({
            ...gameState,
            players: updatedPlayers,
          });
        }
        
        if (playerIndex === 0) {
          // Local player (Player 0) - trigger highlight animation first, then show DingZhu UI
          console.log("[DEALING] DingZhu triggered for local player 0 with card", card);
          setIsDealing(false);
          setIsDingZhuPhase(false); // Don't show DingZhu panel yet - wait for animation
          setPendingDingZhuPlayerId(playerIndex);
          setPendingDingZhuCard(card);
          setFirstTwoCandidate({ playerIndex, suit: card.suit as Suit });
          // Generate a unique card ID for highlighting (using suit and rank)
          const cardId = `${card.suit}-${card.rank}`;
          setHighlightDingZhuCard({ playerId: playerIndex, cardId });
          return; // Wait for animation to complete - don't advance dealingIndex
        } else {
          // AI player - automatically decide
          // For now, AI always chooses to 定主 if they have enough candidate trump cards
          const aiHand = newHands[playerIndex];
          const proposedTrumpSuit = card.suit as Suit;
          const tempConfig: GameConfig = {
            trumpSuit: proposedTrumpSuit,
            hasThreeFan: false,
            hasFiveFan: false,
          };
          const candidateTrumpCards = aiHand.filter(c => isTrump(c, proposedTrumpSuit, tempConfig));
          const candidateCount = candidateTrumpCards.length;
          
          // AI decision: choose 定主 if candidateCount >= 3, otherwise decline
          const aiChoosesDingZhu = candidateCount >= 3;
          
          if (aiChoosesDingZhu) {
            console.log("[DEALING] AI player", playerIndex, "chose to 定主 with", candidateCount, "candidate trump cards");
            setHasTrumpBeenChosen(true);
            setFirstTwoCandidate({ playerIndex, suit: proposedTrumpSuit });
            
            // Update gameState with trump suit
            if (gameState) {
              const isFirstHand = matchState.matchDealerIndex === null;
              let newDealerIndex = gameState.dealerIndex;
              if (isFirstHand) {
                newDealerIndex = playerIndex;
                setMatchState(prev => ({
                  ...prev,
                  matchDealerIndex: playerIndex,
                }));
              }
              
              const updatedGame: GameState = {
                ...gameState,
                trumpSuit: proposedTrumpSuit,
                dealerIndex: newDealerIndex,
                config: {
                  ...gameState.config,
                  trumpSuit: proposedTrumpSuit,
                },
                players: gameState.players.map((player, idx) => ({
                  ...player,
                  hand: newHands[idx],
                })),
              };
              setGameState(updatedGame);
            }
            
            // Show toast notification
            setDingZhuToastMessage(`玩家${playerIndex + 1} 用 ${proposedTrumpSuit}2 定了主`);
            setDingZhuToastVisible(true);
            setTimeout(() => {
              setDingZhuToastVisible(false);
            }, 2500);
            
            // CRITICAL: If AI player becomes dealer, we'll set isBottomSelectionPhase after dealing completes
            // This is handled in the dealing complete logic
            
            // Continue dealing (no more DingZhu prompts)
            setDealingIndex(prev => prev + 1);
          } else {
            console.log("[DEALING] AI player", playerIndex, "chose not to 定主 (only", candidateCount, "candidate trump cards)");
            setDingZhuDeclinedPlayers(prev => new Set([...prev, playerIndex]));
            // Continue dealing
            setDealingIndex(prev => prev + 1);
          }
        }
        
        return; // Don't execute the rest of the setTimeout callback
      }
      
      // Otherwise, continue dealing
      setDealingIndex(prev => prev + 1);
    }, DEAL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [isDealing, dealingIndex, dealingDeck, dealingHands, matchState, hasTrumpBeenChosen, dingZhuDeclinedPlayers, gameState]);

  // Legacy initializeGame function - now just starts the dealing process
  const initializeGame = (explicitDealerIndex?: number, tributePairs?: Array<{ from: number; to: number }>) => {
    // Create and shuffle full deck
    const fullDeck = createFullDeck();
    const shuffledDeck = shuffleDeck(fullDeck);

    // Start dealing animation
    const HAND_SIZE = 12;
    const TOTAL_HAND_CARDS = 4 * HAND_SIZE; // 48 cards to deal
    
    // Initialize dealing state
    // Create a temporary gameState so the table can render during dealing
    // This prevents being stuck on "游戏加载中" screen
    const tempGameState: GameState = createNewGame(
      ['p1', 'p2', 'p3', 'p4'],
      { trumpSuit: '♦', hasThreeFan: false, hasFiveFan: false },
      0
    );
    
    // Set empty hands initially - they will be filled during dealing animation
    const tempPlayers = tempGameState.players.map(p => ({ ...p, hand: [] }));
    const initialGameState: GameState = {
      ...tempGameState,
      players: tempPlayers,
      phase: 'DEAL', // CRITICAL: Ensure phase is DEAL, not ROUND_END
      currentTrick: [], // Ensure currentTrick is empty
      tricks: [], // Ensure tricks array is empty
    };
    
    setGameState(initialGameState);
    setHasGameState(true); // Mark that gameState exists (even if hands are empty)
    setIsDealing(true);
    setDealingIndex(0);
    setDealingDeck(shuffledDeck);
    setDealingHands([[], [], [], []]); // Start with empty hands
    // Reset DingZhu-related state when starting new game
    setHasTrumpBeenChosen(false);
    setHighlightDingZhuCard(null);
    setDingZhuDeclinedPlayers(new Set());
    setIsBottomRevealPhase(false);
    // CRITICAL: Reset all end-of-hand states when starting new game
    setHandFinished(false);
    setIsHandFinished(false);
    setIsTrickComplete(false);
    setFinalScores(null);
    setShowNextTrickButton(false);
    setTrickWinner(null);
    setLastTrickWinnerIndex(null);
    hasHandledEndOfHandRef.current = false; // Reset the ref
    
    console.log("[INITIALIZE_GAME] created initial gameState, starting dealing animation");
    
    // The actual dealing and game initialization will happen in the useEffect above
  };


  /**
   * Perform tribute (进贡) between two players
   * Exchanges highest trump from player A with lowest trump from player B
   * @param playerAHand Hand of player giving highest trump
   * @param playerBHand Hand of player giving lowest trump
   * @param trumpSuit Current trump suit
   * @param config Game config (for trump detection)
   * @returns Object with updated hands, or null if tribute cannot be performed
   */
  const performTribute = (
    playerAHand: Card[],
    playerBHand: Card[],
    trumpSuit: Suit,
    config: GameConfig
  ): { newAHand: Card[]; newBHand: Card[] } | null => {
    // Find all trump cards in each hand
    const aTrumps = playerAHand.filter(card => isTrump(card, trumpSuit, config));
    const bTrumps = playerBHand.filter(card => isTrump(card, trumpSuit, config));
    
    // If either player has no trump cards, skip tribute
    if (aTrumps.length === 0 || bTrumps.length === 0) {
      return null;
    }
    
    // Find highest trump in player A's hand (highest strength)
    let highestTrumpA = aTrumps[0];
    let maxStrengthA = cardStrength(highestTrumpA, trumpSuit, config, 0);
    for (let i = 1; i < aTrumps.length; i++) {
      const strength = cardStrength(aTrumps[i], trumpSuit, config, i);
      if (strength > maxStrengthA) {
        maxStrengthA = strength;
        highestTrumpA = aTrumps[i];
      }
    }
    
    // Find lowest trump in player B's hand (lowest strength)
    let lowestTrumpB = bTrumps[0];
    let minStrengthB = cardStrength(lowestTrumpB, trumpSuit, config, 0);
    for (let i = 1; i < bTrumps.length; i++) {
      const strength = cardStrength(bTrumps[i], trumpSuit, config, i);
      if (strength < minStrengthB) {
        minStrengthB = strength;
        lowestTrumpB = bTrumps[i];
      }
    }
    
    // Remove cards from original hands
    const newAHand = playerAHand.filter(
      card => !(card.suit === highestTrumpA.suit && card.rank === highestTrumpA.rank)
    );
    const newBHand = playerBHand.filter(
      card => !(card.suit === lowestTrumpB.suit && card.rank === lowestTrumpB.rank)
    );
    
    // Add exchanged cards
    newAHand.push(lowestTrumpB);
    newBHand.push(highestTrumpA);
    
    return { newAHand, newBHand };
  };

  // OLD initializeGame function removed - now handled by dealing animation useEffect above

  // Handle highlight animation completion - show DingZhu panel after animation
  const handleHighlightDingZhuCardDone = (playerId: number, cardId: string) => {
    // Safety guard: if trump has already been chosen, ignore this
    if (hasTrumpBeenChosen) {
      console.log("[HIGHLIGHT_DONE] Trump already chosen, ignoring highlight completion");
      setHighlightDingZhuCard(null);
      return;
    }

    // Ensure this is the card we're currently highlighting
    if (!highlightDingZhuCard) return;
    if (highlightDingZhuCard.playerId !== playerId || highlightDingZhuCard.cardId !== cardId) {
      return;
    }

    // Clear highlight and show DingZhu panel
    setHighlightDingZhuCard(null);
    setIsDingZhuPhase(true);
  };

  // Handle 定主 choice (can be called during dealing or after dealing)
  const handleDingZhuChoice = (chooseDingZhu: boolean) => {
    if (!gameState) return;
    
    // Use pendingDingZhuCard if we're in mid-dealing DingZhu, otherwise use firstTwoCandidate
    const candidate = pendingDingZhuCard && pendingDingZhuPlayerId !== null
      ? { playerIndex: pendingDingZhuPlayerId, suit: pendingDingZhuCard.suit as Suit }
      : firstTwoCandidate;
    
    if (!candidate) return;

    const isMidDealingDingZhu = pendingDingZhuPlayerId !== null && pendingDingZhuCard !== null;
    let newDealerIndex = gameState.dealerIndex;
    let newTrumpSuit = gameState.trumpSuit;

    const isFirstHand = matchState.matchDealerIndex === null;
    
    if (chooseDingZhu) {
      // User chose to 定主
      newTrumpSuit = candidate.suit;
      if (isFirstHand) {
        newDealerIndex = candidate.playerIndex; // First hand: candidate becomes dealer
        // Update match dealer
        setMatchState(prev => ({
          ...prev,
          matchDealerIndex: candidate.playerIndex,
        }));
      }
      // Otherwise, dealer stays the same (from matchState)
      
      // IMPORTANT: Mark that trump has been chosen IMMEDIATELY
      // This must be set before any state updates that might trigger re-renders
      setHasTrumpBeenChosen(true);
      
      console.log("[DINGZHU] Player", candidate.playerIndex, "chose to 定主 with suit", candidate.suit);
    } else {
      // User chose not to 定主
      // Add this player to declined set
      if (candidate.playerIndex !== null && candidate.playerIndex !== undefined) {
        setDingZhuDeclinedPlayers(prev => new Set([...prev, candidate.playerIndex]));
      }
      
      // If this is mid-dealing, we'll continue dealing and ask next player if they get a 2
      // If this is after all cards are dealt, use fallback (断电)
      if (!isMidDealingDingZhu) {
        // After dealing complete - simplified 断电
        const suits: Suit[] = ['♠', '♥', '♣', '♦'];
        newTrumpSuit = suits[Math.floor(Math.random() * suits.length)];
        if (isFirstHand) {
          newDealerIndex = 0; // First hand: Player 0 becomes dealer
          // Update match dealer
          setMatchState(prev => ({
            ...prev,
            matchDealerIndex: 0,
          }));
        }
      } else {
        // Mid-dealing: just resume dealing, don't set trump yet
        console.log("[DINGZHU] Player", candidate.playerIndex, "chose not to 定主, resuming dealing");
      }
    }
    
    // Clear DingZhu transient state
    setPendingDingZhuPlayerId(null);
    setPendingDingZhuCard(null);
    setIsDingZhuPhase(false);
    setHighlightDingZhuCard(null); // Clear highlight when DingZhu choice is made
    
    // If mid-dealing and player chose 定主, we need to update gameState and resume dealing
    if (isMidDealingDingZhu) {
      if (chooseDingZhu) {
        // Update gameState with trump suit and dealer
        const updatedGame: GameState = {
          ...gameState,
          trumpSuit: newTrumpSuit,
          dealerIndex: newDealerIndex,
          config: {
            ...gameState.config,
            trumpSuit: newTrumpSuit,
          },
        };
        setGameState(updatedGame);
        
        // IMPORTANT: Set hasTrumpBeenChosen BEFORE resuming dealing
        // This ensures the dealing logic will skip any further DingZhu triggers
        setHasTrumpBeenChosen(true);
        
        // Resume dealing (no more DingZhu prompts will appear because hasTrumpBeenChosen is true)
        setIsDealing(true);
        setDealingIndex(prev => prev + 1); // Continue from next card
      } else {
        // Resume dealing without setting trump
        setIsDealing(true);
        setDealingIndex(prev => prev + 1); // Continue from next card
      }
      return; // Don't execute the rest of the function for mid-dealing case
    }

    // IMPORTANT: Ensure dealer has bottom cards in their hand
    // (This should have been done in initializeGame, but ensure it's done here too)
    const dealer = gameState.players[newDealerIndex];
    const bottomCardsToAdd = bottomCards.length > 0 ? bottomCards : [];
    const dealerHandWithBottom = bottomCardsToAdd.length > 0 && dealer.hand.length === 12
      ? [...dealer.hand, ...bottomCardsToAdd]
      : dealer.hand;

    // Update game state with new trump and dealer
    // IMPORTANT: Set currentPlayerIndex to dealerIndex so dealer leads first trick
    const updatedPlayers = gameState.players.map((player, index) => {
      if (index === newDealerIndex) {
        return {
          ...player,
          hand: dealerHandWithBottom,
        };
      }
      return player;
    });

    // Perform pending tribute now that trump suit is determined
    let finalPlayers = updatedPlayers;
    if (pendingTributePairs.length > 0) {
      // Create updated config with new trump suit for tribute detection
      const updatedConfig: GameConfig = {
        ...gameState.config,
        trumpSuit: newTrumpSuit,
      };
      
      // Collect tribute visualization data
      const visualizationData: Array<{ from: number; to: number; fromCard: Card; toCard: Card }> = [];
      
      for (const pair of pendingTributePairs) {
        // Find cards that will be exchanged (before actually exchanging)
        const aTrumps = finalPlayers[pair.from].hand.filter(card => isTrump(card, newTrumpSuit, updatedConfig));
        const bTrumps = finalPlayers[pair.to].hand.filter(card => isTrump(card, newTrumpSuit, updatedConfig));
        
        if (aTrumps.length > 0 && bTrumps.length > 0) {
          // Find highest trump in player A's hand
          let highestTrumpA = aTrumps[0];
          let maxStrengthA = cardStrength(highestTrumpA, newTrumpSuit, updatedConfig, 0);
          for (let i = 1; i < aTrumps.length; i++) {
            const strength = cardStrength(aTrumps[i], newTrumpSuit, updatedConfig, i);
            if (strength > maxStrengthA) {
              maxStrengthA = strength;
              highestTrumpA = aTrumps[i];
            }
          }
          
          // Find lowest trump in player B's hand
          let lowestTrumpB = bTrumps[0];
          let minStrengthB = cardStrength(lowestTrumpB, newTrumpSuit, updatedConfig, 0);
          for (let i = 1; i < bTrumps.length; i++) {
            const strength = cardStrength(bTrumps[i], newTrumpSuit, updatedConfig, i);
            if (strength < minStrengthB) {
              minStrengthB = strength;
              lowestTrumpB = bTrumps[i];
            }
          }
          
          visualizationData.push({
            from: pair.from,
            to: pair.to,
            fromCard: highestTrumpA,
            toCard: lowestTrumpB,
          });
        }
      }
      
      // Show tribute visualization if there are any exchanges
      if (visualizationData.length > 0) {
        setTributeVisualizationData(visualizationData);
        setShowTributeVisualization(true);
        
        // Hide visualization after 2 seconds
        setTimeout(() => {
          setShowTributeVisualization(false);
          setTributeVisualizationData([]);
        }, 2000);
      }
      
      // Perform actual tribute
      for (const pair of pendingTributePairs) {
        const tributeResult = performTribute(
          finalPlayers[pair.from].hand,
          finalPlayers[pair.to].hand,
          newTrumpSuit,
          updatedConfig
        );
        
        if (tributeResult) {
          // Update hands with exchanged cards
          finalPlayers = finalPlayers.map((player, index) => {
            if (index === pair.from) {
              return { ...player, hand: tributeResult.newAHand };
            }
            if (index === pair.to) {
              return { ...player, hand: tributeResult.newBHand };
            }
            return player;
          });
        }
      }
      // Clear pending tribute pairs after performing
      setPendingTributePairs([]);
    }

    const updatedGame: GameState = {
      ...gameState,
      players: finalPlayers,
      trumpSuit: newTrumpSuit,
      dealerIndex: newDealerIndex,
      currentPlayerIndex: newDealerIndex, // Dealer leads the first trick
      config: {
        ...gameState.config,
        trumpSuit: newTrumpSuit,
      },
      finalBottomCards: [],
      phase: 'PLAY_TRICK', // SIMPLIFIED: Go directly to play phase, first trick is bottom card play
      landlordId: finalPlayers[newDealerIndex].id, // Explicit landlord ID
      landlordDiscardSelection: [], // Initialize empty selection
      tricks: [], // Start with empty tricks array (first trick will be bottom card play)
      currentTrick: [], // Start with empty current trick
    };

    // CRITICAL: Update state in correct order to ensure phase and flags are set correctly
    // First, clear DingZhu phase and set bottom selection phase
    setIsDingZhuPhase(false);
    setIsBottomSelectionPhase(true); // Enable bottom card selection
    setIsBottomRevealPhase(false);
    setIsPreFanPhase(false);
    setSelectedBottomCards([]); // Clear any old selection
    setIsFirstGame(false); // After first game, dealer persists

    // Then set game state - dealer leads the first trick (which is bottom card play)
    setGameState(updatedGame);

    // Show toast notification for ding-zhu decision
    const dingZhuPlayer = chooseDingZhu ? firstTwoCandidate.playerIndex : 0;
    const dingZhuSuit = chooseDingZhu ? firstTwoCandidate.suit : newTrumpSuit;
    setDingZhuToastMessage(`玩家${dingZhuPlayer + 1} 用 ${dingZhuSuit}2 定了主`);
    setDingZhuToastVisible(true);
    
    // Hide toast after 2.5 seconds
    setTimeout(() => {
      setDingZhuToastVisible(false);
    }, 2500);
    
    console.log("[ENTER_BOTTOM_SELECTION] Phase set to PLAY_TRICK, isBottomSelectionPhase = true", {
      phase: 'PLAY_TRICK',
      dealerIndex: newDealerIndex,
      currentPlayerIndex: newDealerIndex,
      isBottomSelectionPhase: true,
      isDingZhuPhase: false,
    });
  };

  // AI strategy for selecting bottom cards
  // CRITICAL: Use current gameState from component state, not parameter (to avoid stale state)
  const handleAiBottomSelection = (dealerIndex: number, numBottom: number) => {
    // CRITICAL: Get the latest gameState using a function to avoid stale closures
    // Use setGameState to get the current state
    setGameState(currentState => {
      if (!currentState) {
        console.error("[BOTTOM_SELECTION] Cannot select bottom cards: gameState is null");
        return currentState;
      }
      
      // Verify we're still in bottom selection phase
      // Note: Bottom selection now happens in PLAY_TRICK phase with isBottomSelectionPhase flag
      // Check if it's the first trick (tricks.length === 0) and dealer is leading
      const isFirstTrick = currentState.tricks.length === 0 && currentState.currentTrick.length === 0;
      const isDealerTurn = currentState.currentPlayerIndex === dealerIndex;
      if (currentState.dealerIndex !== dealerIndex || !isFirstTrick || !isDealerTurn) {
        console.warn("[BOTTOM_SELECTION] Conditions not met for bottom selection, aborting", {
          phase: currentState.phase,
          expectedDealerIndex: dealerIndex,
          actualDealerIndex: currentState.dealerIndex,
          isFirstTrick,
          isDealerTurn,
          currentPlayerIndex: currentState.currentPlayerIndex,
          tricksLength: currentState.tricks.length,
          currentTrickLength: currentState.currentTrick.length,
        });
        return currentState;
      }
      
      // Use currentState instead of gameState from closure
      const stateToUse = currentState;
      
      const dealer = stateToUse.players[dealerIndex];
      if (!dealer || !dealer.hand || dealer.hand.length === 0) {
        console.error("[BOTTOM_SELECTION] Dealer not found or has no cards", {
          dealerIndex,
          dealerExists: !!dealer,
          handLength: dealer?.hand?.length,
        });
        return currentState;
      }
      const hand = [...dealer.hand];
      
      // Simple strategy: prefer non-point cards (not 5, 10, or K)
      // Within that, choose lowest-ranked cards
      const isPointCard = (card: Card): boolean => {
        return card.rank === 5 || card.rank === 10 || card.rank === 13; // 5, 10, K
      };
      
      // Separate point cards and non-point cards
      const pointCards: Card[] = [];
      const nonPointCards: Card[] = [];
      
      for (const card of hand) {
        if (isPointCard(card)) {
          pointCards.push(card);
        } else {
          nonPointCards.push(card);
        }
      }
      
      // Sort non-point cards by rank (lower rank first)
      nonPointCards.sort((a, b) => {
        const rankA = typeof a.rank === 'number' ? a.rank : 0;
        const rankB = typeof b.rank === 'number' ? b.rank : 0;
        return rankA - rankB;
      });
      
      // Choose 6 cards: only non-point cards (底牌不能扣分)
      const selectedBottom: Card[] = [];
      if (nonPointCards.length >= numBottom) {
        selectedBottom.push(...nonPointCards.slice(0, numBottom));
      } else {
        // If not enough non-point cards, use all available non-point cards
        // This should rarely happen, but handle gracefully
        selectedBottom.push(...nonPointCards);
        // Note: In real game, dealer should have enough non-point cards
        // For now, we'll use what's available
      }
      
      // CRITICAL: Validate that we have exactly 6 cards
      if (selectedBottom.length !== 6) {
        console.error("[BOTTOM_SELECTION] AI selected wrong number of bottom cards", {
          dealerIndex,
          selectedBottomCount: selectedBottom.length,
          required: 6,
          dealerHandSize: hand.length,
          nonPointCardsCount: nonPointCards.length,
          pointCardsCount: pointCards.length,
        });
        // Try to fill with point cards if needed (shouldn't happen, but handle gracefully)
        if (selectedBottom.length < 6 && hand.length >= 6) {
          const remainingNeeded = 6 - selectedBottom.length;
          const additionalCards = hand.filter(card => 
            !selectedBottom.some(sel => sel.suit === card.suit && sel.rank === card.rank)
          ).slice(0, remainingNeeded);
          selectedBottom.push(...additionalCards);
          console.warn("[BOTTOM_SELECTION] Added additional cards to reach 6", {
            additionalCount: additionalCards.length,
            finalCount: selectedBottom.length,
          });
        }
      }
      
      console.log("[BOTTOM_SELECTION] AI selecting bottom cards", {
        dealerIndex,
        selectedBottomCount: selectedBottom.length,
        currentPlayerIndex: stateToUse.currentPlayerIndex,
        gameStateDealerIndex: stateToUse.dealerIndex,
        dealerHandSizeBefore: hand.length,
        phase: stateToUse.phase,
      });
      
      // SIMPLIFIED: Treat bottom discard as playing 6 cards in one trick
      // Remove the 6 cards from dealer's hand
      let newDealerHand = [...dealer.hand];
      selectedBottom.forEach(cardToRemove => {
        const cardIndex = newDealerHand.findIndex(
          c => c.suit === cardToRemove.suit && c.rank === cardToRemove.rank
        );
        if (cardIndex !== -1) {
          newDealerHand.splice(cardIndex, 1);
        } else {
          console.warn("[BOTTOM_SELECTION] Card not found in dealer hand", {
            card: `${cardToRemove.suit}${cardToRemove.rank}`,
            dealerHandSize: dealer.hand.length,
          });
        }
      });
      
      // Validate that we removed exactly 6 cards
      if (newDealerHand.length !== dealer.hand.length - 6) {
        console.error("[BOTTOM_SELECTION] Card removal mismatch", {
          originalHandSize: dealer.hand.length,
          newHandSize: newDealerHand.length,
          expectedNewSize: dealer.hand.length - 6,
          selectedBottomCount: selectedBottom.length,
        });
      }
      
      // Update dealer's hand
      const newPlayers = stateToUse.players.map((player, index) => {
        if (index === dealerIndex) {
          return { ...player, hand: newDealerHand };
        }
        return player;
      });
      
      // Create a special "bottom discard trick" - dealer plays 6 cards, others skip
      const bottomDiscardTrick: TrickResult = {
        cards: selectedBottom.map(card => ({
          card,
          playerId: dealer.id,
          playerIndex: dealerIndex,
        })),
        winnerIndex: dealerIndex,
        winnerId: dealer.id,
        points: 0, // No points in bottom discard
      };
      
      // Add history event
      const historyEvent: HistoryEvent = {
        id: `bottom-discard-ai-${Date.now()}`,
        type: 'LANDLORD_DISCARD',
        playerId: dealer.id,
        cards: selectedBottom,
        timestamp: Date.now(),
      };
      
      // Update game state - move to play phase, dealer leads first real trick
      const finalGameState: GameState = {
        ...stateToUse,
        players: newPlayers,
        bottomCards: selectedBottom,
        finalBottomCards: selectedBottom,
        tricks: [...(stateToUse.tricks || []), bottomDiscardTrick],
        history: [...(stateToUse.history || []), historyEvent],
        phase: 'PLAY_TRICK',
        currentPlayerIndex: dealerIndex, // Dealer leads first real trick
        currentTrick: [],
        landlordDiscardSelection: [],
      };
      
      // Update state flags outside of setGameState
      // CRITICAL: Set the same flags as player 0 bottom discard to ensure UI consistency
      setBottomCards(selectedBottom);
      setIsBottomSelectionPhase(false);
      setIsDingZhuPhase(false);
      setPendingDingZhuPlayerId(null);
      setPendingDingZhuCard(null);
      setHighlightDingZhuCard(null);
      setHasTrumpBeenChosen(true);
      setIsBottomRevealPhase(false);
      // CRITICAL: Set trick complete flags so UI shows "next trick" button
      setIsTrickComplete(true);
      setLastTrickWinnerIndex(dealerIndex);
      setTrickWinner(`玩家${dealerIndex + 1}`);
      setShowNextTrickButton(true);
      
      console.log("[BOTTOM_SELECTION] AI bottom selection completed", {
        dealerIndex,
        selectedBottomCount: selectedBottom.length,
        dealerHandSizeBefore: dealer.hand.length,
        dealerHandSizeAfter: newDealerHand.length,
        phase: finalGameState.phase,
        tricksLength: finalGameState.tricks.length,
      });
      
      return finalGameState;
    });
  };

  // Utility: force resolve round when all cards are played but state machine didn't finish
  const forceResolveRound = (state?: GameState) => {
    if (!state) return;
    console.log('[FORCE_RESOLVE_ROUND] Forcing round end', {
      tricksCount: state.tricks?.length,
      currentTrickLength: state.currentTrick?.length,
    });
    setIsHandFinished(true);
    setHandFinished(true);
    setIsTrickComplete(true);
    const finishedState: GameState = {
      ...state,
      phase: 'ROUND_END',
      currentTrick: [],
    };
    setGameState(finishedState);
  };

  // Handle bottom card selection for human dealer (toggle-based)
  // RESTORED: Use isBottomSelectionPhase state check (old working logic)
  const handleBottomCardToggle = (card: Card) => {
    // Check both state variable and phase for compatibility
    const isInBottomSelection =
      isBottomSelectionPhase || (gameState && gameState.phase === 'DISCARD_BOTTOM');

    if (!isInBottomSelection) {
      console.log("[HANDLE_BOTTOM_TOGGLE] Not in bottom selection phase", {
        isBottomSelectionPhase,
        phase: gameState?.phase,
      });
      return;
    }
    
    // Also check dealer index
    if (!gameState || gameState.dealerIndex !== 0) {
      return;
    }
    
    const isSelected = selectedBottomCards.some(
      c => c.suit === card.suit && c.rank === card.rank
    );
    
    if (isSelected) {
      // Deselect: Remove from selection (always allowed, even if 6 cards selected)
      setSelectedBottomCards(prev => 
        prev.filter(c => !(c.suit === card.suit && c.rank === card.rank))
      );
    } else {
      // Select: Add to selection (only if less than 6 cards)
      if (selectedBottomCards.length >= 6) {
        return; // Already have 6 cards, cannot add more
      }
      
      // Check if card is a scoring card (底牌不能扣分)
      const cardPoints = getCardPoints(card);
      if (cardPoints > 0) {
        Alert.alert('无效选择', '底牌不能扣分（不能选择 5、10、K）');
        return;
      }
      
      // Add to selection
      setSelectedBottomCards(prev => [...prev, card]);
    }
  };

  // Finish bottom selection phase - comprehensive state transition
  const finishBottomSelection = (gameState: GameState, selectedBottomCards: Card[]): GameState => {
    const dealerIndex = gameState.dealerIndex;
    const dealer = gameState.players[dealerIndex];
    
    // Validate: selectedBottomCards must have exactly 6 cards
    if (selectedBottomCards.length !== 6) {
      console.warn("[FINISH_BOTTOM_SELECTION] Warning: selectedBottomCards.length !== 6", {
        length: selectedBottomCards.length,
        cards: selectedBottomCards,
      });
    }
    
    // Use unified function from engine
    const updatedGame = applyLandlordDiscard(gameState, dealer.id, selectedBottomCards);
    
    console.log("[FINISH_BOTTOM_SELECTION] Bottom selection finalized", {
      dealerIndex,
      dealerId: dealer.id,
      selectedBottomCardsCount: selectedBottomCards.length,
      finalBottomCardsSet: !!updatedGame.finalBottomCards,
      finalBottomCardsLength: updatedGame.finalBottomCards?.length || 0,
      historyEventAdded: true,
      historyLength: updatedGame.history?.length || 0,
    });
    
    return updatedGame;
  };

  // Confirm bottom card selection - SIMPLIFIED: Treat as playing 6 cards in one trick
  const handleConfirmBottomSelection = () => {
    if (!gameState || selectedBottomCards.length !== 6) {
      Alert.alert('选择不足', `请选择 6 张牌（当前已选择 ${selectedBottomCards.length} 张）`);
      return;
    }
    
    console.log("[BOTTOM_SELECTION] Confirming bottom selection - treating as playing 6 cards", {
      selectedBottomCardsCount: selectedBottomCards.length,
      dealerIndex: gameState.dealerIndex,
      currentPlayerIndex: gameState.currentPlayerIndex,
    });
    
    const dealerIndex = gameState.dealerIndex;
    const dealer = gameState.players[dealerIndex];
    
    // Remove the 6 cards from dealer's hand
    let newDealerHand = [...dealer.hand];
    selectedBottomCards.forEach(cardToRemove => {
      const cardIndex = newDealerHand.findIndex(
        c => c.suit === cardToRemove.suit && c.rank === cardToRemove.rank
      );
      if (cardIndex !== -1) {
        newDealerHand.splice(cardIndex, 1);
      }
    });
    
    // Update dealer's hand
    const newPlayers = gameState.players.map((player, index) => {
      if (index === dealerIndex) {
        return { ...player, hand: newDealerHand };
      }
      return player;
    });
    
    // Create a special "bottom discard trick" - dealer plays 6 cards, others skip
    // This trick doesn't count for scoring, just removes the cards
    const bottomDiscardTrick: TrickResult = {
      cards: selectedBottomCards.map(card => ({
        card,
        playerId: dealer.id,
        playerIndex: dealerIndex,
      })),
      winnerIndex: dealerIndex, // Dealer "wins" this trick (but it doesn't matter)
      winnerId: dealer.id,
      points: 0, // No points in bottom discard
    };
    
    console.log("[BOTTOM_SELECTION] Human dealer bottom discard", {
      dealerIndex,
      selectedBottomCount: selectedBottomCards.length,
      dealerHandSizeBefore: dealer.hand.length,
      dealerHandSizeAfter: newDealerHand.length,
      bottomDiscardTrickCardsCount: bottomDiscardTrick.cards.length,
    });
    
    // Add history event
    const historyEvent: HistoryEvent = {
      id: `bottom-discard-${Date.now()}`,
      type: 'LANDLORD_DISCARD',
      playerId: dealer.id,
      cards: selectedBottomCards,
      timestamp: Date.now(),
    };
    
    // Update game state - move to play phase, dealer leads first real trick
    const finalGameState: GameState = {
      ...gameState,
      players: newPlayers,
      bottomCards: selectedBottomCards,
      finalBottomCards: selectedBottomCards,
      tricks: [...(gameState.tricks || []), bottomDiscardTrick], // Add bottom discard as a trick
      history: [...(gameState.history || []), historyEvent],
      phase: 'PLAY_TRICK', // Move to play phase
      currentPlayerIndex: dealerIndex, // Dealer leads first real trick
      currentTrick: [], // Start with empty trick
      landlordDiscardSelection: [], // Clear selection
    };
    
    // Update all state flags
    setGameState(finalGameState);
    setBottomCards(selectedBottomCards); // Update displayed bottom cards (local state)
    setSelectedBottomCards([]);
    
    // CRITICAL: Clear bottom selection phase
    setIsBottomSelectionPhase(false);
    setIsDingZhuPhase(false);
    
    // Clear transient DingZhu states
    setPendingDingZhuPlayerId(null);
    setPendingDingZhuCard(null);
    setHighlightDingZhuCard(null);
    
    // Ensure hasTrumpBeenChosen is true
    setHasTrumpBeenChosen(true);
    
    // Skip bottom reveal phase - go directly to play
    setIsBottomRevealPhase(false);
    
    console.log("[BOTTOM_SELECTION] Bottom selection completed, entering reveal phase", {
      isBottomSelectionPhase: false,
      isBottomRevealPhase: true,
      isDingZhuPhase: false,
      currentPlayerIndex: updatedGame.currentPlayerIndex,
      dealerIndex: updatedGame.dealerIndex,
      dealerHandSize: updatedGame.players[updatedGame.dealerIndex].hand.length,
      finalBottomCardsCount: updatedGame.finalBottomCards?.length || 0,
    });
    
    // After bottom selection, check for 三反/五反 eligibility
    // Note: This will be checked again after bottom reveal phase ends
    setTimeout(() => {
      const player0 = updatedGame.players[0];
      if (player0 && player0.hand) {
        checkFanEligibility(player0.hand);
        // Only show pre-fan phase if player has eligible cards
        const rank3Count = player0.hand.filter(c => c.rank === 3).length;
        const rank5Count = player0.hand.filter(c => c.rank === 5 && c.suit !== '♦').length;
        if (rank3Count >= 3 || rank5Count >= 3) {
          setIsPreFanPhase(true);
        } else {
          setIsPreFanPhase(false);
        }
      } else {
        setIsPreFanPhase(false);
      }
    }, 100);
  };

  // End bottom reveal phase and start normal play
  const endBottomRevealAndStartPlay = () => {
    if (!gameState) return;
    
    console.log("[BOTTOM_REVEAL] Ending reveal phase, starting normal play");
    
    // Clear bottom reveal phase and all blocking phases
    setIsBottomRevealPhase(false);
    setIsDingZhuPhase(false); // FIXED: Ensure DingZhu phase is cleared
    setIsBottomSelectionPhase(false); // FIXED: Ensure bottom selection phase is cleared
    
    // Ensure currentPlayerIndex is set to dealer for normal play
    const dealerIndex = gameState.dealerIndex;
    const updatedGame: GameState = {
      ...gameState,
      currentPlayerIndex: dealerIndex,
      phase: 'PLAY_TRICK', // Explicit phase: normal play
    };
    setGameState(updatedGame);
    
    // Check for 三反/五反 eligibility after reveal
    setTimeout(() => {
      const player0 = gameState.players[0];
      if (player0 && player0.hand) {
        checkFanEligibility(player0.hand);
        const rank3Count = player0.hand.filter(c => c.rank === 3).length;
        const rank5Count = player0.hand.filter(c => c.rank === 5 && c.suit !== '♦').length;
        if (rank3Count >= 3 || rank5Count >= 3) {
          setIsPreFanPhase(true);
        } else {
          setIsPreFanPhase(false);
        }
      } else {
        setIsPreFanPhase(false);
      }
    }, 100);
  };

  // Auto-select bottom cards for AI landlords
  // CRITICAL: This ensures bot landlords always go through bottom card discard step
  // Bottom selection now happens in PLAY_TRICK phase with isBottomSelectionPhase flag
  useEffect(() => {
    if (!gameState) return;
    
    // Check if it's bottom selection phase (first trick, dealer's turn)
    const isFirstTrick = gameState.tricks.length === 0 && gameState.currentTrick.length === 0;
    const isDealerTurn = gameState.currentPlayerIndex === gameState.dealerIndex;
    const isInBottomSelection = isBottomSelectionPhase && isFirstTrick && isDealerTurn;
    if (!isInBottomSelection) return;
    
    // Only trigger for AI landlords (not player 0)
    if (gameState.dealerIndex === 0) return;
    
    console.log("[BOTTOM_SELECTION] Auto-selecting bottom cards for AI landlord", {
      dealerIndex: gameState.dealerIndex,
      phase: gameState.phase,
      isBottomSelectionPhase,
      dealerHandSize: gameState.players[gameState.dealerIndex]?.hand?.length,
    });
    
    // Small delay to ensure state is fully updated
    // CRITICAL: Call handleAiBottomSelection directly - it will use setGameState to get latest state
    // Check for AI bottom selection: first trick, dealer is AI (not player 0), and it's dealer's turn
    const timer = setTimeout(() => {
      if (gameState && gameState.dealerIndex !== 0) {
        const isFirstTrick = gameState.tricks.length === 0 && gameState.currentTrick.length === 0;
        const isDealerTurn = gameState.currentPlayerIndex === gameState.dealerIndex;
        if (isFirstTrick && isDealerTurn && isBottomSelectionPhase) {
          console.log("[BOTTOM_SELECTION] Calling handleAiBottomSelection", {
            dealerIndex: gameState.dealerIndex,
            phase: gameState.phase,
            isFirstTrick,
            isDealerTurn,
            isBottomSelectionPhase,
            dealerHandSize: gameState.players[gameState.dealerIndex]?.hand?.length,
          });
          handleAiBottomSelection(gameState.dealerIndex, 6);
        } else {
          console.warn("[BOTTOM_SELECTION] Conditions not met for AI bottom selection", {
            hasGameState: !!gameState,
            phase: gameState?.phase,
            dealerIndex: gameState?.dealerIndex,
            isFirstTrick,
            isDealerTurn,
            isBottomSelectionPhase,
            currentPlayerIndex: gameState?.currentPlayerIndex,
          });
        }
      } else {
        console.warn("[BOTTOM_SELECTION] Conditions not met for AI bottom selection", {
          hasGameState: !!gameState,
          phase: gameState?.phase,
          dealerIndex: gameState?.dealerIndex,
        });
      }
    }, 500); // Increased delay to ensure state is stable
    
    return () => clearTimeout(timer);
  }, [gameState?.phase, gameState?.dealerIndex, gameState?.currentPlayerIndex, gameState?.tricks?.length, gameState?.currentTrick?.length, isBottomSelectionPhase, gameState]);

  // Auto-transition from bottom reveal to normal play after 2 seconds
  useEffect(() => {
    if (!isBottomRevealPhase) return;
    
    console.log("[BOTTOM_REVEAL] Auto-transition timer started");
    
    const timer = setTimeout(() => {
      endBottomRevealAndStartPlay();
    }, 2000); // 2 seconds delay
    
    return () => clearTimeout(timer);
  }, [isBottomRevealPhase, gameState]);

  // Check if Player 1 has at least three cards of rank 3 or 5
  const checkFanEligibility = (player1Hand: Card[]) => {
    const rank3Count = player1Hand.filter(c => c.rank === 3).length;
    const rank5Count = player1Hand.filter(c => c.rank === 5 && c.suit !== '♦').length; // Exclude ♦5
    
    setCanThreeFan(rank3Count >= 3);
    setCanFiveFan(rank5Count >= 3);
    
    // Only show pre-fan phase if player actually has enough cards
    // If neither fan is available, skip the phase entirely
    if (rank3Count < 3 && rank5Count < 3) {
      setIsPreFanPhase(false);
    }
  };

  // Helper function to check if a card is trump
  const isTrumpCard = (card: Card, config: GameConfig): boolean => {
    return isTrump(card, gameState?.trumpSuit ?? trumpSuit, config);
  };

  /**
   * Sort hand cards for display into logical groups:
   * 1. 常主 (global trumps: ♦5, BJ, SJ, ♠Q, all J, all 2, 三反/五反)
   * 2. 定主花色 (trump suit cards that are not global trumps)
   * 3. 副牌 (non-trump suits)
   * Within each group, sort by rank descending (A, K, Q, J, 10, ..., 2)
   */
  const sortHandForDisplay = (hand: Card[], config: GameConfig, trumpSuit: Suit, revealedFanCards: Card[]): Card[] => {
    // Safety check: handle empty or null hand
    if (!hand || hand.length === 0) {
      return [];
    }
    
    // Categorize cards: 1 = global trump, 2 = trump suit, 3 = side suits
    const categorized = hand.map(card => {
      let category = 3; // Default: side suit
      
      // Check if it's a global trump (常主)
      if (isFixedTrump(card)) {
        category = 1;
      } else if (isFanTrump(card, config)) {
        category = 1;
      } else if (isJTrump(card, trumpSuit)) {
        category = 1;
      } else if (is2Trump(card, trumpSuit)) {
        category = 1;
      } else if (card.suit === trumpSuit && card.suit !== 'JOKER') {
        // Trump suit card (but not a global trump)
        category = 2;
      } else {
        // Side suit (non-trump)
        category = 3;
      }
      
      return { card, category };
    });
    
    // Sort by category, then by suit order, then by rank descending
    categorized.sort((a, b) => {
      // First: category (1 < 2 < 3)
      if (a.category !== b.category) {
        return a.category - b.category;
      }
      
      // Within same category: sort by suit order (for side suits and trump suit)
      if (a.category === 2 || a.category === 3) {
        const suitOrder: Record<Suit, number> = { '♠': 0, '♥': 1, '♣': 2, '♦': 3, 'JOKER': -1 };
        const suitA = suitOrder[a.card.suit] ?? 99;
        const suitB = suitOrder[b.card.suit] ?? 99;
        if (suitA !== suitB) {
          return suitA - suitB;
        }
      }
      
      // For category 1 (global trumps), sort by strength order:
      // ♦5 > 五反 > 三反 > BJ > SJ > ♠Q > J (trump suit) > J (others) > 2 (trump suit) > 2 (others)
      if (a.category === 1) {
        const strengthA = cardStrength(a.card, trumpSuit, config);
        const strengthB = cardStrength(b.card, trumpSuit, config);
        if (strengthA !== strengthB) {
          return strengthB - strengthA; // Descending order
        }
      }
      
      // Finally: rank descending (higher rank = stronger)
      const rankA = typeof a.card.rank === 'number' ? a.card.rank : (a.card.rank === 'BJ' ? 15 : 14);
      const rankB = typeof b.card.rank === 'number' ? b.card.rank : (b.card.rank === 'BJ' ? 15 : 14);
      return rankB - rankA; // Descending order
    });
    
    return categorized.map(item => item.card);
  };

  // Handle fan selection
  const handleSelectFan = (fanType: 'three' | 'five' | 'none') => {
    if (!gameState) return;

    const player0 = gameState.players[0];
    if (!player0 || !player0.hand) {
      console.error('handleSelectFan: Player 0 or hand not found');
      return;
    }
    
    let revealedCards: Card[] = [];

    if (fanType === 'three') {
      // Get all 3s from player's hand
      revealedCards = player0.hand.filter(c => c.rank === 3);
    } else if (fanType === 'five') {
      // Get all 5s (except ♦5) from player's hand
      revealedCards = player0.hand.filter(c => c.rank === 5 && c.suit !== '♦');
    }

    const newConfig: GameConfig = {
      ...gameState.config,
      hasThreeFan: fanType === 'three',
      hasFiveFan: fanType === 'five',
    };

    const updatedState: GameState = {
      ...gameState,
      config: newConfig,
    };

    setGameState(updatedState);
    setRevealedFanCards(revealedCards);
    setIsPreFanPhase(false);
    // After fan selection, useEffect will automatically handle AI turn if needed
  };

  /**
   * Play multiple cards for AI player in a rui-pai trick
   */
  const playMultipleCardsForAI = (cardsToPlay: Card[], playerIndex: number) => {
    if (!gameState || cardsToPlay.length === 0) return;
    
    // Safety check: ensure playerIndex is valid
    if (playerIndex < 0 || playerIndex >= gameState.players.length) {
      console.error('playMultipleCardsForAI: Invalid playerIndex', playerIndex);
      return;
    }
    
    const player = gameState.players[playerIndex];
    if (!player) {
      console.error('playMultipleCardsForAI: Player not found', playerIndex);
      return;
    }
    
    // Safety check: ensure player has hand
    if (!player.hand) {
      console.error('playMultipleCardsForAI: Player has no hand', playerIndex);
      return;
    }
    
    const playerId = player.id;
    
    // Remove all cards from player's hand
    let newHand = [...player.hand];
    const newPlayers = [...gameState.players];
    
    cardsToPlay.forEach(card => {
      const cardIndex = newHand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
      if (cardIndex !== -1) {
        newHand.splice(cardIndex, 1);
      }
    });
    
    newPlayers[playerIndex] = {
      ...player,
      hand: newHand,
    };
    
    // Add all cards to current trick as PlayedCard entries
    const newCurrentTrick = [...gameState.currentTrick];
    cardsToPlay.forEach(card => {
      newCurrentTrick.push({
        card,
        playerId,
        playerIndex,
      });
    });
    
    // Check if trick is complete: all 4 players have played
    const uniquePlayers = new Set(newCurrentTrick.map(pc => pc.playerIndex));
    const isTrickComplete = uniquePlayers.size === 4;
    
    if (isTrickComplete) {
      // Determine winner for trick (handles both single-card and rui-pai)
      const leaderIndex = newCurrentTrick[0].playerIndex;
      const winnerIndex = determineTrickWinner(newCurrentTrick, gameState, leaderIndex);
      
      // Calculate points
      const points = newCurrentTrick.reduce(
        (sum, pc) => sum + getCardPoints(pc.card),
        0
      );
      
      // Create trick result
      const trickResult: TrickResult = {
        cards: newCurrentTrick,
        winnerIndex,
        winnerId: gameState.players[winnerIndex].id,
        points,
      };
      
      // Update scores
      const dealerIndex = gameState.dealerIndex;
      const dealerTeamIndices = [dealerIndex, (dealerIndex + 2) % 4];
      const isDealerTeam = dealerTeamIndices.includes(winnerIndex);
      const newScores = { ...gameState.scores };
      if (isDealerTeam) {
        newScores.dealerTeam += points;
      } else {
        newScores.nonDealerTeam += points;
      }
      
      // Set pause state - keep cards visible
      setIsTrickComplete(true);
      setLastTrickWinnerIndex(winnerIndex);
      setTrickWinner(`玩家${winnerIndex + 1}`);
      setShowNextTrickButton(true);
      
      // Update game state but keep the trick visible for display
      const updatedState: GameState = {
        ...gameState,
        players: newPlayers,
        currentPlayerIndex: winnerIndex,
        currentTrick: newCurrentTrick, // Keep visible
        tricks: [...gameState.tricks, trickResult],
        scores: newScores,
      };
      
      setGameState(updatedState);
    } else {
      // Trick not complete - advance to next player
      const nextPlayerIndex = (playerIndex + 1) % 4;
      const updatedState: GameState = {
        ...gameState,
        players: newPlayers,
        currentTrick: newCurrentTrick,
        currentPlayerIndex: nextPlayerIndex,
      };
      
      setGameState(updatedState);
    }
  };

  // Auto-play for AI players and player 0 when auto-play is enabled
  useEffect(() => {
    console.log('[USE_EFFECT_AUTO_PLAY] triggered', {
      hasGameState: !!gameState,
      handFinished,
      isTrickComplete,
      isHandFinished,
      isDingZhuPhase,
      isBottomSelectionPhase,
      currentPlayerIndex: gameState?.currentPlayerIndex,
    });

    // Don't auto-play if game is not ready or in a blocking phase
    // CRITICAL: Check isHandFinished FIRST to prevent any operations after game ends
    // CRITICAL: isBottomSelectionPhase overrides blocking phases (allows bottom card play)
    // Use phase system to check for blocking phases
    if (!gameState || handFinished || isTrickComplete || isHandFinished) {
      console.log('[USE_EFFECT_AUTO_PLAY] early return: game finished or trick complete');
      return;
    }
    
    // CRITICAL: Don't auto-play right after bottom card discard (first trick just completed)
    // Bottom discard: tricks.length === 1, currentTrick.length === 0, dealer should lead next
    const isJustAfterBottomDiscard = gameState.tricks.length === 1 && 
                                     gameState.currentTrick.length === 0 && 
                                     gameState.dealerIndex === gameState.currentPlayerIndex;
    if (isJustAfterBottomDiscard && showNextTrickButton) {
      console.log('[USE_EFFECT_AUTO_PLAY] early return: just after bottom discard, waiting for next trick button');
      return;
    }
    
    // CRITICAL: isBottomSelectionPhase allows play even in DingZhu/DEAL phase
    // CRITICAL: In PLAY_TRICK phase, allow play even if isDingZhuPhase is true (may be stale state)
    const isInPlayPhase = gameState.phase === 'PLAY_TRICK';
    if (!isBottomSelectionPhase && !isInPlayPhase && (isDingZhuPhase || gameState.phase === 'DISCARD_BOTTOM' || isBottomRevealPhase ||
        gameState.phase === 'ROUND_END' || gameState.phase === 'CHOOSE_TRUMP' || gameState.phase === 'CONFIRM_LANDLORD')) {
      console.log('[USE_EFFECT_AUTO_PLAY] early return: blocking phase', {
        isDingZhuPhase,
        phase: gameState?.phase,
        isBottomRevealPhase,
        isBottomSelectionPhase,
        isInPlayPhase,
      });
      return;
    }
    
    // CRITICAL: Early check if all players have no cards - game is finished
    // This prevents race conditions where state hasn't updated isHandFinished yet
    if (gameState.players && gameState.players.every(p => p && p.hand && p.hand.length === 0)) {
      console.log('[USE_EFFECT_AUTO_PLAY] early return: all hands empty');
      return;
    }

    // Safety check: ensure players array exists and is valid
    if (!gameState.players || !Array.isArray(gameState.players) || gameState.players.length === 0) {
      console.warn('useEffect auto-play: Invalid players array');
      return;
    }

    // Safety check: ensure currentPlayerIndex is valid
    if (typeof gameState.currentPlayerIndex !== 'number' || 
        gameState.currentPlayerIndex < 0 || 
        gameState.currentPlayerIndex >= gameState.players.length) {
      console.warn('useEffect auto-play: Invalid currentPlayerIndex', gameState.currentPlayerIndex);
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Safety check: ensure player exists
    if (!currentPlayer) {
      console.warn('useEffect auto-play: Current player not found');
      return;
    }
    
    // Safety check: ensure player has hand array
    if (!currentPlayer.hand || !Array.isArray(currentPlayer.hand)) {
      console.warn('useEffect auto-play: Player has invalid hand', currentPlayer.id);
      return;
    }
    
    // Auto-play for non-human players OR player 0 when auto-play is enabled
    const shouldAutoPlay = (currentPlayer.id !== 'p1') || (currentPlayer.id === 'p1' && isAutoPlay);
    
    // NEW: handle edge case where all cards are played but round not resolved yet
    if (shouldAutoPlay && currentPlayer.hand.length === 0) {
      const everyoneEmpty = gameState.players.every(p => p && p.hand && p.hand.length === 0);
      if (everyoneEmpty) {
        console.log('[USE_EFFECT_AUTO_PLAY] All players have no cards, forcing round end');
        forceResolveRound(gameState);
      } else {
        console.warn('[USE_EFFECT_AUTO_PLAY] Current player has no cards but others still have', {
          currentPlayerIndex: gameState.currentPlayerIndex,
          currentTrickLength: gameState.currentTrick.length,
          tricksCount: gameState.tricks.length,
        });
      }
      return;
    }
    
    // Safety check: ensure player has cards before trying to play
    if (shouldAutoPlay && currentPlayer.hand.length > 0) {
      console.log('[USE_EFFECT_AUTO_PLAY] attempting to play', {
        playerId: currentPlayer.id,
        handSize: currentPlayer.hand.length,
        currentTrickLength: gameState.currentTrick.length,
      });
      
      // Check if this is a rui-pai trick
      const ruiPaiInfo = detectRuiPaiTrick(gameState.currentTrick, gameState);
      console.log('[USE_EFFECT_AUTO_PLAY] ruiPaiInfo', {
        isRuiPai: ruiPaiInfo.isRuiPai,
        cardCount: ruiPaiInfo.cardCount,
      });
      
      if (ruiPaiInfo.isRuiPai && ruiPaiInfo.leaderSuit && ruiPaiInfo.cardCount > 1) {
        // This is a rui-pai trick - play multiple cards
        console.log('[USE_EFFECT_AUTO_PLAY] rui-pai trick detected');
        const cardGroup = findValidCardGroup(gameState, currentPlayer.id);
        console.log('[USE_EFFECT_AUTO_PLAY] cardGroup found', { cardGroupLength: cardGroup.length });
        if (cardGroup.length > 0) {
          const timeoutId = setTimeout(() => {
            console.log('[USE_EFFECT_AUTO_PLAY] calling playMultipleCardsForAI');
            playMultipleCardsForAI(cardGroup, gameState.currentPlayerIndex);
          }, 500);
          return () => clearTimeout(timeoutId);
        }
      } else {
        // Normal single-card trick
        console.log('[USE_EFFECT_AUTO_PLAY] normal trick, finding card');
        const cardToPlay = findValidCard(gameState, currentPlayer.id);
        console.log('[USE_EFFECT_AUTO_PLAY] cardToPlay found', { 
          cardExists: !!cardToPlay,
          card: cardToPlay ? `${cardToPlay.suit}${cardToPlay.rank}` : null,
        });
        if (cardToPlay) {
          // Small delay for better UX
          const timeoutId = setTimeout(() => {
            console.log('[USE_EFFECT_AUTO_PLAY] calling handleCardPlay');
            handleCardPlay(cardToPlay, false);
          }, 500);
          
          // Cleanup timeout on unmount or state change
          return () => clearTimeout(timeoutId);
        }
      }
    } else {
      console.log('[USE_EFFECT_AUTO_PLAY] not auto-playing', {
        shouldAutoPlay,
        handLength: currentPlayer?.hand?.length,
      });
    }
  }, [
    gameState?.currentPlayerIndex, 
    gameState?.currentTrick?.length, 
    gameState?.players,
    gameState?.phase,
    gameState?.tricks?.length,
    gameState?.dealerIndex,
    isAutoPlay,
    isTrickComplete,
    isDingZhuPhase,
    handFinished,
    isHandFinished,
    showNextTrickButton,
  ]);

  // ============================================
  // CENTRALIZED END-OF-HAND HANDLING
  // ============================================
  // This effect handles the end-of-hand state ONCE and prevents
  // other effects from trying to operate on empty hands or non-existent next tricks.
  
  // Calculate end-of-hand condition
  // FIXED: Only check if gameState exists and has players to avoid crash on startup
  const allHandsEmpty = gameState?.players && gameState.players.length > 0 
    ? gameState.players.every(p => p && p.hand && p.hand.length === 0) 
    : false;
  // FIXED: When all hands are empty, we should trigger end-of-hand even if trick isn't marked complete
  // The key condition is: all hands empty AND (trick complete OR current trick is empty)
  // CRITICAL: Don't trigger end-of-hand during initialization phases (DEAL, CHOOSE_TRUMP, CONFIRM_LANDLORD)
  // Also ensure we have at least one trick completed (game has actually started)
  const trickIsResolved = isTrickComplete || (gameState?.currentTrick?.length === 0);
  const hasPlayedAtLeastOneTrick = (gameState?.tricks?.length ?? 0) > 0;
  const isNotInitializing = gameState?.phase !== 'DEAL' && 
                            gameState?.phase !== 'CHOOSE_TRUMP' && 
                            gameState?.phase !== 'CONFIRM_LANDLORD' &&
                            gameState?.phase !== undefined; // Also check if phase is defined
  const isEndOfHand = allHandsEmpty && trickIsResolved && hasPlayedAtLeastOneTrick && isNotInitializing;

  // Dedicated useEffect to handle end-of-hand once
  useEffect(() => {
    if (!isEndOfHand) {
      // Reset the ref when we're not in end-of-hand state
      hasHandledEndOfHandRef.current = false;
      return;
    }

    if (hasHandledEndOfHandRef.current) {
      console.log('[END_OF_HAND_EFFECT] already handled, skipping');
      return;
    }

    hasHandledEndOfHandRef.current = true;

    try {
      console.log('[END_OF_HAND_EFFECT] start', {
        allHandsEmpty,
        isTrickComplete,
        trickIsResolved,
        tricksCount: gameState?.tricks?.length,
      });

      // Ensure scores are calculated if not already done
      if (!finalScores && gameState) {
        try {
          console.log('[END_OF_HAND_EFFECT] calculating scores');
          const scores = calculateScores(gameState);
          console.log('[END_OF_HAND_EFFECT] scores calculated', {
            dealerTeamPoints: scores.dealerTeam.totalPoints,
            nonDealerTeamPoints: scores.nonDealerTeam.totalPoints,
          });
          setFinalScores(scores);
          
          // Calculate tribute type for next hand based on nonDealerTeamPoints
          const nonDealerTeamPoints = scores.nonDealerTeam.totalPoints;
          let tributeType: 'none' | 'single' | 'double' = 'none';
          if (nonDealerTeamPoints >= 60 && nonDealerTeamPoints < 80) {
            tributeType = 'single';
          } else if (nonDealerTeamPoints >= 80) {
            tributeType = 'double';
          }
          setNextHandTributeType(tributeType);
        } catch (scoreError) {
          console.error('[END_OF_HAND_EFFECT][ERROR] calculating scores', scoreError);
          // Still mark hand as finished even if score calculation fails
        }
      }

      // Ensure hand finished flags are set
      setIsHandFinished(true);
      setHandFinished(true);
      
      // Update phase to HAND_FINISHED and clear currentTrick to prevent rendering issues
      if (gameState) {
        const finishedState: GameState = {
          ...gameState,
          phase: 'ROUND_END',
          currentTrick: [], // Clear trick when hand is finished
        };
        setGameState(finishedState);
      }

      console.log('[END_OF_HAND_EFFECT] completed successfully', {
        finalScoresCalculated: !!finalScores,
        nextHandTributeType,
      });
    } catch (e) {
      console.error('[END_OF_HAND_EFFECT][ERROR]', e);
      Alert.alert('End-of-hand error', String(e));
      // Don't re-throw to prevent crash, but log it
    }
  }, [isEndOfHand, allHandsEmpty, isTrickComplete, trickIsResolved, gameState, finalScores, nextHandTributeType]);

  const handleCardPlay = (card: Card, isHuman: boolean) => {
    console.log('[PLAY_CARD] start', {
      isHuman,
      currentPlayerIndex: gameState?.currentPlayerIndex,
      currentPlayerId: gameState?.players[gameState?.currentPlayerIndex]?.id,
      handSizeBefore: gameState?.players[gameState?.currentPlayerIndex]?.hand?.length,
      trickCardsCount: gameState?.currentTrick?.length,
      tricksCount: gameState?.tricks?.length,
      card: `${card.suit}${card.rank}`,
      isTrickComplete,
      isHandFinished,
    });

    if (!gameState || isTrickComplete) {
      console.log('[PLAY_CARD] early return: no gameState or trick complete');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Safety check: ensure player exists and has cards
    if (!currentPlayer || currentPlayer.hand.length === 0) {
      console.warn('[PLAY_CARD] Player has no cards or player not found', {
        currentPlayerIndex: gameState.currentPlayerIndex,
        playerExists: !!currentPlayer,
        handLength: currentPlayer?.hand?.length,
      });
      return;
    }
    
    // SIMPLIFIED: Check if this is the first trick (bottom card play)
    const isFirstTrick = gameState.tricks.length === 0 && gameState.currentTrick.length === 0;
    const isLandlord = gameState.dealerIndex === gameState.currentPlayerIndex;
    
    // During first trick, only landlord can play, and must play exactly 6 cards
    if (isFirstTrick && !isLandlord) {
      console.log('[PLAY_CARD] First trick - non-landlord player, auto-skip');
      // Auto-skip: move to next player without playing
      const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
      // If we've cycled back to landlord, the trick is complete (landlord played 6, others skipped)
      if (nextPlayerIndex === gameState.dealerIndex) {
        // Trick complete - landlord wins, no points
        const landlordCards = gameState.currentTrick.filter(pc => pc.playerIndex === gameState.dealerIndex);
        const bottomDiscardTrick: TrickResult = {
          cards: gameState.currentTrick,
          winnerIndex: gameState.dealerIndex,
          winnerId: gameState.players[gameState.dealerIndex].id,
          points: 0,
        };
        
        // Add history event
        const historyEvent: HistoryEvent = {
          type: 'LANDLORD_DISCARD',
          playerId: gameState.players[gameState.dealerIndex].id,
          cards: landlordCards.map(pc => pc.card),
          timestamp: Date.now(),
          landlordId: gameState.players[gameState.dealerIndex].id,
          landlordIndex: gameState.dealerIndex,
        };
        
        const updatedState: GameState = {
          ...gameState,
          tricks: [bottomDiscardTrick],
          bottomCards: landlordCards.map(pc => pc.card),
          finalBottomCards: landlordCards.map(pc => pc.card),
          history: [...(gameState.history || []), historyEvent],
          currentTrick: [],
          currentPlayerIndex: gameState.dealerIndex, // Landlord leads next trick
        };
        
        setGameState(updatedState);
        setIsTrickComplete(true);
        setLastTrickWinnerIndex(gameState.dealerIndex);
        setTrickWinner(`玩家${gameState.dealerIndex + 1}`);
        setShowNextTrickButton(true);
        return;
      }
      
      // Move to next player
      const updatedState: GameState = {
        ...gameState,
        currentPlayerIndex: nextPlayerIndex,
      };
      setGameState(updatedState);
      return;
    }
    
    try {
      // Check if this will complete the trick
      // For first trick with landlord playing 6 cards, check if landlord has played 6 cards
      const willCompleteTrick = isFirstTrick && isLandlord 
        ? (gameState.currentTrick.filter(pc => pc.playerIndex === gameState.dealerIndex).length === 5)
        : (gameState.currentTrick.length === 3);
      console.log('[PLAY_CARD] before playCard call', {
        willCompleteTrick,
        currentTrickLength: gameState.currentTrick.length,
        isFirstTrick,
        isLandlord,
        landlordCardsInTrick: isFirstTrick && isLandlord ? gameState.currentTrick.filter(pc => pc.playerIndex === gameState.dealerIndex).length : 0,
      });
      
      const newState = playCard(gameState, currentPlayer.id, card);
      
      console.log('[PLAY_CARD] after playCard call', {
        handSizeAfter: newState.players[gameState.currentPlayerIndex]?.hand?.length,
        allHandsEmpty: newState.players.every(p => p && p.hand && p.hand.length === 0),
        currentTrickLength: newState.currentTrick.length,
        tricksCount: newState.tricks.length,
        currentPlayerIndex: newState.currentPlayerIndex,
        isFirstTrick,
        isLandlord,
      });
      
      // Safety check: ensure newState is valid
      if (!newState || !newState.players) {
        console.error('handleCardPlay: Invalid game state after playCard');
        return;
      }
      
      // SIMPLIFIED: Handle first trick (bottom card play) completion
      if (isFirstTrick && isLandlord) {
        const landlordCardsInTrick = newState.currentTrick.filter(pc => pc.playerIndex === gameState.dealerIndex);
        if (landlordCardsInTrick.length === 6) {
          // Landlord has played 6 cards - complete the trick
          // Other players auto-skip (handled above)
          const bottomDiscardTrick: TrickResult = {
            cards: newState.currentTrick,
            winnerIndex: gameState.dealerIndex,
            winnerId: gameState.players[gameState.dealerIndex].id,
            points: 0,
          };
          
          // Add history event
          const historyEvent: HistoryEvent = {
            type: 'LANDLORD_DISCARD',
            playerId: gameState.players[gameState.dealerIndex].id,
            cards: landlordCardsInTrick.map(pc => pc.card),
            timestamp: Date.now(),
            landlordId: gameState.players[gameState.dealerIndex].id,
            landlordIndex: gameState.dealerIndex,
          };
          
          const updatedState: GameState = {
            ...newState,
            tricks: [bottomDiscardTrick],
            bottomCards: landlordCardsInTrick.map(pc => pc.card),
            finalBottomCards: landlordCardsInTrick.map(pc => pc.card),
            history: [...(newState.history || []), historyEvent],
            currentTrick: [],
            currentPlayerIndex: gameState.dealerIndex, // Landlord leads next trick
          };
          
          setGameState(updatedState);
          setIsTrickComplete(true);
          setLastTrickWinnerIndex(gameState.dealerIndex);
          setTrickWinner(`玩家${gameState.dealerIndex + 1}`);
          setShowNextTrickButton(true);
          return;
        }
        
        // Landlord hasn't played 6 cards yet - continue playing
        setGameState(newState);
        return;
      }
      
      // Check if trick was just completed (normal play)
      if (willCompleteTrick && newState.currentTrick.length === 0 && newState.tricks.length > 0) {
        console.log('[RESOLVE_TRICK] start', {
          tricksCount: newState.tricks.length,
          allHandsEmpty: newState.players.every(p => p && p.hand && p.hand.length === 0),
        });
        
        // CRITICAL: Check if all cards are played BEFORE updating state
        // This prevents race conditions where useEffect tries to play cards after game ends
        const allCardsPlayed = newState.players.every(p => p && p.hand && p.hand.length === 0);
        console.log('[RESOLVE_TRICK] allCardsPlayed check', { allCardsPlayed });
        
        // Trick was completed - get the winner from the last trick
        const lastTrick = newState.tricks[newState.tricks.length - 1];
        console.log('[RESOLVE_TRICK] lastTrick retrieved', {
          lastTrickExists: !!lastTrick,
          winnerIndex: lastTrick?.winnerIndex,
          lastTrickCardsCount: lastTrick?.cards?.length,
        });
        if (!lastTrick) {
          console.error('handleCardPlay: Last trick not found');
          return;
        }
        
        // Safety check: ensure lastTrick has valid winnerIndex and cards
        if (typeof lastTrick.winnerIndex !== 'number' || lastTrick.winnerIndex < 0 || lastTrick.winnerIndex >= 4) {
          console.error('handleCardPlay: Invalid winnerIndex in lastTrick', lastTrick.winnerIndex);
          return;
        }
        
        if (!lastTrick.cards || !Array.isArray(lastTrick.cards)) {
          console.error('handleCardPlay: Invalid cards in lastTrick');
          return;
        }
        
        const winnerIndex = lastTrick.winnerIndex;
        
        // If all cards are played, mark game as finished FIRST before updating state
        // This ensures useEffect won't try to auto-play after game ends
        if (allCardsPlayed) {
          console.log('[RESOLVE_ROUND_OR_GAME] start - all cards played', {
            tricksCount: newState.tricks.length,
          });
          // CRITICAL: Let the centralized END_OF_HAND_EFFECT handle score calculation
          // Just mark as finished - END_OF_HAND_EFFECT will handle the rest
          console.log('[RESOLVE_ROUND_OR_GAME] setting isHandFinished to true');
          setIsHandFinished(true);
          setHandFinished(true);
          // Also mark trick as complete so end-of-hand condition is met
          setIsTrickComplete(true);
          
          // Update phase to ROUND_END
          const finishedState: GameState = {
            ...newState,
            phase: 'ROUND_END',
            currentTrick: [], // Clear trick when hand is finished
          };
          setGameState(finishedState);
          
          console.log('[RESOLVE_ROUND_OR_GAME] isHandFinished set - END_OF_HAND_EFFECT will handle scores');
          // Early return to prevent further processing
          return;
        }
        
        console.log('[RESOLVE_TRICK] setting trick complete state');
        // Set pause state - keep cards visible by restoring them to currentTrick
        setIsTrickComplete(true);
        setLastTrickWinnerIndex(winnerIndex);
        setTrickWinner(`玩家${winnerIndex + 1}`);
        setShowNextTrickButton(true);
        
        console.log('[RESOLVE_TRICK] creating stateWithTrickVisible');
        // Update game state but keep the trick visible for display
        // CRITICAL: If all cards are played, we should NOT set currentTrick to avoid rendering issues
        // Instead, clear currentTrick and let the UI handle the finished state
        const stateWithTrickVisible: GameState = {
          ...newState,
          currentTrick: allCardsPlayed 
            ? [] // Clear trick if game is finished to prevent rendering issues
            : lastTrick.cards.map(pc => {
                // Safety check: ensure playedCard is valid
                if (!pc || !pc.card) {
                  return null;
                }
                // Additional validation: ensure card has required properties
                if (typeof pc.card.suit !== 'string' || typeof pc.card.rank !== 'number') {
                  return null;
                }
                if (typeof pc.playerIndex !== 'number' || pc.playerIndex < 0 || pc.playerIndex >= 4) {
                  return null;
                }
                return {
                  card: pc.card,
                  playerId: pc.playerId || '',
                  playerIndex: pc.playerIndex >= 0 ? pc.playerIndex : 0,
                };
              }).filter(pc => pc !== null) as PlayedCard[],
          currentPlayerIndex: winnerIndex, // Winner leads next trick (but game is finished if allCardsPlayed)
        };
        
        console.log('[RESOLVE_TRICK] stateWithTrickVisible created', {
          allCardsPlayed,
          currentTrickLength: stateWithTrickVisible.currentTrick.length,
        });
        console.log('[RESOLVE_TRICK] calling setGameState', {
          currentPlayerIndex: stateWithTrickVisible.currentPlayerIndex,
          currentTrickLength: stateWithTrickVisible.currentTrick.length,
          allHandsEmpty: stateWithTrickVisible.players.every(p => p && p.hand && p.hand.length === 0),
        });
        setGameState(stateWithTrickVisible);
        console.log('[RESOLVE_TRICK] setGameState called successfully');
        
        // Note: allCardsPlayed check and score calculation already done above
        // No need to check again here
        
        // Do NOT call advanceTurn here - wait for user to click "next trick"
      } else {
        console.log('[PLAY_CARD] normal play (trick not complete)');
        // Normal play - update state normally
        const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
        console.log('[PLAY_CARD] nextPlayerIndex calculated', { nextPlayerIndex });
        const updatedState: GameState = {
          ...newState,
          currentPlayerIndex: nextPlayerIndex,
        };
        console.log('[PLAY_CARD] calling setGameState for normal play');
        setGameState(updatedState);
        setTrickWinner(null);
        setShowNextTrickButton(false);
        
        // Check if hand is finished (all players have no cards)
        const allCardsPlayed = updatedState.players.every(p => p && p.hand && p.hand.length === 0);
        console.log('[PLAY_CARD] checking allCardsPlayed after normal play', { allCardsPlayed });
        if (allCardsPlayed) {
          console.log('[RESOLVE_ROUND_OR_GAME] start - all cards played (normal play path)');
          // CRITICAL: Let the centralized END_OF_HAND_EFFECT handle score calculation
          // Just mark as finished - END_OF_HAND_EFFECT will handle the rest
          setIsHandFinished(true);
          setHandFinished(true);
          
          // Update phase to HAND_FINISHED
          const finishedState: GameState = {
            ...updatedState,
            phase: 'ROUND_END',
            currentTrick: [], // Clear trick when hand is finished
          };
          setGameState(finishedState);
          
          console.log('[RESOLVE_ROUND_OR_GAME] isHandFinished set - END_OF_HAND_EFFECT will handle scores');
        }
        
        // After human plays, state is updated and useEffect will handle AI turn automatically
      }
    } catch (error) {
      console.error('[PLAY_CARD][ERROR] playing card', error);
      console.error('[PLAY_CARD][ERROR][message]', (error as Error)?.message);
      console.error('[PLAY_CARD][ERROR][stack]', (error as Error)?.stack);
      if (isHuman) {
        Alert.alert('无效出牌', (error as Error).message);
      }
      throw error; // Re-throw to let global handler also see it
    }
  };


  // State to track 甩牌 sequence
  const [ruiPaiQueue, setRuiPaiQueue] = useState<Card[]>([]);
  const [isRuiPaiActive, setIsRuiPaiActive] = useState(false);

  /**
   * Play multiple cards for Player 0 in one trick (甩牌)
   * This function directly manipulates the game state to add all cards to currentTrick
   * The trick will complete when all 4 players have played (Player 0 has multiple cards, others have 1 each)
   */
  const playMultipleCardsInOneTrick = (cardsToPlay: Card[]) => {
    if (!gameState || cardsToPlay.length === 0) return;
    
    // Safety check: ensure player 0 exists
    if (!gameState.players || gameState.players.length === 0) {
      console.error('playMultipleCardsInOneTrick: No players found');
      return;
    }
    
    const player0 = gameState.players[0];
    if (!player0) {
      console.error('playMultipleCardsInOneTrick: Player 0 not found');
      return;
    }
    
    const playerId = player0.id;
    
    // Safety check: ensure player has hand
    if (!player0.hand) {
      console.error('playMultipleCardsInOneTrick: Player 0 has no hand');
      return;
    }
    
    // Remove all cards from player's hand
    let newHand = [...player0.hand];
    const newPlayers = [...gameState.players];
    
    cardsToPlay.forEach(card => {
      const cardIndex = newHand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
      if (cardIndex !== -1) {
        newHand.splice(cardIndex, 1);
      }
    });
    
    newPlayers[0] = {
      ...player0,
      hand: newHand,
    };
    
    // Add all cards to current trick as PlayedCard entries
    const newCurrentTrick = [...gameState.currentTrick];
    cardsToPlay.forEach(card => {
      newCurrentTrick.push({
        card,
        playerId,
        playerIndex: 0,
      });
    });
    
    // Check if this is the bottom discard phase (first trick)
    // Bottom discard: first trick, dealer plays exactly 6 cards
    // Don't rely on isBottomSelectionPhase as it may be false when called
    const isFirstTrick = gameState.tricks.length === 0 && gameState.currentTrick.length === 0;
    const isLandlord = gameState.dealerIndex === 0;
    const isBottomDiscardPhase = isFirstTrick && isLandlord && cardsToPlay.length === 6;
    
    // In bottom discard phase, other 3 players automatically skip (don't play cards)
    // So the trick is complete immediately after dealer plays 6 cards
    const uniquePlayers = new Set(newCurrentTrick.map(pc => pc.playerIndex));
    const isTrickComplete = isBottomDiscardPhase ? true : (uniquePlayers.size === 4);
    
    if (isTrickComplete) {
      // In bottom discard phase, dealer wins the trick (but it doesn't matter, points are 0)
      let winnerIndex: number;
      let points: number;
      
      if (isBottomDiscardPhase) {
        // Bottom discard: dealer wins, no points
        // Also set bottomCards and add history event
        winnerIndex = gameState.dealerIndex;
        points = 0;
        console.log("[BOTTOM_DISCARD] Bottom discard trick completed, dealer wins (no points)");
        
        // Add history event
        const historyEvent: HistoryEvent = {
          type: 'LANDLORD_DISCARD',
          playerId: gameState.players[gameState.dealerIndex].id,
          cards: cardsToPlay,
          timestamp: Date.now(),
          landlordId: gameState.players[gameState.dealerIndex].id,
          landlordIndex: gameState.dealerIndex,
        };
        
        // Create trick result with bottom cards
        const bottomDiscardTrick: TrickResult = {
          cards: newCurrentTrick,
          winnerIndex: gameState.dealerIndex,
          winnerId: gameState.players[gameState.dealerIndex].id,
          points: 0,
        };
        
        // Update gameState with bottomCards
        const updatedStateWithBottom: GameState = {
          ...gameState,
          players: newPlayers,
          tricks: [...gameState.tricks, bottomDiscardTrick],
          bottomCards: cardsToPlay,
          finalBottomCards: cardsToPlay,
          history: [...(gameState.history || []), historyEvent],
          currentTrick: [],
          currentPlayerIndex: gameState.dealerIndex, // Landlord leads next trick
          phase: 'PLAY_TRICK', // Ensure phase is set to PLAY_TRICK after bottom discard
        };
        
        setGameState(updatedStateWithBottom);
        setIsBottomSelectionPhase(false); // Clear bottom selection phase
        setIsDingZhuPhase(false); // Clear DingZhu phase after bottom discard
        setBottomCards([]); // Clear bottom cards display after discard
        setIsTrickComplete(true);
        setLastTrickWinnerIndex(gameState.dealerIndex);
        setTrickWinner(`玩家${gameState.dealerIndex + 1}`);
        setShowNextTrickButton(true);
        return; // Early return - trick is complete
      } else {
        // Normal trick: determine winner
        const leaderIndex = newCurrentTrick[0].playerIndex;
        winnerIndex = determineTrickWinner(newCurrentTrick, gameState, leaderIndex);
        
        // Calculate points
        points = newCurrentTrick.reduce(
          (sum, pc) => sum + getCardPoints(pc.card),
          0
        );
      }
      
      // Safety check: ensure winnerIndex is valid
      if (winnerIndex < 0 || winnerIndex >= gameState.players.length) {
        console.error('playMultipleCardsInOneTrick: Invalid winnerIndex', winnerIndex);
        return;
      }
      
      const winnerPlayer = gameState.players[winnerIndex];
      if (!winnerPlayer) {
        console.error('playMultipleCardsInOneTrick: Winner player not found', winnerIndex);
        return;
      }
      
      // Create trick result
      const trickResult: TrickResult = {
        cards: newCurrentTrick,
        winnerIndex,
        winnerId: winnerPlayer.id,
        points,
      };
      
      // Update scores
      const dealerIndex = gameState.dealerIndex;
      const dealerTeamIndices = [dealerIndex, (dealerIndex + 2) % 4];
      const isDealerTeam = dealerTeamIndices.includes(winnerIndex);
      const newScores = { ...gameState.scores };
      if (isDealerTeam) {
        newScores.dealerTeam += points;
      } else {
        newScores.nonDealerTeam += points;
      }
      
      // Set pause state - keep cards visible
      setIsTrickComplete(true);
      setLastTrickWinnerIndex(winnerIndex);
      setTrickWinner(`玩家${winnerIndex + 1}`);
      setShowNextTrickButton(true);
      
      // Update game state but keep the trick visible for display
      const updatedState: GameState = {
        ...gameState,
        players: newPlayers,
        currentPlayerIndex: winnerIndex,
        currentTrick: newCurrentTrick, // Keep visible
        tricks: [...gameState.tricks, trickResult],
        scores: newScores,
      };
      
      setGameState(updatedState);
      
      // Check if hand is finished (all players have no cards)
      const allCardsPlayed = newPlayers.every(p => p && p.hand && p.hand.length === 0);
      if (allCardsPlayed) {
        console.log('[PLAY_MULTIPLE_CARDS] All cards played, marking hand as finished');
        // CRITICAL: Let the centralized END_OF_HAND_EFFECT handle score calculation
        // Just mark as finished - END_OF_HAND_EFFECT will handle the rest
        setIsHandFinished(true);
        setHandFinished(true);
        setIsTrickComplete(true);
        
        // Update phase to ROUND_END
        const finishedState: GameState = {
          ...updatedState,
          phase: 'ROUND_END',
          currentTrick: [], // Clear trick when hand is finished
        };
        setGameState(finishedState);
        
        console.log('[PLAY_MULTIPLE_CARDS] Hand finished - END_OF_HAND_EFFECT will handle scores');
      }
      
      // Do NOT call advanceTurn here - wait for user to click "next trick"
    } else {
      // Trick not complete - advance to next player
      // In bottom discard phase, other players skip, so we should not reach here
      // But if we do, just advance normally
      if (isBottomDiscardPhase) {
        // This should not happen, but handle gracefully
        console.warn("[BOTTOM_DISCARD] Unexpected: trick not complete in bottom discard phase");
        // Mark trick as complete anyway (other players skip)
        setIsTrickComplete(true);
        setLastTrickWinnerIndex(gameState.dealerIndex);
        setTrickWinner(`玩家${gameState.dealerIndex + 1}`);
        setShowNextTrickButton(true);
        
        const updatedState: GameState = {
          ...gameState,
          players: newPlayers,
          currentTrick: newCurrentTrick,
          currentPlayerIndex: gameState.dealerIndex, // Dealer leads next trick
          tricks: [...gameState.tricks, {
            cards: newCurrentTrick,
            winnerIndex: gameState.dealerIndex,
            winnerId: gameState.players[gameState.dealerIndex].id,
            points: 0,
          }],
        };
        setGameState(updatedState);
      } else {
        // Normal case: advance to next player
        const nextPlayerIndex = (0 + 1) % 4;
        const updatedState: GameState = {
          ...gameState,
          players: newPlayers,
          currentTrick: newCurrentTrick,
          currentPlayerIndex: nextPlayerIndex,
        };
        
        setGameState(updatedState);
        
        // After human plays multiple cards, state is updated and useEffect will handle AI turn automatically
      }
    }
  };

  /**
   * Start 甩牌 sequence
   * For Phase 1: Play all cards in one trick (Player 0 plays multiple, others play one each)
   */
  const startRuiPaiSequence = (cardsToRui: Card[]) => {
    if (!gameState) return;
    
    // Safety check: ensure player0 exists
    const player0 = gameState.players[0];
    if (!player0 || !player0.hand) {
      Alert.alert('错误', '游戏状态异常，无法出牌');
      return;
    }
    
    // Validate selection - MUST run validation before any card play
    // Pass all players' hands to check if higher cards exist in ANY player's hand
    const allPlayersHands = gameState.players.map(p => p.hand);
    const validation = validateRuiPaiSelection(
      cardsToRui, 
      player0.hand,
      gameState.trumpSuit,
      gameState.config,
      gameState.tricks, // Pass previous tricks to check played cards
      allPlayersHands // Pass all players' hands to check ALL hands, not just current player
    );
    
    // If validation fails, show system Alert and STOP - do not proceed with card play
    if (!validation.valid) {
      Alert.alert(
        '甩牌失败', 
        validation.message || '出牌不合法：请检查是否为同点数、合法顺子或其他有效组合。',
        [{ text: '确定', style: 'default' }]
      );
      // CRITICAL: Do not clear selection, do not play cards, do not trigger animations
      // Let player choose single-card play or fix selection
      return;
    }
    
    // Sort cards by rank descending (strongest first)
    const sortedCards = [...cardsToRui].sort((a, b) => {
      const rankA = typeof a.rank === 'number' ? a.rank : 0;
      const rankB = typeof b.rank === 'number' ? b.rank : 0;
      return rankB - rankA;
    });
    
    // Clear selection UI
    setSelectedCards([]);
    
    // Play all cards in one trick
    playMultipleCardsInOneTrick(sortedCards);
    
    // Note: The trick will complete when all 4 players have played
    // (Player 0 has played N cards, Players 1-3 will each play 1 card)
  };

  /**
   * Continue 甩牌 sequence after a trick completes
   * Called when "Next trick" is pressed during 甩牌
   */
  const continueRuiPaiSequence = () => {
    if (!gameState || lastTrickWinnerIndex === null) return;
    
    // Get current queue state
    setRuiPaiQueue(currentQueue => {
      if (!isRuiPaiActive || currentQueue.length <= 1) {
        // End of sequence - do normal next trick
        setIsRuiPaiActive(false);
        
        // Normal next trick logic
        const lastTrick = gameState.tricks[gameState.tricks.length - 1];
        const updatedState: GameState = {
          ...gameState,
          currentTrick: [],
          currentPlayerIndex: lastTrickWinnerIndex,
        };
        
        setGameState(updatedState);
        setIsTrickComplete(false);
        setLastTrickWinnerIndex(null);
        setTrickWinner(null);
        setShowNextTrickButton(false);
        setSelectedCards([]);
        
        // Check if hand is finished (all players have no cards)
        const allCardsPlayed = updatedState.players.every(p => p && p.hand && p.hand.length === 0);
        if (allCardsPlayed) {
          try {
            const scores = calculateScores(updatedState);
            setFinalScores(scores);
            
            // Calculate tribute type for next hand based on nonDealerTeamPoints
            const nonDealerTeamPoints = scores.nonDealerTeam.totalPoints;
            let tributeType: 'none' | 'single' | 'double' = 'none';
            if (nonDealerTeamPoints >= 60 && nonDealerTeamPoints < 80) {
              tributeType = 'single';
            } else if (nonDealerTeamPoints >= 80) {
              tributeType = 'double';
            }
            setNextHandTributeType(tributeType);
            
            setIsHandFinished(true);
            setHandFinished(true);
          } catch (scoreError) {
            console.error('continueRuiPaiSequence: Error calculating scores', scoreError);
            // Still mark hand as finished even if score calculation fails
            setIsHandFinished(true);
            setHandFinished(true);
          }
        }
        return [];
      }
      
      // Remove the first card (already played) from queue
      const remainingCards = currentQueue.slice(1);
      
      // Advance to next trick (clear current trick, Player 0 continues leading in 甩牌)
      const updatedState: GameState = {
        ...gameState,
        currentTrick: [],
        currentPlayerIndex: 0, // In 甩牌, Player 0 always leads each trick
      };
      
      setGameState(updatedState);
      setIsTrickComplete(false);
      setLastTrickWinnerIndex(null);
      setTrickWinner(null);
      setShowNextTrickButton(false);
      
      // Play the next card after a short delay
      if (remainingCards.length > 0) {
        const cardToPlay = remainingCards[0];
        setTimeout(() => {
          // Get the latest gameState and play the card directly
          setGameState(currentState => {
            if (!currentState || currentState.currentPlayerIndex !== 0) {
              return currentState;
            }
            
            try {
              // Safety check: ensure player 0 exists and has cards
              if (!currentState.players || currentState.players.length === 0) {
                console.error('continueRuiPaiSequence: No players found');
                setIsRuiPaiActive(false);
                return currentState;
              }
              
              const player = currentState.players[0];
              if (!player || !player.hand || player.hand.length === 0) {
                console.warn('continueRuiPaiSequence: Player 0 has no cards');
                setIsRuiPaiActive(false);
                return currentState;
              }
              
              const newState = playCard(currentState, player.id, cardToPlay);
              
              // Safety check: ensure newState is valid
              if (!newState || !newState.players) {
                console.error('continueRuiPaiSequence: Invalid game state after playCard');
                setIsRuiPaiActive(false);
                return currentState;
              }
              
              // Check if trick was completed (this was the 4th card)
              const willCompleteTrick = currentState.currentTrick.length === 3;
              if (willCompleteTrick && newState.currentTrick.length === 0 && newState.tricks.length > 0) {
                const lastTrick = newState.tricks[newState.tricks.length - 1];
                if (!lastTrick) {
                  console.error('continueRuiPaiSequence: Last trick not found');
                  setIsRuiPaiActive(false);
                  return currentState;
                }
                
                setIsTrickComplete(true);
                setLastTrickWinnerIndex(lastTrick.winnerIndex);
                setTrickWinner(`玩家${lastTrick.winnerIndex + 1}`);
                setShowNextTrickButton(true);
                
                // Keep trick visible for display
                return {
                  ...newState,
                  currentTrick: lastTrick.cards.map(pc => ({
                    card: pc.card,
                    playerId: pc.playerId,
                    playerIndex: pc.playerIndex,
                  })),
                };
              } else {
                // Normal play - update state normally
                setTrickWinner(null);
                setShowNextTrickButton(false);
                
                // Check if hand is finished (all players have no cards)
                const allCardsPlayed = newState.players.every(p => p && p.hand && p.hand.length === 0);
                if (allCardsPlayed) {
                  try {
                    const scores = calculateScores(newState);
                    setFinalScores(scores);
                    
                    // Calculate tribute type
                    const nonDealerTeamPoints = scores.nonDealerTeam.totalPoints;
                    let tributeType: 'none' | 'single' | 'double' = 'none';
                    if (nonDealerTeamPoints >= 60 && nonDealerTeamPoints < 80) {
                      tributeType = 'single';
                    } else if (nonDealerTeamPoints >= 80) {
                      tributeType = 'double';
                    }
                    setNextHandTributeType(tributeType);
                    
                    setIsHandFinished(true);
                    setHandFinished(true);
                    setIsRuiPaiActive(false);
                  } catch (scoreError) {
                    console.error('continueRuiPaiSequence: Error calculating scores', scoreError);
                    setIsHandFinished(true);
                    setHandFinished(true);
                    setIsRuiPaiActive(false);
                  }
                }
                
                return newState;
              }
            } catch (error) {
              Alert.alert('出牌失败', (error as Error).message);
              return currentState;
            }
          });
        }, 800); // Delay to ensure state is updated and AI can respond
      }
      
      return remainingCards;
    });
  };

  const handleCardPress = (card: Card) => {
    if (!gameState) {
      console.warn("[HANDLE_CARD_PRESS] No gameState");
      return;
    }
    
    // FIXED: Declare isInPlayPhase once at the top of the function
    const isInPlayPhase = gameState.phase === 'PLAY_TRICK';
    
    // SIMPLIFIED: Bottom selection - use normal card selection (not separate toggle)
    // Only rule: cannot select point cards (5, 10, K)
    // All other rules (甩牌, follow-suit, etc.) are ignored
    const isFirstTrick = gameState.tricks.length === 0 && gameState.currentTrick.length === 0;
    const isLandlord = gameState.dealerIndex === 0;
    const canOverrideBlocking = isBottomSelectionPhase || (isFirstTrick && isLandlord);
    const isInBottomSelection = (isBottomSelectionPhase || (isFirstTrick && isLandlord)) && isLandlord;
    
    if (isInBottomSelection) {
      // Check if card is a point card (5, 10, K) - these cannot be used as bottom cards
      const isPointCard = card.rank === 5 || card.rank === 10 || card.rank === 13;
      if (isPointCard) {
        Alert.alert('无效选择', '扣底牌不能选择 5、10、K（有分值的牌）');
        return;
      }
      
      // Toggle card selection (normal selection logic)
      const isSelected = selectedCards.some(c => c.suit === card.suit && c.rank === card.rank);
      if (isSelected) {
        setSelectedCards(prev => prev.filter(c => !(c.suit === card.suit && c.rank === card.rank)));
      } else {
        // Can only select up to 6 cards
        if (selectedCards.length >= 6) {
          Alert.alert('选择过多', '扣底牌只能选择 6 张牌');
          return;
        }
        setSelectedCards(prev => [...prev, card]);
      }
      return; // Don't play cards yet - wait for play button
    }
    
    // Block card play during bottom reveal phase
    if (isBottomRevealPhase) {
      console.log("[HANDLE_CARD_PRESS] Bottom reveal phase - cards not clickable");
      return;
    }
    
    // Check if Player 0 is the leader (currentTrick is empty)
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isPlayer0Turn = currentPlayer.id === 'p1';
    const isTrickEmpty = gameState.currentTrick.length === 0;
    
    // Case B: Following in the middle of a trick (currentTrick already has a leader)
    // Always play single card immediately, no multi-select
    if (!isTrickEmpty) {
      // FIXED: Don't block if we're in PLAY_TRICK phase (normal play)
      if (isTrickComplete || isHandFinished || (isDingZhuPhase && !isInPlayPhase)) return;
      if (isPlayer0Turn) {
        // Clear any selection and play the card immediately
        setSelectedCards([]);
        handleCardPlay(card, true);
      }
      return;
    }
    
    // Case A: Leading a new trick (currentTrick empty)
    // Allow multi-select for rui-pai, but also support single-card play
    // Note: isPreFanPhase is NOT checked - fan selection doesn't block card playing
    // FIXED: Don't block if we're in PLAY_TRICK phase (normal play) or bottom selection
    // CRITICAL: isBottomSelectionPhase or first trick overrides DingZhu blocking
    if (isPlayer0Turn && isTrickEmpty && !isTrickComplete && !isHandFinished && 
        (!isDingZhuPhase || isInPlayPhase || canOverrideBlocking)) {
      console.log("[HANDLE_CARD_PRESS] Leading new trick - toggling card selection", {
        card: `${card.suit}${card.rank}`,
        phase: gameState.phase,
        isInPlayPhase,
        isDingZhuPhase,
        isInBottomSelection,
      });
      // Toggle card selection
      const isSelected = selectedCards.some(c => c.suit === card.suit && c.rank === card.rank);
      if (isSelected) {
        // Unselect
        setSelectedCards(prev => prev.filter(c => !(c.suit === card.suit && c.rank === card.rank)));
      } else {
        // Add to selection
        setSelectedCards(prev => [...prev, card]);
      }
      return;
    }
    
    // Fallback: Normal single-card play (shouldn't reach here in normal flow)
    // Note: isPreFanPhase is NOT checked - fan selection doesn't block card playing
    // FIXED: Don't block if we're in PLAY_TRICK phase (normal play)
    if (isTrickComplete || isHandFinished || (isDingZhuPhase && !isInPlayPhase)) return;
    if (isPlayer0Turn) {
      setSelectedCards([]);
      handleCardPlay(card, true);
    }
  };

  const handleNextTrick = () => {
    console.log('[HANDLE_NEXT_TRICK] start', {
      hasGameState: !!gameState,
      lastTrickWinnerIndex,
      isRuiPaiActive,
      tricksCount: gameState?.tricks?.length,
    });

    if (!gameState || lastTrickWinnerIndex === null) {
      console.log('[HANDLE_NEXT_TRICK] early return: no gameState or winnerIndex');
      return;
    }

    // If we're in a 甩牌 sequence, continue it instead of normal next trick
    if (isRuiPaiActive) {
      console.log('[HANDLE_NEXT_TRICK] continuing rui-pai sequence');
      continueRuiPaiSequence();
      return;
    }

    // Safety check: ensure tricks array exists and has at least one trick
    if (!gameState.tricks || !Array.isArray(gameState.tricks) || gameState.tricks.length === 0) {
      console.error('[HANDLE_NEXT_TRICK][ERROR] No tricks found');
      return;
    }

    // Get the last completed trick from gameState.tricks
    const lastTrick = gameState.tricks[gameState.tricks.length - 1];
    if (!lastTrick) {
      console.error('[HANDLE_NEXT_TRICK][ERROR] Last trick is null');
      return;
    }
    
    console.log('[HANDLE_NEXT_TRICK] proceeding', {
      lastTrickWinnerIndex,
      tricksCount: gameState.tricks.length,
      allHandsEmpty: gameState.players.every(p => p && p.hand && p.hand.length === 0),
    });
    
    // Update game state: clear currentTrick and set current player to winner
    // If this is the transition from first trick (bottom discard) to second trick, clear bottom cards
    const isTransitioningFromBottomDiscard = gameState.tricks.length === 1;
    const updatedState: GameState = {
      ...gameState,
      currentTrick: [], // Clear the trick
      currentPlayerIndex: lastTrickWinnerIndex, // Winner leads next trick
      // Clear bottom cards when transitioning from first trick (bottom discard) to second trick
      ...(isTransitioningFromBottomDiscard && {
        bottomCards: [],
        finalBottomCards: [],
      }),
    };
    
    setGameState(updatedState);
    
    // Also clear bottomCards state if transitioning from bottom discard
    if (isTransitioningFromBottomDiscard) {
      setBottomCards([]);
    }
    
    // Reset trick complete state
    setIsTrickComplete(false);
    setLastTrickWinnerIndex(null);
    setTrickWinner(null);
    setShowNextTrickButton(false);
    
    // Clear any card selection when starting a new trick
    setSelectedCards([]);
    
    // Check if hand is finished after clearing trick
    // Safety check: ensure all players exist and have hand arrays
    const allCardsPlayed = updatedState.players.every(p => p && p.hand && p.hand.length === 0);
    const trickIsEmpty = updatedState.currentTrick && updatedState.currentTrick.length === 0;
    
    // CRITICAL: End-of-hand guard - let the centralized END_OF_HAND_EFFECT handle this
    if (allCardsPlayed && trickIsEmpty) {
      console.log('[HANDLE_NEXT_TRICK] end-of-hand detected, marking as finished');
      // Just mark as finished - the centralized END_OF_HAND_EFFECT will handle score calculation
      setIsHandFinished(true);
      setHandFinished(true);
      
      // Update phase to HAND_FINISHED
      const finishedState: GameState = {
        ...updatedState,
        phase: 'HAND_FINISHED',
        currentTrick: [], // Ensure trick is cleared
      };
      setGameState(finishedState);
      
      // Don't calculate scores here - let END_OF_HAND_EFFECT do it to avoid double execution
    }
    // After clearing trick, useEffect will automatically handle AI turn if needed
  };

  // Handle starting next hand - automatically determines dealer rotation based on scores
  const handleNextHand = () => {
    if (!gameState || !finalScores) return;
    
    const currentDealerIndex = matchState.matchDealerIndex!;
    const nonDealerTeamPoints = finalScores.nonDealerTeam.totalPoints;
    
    // Automatic dealer rotation rule: if nonDealerTeamPoints > 40, dealer MUST step down
    const dealerStepsDown = nonDealerTeamPoints > 40;
    
    // Calculate next dealer index BEFORE updating state (to avoid async state issues)
    const nextDealerIndex = dealerStepsDown ? (currentDealerIndex + 1) % 4 : currentDealerIndex;
    
    // Determine tribute pairs based on nextHandTributeType
    const tributePairs: Array<{ from: number; to: number }> = [];
    
    if (nextHandTributeType === 'single') {
      // 单进贡: only old dealer -> new dealer
      tributePairs.push({ from: currentDealerIndex, to: nextDealerIndex });
    } else if (nextHandTributeType === 'double') {
      // 双进贡: both sides of dealer team tribute
      const dealerMate = (currentDealerIndex + 2) % 4;
      const newDealerMate = (nextDealerIndex + 2) % 4;
      tributePairs.push({ from: currentDealerIndex, to: nextDealerIndex });
      tributePairs.push({ from: dealerMate, to: newDealerMate });
    }
    
    // Update match totals with current hand scores
    if (dealerStepsDown) {
      // 下台: Dealer steps down, next player becomes dealer
      setMatchState(prev => ({
        ...prev,
        matchDealerIndex: nextDealerIndex,
        handNumber: prev.handNumber + 1,
        dealerTeamTotal: prev.dealerTeamTotal + finalScores.dealerTeam.totalPoints,
        nonDealerTeamTotal: prev.nonDealerTeamTotal + finalScores.nonDealerTeam.totalPoints,
      }));
    } else {
      // 连庄: Dealer stays, just increment hand number
      setMatchState(prev => ({
        ...prev,
        handNumber: prev.handNumber + 1,
        dealerTeamTotal: prev.dealerTeamTotal + finalScores.dealerTeam.totalPoints,
        nonDealerTeamTotal: prev.nonDealerTeamTotal + finalScores.nonDealerTeam.totalPoints,
      }));
    }
    
    // Reset hand-specific state
    setIsHandFinished(false);
    setHandFinished(false);
    setFinalScores(null);
    setIsTrickComplete(false);
    setLastTrickWinnerIndex(null);
    setTrickWinner(null);
    setShowNextTrickButton(false);
    setShowScoreDetails(false);
    
    // Start new hand with the calculated dealer index and tribute pairs
    // Tribute will be performed after cards are dealt and trump suit is determined
    initializeGame(nextDealerIndex, tributePairs.length > 0 ? tributePairs : undefined);
  };

  const handleNewGame = () => {
    // Reset match state for a completely new match
    setMatchState({
      matchDealerIndex: null,
      dealerTeamTotal: 0,
      nonDealerTeamTotal: 0,
      handNumber: 1,
    });
    
    // Reset tribute state
    setNextHandTributeType('none');
    setShowTributeVisualization(false);
    setTributeVisualizationData([]);
    setPendingTributePairs([]);
    setShowScoreDetails(false);
    
    initializeGame();
  };

  // Only show "游戏加载中" if gameState truly doesn't exist yet
  if (!gameState) {
    console.log("[RENDER] showing loading screen because gameState is null/undefined");
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d5d2f' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>游戏加载中...</Text>
      </View>
    );
  }

  // From here on, gameState exists - render the game (dealing animation, table, etc.)
  console.log("[RENDER] gameState exists, rendering game", {
    isDealing,
    isDingZhuPhase,
    playersCount: gameState.players?.length,
  });

  // Safety check: ensure gameState and players exist
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d5d2f' }}>
        <Text style={{ color: '#fff' }}>加载中...</Text>
      </View>
    );
  }
  
  // Calculate end-of-hand condition for render short-circuit
  // Note: allHandsEmpty is already calculated above in the END_OF_HAND_EFFECT section (line ~1762)
  // Reuse it here - both are in the same component body scope
  // FIXED: Use same logic as isEndOfHand to avoid inconsistencies
  const renderTrickIsResolved = isTrickComplete || (gameState?.currentTrick?.length === 0);
  const renderHasPlayedAtLeastOneTrick = (gameState?.tricks?.length ?? 0) > 0;
  const renderIsEndOfHand = allHandsEmpty && renderTrickIsResolved && renderHasPlayedAtLeastOneTrick;

  // Short-circuit the render when the hand is finished
  // Only show placeholder BEFORE the effect runs - after effect runs, allow normal render so Modal can show
  if (renderIsEndOfHand && !hasHandledEndOfHandRef.current) {
      console.log('[RENDER] end-of-hand short-circuit (waiting for effect)', {
        allHandsEmpty,
        isTrickComplete,
        trickIsResolved: renderTrickIsResolved,
        hasPlayedAtLeastOneTrick: renderHasPlayedAtLeastOneTrick,
      });

    // Render a simple placeholder while the end-of-hand effect runs
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d5d2f' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>本局结束，正在结算...</Text>
      </View>
    );
  }
  
  // After effect runs, if still in end-of-hand state, continue with normal render
  // This allows the Modal (which checks isHandFinished && finalScores !== null) to be rendered
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  // CRITICAL: Safety check for currentTrick - ensure it's always an array
  const currentTrick = (gameState.currentTrick && Array.isArray(gameState.currentTrick)) 
    ? gameState.currentTrick 
    : [];
  const player1 = gameState.players[0];
  
  // Render-level sanity check for phase transitions
  console.log('[RENDER] phases', {
    isDingZhuPhase,
    isBottomSelectionPhase,
    isHandFinished,
    isTrickComplete,
    allHandsEmpty,
    currentPlayerIndex: gameState.currentPlayerIndex,
    dealerIndex: gameState.dealerIndex,
    hasTrumpBeenChosen,
    currentTrickLength: currentTrick.length,
  });
  
  console.log('[RENDER] current state', {
    currentPlayerIndex: gameState.currentPlayerIndex,
    currentTrickLength: currentTrick.length,
    allHandsEmpty,
    isHandFinished,
  });
  
  // Safety check: ensure player1 exists
  if (!player1) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d5d2f' }}>
        <Text style={{ color: '#fff' }}>游戏状态错误</Text>
      </View>
    );
  }

  // Get all cards for a player in the current trick (supports 甩牌 - multiple cards per player)
  const getTrickCards = (playerIndex: number): Card[] => {
    // CRITICAL: If hand is finished, don't try to access trick cards
    // This prevents crashes when state is inconsistent
    if (isHandFinished || handFinished) {
      console.log('[GET_TRICK_CARDS] hand finished, returning empty', { playerIndex, isHandFinished, handFinished });
      return [];
    }
    
    // CRITICAL: Safety check for currentTrick
    if (!currentTrick || !Array.isArray(currentTrick)) {
      console.log('[GET_TRICK_CARDS] currentTrick is invalid', { currentTrick, playerIndex });
      return [];
    }
    
    try {
      const result = currentTrick
        .filter(pc => {
          // CRITICAL: Ensure pc is valid and has required properties
          if (!pc || typeof pc !== 'object') return false;
          if (typeof pc.playerIndex !== 'number' || pc.playerIndex < 0 || pc.playerIndex >= 4) return false;
          if (!pc.card || typeof pc.card !== 'object') return false;
          return pc.playerIndex === playerIndex;
        })
        .map(pc => pc.card)
        .filter(card => {
          // CRITICAL: Ensure card is valid
          if (!card || typeof card !== 'object') return false;
          if (typeof card.suit !== 'string') return false;
          // FIXED: Allow rank to be number OR string (for JOKER cards: 'BJ' or 'SJ')
          if (typeof card.rank !== 'number' && typeof card.rank !== 'string') return false;
          // Additional validation: if suit is JOKER, rank must be 'BJ' or 'SJ'
          if (card.suit === 'JOKER' && card.rank !== 'BJ' && card.rank !== 'SJ') return false;
          return true;
        });
      
      console.log('[GET_TRICK_CARDS] result', { playerIndex, resultLength: result.length });
      return result;
    } catch (error) {
      console.error('[GET_TRICK_CARDS][ERROR]', error, { playerIndex, currentTrick });
      return [];
    }
  };

  // Get single card for backward compatibility (returns first card if multiple)
  const getTrickCard = (playerIndex: number): Card | null => {
    const cards = getTrickCards(playerIndex);
    return cards.length > 0 ? cards[0] : null;
  };

  // Card dimensions for overlapping layout
  const cardWidth = 55;
  const cardHeight = 85;
  const overlapOffset = 20; // Horizontal overlap for bottom/top players
  const overlapOffsetVertical = 15; // Vertical overlap for left/right players
  
  // Constants for current trick positioning
  const handAreaHeight = 80;
  const infoBarHeight = 50; // Fixed height for top info bar (always visible)
  const trickCardScale = 0.65; // Smaller cards for trick display
  const badgeHeight = 32; // Approximate height of player badge (paddingVertical: 8 + fontSize: 16 + paddingVertical: 8)
  const trickCardOverlapOffset = 14; // Horizontal overlap offset for stacked trick cards (12-18px for better visibility)
  const badgeTopOffset = 40; // Offset below badge: badgeHeight + gap
  
  // Calculate tableMiddleY: vertical middle between info bar and bottom hand area
  const handAreaTop = height - handAreaHeight - 10; // Bottom hand starts here
  const tableMiddleY = infoBarHeight + (handAreaTop - infoBarHeight) * 0.45;
  
  // Unified middle row Y for side players (Player 2 and Player 4)
  // All side player icons and cards should align on this horizontal line
  const oldSidePlayerRowCenterY = height * 0.3 + badgeHeight / 2; // Original centerY at 30% height
  // Move side players downward for better vertical balance
  // verticalOffset: 60px (adjustable between 40-80px based on screen size)
  const sidePlayersCenterY = oldSidePlayerRowCenterY + 60; // New centerY moved downward
  
  // Helper component to render card back
  const CardBack = ({ scale = 1 }: { scale?: number }) => (
    <View style={{
      width: cardWidth * scale,
      height: cardHeight * scale,
      backgroundColor: '#1a4d2e',
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#2d7a4d',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }}>
      <View style={{
        width: '60%',
        height: '60%',
        backgroundColor: '#0d5d2f',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#4a7c59',
      }} />
    </View>
  );

  // Helper function to render overlapping cards horizontally
  const renderOverlappingHandHorizontal = (cards: Card[], isPlayer0: boolean = false, playerIndex: number = 0) => {
    // Safety check: handle empty hand
    if (!cards || cards.length === 0) {
      return <View style={{ height: cardHeight * (isPlayer0 ? 1 : 0.6) }} />;
    }
    
    // Safety check: ensure gameState exists before accessing config
    if (!gameState) {
      return <View style={{ height: cardHeight * (isPlayer0 ? 1 : 0.6) }} />;
    }
    
    // CRITICAL: Explicit flag for human dealer selecting bottom cards
    // This is a hard rule: if bottom selection phase AND dealer is local player, cards MUST be selectable
    const localPlayerId = 0; // Player 0 is always the local human player
    const dealerIndex = gameState.dealerIndex;
    
    // FORCE CHECK: Triple-check all conditions to ensure human dealer can select bottom cards
    // FIXED: Simplify condition - if isPlayer0 is true, it means this is player 0's hand
    const isHumanDealerSelectingBottom = 
      gameState.phase === 'DISCARD_BOTTOM' && 
      isPlayer0 &&  // This is player 0's hand
      dealerIndex === localPlayerId;  // Dealer is player 0
    
    // ALWAYS log when in bottom selection phase to debug
    if (gameState.phase === 'DISCARD_BOTTOM') {
      console.log("[BOTTOM_SELECTION_STATE]", {
        phase: gameState.phase,
        dealerIndex,
        localPlayerId,
        playerIndex,
        isPlayer0,
        isDealer: dealerIndex === playerIndex,
        isHumanDealerSelectingBottom,
        cardsCount: cards.length,
        condition1: gameState.phase === 'DISCARD_BOTTOM',
        condition2: dealerIndex === localPlayerId,
        condition3: playerIndex === localPlayerId,
        condition4: isPlayer0,
        // Force check: all conditions must be true
        allConditionsMet: gameState.phase === 'DISCARD_BOTTOM' && isPlayer0 && dealerIndex === 0 && playerIndex === 0,
        // CRITICAL: This should be true for human dealer
        shouldEnableCards: gameState.phase === 'DISCARD_BOTTOM' && isPlayer0 && dealerIndex === 0 && playerIndex === 0,
      });
    }
    
    const scale = isPlayer0 ? 1 : 0.6; // Smaller for other players
    const sortedCards = isPlayer0 ? sortHandForDisplay(
      cards,
      gameState.config,
      gameState.trumpSuit,
      revealedFanCards
    ) : cards;
    
    // Check if card is a fan card (for player0 only)
    const isFanCard = (card: Card) => {
      if (!isPlayer0 || !gameState) return false;
      if (gameState.config.hasThreeFan && card.rank === 3) return true;
      if (gameState.config.hasFiveFan && card.rank === 5 && card.suit !== '♦') return true;
      return false;
    };
    
    return (
      <View style={{ 
        position: 'relative', 
        height: cardHeight * scale,
        width: Math.min(sortedCards.length * overlapOffset + cardWidth * scale, width - 40),
        alignSelf: 'center',
      }}>
        {sortedCards.map((card, index) => {
          const cardIsTrump = gameState ? isTrumpCard(card, gameState.config) : false;
          const isSelectedForBottom = isPlayer0 && selectedBottomCards.some(
            c => c.suit === card.suit && c.rank === card.rank
          );
          const isSelectedForRuiPai = isPlayer0 && selectedCards.some(
            c => c.suit === card.suit && c.rank === card.rank
          );
          // During bottom selection: only disable cards with points (5, 10, K) for dealer
          // HARD RULE: If human dealer is selecting bottom, cards MUST be selectable
          // FORCE CHECK: Triple-check that this is human dealer selecting bottom
          // FIXED: Simplify condition - if isPlayer0 is true, it means this is player 0's hand
          const forceIsHumanDealerSelectingBottom = 
            (isBottomSelectionPhase || gameState?.phase === 'DISCARD_BOTTOM') && 
            isPlayer0 && 
            gameState?.dealerIndex === 0;
          
          // Only disable cards with points (5, 10, K) - these cannot be selected as bottom
          // CRITICAL: isDisabledForBottom should be true ONLY if we're in bottom selection AND card has points
          const isDisabledForBottom = forceIsHumanDealerSelectingBottom && getCardPoints(card) > 0;
          
          // DEBUG: Log card disable logic
          if (gameState?.phase === 'DISCARD_BOTTOM' && isPlayer0) {
            console.log("[CARD_DISABLE_LOGIC]", {
              card: `${card.suit}${card.rank}`,
              phase: gameState.phase,
              dealerIndex: gameState.dealerIndex,
              isPlayer0,
              forceIsHumanDealerSelectingBottom,
              cardPoints: getCardPoints(card),
              isDisabledForBottom,
            });
          }
          const fanCard = isFanCard(card);
          
          // Check if this card should be highlighted
          const cardId = `${card.suit}-${card.rank}`;
          const isHighlighted = highlightDingZhuCard !== null &&
            highlightDingZhuCard.playerId === playerIndex &&
            highlightDingZhuCard.cardId === cardId;
          
          // During bottom selection, dealer's cards should be fully opaque and clickable (except point cards)
          // Other players' cards can be semi-transparent
          // CRITICAL: If human dealer is selecting bottom, cards MUST be fully opaque (except point cards)
          // Use forceIsHumanDealerSelectingBottom to ensure cards are always visible
          const cardOpacity = gameState?.phase === 'DISCARD_BOTTOM' 
            ? (
                forceIsHumanDealerSelectingBottom 
                  ? (isDisabledForBottom ? 0.5 : 1)  // Human dealer: fully opaque except point cards
                  : 0.3  // Other players: semi-transparent
              )
            : (isDisabledForBottom ? 0.5 : 1);
          
          // Check if card can be played according to game rules (follow suit, etc.)
          // Only check for player 0 (local human player) during normal play
          // CRITICAL: Skip ALL validation during bottom selection phase (only check for point cards)
          let isCardInvalidForPlay = false;
          const isInBottomSelectionForValidation = (isBottomSelectionPhase || gameState?.phase === 'DISCARD_BOTTOM') && 
                                                   isPlayer0 && 
                                                   gameState && 
                                                   gameState.dealerIndex === 0;
          
          // Only validate in normal play, NOT during bottom selection
          if (!isInBottomSelectionForValidation && isPlayer0 && gameState?.phase !== 'DISCARD_BOTTOM' && !isBottomRevealPhase && !isDingZhuPhase && !isTrickComplete && gameState) {
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            const isPlayer0Turn = currentPlayer && currentPlayer.id === 'p1';
            
            // Only validate if it's player 0's turn and trick is not empty (not leading)
            if (isPlayer0Turn && gameState.currentTrick.length > 0) {
              try {
                const validation = validateCardPlay(gameState, 'p1', card);
                if (!validation.valid) {
                  isCardInvalidForPlay = true;
                }
              } catch (error) {
                // If validation throws an error, assume card is invalid
                console.warn('[CARD_DISABLED] Validation error', error);
                isCardInvalidForPlay = true;
              }
            }
          }
          
          // Card should be disabled if:
          // 1. In DingZhu phase (but NOT during bottom selection)
          // 2. Trick complete and not rui-pai active
          // 3. Bottom selection: card has points (5, 10, K) - cannot be selected as bottom
          //    CRITICAL: During bottom selection, ONLY check for point cards, ignore ALL other rules (甩牌, follow-suit, etc.)
          // 4. Card violates follow-suit rules (must follow suit if possible) - ONLY in normal play
          // CRITICAL: During bottom selection for human dealer, cards MUST be enabled (except point cards)
          // BULLETPROOF: If we're in bottom selection phase AND this is player 0's hand AND dealer is player 0,
          // then ONLY disable point cards, ignore ALL other conditions
          let isCardDisabled: boolean;
          
          // SIMPLIFIED: Bottom selection logic - ONLY check for point cards, ignore all other rules
          // CRITICAL: isBottomSelectionPhase overrides DingZhu/DEAL blocking
          // Also check if it's the first trick (tricks.length === 0) and landlord is player 0
          const isFirstTrick = gameState && gameState.tricks.length === 0 && gameState.currentTrick.length === 0;
          const isLandlord = gameState && gameState.dealerIndex === 0;
          const isInBottomSelection = (isBottomSelectionPhase || (isFirstTrick && isLandlord)) && 
                                      isPlayer0 && 
                                      gameState && 
                                      gameState.dealerIndex === 0;
          
          if (isInBottomSelection) {
            // Human dealer selecting bottom - ONLY disable point cards (5, 10, K)
            // All other cards should be clickable/selectable
            // IGNORE: 甩牌 rules, follow-suit rules, DingZhu phase, DEAL phase, and all other validation
            isCardDisabled = isDisabledForBottom;
            console.log("[CARD_DISABLED_BOTTOM]", {
              card: `${card.suit}${card.rank}`,
              isDisabledForBottom,
              isCardDisabled,
              willBeClickable: !isCardDisabled,
              isBottomSelectionPhase,
              isFirstTrick,
              isLandlord,
              phase: gameState?.phase,
            });
          } else {
            // Normal play phase - apply standard validation rules
            // CRITICAL: Allow cards to be clickable during PLAY_TRICK phase
            // CRITICAL: isBottomSelectionPhase or first trick overrides DingZhu/DEAL blocking
            const isInPlayPhase = gameState?.phase === 'PLAY_TRICK';
            const canOverrideBlocking = isBottomSelectionPhase || (isFirstTrick && isLandlord && isPlayer0);
            isCardDisabled = (
              (isDingZhuPhase && !isInPlayPhase && !canOverrideBlocking) || // Allow if bottom selection or first trick
              (isTrickComplete && !isRuiPaiActive) || 
              (isCardInvalidForPlay && !isInPlayPhase && !canOverrideBlocking)  // Allow if bottom selection or first trick
            );
            if (isPlayer0) {
              console.log("[CARD_DISABLED_NORMAL]", {
                card: `${card.suit}${card.rank}`,
                isDingZhuPhase,
                isTrickComplete,
                isCardInvalidForPlay,
                isInPlayPhase,
                isBottomSelectionPhase,
                isFirstTrick,
                isLandlord,
                canOverrideBlocking,
                isCardDisabled,
                willBeClickable: !isCardDisabled,
              });
            }
          }
          
          // Debug logging for bottom selection
          if (gameState?.phase === 'DISCARD_BOTTOM' && isPlayer0) {
            console.log("[BOTTOM_SELECTION_CARD]", {
              playerIndex,
              dealerIndex: gameState?.dealerIndex,
              currentPlayerIndex: gameState?.currentPlayerIndex,
              isPlayer0,
              phase: gameState?.phase,
              forceIsHumanDealerSelectingBottom,
              cardPoints: getCardPoints(card),
              isDisabledForBottom,
              isCardDisabled,
              cardOpacity,
              canSelectCard: !isCardDisabled,
              // Force check conditions
              condition1: gameState?.phase === 'DISCARD_BOTTOM',
              condition2: isPlayer0,
              condition3: gameState?.dealerIndex === 0,
              condition4: playerIndex === 0,
              allConditionsMet: gameState?.phase === 'DISCARD_BOTTOM' && isPlayer0 && gameState?.dealerIndex === 0 && playerIndex === 0,
            });
          }
          
          return (
            <View
              key={`${card.suit}-${card.rank}-${index}`}
              style={{
                position: 'absolute',
                left: index * overlapOffset * scale,
                transform: [
                  { scale },
                  ...(isSelectedForBottom || isSelectedForRuiPai ? [{ translateY: -8 }] : []),
                  ...(fanCard ? [{ translateY: -5 }] : []), // Slightly offset fan cards
                ],
                opacity: cardOpacity,
                zIndex: index + (fanCard ? 100 : 0) + (isHighlighted ? 200 : 0), // Highlighted cards on top
              }}
            >
              {isPlayer0 ? (
                <>
                  <CardView
                    card={card}
                    isTrump={cardIsTrump}
                    onPress={() => handleCardPress(card)}
                    disabled={isCardDisabled}
                    isHighlighted={isHighlighted}
                    onHighlightDone={() => handleHighlightDingZhuCardDone(playerIndex, cardId)}
                    ownerPlayerId={playerIndex}
                  />
                  {/* Fan card badge - small round badge at top-right corner */}
                  {fanCard && (
                    <View style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#ffd700',
                      borderWidth: 2,
                      borderColor: '#fff',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 1000,
                    }}>
                      <Text style={{ 
                        color: '#000', 
                        fontSize: 11, 
                        fontWeight: 'bold',
                        lineHeight: 12,
                      }}>
                        亮
                      </Text>
                    </View>
                  )}
                  {(isSelectedForBottom || isSelectedForRuiPai) && (
                    <View style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      backgroundColor: isSelectedForRuiPai ? '#ff6b6b' : '#ffd700',
                      borderRadius: 10,
                      width: 18,
                      height: 18,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>
                        {isSelectedForRuiPai ? '甩' : '底'}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                // Show card back for other players
                <CardBack scale={scale} />
              )}
            </View>
          );
        })}
      </View>
    );
  };
  
  // Helper function to render overlapping cards vertically
  const renderOverlappingHandVertical = (cards: Card[], playerIndex: number) => {
    const scale = 0.5;
    return (
      <View style={{ 
        position: 'relative', 
        width: cardHeight * scale,
        height: Math.min(cards.length * overlapOffsetVertical + cardWidth * scale, height * 0.4),
        alignItems: 'center',
      }}>
        {cards.map((card, index) => {
          return (
            <View
              key={`back-${index}`}
              style={{
                position: 'absolute',
                top: index * overlapOffsetVertical * scale,
                transform: [{ scale }],
                zIndex: index,
              }}
            >
              {/* Show card back for other players */}
              <CardBack scale={scale} />
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#0d5d2f',
      paddingTop: gameState?.phase === 'DISCARD_BOTTOM' && gameState?.dealerIndex === 0 ? (isLandscape ? 0 : 100) : 0,
    }}>
      {/* Top Bar - Game info + Action buttons - Pinned to screen top */}
      {gameState && (
        <View style={{
          position: 'absolute',
          top: 0, // Always pinned to top of screen
          left: 0,
          right: 0,
          height: 50, // Fixed height
          backgroundColor: '#1a4d2e',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 15,
          borderBottomWidth: 2,
          borderBottomColor: '#2d7a4d',
          zIndex: 100, // High z-index to ensure it's above all other elements
        }}>
          {/* Game Info - Left/Center */}
          <View style={{ flex: 1 }}>
            {isLandscape ? (
              <>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  第 {matchState.handNumber} 局 | 主花色: {gameState.trumpSuit} | 庄家: 玩家{gameState.dealerIndex + 1}
                </Text>
                <Text style={{ color: '#ccc', fontSize: 11, marginTop: 2 }}>
                  本局: 庄家方 {gameState.scores.dealerTeam} 分 | 闲家方 {gameState.scores.nonDealerTeam} 分
                </Text>
              </>
            ) : (
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                主花色: {gameState.trumpSuit} | 庄家: 玩家{gameState.dealerIndex + 1}
              </Text>
            )}
          </View>
          
          {/* Action Buttons Group - Right side */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            {/* Rules Button */}
            <Pressable
              onPress={() => setShowRules(true)}
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                规则
              </Text>
            </Pressable>
            
            {/* Auto-play (托管) Button */}
            <Pressable
              onPress={() => setIsAutoPlay(!isAutoPlay)}
              style={{
                backgroundColor: isAutoPlay ? '#4caf50' : 'rgba(0,0,0,0.7)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#fff',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                {isAutoPlay ? '取消托管' : '托管'}
              </Text>
            </Pressable>
            
            {/* History Button */}
            <Pressable
              onPress={() => setShowHistory(!showHistory)}
              style={{
                backgroundColor: showHistory ? '#4caf50' : 'rgba(0,0,0,0.7)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#fff',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                {showHistory ? '关闭历史' : '历史出牌'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* History Panel - Centered modal for landscape mode */}
      {showHistory && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <View style={{
            width: isLandscape ? '88%' : '90%',
            height: isLandscape ? '70%' : '80%',
            maxHeight: isLandscape ? '70%' : '80%',
            backgroundColor: 'rgba(0,0,0,0.95)',
            borderRadius: 15,
            padding: 20,
            borderWidth: 2,
            borderColor: '#ffd700',
          }}>
            {/* Header with title and close button */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 15,
            }}>
              <Text style={{ color: '#ffd700', fontSize: 18, fontWeight: 'bold' }}>
                历史出牌 ({gameState.tricks.length} 轮)
              </Text>
              <Pressable
                onPress={() => setShowHistory(false)}
                style={{
                  backgroundColor: '#4caf50',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                  关闭
                </Text>
              </Pressable>
            </View>
            
            {/* Scrollable content */}
            <View style={{ flex: 1, minHeight: 0 }}>
            {/* Debug: Log finalBottomCards in history panel */}
            {(() => {
              const bottomSetEvent = gameState.history?.find(e => e.type === 'BOTTOM_SET');
              const bottomCards = bottomSetEvent?.cards || gameState.finalBottomCards;
              console.log("[HISTORY_PANEL] Rendering history", {
                tricksCount: gameState.tricks.length,
                finalBottomCardsExists: !!gameState.finalBottomCards,
                finalBottomCardsLength: gameState.finalBottomCards?.length || 0,
                historyBottomCardsExists: !!bottomSetEvent,
                historyBottomCardsLength: bottomSetEvent?.cards?.length || 0,
                bottomCardsFromHistory: bottomCards,
                dealerIndex: gameState.dealerIndex,
                historyLength: gameState.history?.length || 0,
              });
              return null;
            })()}
            {(() => {
              // Check for LANDLORD_DISCARD events first, then BOTTOM_SET, then finalBottomCards
              const landlordDiscardEvent = gameState.history?.find(e => e.type === 'LANDLORD_DISCARD');
              const bottomSetEvent = gameState.history?.find(e => e.type === 'BOTTOM_SET');
              const bottomCards = landlordDiscardEvent?.cards || bottomSetEvent?.cards || gameState.finalBottomCards;
              return gameState.tricks.length > 0 || (bottomCards && bottomCards.length > 0);
            })() ? (
              <ScrollView 
                showsVerticalScrollIndicator={true}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 10, paddingRight: 5 }}
              >
              {/* Bottom Cards Row - Display as FIRST row */}
              {/* Always show bottom cards if they exist, regardless of dealer */}
              {/* Check for LANDLORD_DISCARD events first (preferred), then BOTTOM_SET, then finalBottomCards */}
              {(() => {
                // First, try to get bottom cards from LANDLORD_DISCARD event (preferred)
                const landlordDiscardEvent = gameState.history?.find(e => e.type === 'LANDLORD_DISCARD');
                const bottomSetEvent = gameState.history?.find(e => e.type === 'BOTTOM_SET');
                const bottomCards = landlordDiscardEvent?.cards || bottomSetEvent?.cards || gameState.finalBottomCards;
                const landlordIndex = landlordDiscardEvent?.landlordIndex ?? bottomSetEvent?.dealerIndex ?? gameState.dealerIndex;
                
                if (bottomCards && bottomCards.length > 0) {
                  // Format cards as text: <card1>, <card2>, ...
                  const cardsText = bottomCards.map(card => formatCard(card)).join(', ');
                  
                  return (
                    <View style={{ marginBottom: 12 }}>
                      {/* Bottom cards label - show as history entry */}
                      <Text style={{ 
                        color: '#ffd700', 
                        fontSize: 14, 
                        fontWeight: 'bold',
                        marginBottom: 6,
                      }}>
                        玩家{landlordIndex + 1} 扣底牌：{cardsText}
                      </Text>
                      
                      {/* Horizontal scrollable row for bottom cards */}
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ paddingRight: 10 }}
                      >
                        {bottomCards.map((card, cardIdx) => (
                          <View key={cardIdx} style={{ marginRight: 2, transform: [{ scale: 0.7 }] }}>
                            <CardView
                              card={card}
                              isTrump={isTrumpCard(card, gameState.config)}
                            />
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  );
                }
                return null;
              })()}
              
              {/* Trick History */}
              {/* Skip first trick (index 0) as it's the bottom discard, already shown above */}
              {gameState.tricks.map((trick, trickIndex) => {
                // Skip first trick (bottom discard) - it's already shown in the "扣底牌" section above
                if (trickIndex === 0) return null;
                
                const winnerIndex = trick.winnerIndex;
                
                return (
                  <View key={trickIndex} style={{ marginBottom: 12 }}>
                    {/* Trick label */}
                    <Text style={{ 
                      color: '#ffd700', 
                      fontSize: 14, 
                      fontWeight: 'bold',
                      marginBottom: 6,
                    }}>
                      第{trickIndex + 1}轮:
                    </Text>
                    
                    {/* Horizontal scrollable row for cards grouped by player */}
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={true}
                      contentContainerStyle={{ paddingRight: 10 }}
                    >
                      {(() => {
                        // Group cards by player (supports 甩牌 - multiple cards per player)
                        const cardsByPlayer: { [playerIndex: number]: Card[] } = {};
                        trick.cards.forEach(playedCard => {
                          if (!cardsByPlayer[playedCard.playerIndex]) {
                            cardsByPlayer[playedCard.playerIndex] = [];
                          }
                          cardsByPlayer[playedCard.playerIndex].push(playedCard.card);
                        });
                        
                        // Render in player order (0, 1, 2, 3)
                        return [0, 1, 2, 3].map(playerIndex => {
                          const playerCards = cardsByPlayer[playerIndex] || [];
                          if (playerCards.length === 0) return null;
                          
                          const isWinner = playerIndex === winnerIndex;
                          
                          return (
                            <View 
                              key={playerIndex} 
                              style={{ 
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginRight: 8,
                              }}
                            >
                              {/* Player label */}
                              <Text style={{ 
                                color: isWinner ? '#ffd700' : '#fff', 
                                fontSize: 12, 
                                fontWeight: isWinner ? 'bold' : 'normal',
                                marginRight: 4,
                              }}>
                                玩家{playerIndex + 1}:
                              </Text>
                              
                              {/* All cards for this player - smaller size */}
                              {playerCards.map((card, cardIdx) => (
                                <View key={cardIdx} style={{ marginRight: 2, transform: [{ scale: 0.7 }] }}>
                                  <CardView
                                    card={card}
                                    isTrump={isTrumpCard(card, gameState.config)}
                                  />
                                </View>
                              ))}
                              
                              {/* Winner indicator */}
                              {isWinner && (
                                <Text style={{ 
                                  color: '#ffd700', 
                                  fontSize: 10, 
                                  fontWeight: 'bold',
                                  marginLeft: 4,
                                }}>
                                  (赢)
                                </Text>
                              )}
                            </View>
                          );
                        });
                      })()}
                    </ScrollView>
                  </View>
                );
              })}
              </ScrollView>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
                <Text style={{ color: '#999', fontSize: 14 }}>
                  暂无历史记录
                </Text>
              </View>
            )}
            </View>
          </View>
        </View>
      )}

      {/* Rules Modal */}
      <Modal
        visible={showRules}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRules(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            width: isLandscape ? '70%' : '85%',
            maxHeight: '85%',
          }}>
            <Text style={{ 
              color: '#000', 
              fontSize: 20, 
              fontWeight: 'bold',
              marginBottom: 15,
            }}>
              游戏规则
            </Text>
            <ScrollView style={{ maxHeight: '80%' }}>
              <Text style={{ 
                fontSize: 14, 
                lineHeight: 20, 
                color: '#222',
              }}>
                {RULES_CN_TEXT}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={{
                backgroundColor: '#4caf50',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                marginTop: 15,
                alignSelf: 'flex-end',
              }}
              onPress={() => setShowRules(false)}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                关闭
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4-Player Table Layout - Classic Horizontal Card Table */}
      <View style={{ 
        flex: 1,
        position: 'relative',
      }}>
        {/* Top: Player 3 (index 2) */}
        <View style={{
          position: 'absolute',
          // Info bar: top = 0, height = 50
          // Info bar bottom = 0 + 50 = 50
          // Player 3 icon should be below info bar: top = infoBarBottom + iconMarginY
          // iconMarginY = 12px (small margin)
          top: 50 + 12, // Position below info bar
          left: 0,
          right: 0,
          alignItems: 'center', // CenterX alignment
          zIndex: 10,
        }}>
          <View style={{
            backgroundColor: gameState.currentPlayerIndex === 2 ? '#2d7a4d' : 'rgba(0,0,0,0.3)',
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: gameState.currentPlayerIndex === 2 ? '#ffd700' : 'transparent',
            marginBottom: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              {gameState.dealerIndex === 2 ? '👑 ' : ''}玩家3
            </Text>
          </View>
          {/* Top player hand - hidden in landscape mode (only show avatar + name + dealer crown) */}
          {/* Hand cards are hidden for other players in landscape mode */}
        </View>

        {/* Right: Player 2 (index 1) */}
        <View style={{
          position: 'absolute',
          right: 10,
          // Align icon centerY with new side players centerY (moved downward)
          top: sidePlayersCenterY - badgeHeight / 2,
          alignItems: 'center',
          zIndex: 10,
        }}>
          <View style={{
            backgroundColor: gameState.currentPlayerIndex === 1 ? '#2d7a4d' : 'rgba(0,0,0,0.3)',
            paddingHorizontal: 15,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: gameState.currentPlayerIndex === 1 ? '#ffd700' : 'transparent',
            marginBottom: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              {gameState.dealerIndex === 1 ? '👑 ' : ''}玩家2
            </Text>
          </View>
          {/* Right player hand - hidden in landscape mode (only show avatar + name + dealer crown) */}
          {/* Hand cards are hidden for other players in landscape mode */}
        </View>

        {/* Left: Player 4 (index 3) */}
        <View style={{
          position: 'absolute',
          left: 10,
          // Align icon centerY with new side players centerY (moved downward)
          top: sidePlayersCenterY - badgeHeight / 2,
          alignItems: 'center',
          zIndex: 10,
        }}>
          <View style={{
            backgroundColor: gameState.currentPlayerIndex === 3 ? '#2d7a4d' : 'rgba(0,0,0,0.3)',
            paddingHorizontal: 15,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: gameState.currentPlayerIndex === 3 ? '#ffd700' : 'transparent',
            marginBottom: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              {gameState.dealerIndex === 3 ? '👑 ' : ''}玩家4
            </Text>
          </View>
          {/* Left player hand - hidden in landscape mode (only show avatar + name + dealer crown) */}
          {/* Hand cards are hidden for other players in landscape mode */}
        </View>

        {/* Bottom: Player 0 (index 0) - Me */}
        {/* Hand cards container with layout measurement */}
        {/* Show hand during dealing animation OR during normal play (including ding-zhu phase) */}
        {((isDealing && dealingHands[0] && dealingHands[0].length > 0) || 
          (player1.hand && player1.hand.length > 0)) && (
          <View 
            onLayout={(event) => {
              const { x, y, width: handWidth } = event.nativeEvent.layout;
              // Store hand area left edge for icon positioning
              // handArea1.left = x (from layout)
              // handArea1.bottom = 10 (from screen bottom)
            }}
            style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            {renderOverlappingHandHorizontal(
              isDealing ? dealingHands[0] : player1.hand, 
              true,
              0
            )}
          </View>
        )}
        
        {/* Player 1 icon - centerY aligned with hand area, positioned to left of hand */}
        {(() => {
          // Calculate hand area position for icon alignment
          // Hand cards are at bottom: 10 (10px from screen bottom)
          // handArea1.bottom = height - 10
          // handArea1.top = height - 10 - cardHeight = height - 10 - 85 = height - 95
          // handArea1.centerY = (handArea1.top + handArea1.bottom) / 2 = (height - 95 + height - 10) / 2 = height - 52.5
          // Hand width = Math.min(cardCount * overlapOffset + cardWidth, width - 40)
          // handArea1.left = (width - handWidth) / 2
          // Safety check: handle empty hand case
          const handLength = player1.hand && player1.hand.length > 0 ? player1.hand.length : 0;
          const estimatedHandWidth = handLength > 0 
            ? Math.min(handLength * overlapOffset + cardWidth, width - 40)
            : cardWidth; // Use default card width when hand is empty
          const handAreaLeft = (width - estimatedHandWidth) / 2;
          const handAreaBottom = height - 10;
          const handAreaTop = height - 10 - cardHeight;
          const handAreaCenterY = (handAreaTop + handAreaBottom) / 2;
          const iconOffsetX = 12; // 12-20px gap between icon and hand
          const iconWidth = 100; // Approximate icon width (padding + text)
          const iconHeight = badgeHeight; // Icon badge height
          
          return (
            <View style={{
              position: 'absolute',
              // Icon centerY should align with handArea1.centerY
              // icon.centerY = handArea1.centerY
              // icon.top = icon.centerY - iconHeight/2 = handAreaCenterY - iconHeight/2
              top: handAreaCenterY - iconHeight / 2,
              // Icon should be to the left of hand: right = handArea1.left - iconOffsetX
              // Using left positioning: left = handArea1.left - iconOffsetX - iconWidth
              left: Math.max(10, handAreaLeft - iconOffsetX - iconWidth), // Position to left of hand, ensure not negative
              alignItems: 'flex-start',
              zIndex: 10,
            }}>
              <View style={{
                backgroundColor: gameState.currentPlayerIndex === 0 ? '#2d7a4d' : 'rgba(0,0,0,0.3)',
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: gameState.currentPlayerIndex === 0 ? '#ffd700' : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  {gameState.dealerIndex === 0 ? '👑 ' : ''}玩家1
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Current Trick Area - Diamond layout (菱形) with 4 horizontal groups */}
        
        {/* Bottom Cards - Only visible during first trick (bottom discard) */}
        {(() => {
          // Get bottom cards from LANDLORD_DISCARD event first, then BOTTOM_SET, then bottomCards/finalBottomCards
          const landlordDiscardEvent = gameState?.history?.find(e => e.type === 'LANDLORD_DISCARD');
          const bottomSetEvent = gameState?.history?.find(e => e.type === 'BOTTOM_SET');
          const bottomCards = landlordDiscardEvent?.cards || bottomSetEvent?.cards || gameState?.bottomCards || gameState?.finalBottomCards;
          const dealerIndex = landlordDiscardEvent?.landlordIndex ?? bottomSetEvent?.dealerIndex ?? gameState?.dealerIndex ?? 0;
          
          // Show bottom cards:
          // 1. Before/during bottom discard (tricks.length === 0)
          // 2. After bottom discard complete, waiting for next trick (tricks.length === 1 and showNextTrickButton)
          // Hide bottom cards once next trick starts (tricks.length >= 2)
          const isBottomDiscardPhase = !gameState || gameState.tricks.length === 0;
          const isWaitingForNextTrickAfterBottom = gameState && gameState.tricks.length === 1 && showNextTrickButton;
          const shouldShowBottomCards = isBottomDiscardPhase || isWaitingForNextTrickAfterBottom;
          
          if (!bottomCards || bottomCards.length === 0 || !shouldShowBottomCards) return null;
          
          // Display bottom cards at dealer's position (same as trick cards)
          // Player 0 (bottom): cards above hand
          if (dealerIndex === 0) {
            return (
              <View style={{
                position: 'absolute',
                bottom: handAreaHeight + 12,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 5,
              }}>
                <View style={{ 
                  position: 'relative',
                  width: bottomCards.length > 1 
                    ? (cardWidth * trickCardScale) + (bottomCards.length - 1) * trickCardOverlapOffset
                    : cardWidth * trickCardScale,
                  height: cardHeight * trickCardScale,
                }}>
                  {bottomCards.map((card, idx) => (
                    <View 
                      key={idx} 
                      style={{ 
                        position: 'absolute',
                        left: idx * trickCardOverlapOffset,
                        transform: [{ scale: trickCardScale }],
                        zIndex: idx,
                      }}
                    >
                      <CardView
                        card={card}
                        isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          
          // Player 1 (right): cards to the LEFT of icon
          if (dealerIndex === 1) {
            return (
              <View style={{
                position: 'absolute',
                right: 126,
                top: sidePlayersCenterY - (cardHeight * trickCardScale) / 2,
                flexDirection: 'row',
                alignItems: 'center',
                zIndex: 5,
              }}>
                <View style={{ 
                  position: 'relative',
                  width: bottomCards.length > 1 
                    ? (cardWidth * trickCardScale) + (bottomCards.length - 1) * trickCardOverlapOffset
                    : cardWidth * trickCardScale,
                  height: cardHeight * trickCardScale,
                }}>
                  {bottomCards.map((card, idx) => (
                    <View 
                      key={idx} 
                      style={{ 
                        position: 'absolute',
                        left: idx * trickCardOverlapOffset,
                        transform: [{ scale: trickCardScale }],
                        zIndex: idx,
                      }}
                    >
                      <CardView
                        card={card}
                        isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          
          // Player 2 (top): cards BELOW icon
          if (dealerIndex === 2) {
            return (
              <View style={{
                position: 'absolute',
                top: 50 + 12 + badgeHeight + 5 + 12,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 5,
              }}>
                <View style={{ 
                  position: 'relative',
                  width: bottomCards.length > 1 
                    ? (cardWidth * trickCardScale) + (bottomCards.length - 1) * trickCardOverlapOffset
                    : cardWidth * trickCardScale,
                  height: cardHeight * trickCardScale,
                }}>
                  {bottomCards.map((card, idx) => (
                    <View 
                      key={idx} 
                      style={{ 
                        position: 'absolute',
                        left: idx * trickCardOverlapOffset,
                        transform: [{ scale: trickCardScale }],
                        zIndex: idx,
                      }}
                    >
                      <CardView
                        card={card}
                        isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          
          // Player 3 (left): cards to the RIGHT of icon
          if (dealerIndex === 3) {
            return (
              <View style={{
                position: 'absolute',
                left: 110 + 16,
                top: sidePlayersCenterY - (cardHeight * trickCardScale) / 2,
                flexDirection: 'row',
                alignItems: 'center',
                zIndex: 5,
              }}>
                <View style={{ 
                  position: 'relative',
                  width: bottomCards.length > 1 
                    ? (cardWidth * trickCardScale) + (bottomCards.length - 1) * trickCardOverlapOffset
                    : cardWidth * trickCardScale,
                  height: cardHeight * trickCardScale,
                }}>
                  {bottomCards.map((card, idx) => (
                    <View 
                      key={idx} 
                      style={{ 
                        position: 'absolute',
                        left: idx * trickCardOverlapOffset,
                        transform: [{ scale: trickCardScale }],
                        zIndex: idx,
                      }}
                    >
                      <CardView
                        card={card}
                        isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          
          return null;
        })()}
        
        {/* Bottom Reveal Phase - Show continue button for local player */}
        {isBottomRevealPhase && gameState && gameState.dealerIndex === 0 && (
          <View style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -50,
            marginTop: 100,
            alignItems: 'center',
            zIndex: 50,
          }}>
            <Pressable
              onPress={endBottomRevealAndStartPlay}
              style={{
                backgroundColor: '#4caf50',
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
              }}>
                继续
              </Text>
            </Pressable>
          </View>
        )}
        
        {/* Player 3 (index 2) - Card BELOW icon, centerX aligned with icon */}
        {!isBottomRevealPhase && getTrickCards(2).length > 0 && (
          <View style={{
            position: 'absolute',
            // Player 3 icon: top = 50 + 12 = 62
            // Icon badge height ≈ 32px (paddingVertical: 8 + fontSize: 16 + paddingVertical: 8)
            // Icon marginBottom = 5px
            // Icon bottom = icon.top + badgeHeight + marginBottom = 62 + 32 + 5 = 99
            // Card should be BELOW icon: top = icon.bottom + cardOffsetY
            // cardOffsetY = 12px (small gap)
            top: 50 + 12 + badgeHeight + 5 + 12, // Position BELOW icon with gap
            left: 0,
            right: 0,
            alignItems: 'center', // CenterX alignment with Player 3 icon
            zIndex: 5,
          }}>
            <View style={{ 
              position: 'relative',
              width: getTrickCards(2).length > 1 
                ? (cardWidth * trickCardScale) + (getTrickCards(2).length - 1) * trickCardOverlapOffset
                : cardWidth * trickCardScale,
              height: cardHeight * trickCardScale,
            }}>
              {getTrickCards(2).map((card, idx) => (
                <View 
                  key={idx} 
                  style={{ 
                    position: 'absolute',
                    left: idx * trickCardOverlapOffset,
                    transform: [{ scale: trickCardScale }],
                    zIndex: idx, // Later cards on top
                  }}
                >
                  <CardView
                    card={card}
                    isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Player 2 (index 1) - Card to the LEFT of icon, centerY aligned with side players centerY */}
        {!isBottomRevealPhase && getTrickCards(1).length > 0 && (
          <View style={{
            position: 'absolute',
            // Player 2 icon: right: 10
            // Icon badge width ≈ 100px (paddingHorizontal: 15 + text + 15 + gap)
            // Icon left edge is at: width - 10 - 100 = width - 110 (from left), or 110px (from right)
            // Card should be to the LEFT of icon: card.right = icon.left + sideOffset
            // sideOffset = 16px
            // Card right edge = 110 + 16 = 126px (from right)
            right: 126, // Position to LEFT of icon
            // CenterY alignment: use new side players centerY (moved downward)
            // Card scaled height = 85 * 0.65 = 55.25px
            // Card centerY should match sidePlayersCenterY: top = sidePlayersCenterY - cardHeight/2
            top: sidePlayersCenterY - (cardHeight * trickCardScale) / 2,
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 5,
          }}>
            <View style={{ 
              position: 'relative',
              width: getTrickCards(1).length > 1 
                ? (cardWidth * trickCardScale) + (getTrickCards(1).length - 1) * trickCardOverlapOffset
                : cardWidth * trickCardScale,
              height: cardHeight * trickCardScale,
            }}>
              {getTrickCards(1).map((card, idx) => (
                <View 
                  key={idx} 
                  style={{ 
                    position: 'absolute',
                    left: idx * trickCardOverlapOffset,
                    transform: [{ scale: trickCardScale }],
                    zIndex: idx, // Later cards on top
                  }}
                >
                  <CardView
                    card={card}
                    isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom position (Player 0, index 0) - above hand */}
        {!isBottomRevealPhase && getTrickCards(0).length > 0 && (
          <View style={{
            position: 'absolute',
            bottom: handAreaHeight + 12,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 5,
          }}>
            <View style={{ 
              position: 'relative',
              width: getTrickCards(0).length > 1 
                ? (cardWidth * trickCardScale) + (getTrickCards(0).length - 1) * trickCardOverlapOffset
                : cardWidth * trickCardScale,
              height: cardHeight * trickCardScale,
            }}>
              {getTrickCards(0).map((card, idx) => (
                <View 
                  key={idx} 
                  style={{ 
                    position: 'absolute',
                    left: idx * trickCardOverlapOffset,
                    transform: [{ scale: trickCardScale }],
                    zIndex: idx, // Later cards on top
                  }}
                >
                  <CardView
                    card={card}
                    isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Player 4 (index 3) - Card to the RIGHT of icon, centerY aligned with side players centerY */}
        {!isBottomRevealPhase && getTrickCards(3).length > 0 && (
          <View style={{
            position: 'absolute',
            // Player 4 icon: left: 10
            // Icon badge width ≈ 100px (paddingHorizontal: 15 + text + 15 + gap)
            // Icon right edge = 10 + 100 = 110
            // Card should be to the RIGHT of icon: card.left = icon.right + sideOffset
            // sideOffset = 16px
            // Card left edge = 110 + 16 = 126
            left: 110 + 16, // Position to RIGHT of icon
            // CenterY alignment: use new side players centerY (moved downward)
            // Card scaled height = 85 * 0.65 = 55.25px
            // Card centerY should match sidePlayersCenterY: top = sidePlayersCenterY - cardHeight/2
            top: sidePlayersCenterY - (cardHeight * trickCardScale) / 2,
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 5,
          }}>
            <View style={{ 
              position: 'relative',
              width: getTrickCards(3).length > 1 
                ? (cardWidth * trickCardScale) + (getTrickCards(3).length - 1) * trickCardOverlapOffset
                : cardWidth * trickCardScale,
              height: cardHeight * trickCardScale,
            }}>
              {getTrickCards(3).map((card, idx) => (
                <View 
                  key={idx} 
                  style={{ 
                    position: 'absolute',
                    left: idx * trickCardOverlapOffset,
                    transform: [{ scale: trickCardScale }],
                    zIndex: idx, // Later cards on top
                  }}
                >
                  <CardView
                    card={card}
                    isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Trick Winner Message - Show when trick is complete */}
        {isTrickComplete && lastTrickWinnerIndex !== null && (
          <View style={{ 
            position: 'absolute',
            top: '45%',
            left: '50%',
            marginLeft: -80,
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: 12,
            borderRadius: 8,
            zIndex: 100,
          }}>
            <Text style={{ color: '#ffd700', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
              本轮赢家: 玩家{lastTrickWinnerIndex + 1}
            </Text>
          </View>
        )}
      </View>

      {/* 定主 Phase Dialog - Centered modal overlay */}
      {/* Show DingZhu UI if: (1) mid-dealing and pendingDingZhuPlayerId is 0, OR (2) after dealing and firstTwoCandidate.playerIndex is 0 */}
      {/* Safety guard: don't show if trump has already been chosen */}
      {isDingZhuPhase && !hasTrumpBeenChosen && (
        (pendingDingZhuPlayerId === 0 && pendingDingZhuCard) ||
        (firstTwoCandidate && firstTwoCandidate.playerIndex === 0)
      ) && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 200,
        }}>
          <View style={{
            backgroundColor: '#2d7a4d',
            paddingVertical: 24,
            paddingHorizontal: 30,
            borderRadius: 15,
            borderWidth: 3,
            borderColor: '#ffd700',
            width: isLandscape ? '60%' : '85%',
            maxWidth: 400,
            alignItems: 'center',
          }}>
            <Text style={{ 
              color: '#fff', 
              fontSize: isLandscape ? 18 : 20, 
              fontWeight: 'bold', 
              textAlign: 'center',
              marginBottom: 12,
            }}>
              {(() => {
                // Use pendingDingZhuCard if mid-dealing, otherwise use firstTwoCandidate
                const card = pendingDingZhuCard || (firstTwoCandidate ? { suit: firstTwoCandidate.suit, rank: 2 } : null);
                return card ? `你起到了 ${card.suit}2，要不要用它来定主？` : '要不要定主？';
              })()}
            </Text>
            {(() => {
              // Calculate candidate trump cards for Player 1
              const player1Hand = gameState?.players[0]?.hand || [];
              // Use pendingDingZhuCard suit if mid-dealing, otherwise use firstTwoCandidate
              const proposedTrumpSuit = pendingDingZhuCard?.suit as Suit || firstTwoCandidate?.suit || '♦';
              const tempConfig: GameConfig = {
                trumpSuit: proposedTrumpSuit,
                hasThreeFan: false,
                hasFiveFan: false,
              };
              
              // Count candidate trump cards (cards that would be trump if this suit is chosen)
              const candidateTrumpCards = player1Hand.filter(card => 
                isTrump(card, proposedTrumpSuit, tempConfig)
              );
              const candidateCount = candidateTrumpCards.length;
              
              return (
                <Text style={{
                  color: '#ffd700',
                  fontSize: isLandscape ? 14 : 16,
                  textAlign: 'center',
                  marginBottom: 24,
                }}>
                  你当前手里有 {candidateCount} 张候选主牌
                </Text>
              );
            })()}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 15 }}>
              <Pressable
                onPress={() => handleDingZhuChoice(true)}
                style={{
                  backgroundColor: '#4caf50',
                  paddingHorizontal: 30,
                  paddingVertical: 12,
                  borderRadius: 8,
                  minWidth: 100,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
                  定主
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleDingZhuChoice(false)}
                style={{
                  backgroundColor: '#666',
                  paddingHorizontal: 30,
                  paddingVertical: 12,
                  borderRadius: 8,
                  minWidth: 100,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
                  不定
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Flying card animation during dealing */}
      {flyingCard && (
        <Animated.View
          style={{
            position: 'absolute',
            left: flyingCard.animValue.x,
            top: flyingCard.animValue.y,
            transform: [
              { translateX: -27.5 }, // Half of cardWidth
              { translateY: -42.5 }, // Half of cardHeight
            ],
            zIndex: 1000,
          }}
        >
          <CardView card={flyingCard.card} width={55} height={85} />
        </Animated.View>
      )}

      {/* Central deck pile during dealing */}
      {isDealing && (
        <View
          style={{
            position: 'absolute',
            left: width / 2 - 27.5,
            top: height / 2 - 42.5,
            zIndex: 999,
          }}
        >
          <View
            style={{
              width: 55,
              height: 85,
              backgroundColor: '#1a1a1a',
              borderRadius: 8,
              borderWidth: 2,
              borderColor: '#ffd700',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffd700', fontSize: 12, fontWeight: 'bold' }}>
              牌堆
            </Text>
          </View>
        </View>
      )}

      {/* Ding-zhu Toast Notification - Temporary */}
      {dingZhuToastVisible && dingZhuToastMessage && (
        <View style={{
          position: 'absolute',
          top: isLandscape ? 75 : 50,
          left: isLandscape ? 'auto' : '10%',
          right: isLandscape ? 15 : '10%',
          alignSelf: isLandscape ? 'flex-end' : 'center',
          backgroundColor: 'rgba(0,0,0,0.9)',
          paddingHorizontal: 15,
          paddingVertical: 8,
          borderRadius: 20,
          zIndex: 50,
          borderWidth: 2,
          borderColor: '#ffd700',
        }}>
          <Text style={{ color: '#ffd700', fontSize: isLandscape ? 13 : 15, fontWeight: 'bold' }}>
            {dingZhuToastMessage}
          </Text>
        </View>
      )}

      {/* 断电 Notification - Small Pill/Toast */}
      {!isDingZhuPhase && !firstTwoCandidate && gameState && (
        <View style={{
          position: 'absolute',
          top: isLandscape ? 75 : 50,
          left: isLandscape ? 'auto' : '10%',
          right: isLandscape ? 15 : '10%',
          alignSelf: isLandscape ? 'flex-end' : 'center',
          backgroundColor: 'rgba(0,0,0,0.8)',
          paddingHorizontal: 15,
          paddingVertical: 6,
          borderRadius: 20,
          zIndex: 50,
          borderWidth: 1,
          borderColor: '#ffd700',
        }}>
          <Text style={{ color: '#ffd700', fontSize: isLandscape ? 12 : 14 }}>
            断电：随机主花色为 {gameState.trumpSuit}
          </Text>
        </View>
      )}

      {/* Game Phase Indicator Banner - REMOVED per user request */}

      {/* REMOVED: Old bottom card selection UI - now handled as first trick */}
      {/* Bottom card selection is now part of normal play (first trick) */}

      {/* REMOVED: Old AI bottom selection notification - now handled as first trick */}
      {/* AI bottom card selection is now part of normal play (first trick) */}

      {/* Pre-Fan Phase Panel - Only show when player has eligible fan cards */}
      {/* Show during dealing phase (DEAL) or before bottom discard, even if in DingZhu phase */}
      {/* Allow showing during dealing even if gameState doesn't exist yet or is in DingZhu phase */}
      {isPreFanPhase && (canThreeFan || canFiveFan) && 
       (isDealing || (gameState && gameState.phase !== 'DISCARD_BOTTOM' && (!isDingZhuPhase || gameState.phase === 'DEAL'))) && (
        <View style={{
          backgroundColor: '#2d7a4d',
          padding: 20,
          borderTopWidth: 2,
          borderTopColor: '#ffd700',
        }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 }}>
            选择亮牌
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {canFiveFan && (
              <Pressable
                onPress={() => handleSelectFan('five')}
                style={{
                  backgroundColor: '#4caf50',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  亮五反
                </Text>
              </Pressable>
            )}
            {canThreeFan && (
              <Pressable
                onPress={() => handleSelectFan('three')}
                style={{
                  backgroundColor: '#4caf50',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  亮三反
                </Text>
              </Pressable>
            )}
            {/* Only show "不亮" button when at least one fan option is available */}
            {(canThreeFan || canFiveFan) && (
              <Pressable
                onPress={() => handleSelectFan('none')}
                style={{
                  backgroundColor: '#666',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  不亮
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Card Selection Panel - Show when Player 0 is leader and has selected cards */}
      {gameState && gameState.currentPlayerIndex === 0 && gameState.currentTrick.length === 0 && 
       selectedCards.length > 0 && !isTrickComplete && !isHandFinished && (() => {
         // Check if this is the first trick (bottom card play)
         const isFirstTrick = gameState.tricks.length === 0 && gameState.currentTrick.length === 0;
         const isLandlord = gameState.dealerIndex === 0;
         const isBottomCardSelection = isFirstTrick && isLandlord;
         // Show button if: not in DingZhu phase (or in play phase), OR in bottom card selection phase
         const shouldShowButton = (!isDingZhuPhase || gameState.phase === 'PLAY_TRICK' || isBottomSelectionPhase || isBottomCardSelection);
         if (!shouldShowButton) return null;
        // Validate selection for rui-pai (if 2+ cards)
        // Pass all players' hands to check if higher cards exist in ANY player's hand
        const allPlayersHands = gameState ? gameState.players.map(p => p.hand) : undefined;
        const validation = selectedCards.length >= 2 && gameState ? validateRuiPaiSelection(
          selectedCards,
          gameState.players[0].hand,
          gameState.trumpSuit,
          gameState.config,
          gameState.tricks, // Pass previous tricks to check played cards
          allPlayersHands // Pass all players' hands to check ALL hands, not just current player
        ) : { valid: true, message: '' };
        const ruiPaiValid = validation.valid;
        const ruiPaiError = validation.message || '';
        
        return (
          <View style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            backgroundColor: '#2d7a4d',
            padding: 12,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#ffd700',
            zIndex: 20,
            alignItems: 'flex-end',
            minWidth: 150,
          }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' }}>
              {selectedCards.length === 1 ? '已选择 1 张牌' : `已选择 ${selectedCards.length} 张牌`}
            </Text>
            {/* Removed inline error message - will use system Alert instead */}
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {/* Single card play button - show when exactly 1 card selected */}
              {selectedCards.length === 1 && (
                <Pressable
                  onPress={() => {
                    const cardToPlay = selectedCards[0];
                    setSelectedCards([]);
                    handleCardPlay(cardToPlay, true);
                  }}
                  style={{
                    backgroundColor: '#4caf50',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                    minWidth: 100,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                    {isFirstTrick && isLandlord && isBottomSelectionPhase ? '扣底牌' : '出牌'}
                  </Text>
                </Pressable>
              )}
              {/* Rui-pai button - show when 2+ cards selected */}
              {/* For first trick (bottom card play), only show if exactly 6 cards selected */}
              {selectedCards.length >= 2 && (!isFirstTrick || !isLandlord || selectedCards.length === 6) && (
                <Pressable
                  onPress={() => {
                    const isBottomCardPlay = isFirstTrick && isLandlord && selectedCards.length === 6;
                    if (isBottomCardPlay && (isBottomSelectionPhase || gameState.phase === 'PLAY_TRICK' || gameState.phase === 'DEAL')) {
                      // First trick: play 6 cards as bottom cards (skip rui-pai validation)
                      console.log("[BOTTOM_DISCARD] Playing 6 cards as bottom cards");
                      playMultipleCardsInOneTrick(selectedCards);
                      setSelectedCards([]);
                    } else {
                      // Normal rui-pai sequence with validation
                      startRuiPaiSequence(selectedCards);
                    }
                  }}
                  style={{
                    backgroundColor: (isFirstTrick && isLandlord && selectedCards.length === 6 && (isBottomSelectionPhase || gameState.phase === 'PLAY_TRICK' || gameState.phase === 'DEAL')) || ruiPaiValid ? '#4caf50' : '#666',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                    opacity: (isFirstTrick && isLandlord && selectedCards.length === 6 && (isBottomSelectionPhase || gameState.phase === 'PLAY_TRICK' || gameState.phase === 'DEAL')) || ruiPaiValid ? 1 : 0.7,
                    minWidth: 100,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                    {isFirstTrick && isLandlord && selectedCards.length === 6 && (isBottomSelectionPhase || gameState.phase === 'PLAY_TRICK' || gameState.phase === 'DEAL') ? '扣底牌' : `甩牌 (${selectedCards.length})`}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setSelectedCards([])}
                style={{
                  backgroundColor: '#666',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  minWidth: 100,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                  取消
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })()}

      {/* Fan cards are now highlighted within the hand - no separate overlay */}

      {/* Next Trick Button - Show when trick is complete (positioned separately) */}
      {isTrickComplete && lastTrickWinnerIndex !== null && (
        <Pressable
          onPress={handleNextTrick}
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            backgroundColor: '#4caf50',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: '#fff',
            minWidth: 100,
            zIndex: 15,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
            {isRuiPaiActive && ruiPaiQueue.length > 1 
              ? `继续甩牌 (${ruiPaiQueue.length - 1})` 
              : '下一轮'}
          </Text>
        </Pressable>
      )}

      {/* Game Info Bar - Only show in portrait or as minimal overlay */}
      {!isLandscape && (
        <View style={{
          backgroundColor: '#1a4d2e',
          padding: 10,
          borderTopWidth: 2,
          borderTopColor: '#2d7a4d',
        }}>
          <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>
            主花色: {gameState.trumpSuit} | 庄家: 玩家{gameState.dealerIndex + 1}
          </Text>
          <Text style={{ color: '#ccc', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            庄家方: {gameState.scores.dealerTeam} 分 | 闲家方: {gameState.scores.nonDealerTeam} 分
          </Text>
        </View>
      )}

      {/* Hand Finished Modal - Result Summary */}
      <Modal
        visible={isHandFinished && finalScores !== null}
        transparent={true}
        animationType="fade"
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#1a4d2e',
            borderRadius: 15,
            padding: 25,
            width: '90%',
            maxWidth: 400,
            borderWidth: 3,
            borderColor: '#ffd700',
          }}>
            <Text style={{ color: '#ffd700', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
              本局结束
            </Text>
            
            {finalScores && (
              <>
                <ScrollView style={{ maxHeight: '70%' }} showsVerticalScrollIndicator={true}>
                  {/* Concise Summary */}
                  {(() => {
                    const nonDealerTeamPoints = finalScores.nonDealerTeam.totalPoints;
                    const dealerStepsDown = nonDealerTeamPoints > 40;
                    const tributeText = nextHandTributeType === 'none' 
                      ? '不用进贡'
                      : nextHandTributeType === 'single'
                        ? '单进贡'
                        : '双进贡';
                    
                    return (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                          第 {matchState.handNumber} 局结束
                        </Text>
                        
                        {/* Result Summary */}
                        <View style={{ 
                          backgroundColor: '#0d5d2f',
                          padding: 15,
                          borderRadius: 8,
                          marginBottom: 10,
                        }}>
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                            本局结果：{dealerStepsDown ? '庄家下台' : '庄家连庄'}
                          </Text>
                          <Text style={{ color: '#ffd700', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
                            下一局：{tributeText}
                          </Text>
                        </View>
                        
                        {/* Toggle Score Details Button */}
                        <Pressable
                          onPress={() => setShowScoreDetails(!showScoreDetails)}
                          style={{
                            backgroundColor: '#2d7a4d',
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginBottom: 15,
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                            {showScoreDetails ? '收起分牌明细' : '查看本局分牌明细'}
                          </Text>
                        </Pressable>
                        
                        {/* Score Details (Collapsible) */}
                        {showScoreDetails && (
                          <View style={{ marginBottom: 15 }}>
                            {/* Dealer Team Score */}
                            <View style={{ backgroundColor: '#0d5d2f', padding: 15, borderRadius: 8, marginBottom: 10 }}>
                              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                                庄家方: {finalScores.dealerTeam.totalPoints} 分
                              </Text>
                              {finalScores.dealerTeam.scoringCards.length > 0 ? (
                                <View style={{ marginTop: 8 }}>
                                  <Text style={{ color: '#ccc', fontSize: 12, marginBottom: 5 }}>
                                    得分牌:
                                  </Text>
                                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                    {finalScores.dealerTeam.scoringCards.map((card, index) => (
                                      <View key={index} style={{ marginRight: 5 }}>
                                        <CardView
                                          card={card}
                                          isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                                        />
                                      </View>
                                    ))}
                                  </ScrollView>
                                </View>
                              ) : (
                                <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
                                  无得分牌
                                </Text>
                              )}
                            </View>
                            
                            {/* Non-Dealer Team Score */}
                            <View style={{ backgroundColor: '#0d5d2f', padding: 15, borderRadius: 8, marginBottom: 10 }}>
                              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                                闲家方: {finalScores.nonDealerTeam.totalPoints} 分
                              </Text>
                              {finalScores.nonDealerTeam.scoringCards.length > 0 ? (
                                <View style={{ marginTop: 8 }}>
                                  <Text style={{ color: '#ccc', fontSize: 12, marginBottom: 5 }}>
                                    得分牌:
                                  </Text>
                                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                    {finalScores.nonDealerTeam.scoringCards.map((card, index) => (
                                      <View key={index} style={{ marginRight: 5 }}>
                                        <CardView
                                          card={card}
                                          isTrump={gameState ? isTrumpCard(card, gameState.config) : false}
                                        />
                                      </View>
                                    ))}
                                  </ScrollView>
                                </View>
                              ) : (
                                <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
                                  无得分牌
                                </Text>
                              )}
                            </View>
                            
                            {/* Match Totals */}
                            <View style={{ marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#555' }}>
                              <Text style={{ color: '#ffd700', fontSize: 14, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                                比赛总分 (累计):
                              </Text>
                              <View style={{ backgroundColor: '#0d5d2f', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                                  庄家方: {matchState.dealerTeamTotal + finalScores.dealerTeam.totalPoints} 分
                                </Text>
                              </View>
                              <View style={{ backgroundColor: '#0d5d2f', padding: 12, borderRadius: 8 }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                                  闲家方: {matchState.nonDealerTeamTotal + finalScores.nonDealerTeam.totalPoints} 分
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </ScrollView>
                
                {/* Action Buttons - Fixed at bottom */}
                <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: '#555', paddingTop: 15 }}>
                  <Pressable
                    onPress={handleNextHand}
                    style={{
                      backgroundColor: '#4caf50',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                      继续下一局
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={handleNewGame}
                    style={{
                      backgroundColor: '#666',
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                      新比赛
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Tribute Visualization Overlay */}
      {showTributeVisualization && tributeVisualizationData.length > 0 && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: '#1a4d2e',
            padding: 30,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#ffd700',
            maxWidth: '90%',
            alignItems: 'center',
          }}>
            <Text style={{
              color: '#ffd700',
              fontSize: 24,
              fontWeight: 'bold',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              进贡阶段
            </Text>
            
            {tributeVisualizationData.map((data, index) => {
              const getCardDisplayName = (card: Card): string => {
                if (card.rank === 'BJ') return '小王';
                if (card.rank === 'SJ') return '大王';
                const suitNames: Record<Suit, string> = {
                  '♠': '♠',
                  '♥': '♥',
                  '♦': '♦',
                  '♣': '♣',
                };
                const rankNames: Record<number, string> = {
                  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
                  9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
                };
                const rank = typeof card.rank === 'number' ? rankNames[card.rank] || String(card.rank) : '';
                return `${suitNames[card.suit]}${rank}`;
              };
              
              return (
                <View key={index} style={{
                  marginBottom: 15,
                  padding: 15,
                  backgroundColor: '#0d5d2f',
                  borderRadius: 8,
                  width: '100%',
                  alignItems: 'center',
                }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 16,
                    textAlign: 'center',
                    lineHeight: 24,
                  }}>
                    玩家{data.from + 1} 向 玩家{data.to + 1} 进贡 {getCardDisplayName(data.fromCard)}
                  </Text>
                  <Text style={{
                    color: '#ffd700',
                    fontSize: 16,
                    textAlign: 'center',
                    marginTop: 5,
                    lineHeight: 24,
                  }}>
                    玩家{data.to + 1} 还 {getCardDisplayName(data.toCard)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
