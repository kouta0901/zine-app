# ZINE保存機能 & 小説モード修正適用機能 実装プラン (2025-09-03)

## 実装要件

### 1. ZINE保存機能
- ZINE作成・小説化された後の状態で保存機能を追加
- 保存されたデータはホーム画面に「編集中のデータ」として表示
- バックエンド側でもデータ保存

### 2. 小説モード修正機能改善
- 修正前と修正後をユーザーが確認してから適用
- 現在表示されている文章の下に赤字で修正後文章を表示
- 「適用する」ボタンで新しい文章に変更

## 1. ZINE保存機能の実装

### 1.1 データ構造設計
**保存するデータ構造:**
```typescript
interface SavedZine {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'novel' | 'completed'
  
  // ZINE作成時のデータ
  conceptConfig?: {
    length: string
    genre: string 
    keywords: string
  }
  aiWriterConfig?: {
    values: string
    rules: string
  }
  worldConfig?: {
    character: string
    personality: string
    scenario: string
  }
  
  // ページ・要素データ
  pages: Page[]
  
  // 小説化後のデータ
  novelContent?: string
  novelPages?: string[]
  
  // プレビュー用
  thumbnail?: string
  description?: string
}
```

### 1.2 バックエンドAPI拡張
**新しいエンドポイント:**
- `POST /zines` - ZINE保存
- `GET /zines` - 保存済みZINE一覧取得
- `GET /zines/:id` - 特定ZINE取得
- `PUT /zines/:id` - ZINE更新
- `DELETE /zines/:id` - ZINE削除

**実装場所:** `api/server.ts`

### 1.3 フロントエンド保存機能
**修正対象ファイル:**
- `zine-app/components/zine-creator.tsx` - 保存ボタン機能追加
- `zine-app/components/project-selection.tsx` - 保存済み作品表示
- `zine-app/lib/api.ts` - API関数追加

### 1.4 ホーム画面の拡張
**保存済み作品の表示:**
- 「執筆中の本」セクションに動的データ表示
- サムネイル、タイトル、最終更新日を表示
- 編集継続機能（既存データの復元）

## 2. 小説モード修正機能の改善

### 2.1 修正前・修正後の比較表示
**現在の問題:**
- 文体・ワンポイント機能は即座に適用される
- ユーザーが修正内容を確認できない

**新しいUI設計:**
```
[現在の小説文章]

[修正機能選択]
↓
[修正後文章 - 赤字で表示]
「○○に修正されました」

[適用する] [キャンセル]
```

### 2.2 実装変更点
**修正対象:** `zine-app/components/zine-creator.tsx`

**変更内容:**
- `applyStyleToNovel()` / `applyOnepointToNovel()` 関数の修正
- 修正候補の一時保存機能
- 比較表示UI（現在の作家レビュー機能のスタイルを流用）
- 適用・キャンセル機能

### 2.3 状態管理の追加
```typescript
interface PendingModification {
  type: 'style' | 'onepoint'
  original: string
  modified: string
  instruction: string
}

const [pendingModification, setPendingModification] = useState<PendingModification | null>(null)
```

## 3. データ永続化の実装

### 3.1 バックエンドストレージ
**選択肢検討:**
- **Option A:** Cloud Storage (JSON files) - 簡単実装
- **Option B:** Cloud SQL / Firestore - スケーラブル
- **推奨:** まずはCloud Storageで実装、将来的にDatabase移行

### 3.2 フロントエンド状態管理
**自動保存機能:**
- 要素変更時の自動保存（debounce付き）
- 小説生成時の自動保存
- 手動保存機能

## 4. 実装順序

### Phase 1: バックエンドAPI (1-2時間)
1. Cloud Storage設定
2. ZINE保存/取得エンドポイント実装
3. API関数テスト

### Phase 2: 保存機能フロントエンド (2-3時間)
1. 保存ボタン・API連携実装
2. ホーム画面の動的データ表示
3. 編集継続機能実装

### Phase 3: 小説モード修正機能改善 (2-3時間)
1. 修正候補の一時保存
2. 比較表示UI実装
3. 適用・キャンセル機能

### Phase 4: テスト・調整 (1時間)
1. 保存・読み込みテスト
2. 修正機能のユーザビリティテスト
3. エラーハンドリング

## 5. 技術的考慮事項

### セキュリティ
- データ検証・サニタイゼーション
- ファイルサイズ制限
- アクセス制御（将来のユーザー認証準備）

### パフォーマンス
- 大きなZINEデータの効率的な読み書き
- 自動保存のdebounce実装
- ローディング状態の適切な表示

### UX設計
- 保存失敗時のエラーハンドリング
- オフライン時の対応
- 修正内容の視覚的な差分表示

---
**プラン作成日**: 2025年9月3日  
**実装予定期間**: 6-8時間  
**優先度**: 高 - ユーザー体験の重要な改善