# 🏗️ ZINE-app アーキテクチャ設計書

## 📋 目次
- [システム全体概要](#システム全体概要)
- [フロントエンド アーキテクチャ](#フロントエンド-アーキテクチャ)
- [バックエンド アーキテクチャ](#バックエンド-アーキテクチャ)
- [AI処理パイプライン](#ai処理パイプライン)
- [データフロー](#データフロー)
- [技術スタック詳細](#技術スタック詳細)
- [セキュリティ & 運用](#セキュリティ--運用)

---

## システム全体概要

```mermaid
graph TB
    subgraph "Client Side"
        UI[React UI Components]
        Canvas[ZineCanvas]
        Editor[ZINE Editor]
        Viewer[Novel Viewer]
    end

    subgraph "Application Layer"
        NextJS[Next.js 15 App Router]
        API[API Routes]
        Auth[Authentication]
    end

    subgraph "Backend Services"
        Express[Express API Server]
        Storage[Google Cloud Storage]
    end

    subgraph "AI Processing Pipeline"
        OCR[Document AI OCR]
        Vision[Vertex AI Vision]
        LLM[Gemini LLM]
        Spatial[Spatial Analysis]
    end

    subgraph "Infrastructure"
        CloudRun[Google Cloud Run]
        CDN[Content Delivery]
        Monitor[Monitoring & Logs]
    end

    UI --> NextJS
    Canvas --> API
    Editor --> API
    Viewer --> API

    NextJS --> Express
    API --> Express

    Express --> OCR
    Express --> Vision
    Express --> LLM
    Express --> Spatial
    Express --> Storage

    Express --> CloudRun
    Storage --> CDN
    CloudRun --> Monitor
```

---

## フロントエンド アーキテクチャ

### 🎨 **コンポーネント階層構造**

```mermaid
graph TD
    App[App Router Layout]

    subgraph "Page Level"
        Home[Home Page]
        Creator[ZINE Creator]
        Gallery[Gallery View]
        Novel[Novel Viewer]
    end

    subgraph "Feature Components"
        ZineCanvas[ZineCanvas Component]
        MenuPanel[ZineMenuPanel]
        Toolbar[ZineToolbar]
        NovelEditor[Novel Editor]
        AIChat[AI Chat Interface]
    end

    subgraph "UI Components"
        Button[Button]
        Input[Input]
        Modal[Modal]
        Notification[Notification]
        Cursor[Custom Cursor]
    end

    subgraph "Utilities"
        API[API Client]
        Spatial[Spatial Analysis]
        Utils[Utility Functions]
    end

    App --> Home
    App --> Creator
    App --> Gallery
    App --> Novel

    Creator --> ZineCanvas
    Creator --> MenuPanel
    Creator --> Toolbar
    Creator --> AIChat

    Novel --> NovelEditor

    ZineCanvas --> Button
    ZineCanvas --> Modal
    MenuPanel --> Input
    MenuPanel --> Button

    ZineCanvas --> API
    NovelEditor --> API
    AIChat --> API

    ZineCanvas --> Spatial
    API --> Utils
```

### 📁 **ディレクトリ構造**

```
zine-app/
├── app/                          # Next.js App Router
│   ├── globals.css              # グローバルスタイル（アンティーク図書館テーマ）
│   ├── layout.tsx               # アプリケーション全体レイアウト
│   ├── loading.tsx              # ローディング画面
│   └── page.tsx                 # メインページ（24,541行）
├── components/                   # Reactコンポーネント
│   ├── ui/                      # 基本UIコンポーネント（Radix UI + shadcn）
│   ├── zine-creator.tsx         # メインクリエイター（132,242行）
│   ├── ZineCanvas.tsx           # キャンバスコンポーネント（44,728行）
│   ├── novel-viewer.tsx         # 小説ビューア（13,539行）
│   ├── notification.tsx         # カスタム通知システム
│   └── custom-cursor.tsx        # カスタムカーソル
├── lib/                         # ユーティリティ・API
│   ├── api.ts                   # API関数集（14,265行）
│   ├── spatial-analysis.ts     # 空間解析ロジック（10,814行）
│   └── utils.ts                 # 共通ユーティリティ
├── types/                       # TypeScript型定義
│   └── zine.ts                  # ZINE関連型定義
└── public/                      # 静的アセット
```

---

## バックエンド アーキテクチャ

### ⚙️ **API サーバー構造**

```mermaid
graph TD
    subgraph "Express API Server"
        Router[Express Router]

        subgraph "Endpoints"
            Health[/healthz]
            Novelize[/novelize-with-images]
            Review[/review]
            Cover[/cover]
            Embed[/embed]
        end

        subgraph "Middleware"
            CORS[CORS Handler]
            BodyParser[Body Parser 50MB]
            Auth[Authentication]
            ErrorHandler[Error Handler]
        end

        subgraph "Services"
            OCRService[OCR Processing]
            ImageService[Image Analysis]
            NovelService[Novel Generation]
            SpatialService[Spatial Analysis]
        end
    end

    Router --> Health
    Router --> Novelize
    Router --> Review
    Router --> Cover
    Router --> Embed

    CORS --> Router
    BodyParser --> Router
    Auth --> Router
    Router --> ErrorHandler

    Novelize --> OCRService
    Novelize --> ImageService
    Novelize --> NovelService
    Review --> NovelService
    Cover --> ImageService

    OCRService --> SpatialService
```

### 🗄️ **データ管理**

```mermaid
graph TB
    subgraph "Data Storage"
        CloudStorage[Google Cloud Storage]

        subgraph "Buckets"
            ZineBucket[zines-bucket]
            CoverBucket[covers-bucket]
            TempBucket[temp-processing]
        end
    end

    subgraph "Data Types"
        ZineData[ZINE Project Data]
        NovelData[Generated Novels]
        ImageData[User Images]
        CoverData[Generated Covers]
    end

    CloudStorage --> ZineBucket
    CloudStorage --> CoverBucket
    CloudStorage --> TempBucket

    ZineData --> ZineBucket
    NovelData --> ZineBucket
    ImageData --> TempBucket
    CoverData --> CoverBucket
```

---

## AI処理パイプライン

### 🤖 **7段階AI処理フロー**

```mermaid
graph TD
    Input[ユーザー入力: ZINE Pages]

    subgraph "Stage 1-2: データ前処理"
        Normalize[画像データ正規化]
        Validate[Base64検証]
    end

    subgraph "Stage 3: 並列AI処理"
        OCR[Document AI OCR]
        Caption[Vertex AI キャプション]
    end

    subgraph "Stage 4: データクリーンアップ"
        UIFilter[UI汚染除去 20+ patterns]
        TextClean[テキスト正規化]
    end

    subgraph "Stage 5: 空間解析"
        SpatialAnalysis[画像-テキスト関係性解析]
        DirectionWeight[方向重み付け計算]
    end

    subgraph "Stage 6: 小説生成"
        PromptGen[プロンプト生成]
        LLMCall[Gemini LLM呼び出し]
    end

    subgraph "Stage 7: 協創的推敲"
        StyleMod[文体修正]
        Onepoint[ワンポイント調整]
        InlineEdit[インライン編集]
    end

    Output[完成: 小説 + ZINE]

    Input --> Normalize
    Normalize --> Validate
    Validate --> OCR
    Validate --> Caption

    OCR --> UIFilter
    Caption --> UIFilter
    UIFilter --> TextClean

    TextClean --> SpatialAnalysis
    SpatialAnalysis --> DirectionWeight

    DirectionWeight --> PromptGen
    PromptGen --> LLMCall

    LLMCall --> StyleMod
    StyleMod --> Onepoint
    Onepoint --> InlineEdit

    InlineEdit --> Output
```

### 🔄 **AI冗長性システム**

```mermaid
graph TD
    Request[AI処理リクエスト]

    subgraph "Primary Layer"
        VertexAI[Vertex AI Gemini 2.5 Flash]
        VertexSuccess{成功?}
    end

    subgraph "Secondary Layer"
        DirectAPI[Direct HTTP API Gemini 1.5 Pro]
        DirectSuccess{成功?}
    end

    subgraph "Fallback Layer"
        GenAI[Google Generative AI SDK]
        GenSuccess{成功?}
    end

    Error[エラーレスポンス]
    Success[成功レスポンス]

    Request --> VertexAI
    VertexAI --> VertexSuccess
    VertexSuccess -->|Yes| Success
    VertexSuccess -->|No| DirectAPI

    DirectAPI --> DirectSuccess
    DirectSuccess -->|Yes| Success
    DirectSuccess -->|No| GenAI

    GenAI --> GenSuccess
    GenSuccess -->|Yes| Success
    GenSuccess -->|No| Error
```

---

## データフロー

### 📊 **ZINE作成からノベル生成まで**

```mermaid
sequenceDiagram
    participant User
    participant ZineCanvas
    participant API
    participant AIService
    participant Storage

    User->>ZineCanvas: 画像・テキスト配置
    ZineCanvas->>ZineCanvas: html2canvasでキャプチャ
    User->>ZineCanvas: 小説生成ボタン

    ZineCanvas->>API: extractZineImages()
    API->>AIService: OCR + 画像解析リクエスト

    par OCR Processing
        AIService->>AIService: Document AI OCR
    and Image Analysis
        AIService->>AIService: Vertex AI Vision
    end

    AIService->>AIService: UI汚染除去
    AIService->>AIService: 空間解析
    AIService->>AIService: 小説生成

    AIService-->>API: 生成された小説
    API-->>ZineCanvas: 小説データ返却

    ZineCanvas->>ZineCanvas: ページ分割・表示

    opt 保存する場合
        ZineCanvas->>API: saveZine()
        API->>Storage: データ保存
        Storage-->>API: 保存完了
        API-->>ZineCanvas: 保存成功
    end
```

### 🔄 **リアルタイム協創フロー**

```mermaid
sequenceDiagram
    participant User
    participant NovelEditor
    participant AIService

    User->>NovelEditor: テキスト選択
    NovelEditor->>NovelEditor: 選択範囲保護

    User->>NovelEditor: 修正指示入力
    NovelEditor->>AIService: review() API呼び出し

    AIService->>AIService: Gemini で修正処理
    AIService-->>NovelEditor: 修正された文章

    NovelEditor->>NovelEditor: インライン修正表示
    User->>NovelEditor: 修正承認/拒否

    alt 承認の場合
        NovelEditor->>NovelEditor: 本文に反映
    else 拒否の場合
        NovelEditor->>NovelEditor: 元に戻す
    end
```

---

## 技術スタック詳細

### 🛠️ **Development Stack**

| レイヤー | 技術 | バージョン | 役割 |
|----------|------|------------|------|
| **Frontend** | Next.js | 15.2.4 | アプリケーションフレームワーク |
| | React | 19 | UIライブラリ |
| | TypeScript | 5 | 型安全性 |
| | Tailwind CSS | 4.1.9 | スタイリング |
| | Framer Motion | latest | アニメーション |
| **Backend** | Express.js | 4.19.2 | APIサーバー |
| | TypeScript | 5.6.2 | サーバーサイド型安全性 |
| **AI/ML** | Google Cloud Document AI | 9.4.0 | OCR処理 |
| | Google Cloud Vertex AI | 1.10.0 | 画像解析・小説生成 |
| | Google Generative AI | 0.24.1 | フォールバック生成 |
| **Infrastructure** | Google Cloud Run | - | サーバーレスホスティング |
| | Google Cloud Storage | 7.12.0 | ファイル管理 |
| **Tools** | html2canvas | 1.4.1 | 画面キャプチャ |

### 📦 **Package Dependencies**

#### フロントエンド主要依存関係
```json
{
  "dependencies": {
    "@radix-ui/*": "1.1-2.2.x", // アクセシブルUIコンポーネント
    "framer-motion": "latest",   // アニメーション
    "html2canvas": "^1.4.1",     // 画面キャプチャ
    "lucide-react": "^0.454.0",  // アイコン
    "class-variance-authority": "^0.7.1", // CSS-in-JS
    "tailwind-merge": "^2.5.5"   // Tailwind結合
  }
}
```

#### バックエンド主要依存関係
```json
{
  "dependencies": {
    "@google-cloud/documentai": "^9.4.0",  // OCR
    "@google-cloud/vertexai": "^1.7.0",    // AI処理
    "@google-cloud/storage": "^7.12.0",    // ファイル管理
    "express": "^4.19.2",                  // APIサーバー
    "cors": "^2.8.5",                      // CORS対応
    "body-parser": "^1.20.2"               // 50MB対応
  }
}
```

---

## セキュリティ & 運用

### 🔒 **セキュリティ対策**

```mermaid
graph TB
    subgraph "Authentication & Authorization"
        OAuth[Google OAuth 2.0]
        JWT[JWT Token Management]
        Scope[API Scope Management]
    end

    subgraph "Data Protection"
        HTTPS[HTTPS Only]
        CORS[CORS Policy]
        Sanitize[Input Sanitization]
        Validate[Data Validation]
    end

    subgraph "Infrastructure Security"
        IAM[Google Cloud IAM]
        VPC[Private Network]
        Encryption[Data Encryption]
    end

    OAuth --> JWT
    JWT --> Scope

    HTTPS --> CORS
    CORS --> Sanitize
    Sanitize --> Validate

    IAM --> VPC
    VPC --> Encryption
```

### 📊 **監視・ログ**

```mermaid
graph TB
    subgraph "Application Monitoring"
        Logs[Cloud Logging]
        Metrics[Performance Metrics]
        Alerts[Error Alerts]
    end

    subgraph "AI Processing Monitoring"
        AILogs[AI Processing Logs]
        Fallback[Fallback Tracking]
        Usage[API Usage Monitoring]
    end

    subgraph "User Experience Monitoring"
        Performance[Page Performance]
        Errors[Client Errors]
        Analytics[Usage Analytics]
    end

    Logs --> AILogs
    Metrics --> Usage
    Alerts --> Fallback

    Performance --> Analytics
    Errors --> Analytics
```

### 🚀 **デプロイメント戦略**

```mermaid
graph TB
    subgraph "Development"
        Local[Local Development]
        Test[Unit Testing]
    end

    subgraph "CI/CD Pipeline"
        Build[Build Process]
        CloudBuild[Google Cloud Build]
        Deploy[Cloud Run Deploy]
    end

    subgraph "Production"
        CloudRun[Google Cloud Run]
        AutoScale[Auto Scaling]
        CDN[Global CDN]
    end

    Local --> Test
    Test --> Build
    Build --> CloudBuild
    CloudBuild --> Deploy
    Deploy --> CloudRun
    CloudRun --> AutoScale
    CloudRun --> CDN
```

---

## 🎯 **パフォーマンス最適化**

### ⚡ **フロントエンド最適化**
- **Code Splitting**: Next.js自動分割
- **Image Optimization**: Next.js Image Component
- **Lazy Loading**: React.lazy + Suspense
- **Memoization**: React.memo + useMemo

### 🔧 **バックエンド最適化**
- **並列処理**: Promise.all for AI calls
- **メモリ効率**: Stream processing for large files
- **キャッシュ**: Response caching for frequent requests
- **エラー回復**: Graceful degradation with fallbacks

### 📈 **スケーラビリティ**
- **Serverless**: Google Cloud Run自動スケーリング
- **CDN**: Global content delivery
- **Load Balancing**: 自動負荷分散
- **Database**: Cloud Storage for high availability

---

## 📝 **開発・運用ガイドライン**

### 🛠️ **ローカル開発環境**
```bash
# フロントエンド起動
cd zine-app
npm run dev

# バックエンド起動
cd api
npm run dev

# 環境変数設定
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

### 🔍 **デバッグ・トラブルシューティング**
- **AI処理エラー**: 3層フォールバック確認
- **OCR精度問題**: 画像品質・言語設定確認
- **パフォーマンス**: Chrome DevTools Performance tab
- **メモリリーク**: React DevTools Profiler

---

*このアーキテクチャ設計書は、ZINE-appの技術実装を包括的に説明しています。詳細な実装については、各ソースコードファイルを参照してください。*