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
      // ── 데모 모드: 카카오 SDK 없이 익명 로그인 ──────────────────────────
      // 네이티브 빌드(방법 B) 전환 시 아래 블록을 실제 Kakao SDK 코드로 교체
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      const authId = authData.user!.id;
      // 기기별 고정 닉네임: 재로그인해도 같은 계정으로 인식
      const demoKakaoId = `demo_${authId.slice(0, 8)}`;
      const demoNickname = `테스트_${authId.slice(0, 4)}`;

      const supabaseUser = await upsertUser(
        authId,
        demoKakaoId,
        demoNickname,
        undefined
      );
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
