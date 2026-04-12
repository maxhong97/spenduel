import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>프로필</Text>

        {/* Avatar & Nickname */}
        <View style={styles.profileCard}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user?.nickname?.charAt(0) ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.nickname}>{user?.nickname ?? ''}</Text>

          <View style={styles.badgesRow}>
            <View style={styles.trustBadge}>
              <Text style={styles.trustIcon}>🛡️</Text>
              <Text style={styles.trustText}>신뢰도 {user?.trust_score ?? 100}점</Text>
            </View>
            {user?.card_linked && (
              <View style={styles.cardBadge}>
                <Text style={styles.cardIcon}>💳</Text>
                <Text style={styles.cardText}>카드 연동</Text>
              </View>
            )}
          </View>
        </View>

        {/* Card Link CTA */}
        {!user?.card_linked && (
          <View style={styles.ctaCard}>
            <Text style={styles.ctaEmoji}>💳</Text>
            <View style={styles.ctaBody}>
              <Text style={styles.ctaTitle}>카드 연동으로 자동 소비 감지</Text>
              <Text style={styles.ctaText}>
                카드를 연동하면 영수증 없이 소비를 자동으로 기록할 수 있어요.
              </Text>
            </View>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>연동</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Rows */}
        <View style={styles.infoSection}>
          <InfoRow label="카드 연동" value={user?.card_linked ? '완료' : '미연동'} />
          <InfoRow label="가입일" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'} />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2D3436',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#6C5CE7',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  nickname: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0EBFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trustIcon: {
    fontSize: 14,
  },
  trustText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F8F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cardIcon: {
    fontSize: 14,
  },
  cardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00B894',
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  ctaEmoji: {
    fontSize: 28,
  },
  ctaBody: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  ctaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#636E72',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  signOutButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E17055',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E17055',
  },
});
