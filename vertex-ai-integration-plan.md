# ZINE App - Vertex AI & バックエンド統合実装計画

## 実行日時
2025-09-02

## プロジェクト情報
- **GCP Project ID**: vital-analogy-470911-t0
- **GCP Project Number**: 830716651527
- **Region**: asia-northeast1
- **フロントサービス**: web (既存)
- **APIサービス**: api (新規)

## 実装する機能

### 1. 小説化機能 (`/novelize`)
- **モデル**: Gemini 2.5-flash
- **入力**: concept, world, prompt
- **出力**: 生成された小説本文

### 2. 作家レビュー・推敲機能 (`/review`) 
- **モデル**: Gemini 2.5-flash
- **入力**: original text, instruction
- **出力**: 修正・推敲された文章

### 3. 表紙画像生成 (`/cover`)
- **モデル**: Imagen 3.0-generate-001
- **入力**: synopsis (あらすじ)
- **出力**: Cloud Storage に保存された画像URL

### 4. 埋め込み機能 (`/embed`) - 将来拡張用
- **モデル**: gemini-embedding-001
- **入力**: text
- **出力**: ベクトル配列

## Phase 1: GCP環境準備

### 1.1 API有効化
```bash
gcloud services enable aiplatform.googleapis.com
```

### 1.2 サービスアカウント権限設定
```bash
PROJECT_NUM=830716651527
RUNTIME_SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"

# Vertex AI 利用権限
gcloud projects add-iam-policy-binding vital-analogy-470911-t0 \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/aiplatform.user"

# Cloud Storage 書き込み権限
gcloud projects add-iam-policy-binding vital-analogy-470911-t0 \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin"
```

### 1.3 Cloud Storage バケット作成
```bash
gsutil mb -l asia-northeast1 gs://vital-analogy-470911-t0-covers
gsutil iam ch allUsers:objectViewer gs://vital-analogy-470911-t0-covers
```

## Phase 2: バックエンドAPI作成

### 2.1 ディレクトリ構造
```
api/
├── package.json
├── tsconfig.json
├── server.ts
├── routes/
│   ├── novelize.ts
│   ├── review.ts
│   ├── cover.ts
│   └── embed.ts
└── Dockerfile
```

### 2.2 依存関係
- **@google/genai**: Google Gen AI SDK (Gemini 2.x対応)
- **@google-cloud/storage**: Cloud Storage操作
- **express**: Webサーバー
- **typescript**: TypeScript開発環境

### 2.3 主要ファイル構成

#### server.ts
- Express サーバーの基本設定
- Google Gen AI SDK 初期化 (Vertex AI モード)
- 各エンドポイントのルーティング

#### Dockerfile
- Node.js 20-alpine ベース
- マルチステージビルド (deps → build → runtime)
- TypeScript → JavaScript コンパイル

## Phase 3: フロントエンド統合

### 3.1 API呼び出し用関数作成
- `lib/api.ts`: API呼び出し用ヘルパー関数
- 環境変数 `NEXT_PUBLIC_API_BASE` を使用

### 3.2 既存コンポーネント拡張
- `components/writing-workspace.tsx`: AI機能統合
- 小説化、推敲、表紙生成ボタンの追加

## Phase 4: デプロイメント

### 4.1 APIサービスのCloud Runデプロイ
```bash
# ビルド & プッシュ
gcloud builds submit api \
  --tag asia-northeast1-docker.pkg.dev/vital-analogy-470911-t0/zine-repo/api:latest

# デプロイ
gcloud run deploy api \
  --image asia-northeast1-docker.pkg.dev/vital-analogy-470911-t0/zine-repo/api:latest \
  --region asia-northeast1 \
  --set-env-vars GOOGLE_CLOUD_LOCATION=asia-northeast1,COVER_BUCKET=vital-analogy-470911-t0-covers \
  --allow-unauthenticated
```

### 4.2 フロントエンド環境変数更新
```bash
# API URLを環境変数に設定
API_URL=$(gcloud run services describe api --region=asia-northeast1 --format='value(status.url)')
echo "NEXT_PUBLIC_API_BASE=${API_URL}" >> zine-app/.env.local
```

## Phase 5: CI/CD統合

### 5.1 cloudbuild.yaml更新
- 既存のwebサービスビルドに加えて
- apiサービスのビルド・デプロイを追加
- 並列実行で効率化

### 5.2 GitHub連携
- 既存のトリガー設定を活用
- main ブランチプッシュで自動デプロイ

## 技術仕様

### 使用するAIモデル
- **Gemini 2.5-flash**: コスト効率重視のテキスト生成
- **Imagen 3.0-generate-001**: 標準品質の画像生成
- **gemini-embedding-001**: テキスト埋め込み (将来拡張用)

### セキュリティ
- **Application Default Credentials (ADC)**: Cloud Run環境での認証
- **IAM最小権限の原則**: 必要最小限の権限のみ付与
- **CORS設定**: フロントエンドからの適切なアクセス制御

### モニタリング
- **Cloud Logging**: APIリクエスト・レスポンスログ
- **Cloud Monitoring**: パフォーマンスメトリクス監視
- **エラーハンドリング**: 適切なHTTPステータスコード返却

## 想定工数・コスト
- **開発工数**: 4-6時間
- **Vertex AI コスト**: 従量課金 (Gemini 2.5-flash: 安価, Imagen: 中程度)
- **Cloud Run コスト**: リクエストベース課金
- **Cloud Storage コスト**: 画像保存容量ベース

## 次期拡張計画
1. **RAG (Retrieval-Augmented Generation)**: 埋め込み機能を活用した検索
2. **ファインチューニング**: 独自データでのモデル調整
3. **リアルタイム協調編集**: WebSocket を使った多人数編集
4. **音声合成**: 小説の読み上げ機能