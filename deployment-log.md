# ZINE App - Cloud Run デプロイメント記録

## 実行日時
2025-09-02

## プロジェクト情報
- **GCP Project ID**: vital-analogy-470911-t0
- **GCP Project Number**: 830716651527
- **Region**: asia-northeast1
- **Service Name**: web
- **Repository Name**: zine-repo

## 実行した作業

### 1. ファイル作成・修正

#### 作成したファイル
1. **zine-app/Dockerfile**
   - Next.js アプリのコンテナ化設定
   - マルチステージビルドを使用（builder + runtime）
   - Node.js 20-alpine ベース
   - Cloud Run の $PORT 環境変数対応

2. **zine-app/.dockerignore**
   - ビルド時の除外ファイル指定
   - node_modules, .next/cache, .git, .vscode, .DS_Store を除外

3. **cloudbuild.yaml** (リポジトリルート)
   - CI/CD パイプライン設定
   - Docker ビルド → Artifact Registry へプッシュ → Cloud Run デプロイ
   - 自動デプロイ用の設定

4. **.gitignore** (リポジトリルート)
   - Git管理から除外するファイルの設定
   - Node.js, Next.js, IDE関連ファイルを除外

#### 修正したファイル
1. **zine-app/package.json**
   - start スクリプトを修正: `"start": "next start -p $PORT"`
   - Cloud Run の環境変数 PORT に対応

#### 削除したファイル
1. **zine-app/pnpm-lock.yaml**
   - npm に統一するため削除
   - package-lock.json を使用

### 2. GCP リソースの作成

#### 有効化したAPI
```bash
# 実行済み（事前に有効化されていた）
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# 追加で有効化
gcloud services enable secretmanager.googleapis.com
```

#### Artifact Registry
```bash
gcloud artifacts repositories create zine-repo \
  --repository-format=docker \
  --location=asia-northeast1
```
- Dockerイメージを保存するリポジトリを作成

#### Cloud Build
1. **Docker イメージのビルドとプッシュ**
```bash
gcloud builds submit zine-app \
  --tag "asia-northeast1-docker.pkg.dev/vital-analogy-470911-t0/zine-repo/web:latest"
```
- ビルドID: 7a43aaee-1e70-4cf8-9351-feda51305586
- ビルド成功
- イメージサイズ: 約173KB (First Load JS)

#### Cloud Run デプロイ
```bash
gcloud run deploy web \
  --image="asia-northeast1-docker.pkg.dev/vital-analogy-470911-t0/zine-repo/web:latest" \
  --region="asia-northeast1" \
  --allow-unauthenticated
```
- サービス名: web
- リビジョン: web-00001-cmx
- 100% のトラフィックを配信中

### 3. GitHub 連携設定

#### Cloud Build と GitHub の接続
1. **GitHub 接続の作成**
```bash
gcloud builds connections create github zine-github-connection \
  --region=asia-northeast1
```

2. **必要な権限の付与**
```bash
gcloud projects add-iam-policy-binding vital-analogy-470911-t0 \
  --member="serviceAccount:service-830716651527@gcp-sa-cloudbuild.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"
```

3. **リポジトリのリンク**
```bash
gcloud builds repositories create zine-app-repo \
  --remote-uri="https://github.com/kouta0901/zine-app.git" \
  --connection="zine-github-connection" \
  --region=asia-northeast1
```

#### Git リポジトリの初期化
```bash
git init
git branch -m main
```

### 4. デプロイ結果

#### 公開URL
- **Cloud Run URL**: https://web-2be2c4ycca-an.a.run.app
- **代替URL**: https://web-830716651527.asia-northeast1.run.app

#### ステータス
- ✅ アプリケーションは正常にデプロイされ、公開アクセス可能
- ✅ Artifact Registry にイメージが保存済み
- ✅ Cloud Build と GitHub の接続完了
- ✅ リポジトリリンク作成完了
- ⏳ Cloud Build トリガーは手動設定が必要

### 5. 次のステップ

#### 必要な作業
1. **Cloud Build トリガーの手動設定**
   - URL: https://console.cloud.google.com/cloud-build/triggers;region=asia-northeast1?project=vital-analogy-470911-t0
   - トリガー名: zine-app-auto-deploy
   - ブランチパターン: ^main$
   - 設定ファイル: /cloudbuild.yaml

2. **GitHubへのプッシュ**
```bash
# リモートリポジトリの追加
git remote add origin https://github.com/kouta0901/zine-app.git

# 初回コミット
git add .
git commit -m "Initial commit: Cloud Run deployment setup"

# プッシュ
git push -u origin main
```

#### オプションの改善
1. **Firebase Hosting 連携**
   - CDN配信
   - カスタムドメイン設定

2. **監視とログ**
   - Cloud Logging でのログ確認
   - Cloud Monitoring でのメトリクス監視

3. **パフォーマンス最適化**
   - Next.js の standalone 出力モードの使用
   - イメージサイズの削減

### 6. トラブルシューティング用コマンド

```bash
# ログの確認
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=web" \
  --limit=50

# サービスの詳細確認
gcloud run services describe web --region=asia-northeast1

# ビルド履歴の確認
gcloud builds list --limit=5

# イメージの確認
gcloud artifacts docker images list asia-northeast1-docker.pkg.dev/vital-analogy-470911-t0/zine-repo
```

## 備考
- package-lock.json と pnpm-lock.yaml が共存していたため、npm に統一
- Cloud Run は $PORT 環境変数での listen が必須
- GitHub Actions ではなく Cloud Build を使用してCI/CDを構築