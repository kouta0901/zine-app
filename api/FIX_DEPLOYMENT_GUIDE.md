# 🔧 ZINE API エラー修正 & デプロイメントガイド

## 問題の概要

1. **Vertex AI エラー**: `locations/global`が無効でHTMLエラーページが返される
2. **Document AI エラー**: Processor IDが未設定でOCR機能が動作しない

## 🚀 即時修正手順

### Step 1: Document AI Processorの作成

```bash
# 1. Document AI APIを有効化
gcloud services enable documentai.googleapis.com --project=vital-analogy-470911-t0

# 2. OCR Processorを作成
gcloud beta document-ai processors create \
  --location=us \
  --display-name="ZINE OCR Processor" \
  --type="OCR_PROCESSOR" \
  --project=vital-analogy-470911-t0

# 3. Processor IDを取得（出力から"processors/"以降の部分を控える）
gcloud beta document-ai processors list \
  --location=us \
  --project=vital-analogy-470911-t0 \
  --format="value(name.segment(-1))"
```

### Step 2: Cloud Run環境変数の更新

```bash
# Document AI Processor IDを環境変数に設定（YOUR_PROCESSOR_IDは実際のIDに置き換え）
gcloud run services update zine-api \
  --update-env-vars="DOC_OCR_PROCESSOR_ID=YOUR_PROCESSOR_ID,DOC_AI_LOCATION=us,GOOGLE_CLOUD_LOCATION=us-central1" \
  --region=us-central1 \
  --project=vital-analogy-470911-t0
```

### Step 3: 権限の付与

```bash
# Cloud Runサービスアカウントに必要な権限を付与
gcloud projects add-iam-policy-binding vital-analogy-470911-t0 \
  --member="serviceAccount:830716651527-compute@developer.gserviceaccount.com" \
  --role="roles/documentai.apiUser"

gcloud projects add-iam-policy-binding vital-analogy-470911-t0 \
  --member="serviceAccount:830716651527-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Step 4: コードの再デプロイ

```bash
# 1. ディレクトリ移動
cd /Users/pc-0065_kota.akatsuka/Desktop/ZINE-app/api

# 2. ビルド
npm run build

# 3. Cloud Buildでデプロイ
gcloud builds submit --config=../cloudbuild.yaml \
  --substitution=_SERVICE_NAME=zine-api \
  --substitution=_REGION=us-central1 \
  --project=vital-analogy-470911-t0

# または直接デプロイ
gcloud run deploy zine-api \
  --source . \
  --region=us-central1 \
  --project=vital-analogy-470911-t0 \
  --allow-unauthenticated
```

## ✅ 動作確認

### 1. Health Checkの確認

```bash
# APIのヘルスチェック
curl https://zine-api-830716651527.us-central1.run.app/healthz

# 期待される応答
# {"ok":true,"timestamp":"2025-09-20T..."}
```

### 2. ログの確認

```bash
# Vertex AIエラーが解消されているか確認
gcloud logging read 'resource.type="cloud_run_revision"
  AND resource.labels.service_name="zine-api"
  AND textPayload:"Captioning"' \
  --limit=5 \
  --format="table(timestamp,textPayload)" \
  --project=vital-analogy-470911-t0

# Document AIが正常に初期化されているか確認
gcloud logging read 'resource.type="cloud_run_revision"
  AND resource.labels.service_name="zine-api"
  AND textPayload:"Document AI OCR initialized"' \
  --limit=5 \
  --format="table(timestamp,textPayload)" \
  --project=vital-analogy-470911-t0
```

## 📊 期待される結果

修正後、以下のエラーが解消されます：

✅ **解消されるエラー**:
- `❌ Captioning failed: SyntaxError: Unexpected token '<'`
- `🔧 OCR: Document AI not configured, returning empty result`

✅ **正常なログ**:
- `📄 Document AI OCR initialized: projects/.../processors/...`
- `🎨 Caption generated for page...`
- `📄 OCR processed: XXX chars, confidence: X.XX`

## 🔄 ロールバック手順

問題が発生した場合：

```bash
# 以前のリビジョンにロールバック
gcloud run services update-traffic zine-api \
  --to-revisions=LATEST=0 \
  --region=us-central1 \
  --project=vital-analogy-470911-t0

# リビジョンリストを確認
gcloud run revisions list \
  --service=zine-api \
  --region=us-central1 \
  --project=vital-analogy-470911-t0
```

## 📝 修正内容の詳細

### server.tsの変更点:

1. **Vertex AI初期化**（23行目）:
   ```typescript
   // Before: const location = "global";
   // After:  const location = "us-central1";
   ```

2. **API URLs**（264, 486, 600, 712, 858行目）:
   ```typescript
   // Before: /locations/global/
   // After:  /locations/${location}/  // us-central1
   ```

3. **Document AI初期化**（58-67行目）:
   環境変数`DOC_OCR_PROCESSOR_ID`が設定されていれば自動的に有効化

## 🚨 注意事項

- Document AI Processorの作成には数分かかる場合があります
- 環境変数の更新後、Cloud Runサービスが自動的に再起動されます
- 初回のリクエストはコールドスタートのため時間がかかる場合があります