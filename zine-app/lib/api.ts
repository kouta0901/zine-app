// 一時的にハードコード（後で環境変数に戻す）
// 注: 実際のデプロイされたAPI URLを使用
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://zine-api-830716651527.us-central1.run.app';

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
  title?: string;
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

// ZINE保存・管理機能

// ZINE保存
export async function saveZine(zineData: any): Promise<{ id: string; message: string }> {
  try {
    // Save to API server
    const result = await apiCall("/zines", zineData);
    
    // Also save to localStorage for local access (client-side only)
    if (typeof window !== 'undefined') {
      const localData = {
        ...zineData,
        id: result.id,
        lastModified: new Date().toISOString(),
        type: 'zine'
      };
      
      localStorage.setItem(`zine_${result.id}`, JSON.stringify(localData));
      
      // Trigger storage event for other components
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdate'));
    }
    
    return result;
  } catch (error) {
    // If API fails, still try to save locally (client-side only)
    if (typeof window !== 'undefined') {
      const fallbackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const localData = {
        ...zineData,
        id: fallbackId,
        lastModified: new Date().toISOString(),
        type: 'zine',
        isLocalOnly: true
      };
      
      localStorage.setItem(`zine_${fallbackId}`, JSON.stringify(localData));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdate'));
      
      // Re-throw the original error but with local save success
      console.warn('API save failed, saved locally instead:', error);
      return { id: fallbackId, message: 'Saved locally (API unavailable)' };
    }
    
    // If we're on server side, just throw the original error
    throw error;
  }
}

// ZINE一覧取得
export async function getZines(): Promise<{ zines: any[] }> {
  const response = await fetch(`${API_BASE}/zines`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ZINEs: ${response.statusText}`);
  }
  return response.json();
}

// 特定ZINE取得
export async function getZine(id: string): Promise<any> {
  const response = await fetch(`${API_BASE}/zines/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ZINE: ${response.statusText}`);
  }
  return response.json();
}

// ZINE更新
export async function updateZine(id: string, zineData: any): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_BASE}/zines/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(zineData),
  });

  if (!response.ok) {
    throw new Error(`Failed to update ZINE: ${response.statusText}`);
  }

  return response.json();
}

// ZINE削除
export async function deleteZine(id: string): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_BASE}/zines/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete ZINE: ${response.statusText}`);
  }

  return response.json();
}

// Novel保存機能
export async function saveNovel(novelData: any): Promise<{ id: string; message: string }> {
  try {
    // For now, we don't have a novel API endpoint, so save locally only
    // TODO: Implement novel API endpoint in the future
    if (typeof window !== 'undefined') {
      const novelId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const localData = {
        ...novelData,
        id: novelId,
        lastModified: new Date().toISOString(),
        type: 'novel'
      };
      
      localStorage.setItem(`novel_${novelId}`, JSON.stringify(localData));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdate'));
      
      return { id: novelId, message: 'Novel saved successfully' };
    }
    
    // If we're on server side, return a placeholder response
    const serverId = `server_${Date.now()}`;
    return { id: serverId, message: 'Novel save deferred to client' };
  } catch (error) {
    console.error('Failed to save novel:', error);
    throw error;
  }
}

// Novel一覧取得 (将来のAPI実装用)
export async function getNovels(): Promise<{ novels: any[] }> {
  // TODO: Implement novel API endpoint
  // For now, return empty array since we don't have novel API
  return { novels: [] };
}

// Works in Progress用：完全なZINEデータを取得
export async function getZineWithDetails(id: string): Promise<any | null> {
  try {
    // First try Cloud Storage API
    const result = await getZine(id);
    if (result) {
      return result;
    }
  } catch (error) {
    console.warn('Failed to get ZINE from Cloud Storage:', error);
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const localData = localStorage.getItem(`zine_${id}`);
      if (localData) {
        const zineData = JSON.parse(localData);
        console.log('Retrieved ZINE from localStorage:', zineData);
        return zineData;
      }
    } catch (error) {
      console.error('Error retrieving ZINE from localStorage:', error);
    }
  }

  return null;
}