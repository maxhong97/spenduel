/**
 * Claude API를 사용해 가맹점명을 카테고리로 분류합니다.
 */

import { DuelCategory } from '@/types';

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const CATEGORY_LIST = ['impulse_buy', 'cafe', 'delivery', 'dining', 'shopping', 'other'];

export async function classifyMerchant(merchantName: string): Promise<DuelCategory | null> {
  if (!CLAUDE_API_KEY) {
    console.warn('Claude API key not set');
    return null;
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: `가맹점명을 다음 카테고리 중 하나로 분류해주세요. 반드시 아래 카테고리 중 하나만 JSON으로 응답하세요.

카테고리: ${CATEGORY_LIST.join(', ')}

- impulse_buy: 편의점, 다이소, 생활용품 등 충동구매
- cafe: 카페, 커피숍, 베이커리
- delivery: 배달 앱, 배달 음식점
- dining: 식당, 음식점, 패스트푸드
- shopping: 쇼핑몰, 의류, 전자제품
- other: 분류 불가

가맹점명: "${merchantName}"

응답 형식: {"category": "카테고리명"}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';
    const match = text.match(/"category"\s*:\s*"([^"]+)"/);
    const category = match?.[1];

    if (category && CATEGORY_LIST.includes(category) && category !== 'other') {
      return category as DuelCategory;
    }
    return null;
  } catch (error) {
    console.error('Failed to classify merchant:', error);
    return null;
  }
}
