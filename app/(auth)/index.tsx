import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { signInWithKakao } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleKakaoLogin = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('알림', '카카오 로그인은 모바일 앱에서 지원됩니다.');
      return;
    }

    setLoading(true);
    try {
      await signInWithKakao();
    } catch (error: any) {
      Alert.alert('로그인 실패', error?.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>⚔️</Text>
        </View>
        <Text style={styles.appName}>Spenduel</Text>
        <Text style={styles.tagline}>친구와 소비 절제 대결</Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.features}>
        <FeatureRow emoji="🏆" text="1:1 소비 절제 대결로 동기부여" />
        <FeatureRow emoji="⚡" text="실시간 점수 반영 & 순위 확인" />
        <FeatureRow emoji="🎯" text="카테고리별 맞춤 대결 설정" />
        <FeatureRow emoji="📸" text="영수증 인증으로 공정한 경쟁" />
      </View>

      {/* Login Button */}
      <View style={styles.loginSection}>
        <TouchableOpacity
          style={[styles.kakaoButton, loading && styles.disabled]}
          onPress={handleKakaoLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#3C1E1E" />
          ) : (
            <>
              <Text style={styles.kakaoIcon}>💬</Text>
              <Text style={styles.kakaoText}>카카오로 시작하기</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          로그인 시 서비스 이용약관 및 개인정보처리방침에 동의합니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2D3436',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 8,
    fontWeight: '500',
  },
  features: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  featureEmoji: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    flex: 1,
  },
  loginSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FEE500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  kakaoIcon: {
    fontSize: 20,
  },
  kakaoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C1E1E',
  },
  disclaimer: {
    fontSize: 11,
    color: '#B2BEC3',
    textAlign: 'center',
    lineHeight: 16,
  },
});
