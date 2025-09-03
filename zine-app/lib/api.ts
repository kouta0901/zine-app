// 一時的にハードコード（後で環境変数に戻す）
// 注: 実際のデプロイされたAPI URLを使用
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api-2be2c4ycca-an.a.run.app';

// API呼び出し用のヘルパー関数
async function apiCall(endpoint: string, payload: any) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

// 小説化機能
export async function novelize(payload: {
  concept: string;
  world: string;
  prompt: string;
}): Promise<{ text: string }> {
  return apiCall("/novelize", payload);
}

// 作家レビュー・推敲機能
export async function review(payload: {
  original: string;
  instruction: string;
}): Promise<{ text: string }> {
  return apiCall("/review", payload);
}

// 表紙画像生成機能
export async function generateCover(payload: {
  synopsis: string;
}): Promise<{ url: string; message?: string }> {
  return apiCall("/cover", payload);
}

// 埋め込み機能（将来拡張用）
export async function embed(payload: {
  text: string;
}): Promise<{ vector: number[]; dimensions: number; message?: string }> {
  return apiCall("/embed", payload);
}

// APIの健康チェック
export async function healthCheck(): Promise<{ ok: boolean; timestamp: string }> {
  const response = await fetch(`${API_BASE}/healthz`);
  return response.json();
}