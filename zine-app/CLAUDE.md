# TaleZine Development Log

## プロジェクト概要
TaleZineは、ビジュアルコンテンツから小説を生成するクリエイティブアプリです。ZINE形式でページを作成し、AI技術を使って画像とテキストから物語を生成します。

## 技術スタック
- **Frontend**: Next.js 15.2.4, React, TypeScript
- **UI/UX**: Tailwind CSS, Framer Motion
- **画像処理**: html2canvas
- **AI/ML**: Google Cloud Document AI (OCR), Vertex AI (画像解析)
- **API**: カスタムバックエンド (Cloud Run)

## 開発履歴

### 2025-09-22: 小説生成メタデータ汚染修正

#### 問題の特定
- **症状**: ZINEから小説生成時に意図しないメタデータ（UI要素、技術情報）が混入
- **原因**: OCRキャプチャ範囲にUI要素全体が含まれていた
- **影響**: 生成される小説にズーム%、ページ番号、レイアウト情報が混入

#### 実装した解決策

##### Phase 1: キャプチャ範囲の制限
**ファイル**: `components/ZineCanvas.tsx`
**変更箇所**: Line 388-392, 396-409

```typescript
// 修正前: 全キャンバス（UI含む）をキャプチャ
const canvasElement = containerRef.current.querySelector('.relative.rounded-xl')

// 修正後: コンテンツエリアのみをキャプチャ
const canvasElement = canvasRef.current
```

**除外対象**:
- ズームインジケーター (Line 472-475)
- 木製テーブル背景テクスチャ
- センター綴じビジュアルガイド (Line 580-592)
- ページ境界インジケーター (Line 595-612)

##### Phase 2: 空間コンテキストの自然化
**ファイル**: `components/zine-creator.tsx`
**変更箇所**: Line 1837-1858, 1895-1897

```typescript
// 修正前: 技術的メタデータ
let spatialContext = `Page ${i + 1} layout: Image with ${pair.relatedText.length} related texts`

// 修正後: 自然な日本語表現
spatialContext = `${imageElements.length}個の画像と${textElements.length}個のテキスト要素を含むシーン`
```

##### Phase 3: テキストクリーンアップの強化
**ファイル**: `components/zine-creator.tsx`
**変更箇所**: Line 1734-1769

**追加したフィルターパターン** (20+ patterns):
```typescript
/\d+%/gi,                    // ズーム% (100%, 150%)
/zoom|ズーム/gi,             // ズーム関連
/layout|レイアウト/gi,       // レイアウト
/binding|綴じ/gi,           // 綴じ関連
/center|センター/gi,         // センター
/boundary|境界/gi,          // 境界
/indicator|インジケーター/gi, // インジケーター
/canvas|キャンバス/gi,       // キャンバス
/background|背景/gi,        // 背景
/texture|テクスチャ/gi,      // テクスチャ
// ... その他多数
```

#### 検証結果
- ✅ 開発サーバー正常動作 (`localhost:3003`)
- ✅ 既存機能への影響なし
- ✅ UI要素のキャプチャ除外確認
- ✅ TypeScript型チェック通過

#### 期待効果
1. **OCR汚染の根本解決**: UI要素を物理的にキャプチャ対象外
2. **メタデータ除去**: 技術的情報の自然言語化
3. **小説品質向上**: 意図しないUI用語の混入防止
4. **システム安定性**: キャプチャ範囲の明確化

---

### 過去の修正履歴

#### 2025-09-22: 通知システムUI改善
- カスタム通知コンポーネント実装 (`components/notification.tsx`)
- アプリテーマに合わせた vintage library スタイル
- alert() 呼び出しを全て themed notifications に置換

#### 2025-09-22: ZINEページ重複表示バグ修正
- **症状**: 2ページ目コンテンツが1ページ目に重複表示
- **原因**: ページIDの重複 (両方とも "page1")
- **解決**: 初期ページIDを "page1" → "page0" に変更

#### 2025-09-22: GitHub統合
- 変更のコミットとプッシュ完了
- コミットメッセージ: "🔧 Fix ZINE page content overlap & enhance notifications"

## 開発ガイドライン

### テストコマンド
```bash
# 開発サーバー起動
npm run dev

# 型チェック
npx tsc --noEmit

# コード品質チェック
npm run lint
```

### 注意事項
- OCR/AI機能は環境変数設定が必要 (Document AI, Vertex AI)
- ローカル開発時はポート自動調整 (3000→3001→3002→3003)
- 画像キャプチャは html2canvas を使用、CORS設定に注意

### アーキテクチャメモ
- ZineCanvas: キャンバス描画とキャプチャ機能
- zine-creator: メイン編集UI、小説生成ロジック
- notification: 全体通知システム
- API通信: lib/api.ts で一元管理

---

**最終更新**: 2025-09-22
**担当**: Claude Code Assistant