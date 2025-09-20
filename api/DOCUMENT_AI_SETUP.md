# Document AI OCR セットアップガイド

## 1. Document AI APIの有効化

```bash
# Document AI APIを有効化
gcloud services enable documentai.googleapis.com --project=vital-analogy-470911-t0
```

## 2. OCR Processorの作成

### Option A: コンソールから作成

1. [Google Cloud Console - Document AI](https://console.cloud.google.com/ai/document-ai/processors)にアクセス
2. **Create Processor**をクリック
3. **OCR**タイプを選択
4. リージョンを選択（推奨: `us` または `eu`）
5. 名前を設定（例: `zine-ocr-processor`）
6. **Create**をクリック

### Option B: gcloudコマンドで作成

```bash
# プロセッサーを作成（USリージョン）
gcloud beta document-ai processors create \
  --location=us \
  --display-name="ZINE OCR Processor" \
  --type="OCR_PROCESSOR" \
  --project=vital-analogy-470911-t0
```

## 3. Processor IDの取得

作成後、Processor IDを確認：

```bash
# プロセッサーのリストを表示
gcloud beta document-ai processors list \
  --location=us \
  --project=vital-analogy-470911-t0 \
  --format="table(name,displayName,type)"
```

出力例：
```
NAME                                                          DISPLAY_NAME        TYPE
projects/vital-analogy-470911-t0/locations/us/processors/abc123def456  ZINE OCR Processor  OCR_PROCESSOR
```

`abc123def456`がProcessor IDです。

## 4. 環境変数の設定

### ローカル開発環境

`.env`ファイルに追加：
```env
DOC_OCR_PROCESSOR_ID=abc123def456
DOC_AI_LOCATION=us
```

### Cloud Runへの設定

```bash
# Cloud Runサービスの環境変数を更新
gcloud run services update zine-api \
  --update-env-vars="DOC_OCR_PROCESSOR_ID=abc123def456,DOC_AI_LOCATION=us" \
  --region=us-central1 \
  --project=vital-analogy-470911-t0
```

## 5. サービスアカウントの権限確認

```bash
# Cloud Runのサービスアカウントに権限を付与
gcloud projects add-iam-policy-binding vital-analogy-470911-t0 \
  --member="serviceAccount:830716651527-compute@developer.gserviceaccount.com" \
  --role="roles/documentai.apiUser"
```

## 6. 動作確認

APIを再デプロイ後、ログを確認：

```bash
# ログを確認
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="zine-api" AND textPayload:"Document AI"' \
  --limit=10 \
  --format="table(timestamp,textPayload)" \
  --project=vital-analogy-470911-t0
```

成功時のログ：
```
📄 Document AI OCR initialized: projects/vital-analogy-470911-t0/locations/us/processors/abc123def456
```

## トラブルシューティング

### エラー: "Document AI not configured"
- `DOC_OCR_PROCESSOR_ID`環境変数が設定されているか確認
- Cloud Runサービスを再デプロイ

### エラー: "Permission denied"
- サービスアカウントに`roles/documentai.apiUser`ロールが付与されているか確認
- Document AI APIが有効になっているか確認

### エラー: "Invalid processor"
- Processor IDが正しいか確認
- Processorのリージョンと`DOC_AI_LOCATION`が一致しているか確認