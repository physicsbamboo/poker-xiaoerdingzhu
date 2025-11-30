import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Card } from '@/src/game/types';

interface CardViewProps {
  card: Card;
  isTrump?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  isHighlighted?: boolean;
  onHighlightDone?: () => void;
  ownerPlayerId?: number;
}

/**
 * Format rank for display
 */
function formatRank(rank: Card['rank']): string {
  if (typeof rank === 'number') {
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    if (rank === 14) return 'A';
    return rank.toString();
  }
  return rank; // 'SJ' or 'BJ'
}

/**
 * Get text color based on suit
 */
function getSuitColor(suit: Card['suit']): string {
  if (suit === '♥' || suit === '♦') {
    return '#D11A1A'; // Red for hearts and diamonds
  }
  if (suit === '♠' || suit === '♣') {
    return '#111111'; // Black for spades and clubs
  }
  return '#111111'; // Default black for jokers
}

export default function CardView({ 
  card, 
  isTrump = false, 
  onPress, 
  disabled = false,
  isHighlighted = false,
  onHighlightDone,
  ownerPlayerId,
}: CardViewProps) {
  const suitColor = getSuitColor(card.suit);
  const isJoker = card.suit === 'JOKER';
  const scale = useRef(new Animated.Value(1)).current;
  const [hasPlayedHighlight, setHasPlayedHighlight] = useState(false);

  // Handle highlight animation
  useEffect(() => {
    if (!isHighlighted || hasPlayedHighlight) return;

    setHasPlayedHighlight(true);

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animation completed - notify parent
      if (onHighlightDone) {
        onHighlightDone();
      }
    });
  }, [isHighlighted, hasPlayedHighlight, scale, onHighlightDone]);

  // Reset highlight state when isHighlighted becomes false
  useEffect(() => {
    if (!isHighlighted && hasPlayedHighlight) {
      setHasPlayedHighlight(false);
      scale.setValue(1);
    }
  }, [isHighlighted, hasPlayedHighlight, scale]);
  
  const cardContent = (
    <Animated.View
      style={[
        styles.card,
        isTrump && styles.cardTrump,
        disabled && styles.cardDisabled,
        !disabled && styles.cardPlayable,
        { transform: [{ scale }] },
        isHighlighted && styles.cardHighlighted,
      ]}
    >
      {isJoker ? (
        // Joker card - vertical JOKER text in top-left corner
        <View style={styles.jokerTopLeft}>
          {['J', 'O', 'K', 'E', 'R'].map((letter, idx) => (
            <Text
              key={idx}
              style={[
                styles.jokerVerticalText,
                card.rank === 'BJ' && styles.jokerRedText,
                card.rank === 'SJ' && styles.jokerBlackText,
              ]}
            >
              {letter}
            </Text>
          ))}
        </View>
      ) : (
        <>
          {/* Top-left corner: Rank + small suit */}
          <View style={styles.topLeft}>
            <Text style={[styles.rankText, { color: suitColor }]}>
              {formatRank(card.rank)}
            </Text>
            <Text style={[styles.smallSuitText, { color: suitColor }]}>
              {card.suit}
            </Text>
          </View>

          {/* Bottom-right corner: Big suit symbol */}
          <View style={styles.bottomRight}>
            <Text style={[styles.bigSuitText, { color: suitColor }]}>
              {card.suit}
            </Text>
          </View>
        </>
      )}
    </Animated.View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: 5,
  },
  card: {
    width: 48, // Base width (2:3 aspect ratio)
    height: 72, // Base height (2:3 aspect ratio)
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 5,
    flexDirection: 'column',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  cardTrump: {
    backgroundColor: '#fff8dc', // Light yellow background for trump
    borderWidth: 2,
    borderColor: '#ff4444', // Red border for trump
  },
  cardDisabled: {
    // Unplayable cards: normal opacity, just disabled for touch
    // No visual styling needed - disabled prop handles touch interaction
  },
  cardPlayable: {
    // Playable cards: slightly raised to highlight them
    marginTop: -4,
  },
  cardHighlighted: {
    // Optional: add subtle glow/shadow effect during highlight
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  topLeft: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
    marginBottom: 2,
  },
  smallSuitText: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  bottomRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginRight: 2,
    marginBottom: 2,
  },
  bigSuitText: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30,
  },
  jokerTopLeft: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    marginTop: 2,
    marginLeft: 2,
  },
  jokerVerticalText: {
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
    letterSpacing: 0,
  },
  jokerRedText: {
    color: '#D11A1A', // Red for Big Joker (大王)
  },
  jokerBlackText: {
    color: '#111111', // Black for Small Joker (小王)
  },
});
