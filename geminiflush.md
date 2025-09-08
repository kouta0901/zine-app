curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \

https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_VERSION}:predict \
-d '{
  "instances": [
    {
      "prompt": "..."
    }
  ],
  "parameters": {
    "sampleCount": ...
  }
}'

以下
は、ご指定の Google Cloud ドキュメント「Imagen API（画像生成 API）」の 日本語ページ を Markdown 形式でテキスト化した内容です（REST セクションを中心に、見やすく構成しています）。

⸻

画像生成 API（Imagen API）

Imagen API を使用すると、テキストプロンプトによってガイドされた高品質な画像を数秒で生成できます。また、画像アップスケールも可能です。
（GitHub やコンソールへのリンクなど、オリジナルの UI ナビゲーションは省略しています） ￼

⸻

サポートされているモデル
	•	注意：2025年6月24日以降、Imagen バージョン 1 と 2 は非推奨になります。
imagegeneration@002、imagegeneration@005、imagegeneration@006 は2025年9月24日に削除予定です。Imagen 3 への移行については別途案内があります。 ￼
	•	使用可能モデル一覧：
	•	imagen-4.0-generate-001
	•	imagen-4.0-fast-generate-001
	•	imagen-4.0-ultra-generate-001
	•	imagen-3.0-generate-002
	•	imagen-3.0-generate-001
	•	imagen-3.0-fast-generate-001
	•	imagen-3.0-capability-001
	•	imagegeneration@006
	•	imagegeneration@005
	•	imagegeneration@002 ￼

⸻

REST：構文の例

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_VERSION}:predict \
  -d '{
    "instances": [
      {
        "prompt": "..."
      }
    ],
    "parameters": {
      "sampleCount": ...
    }
  }'

-${LOCATION}：地域（例：us-central1、europe-west2 など）
-${MODEL_VERSION}：使用モデル（上記のリストから選択）
	•	"prompt"：画像生成指示テキスト
	•	"sampleCount"：生成する画像枚数 ￼

⸻

REST リクエスト パラメータ

パラメータ	型	説明
prompt	string	必須。画像生成用のテキストプロンプト。 ￼
addWatermark	bool	任意。生成画像に見えない透かしを追加。デフォルト true。ただし imagegeneration@002, imagegeneration@005 は例外。 ￼
aspectRatio	string	任意。画像のアスペクト比（例：“1:1”）。デフォルトは 1:1。 ￼
enhancePrompt	boolean	任意。LLM によるプロンプト強化の有効/無効。無効にすると品質や応答への一致性が下がる可能性あり。 ￼
language	string	任意。プロンプト言語コード（auto, en, ja など）。auto は自動検出し必要に応じ英語に翻訳。 ￼
negativePrompt	string	任意。除外したい要素を記述。imagen-3.0-generate-002 以降では未サポート。 ￼
outputOptions	object	任意。mimeType, compressionQuality を指定可能。 ￼
personGeneration	string	任意。人物生成の制御。dont_allow, allow_adult, allow_all のいずれか。デフォルトは allow_adult。 ￼
safetySetting	string	任意。安全フィルターレベル。block_low_and_above, block_medium_and_above（デフォルト）など。 ￼
sampleCount	int	必須。生成する画像数。デフォルトは 4。 ￼
sampleImageSize	string	任意。画像サイズ。"1K" または "2K"。デフォルト "1K"。 ￼
seed	Uint32	任意。乱数シード。addWatermark = true や enhancePrompt = true の時は使用不可。 ￼
storageUri	string	任意。Cloud Storage 保存先 URI。 ￼


⸻

outputOptions オブジェクト（詳）

outputOptions:
  mimeType: (string) "image/png"（デフォルト）、"image/jpeg"
  compressionQuality: (int, JPEG の場合のみ) 0–100。デフォルトは 75。

￼

⸻

レスポンス内容
	•	predictions: リクエストごとの画像結果配列（生成枚数に対応）。責任ある AI によるフィルタを通さない画像は、includeRaiReason = true 出ない限り含まれません。 ￼
	•	各 VisionGenerativeModelResult オブジェクトには：
	•	bytesBase64Encoded: base64 エンコードされた画像（フィルタ通過の場合のみ）
	•	mimeType: 画像形式
	•	raiFilteredReason: フィルタ理由（includeRaiReason が有効な場合のみ）
	•	safetyAttributes.categories & .scores: 安全属性とスコア（includeSafetyAttributes が有効な場合のみ） ￼

⸻

Python サンプル構文

from vertexai.preview.vision_models import ImageGenerationModel

generation_model = ImageGenerationModel.from_pretrained("MODEL_VERSION")
response = generation_model.generate_images(
    prompt="...",
    negative_prompt="...",
    aspect_ratio=...,
)
response.images[0].show()

（Model Version やその他パラメータは必要に応じて調整） ￼

⸻

以上が「Imagen API（画像生成 API）」の REST セクションを中心とした Markdown 整形版です。

他にも「画像編集」「アップスケール」「キャプション生成」「VQA（視覚的な質問応答）」などの API もありますので、必要に応じてそちらも変換可能です。お気軽にお知らせください！