import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { User } from '@/types';

interface Props {
  creator: User;
  opponent: User | null;
  scores: Record<string, number>;
  winnerId?: string | null;
}

export function ScoreBoard({ creator, opponent, scores, winnerId }: Props) {
  const creatorScore = scores[creator.id] ?? 0;
  const opponentScore = opponent ? (scores[opponent.id] ?? 0) : 0;
  const total = creatorScore + opponentScore;

  const creatorRatio = total === 0 ? 0.5 : creatorScore / total;
  const opponentRatio = total === 0 ? 0.5 : opponentScore / total;

  const creatorLeads = creatorScore >= opponentScore;

  return (
    <View style={styles.container}>
      {/* Players Row */}
      <View style={styles.playersRow}>
        <PlayerBadge
          user={creator}
          score={creatorScore}
          isWinner={winnerId === creator.id}
          isLeading={creatorLeads && creatorScore !== opponentScore}
          align="left"
        />

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {opponent ? (
          <PlayerBadge
            user={opponent}
            score={opponentScore}
            isWinner={winnerId === opponent.id}
            isLeading={!creatorLeads && creatorScore !== opponentScore}
            align="right"
          />
        ) : (
          <View style={[styles.playerBadge, styles.emptyOpponent]}>
            <Text style={styles.emptyText}>상대방 대기 중</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressLeft,
            { flex: Math.max(creatorRatio, 0.05) },
            creatorLeads && styles.progressLeading,
          ]}
        />
        <View
          style={[
            styles.progressRight,
            { flex: Math.max(opponentRatio, 0.05) },
            !creatorLeads && styles.progressLeading,
          ]}
        />
      </View>

      {creatorScore === opponentScore && (
        <Text style={styles.tieText}>현재 동점!</Text>
      )}
    </View>
  );
}

function PlayerBadge({
  user,
  score,
  isWinner,
  isLeading,
  align,
}: {
  user: User;
  score: number;
  isWinner: boolean;
  isLeading: boolean;
  align: 'left' | 'right';
}) {
  return (
    <View style={[styles.playerBadge, align === 'right' && styles.playerBadgeRight]}>
      {isWinner && <Text style={styles.crownEmoji}>👑</Text>}
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{user.nickname.charAt(0)}</Text>
        </View>
      )}
      <Text style={styles.nickname} numberOfLines={1}>{user.nickname}</Text>
      <Text style={[styles.score, isLeading && styles.scoreLeading]}>
        {score > 0 ? `+${score}` : score}점
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  playerBadge: {
    flex: 1,
    alignItems: 'flex-start',
  },
  playerBadgeRight: {
    alignItems: 'flex-end',
  },
  emptyOpponent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#B2BEC3',
    textAlign: 'right',
  },
  vsContainer: {
    width: 48,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6C5CE7',
  },
  crownEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  nickname: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3436',
    maxWidth: 100,
  },
  score: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '800',
    color: '#636E72',
  },
  scoreLeading: {
    color: '#6C5CE7',
  },
  progressContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  progressLeft: {
    backgroundColor: '#B2BEC3',
    borderRadius: 4,
  },
  progressRight: {
    backgroundColor: '#B2BEC3',
    borderRadius: 4,
  },
  progressLeading: {
    backgroundColor: '#6C5CE7',
  },
  tieText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#FDCB6E',
    fontWeight: '600',
  },
});
