/**
 * Game Engine Module
 * 
 * This module provides the core game logic for 「小二定主」
 * (Xiao Er Ding Zhu), a Chinese trick-taking card game.
 * 
 * Usage:
 * ```typescript
 * import { createNewGame, playCard, calculateScores } from '@/src/game';
 * 
 * const config = {
 *   trumpSuit: '♥',
 *   hasThreeFan: false,
 *   hasFiveFan: false,
 * };
 * 
 * let game = createNewGame(['p1', 'p2', 'p3', 'p4'], config);
 * game = playCard(game, 'p1', { suit: '♠', rank: 14 });
 * // ... continue playing
 * const scores = calculateScores(game);
 * ```
 */

export * from './types';
export * from './rules';
export * from './engine';



