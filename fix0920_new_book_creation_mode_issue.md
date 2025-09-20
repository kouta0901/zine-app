# 🔧 新規作成モード問題修正記録 (2025-09-20)

## 📋 問題概要

**報告内容:** 「本を新規作成」ボタンを押すといきなり小説モードになってしまう
**期待動作:** 新規作成 → ZINEモード → コンテンツ作成 → 小説化ボタン → 小説モード
**実際動作:** 新規作成 → 小説モード（期待と異なる）

## 🔍 調査結果

### 発見した問題

1. **ZineCreatorのprops不備**
   - `initialData`と`onPublishedBooksUpdate`がpropsで受け取られていない
   - 型定義には存在するが実装されていない

2. **initialData処理の欠落**
   - 既存作品編集時の状態復元処理が全く実装されていない
   - 新規作成時のデフォルト状態設定が不十分

3. **子コンポーネントのprops名不一致**
   - ZineCreatorから`currentMode`/`setCurrentMode`を送信
   - ZineToolbar/ZineMenuPanelは`mode`/`setMode`を期待
   - この不一致により表示モードが正しく反映されない

## 🛠️ 実施した修正

### 1. ZineCreatorのprops修正
**ファイル:** `zine-app/components/zine-creator.tsx:50`

```typescript
// 修正前
export function ZineCreator({ onBack }: ZineCreatorProps) {

// 修正後
export function ZineCreator({ onBack, initialData, onPublishedBooksUpdate }: ZineCreatorProps) {
```

### 2. initialData処理のuseEffect実装
**ファイル:** `zine-app/components/zine-creator.tsx:127-187`

```typescript
// initialData処理用のuseEffect - 既存作品の復元
useEffect(() => {
  if (initialData) {
    console.log('📂 Restoring existing work data:', initialData.title)
    console.log('🔍 Restoring mode:', initialData.currentMode || 'zine')

    // タイトル、モード、ページ、小説コンテンツ、表紙画像を復元
    if (initialData.title) setZineTitle(initialData.title)
    if (initialData.currentMode) {
      setCurrentMode(initialData.currentMode)
      console.log('🎯 Mode restored to:', initialData.currentMode)
    } else {
      setCurrentMode("zine")
      console.log('🎯 Mode set to default: zine')
    }
    // ... 他の状態復元処理
  } else {
    console.log('🆕 New work creation - using default zine mode')
    setCurrentMode("zine")
    // ... デフォルト状態設定
    console.log('✅ Default state initialized for new creation')
  }
}, [initialData])
```

### 3. ZineToolbarのprops修正
**ファイル:** `zine-app/components/zine-creator.tsx:2828-2829`

```typescript
// 修正前
currentMode={currentMode}
setCurrentMode={setCurrentMode}

// 修正後
mode={currentMode}
setMode={setCurrentMode}
```

### 4. ZineMenuPanelのprops修正
**ファイル:** `zine-app/components/zine-creator.tsx:2771`

```typescript
// 修正前
currentMode={currentMode}

// 修正後
mode={currentMode}
```

### 5. onPublishedBooksUpdate呼び出し追加
**ファイル:** `zine-app/components/zine-creator.tsx:2208-2212`

```typescript
// 📚 Published Booksの更新を通知
if (onPublishedBooksUpdate) {
  console.log('📚 Triggering published books update after save')
  onPublishedBooksUpdate()
}
```

## 🧪 動作確認

### テスト環境
- **URL:** http://localhost:3007
- **ツール:** Playwright MCP

### テスト結果
```yaml
修正前:
  - 「本を新規作成」クリック → 「小説モード」表示 ❌

修正後:
  - 「本を新規作成」クリック → 「ZINE Mode」表示 ✅
  - ZINEモード用メニュー表示: コンセプト、AI作家、世界観 ✅
  - 「小説化する」ボタン表示 ✅
```

### ログ確認
```
🆕 New work creation - using default zine mode
✅ Default state initialized for new creation
```

## 📊 修正効果

### ユーザー体験の改善
- ✅ 期待される作成フローの復活
- ✅ 新規作成時のZINEモード確実な開始
- ✅ 既存作品編集時の正しい状態復元
- ✅ 保存後のMy Books自動更新

### システムの安定性
- ✅ TypeScriptエラーの解消
- ✅ props型安全性の向上
- ✅ 状態管理の一貫性確保
- ✅ デバッグログによる状態追跡可能

## 🔄 コミット情報

**コミットID:** `e58b3a3`
**日時:** 2025-09-20
**メッセージ:**
```
fix: Resolve 'New Book Creation' mode issue - correct ZineMode initialization

- Fix ZineCreator props to receive initialData and onPublishedBooksUpdate correctly
- Add proper initialData processing with useEffect for state restoration
- Fix props mismatch: currentMode/setCurrentMode → mode/setMode for ZineToolbar and ZineMenuPanel
- Ensure new creation starts in ZineMode (not NovelMode) as expected
- Add comprehensive debug logging for mode transitions
- Add onPublishedBooksUpdate callback in save process
```

## 🎯 今後の予防策

### コード品質向上
- TypeScript strict mode での型チェック強化
- props interface と実装の整合性確認
- useEffect依存配列の適切な設定

### テスト強化
- 新規作成フローの自動テスト追加
- 既存作品編集フローのテスト追加
- モード切り替えのE2Eテスト実装

### ドキュメント整備
- ZineCreatorのprops仕様書作成
- 状態管理フローの図解化
- トラブルシューティングガイド作成

---

**修正担当:** Claude Code
**検証:** Playwright MCP
**ステータス:** ✅ 完了・プッシュ済み