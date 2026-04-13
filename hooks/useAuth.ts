import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { upsertUser } from '@/lib/api';
import { User } from '@/types';
import { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          loadUser(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUser = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setUser(data as User);
    } catch {
      // users 행이 아직 없을 수 있음 (Kakao 프로필 upsert 전)
    } finally {
      setLoading(false);
    }
  };

  const signInWithKakao = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        throw new Error('카카오 로그인은 모바일 앱에서만 지원됩니다.');
      }

      const { login } = await import('@react-native-seoul/kakao-login');
      const kakaoToken = await login();

      // Supabase에 카카오 ID 토큰으로 로그인
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'kakao',
        token: kakaoToken.idToken,
        access_token: kakaoToken.accessToken,
      });
      if (authError) throw authError;

      const authId = authData.user!.id;
      const kakaoId = String(authData.user!.user_metadata?.provider_id ?? authId);
      const nickname = authData.user!.user_metadata?.name ?? `사용자_${authId.slice(0, 4)}`;
      const avatarUrl = authData.user!.user_metadata?.avatar_url;

      const supabaseUser = await upsertUser(authId, kakaoId, nickname, avatarUrl);
      setUser(supabaseUser);

      return supabaseUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return { session, user, loading, signInWithKakao, signOut };
}
