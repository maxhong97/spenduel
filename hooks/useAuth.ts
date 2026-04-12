import { useState, useEffect, useCallback } from 'react';
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
      // React Native용 카카오 SDK (네이티브 빌드 필요)
      const KakaoLogin = require('@react-native-seoul/kakao-login');
      await KakaoLogin.login();
      const profile = await KakaoLogin.getProfile();

      // MVP: signInAnonymously로 Supabase 세션 발급
      // 프로덕션에서는 Edge Function으로 커스텀 JWT 교환 권장
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      const authId = authData.user!.id;

      // users 테이블에 Supabase auth ID를 PK로 upsert
      const supabaseUser = await upsertUser(
        authId,
        String(profile.id),
        profile.nickname || '익명',
        profile.profileImageUrl || undefined
      );
      setUser(supabaseUser);

      return supabaseUser;
    } catch (error) {
      console.error('Kakao login error:', error);
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
