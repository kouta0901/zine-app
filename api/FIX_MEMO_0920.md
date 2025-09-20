# 📝 ZINE-APP 修正実施メモ (2025-09-20)

## 🎯 実施する修正プラン

### Priority 1: 表紙生成機能の修復 (実施中)
**問題:** Gemini 2.5 Flash Image Preview が us-central1 で利用不可
**解決策:** locationを `global` に変更

**修正対象:**
- `api/server.ts` の `/cover` エンドポイント (888行目付近)
- 画像生成用のAPI URL

### Priority 2: Document AI OCR設定 (次回)
**問題:** OCR Processor未設定
**解決策:**
- OCR Processor作成
- 環境変数 `DOC_OCR_PROCESSOR_ID` 設定

### Priority 3: エラーハンドリング強化 (次回)
**問題:** フォールバック機能不足
**解決策:**
- 複数の画像生成方法実装
- 堅牢なエラー処理追加

## 📊 現在の状況
- ✅ 小説生成機能: 正常動作
- ✅ 画像キャプション: 正常動作
- ❌ 表紙生成機能: 404エラーで停止
- ❌ OCR機能: 未設定で無効化

## 🚀 実施中の作業
1. **Step 1**: Gemini 2.5 Flash Image Preview のlocation修正
2. **Step 2**: 修正をCloud Runにデプロイ
3. **Step 3**: 動作確認とログ確認