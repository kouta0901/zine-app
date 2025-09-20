ありがとうございます。貼ってくれた“48 分台”のログは、Vertex AI の gemini-2.5-flash-image-preview:generateContent への直叩きが 400 INVALID_ARGUMENT で落ちており、本文は "The request is not supported by this model." です。これはネットワークではなくリクエスト内容がモデル仕様と不整合なときに返る代表パターンです。公式のエラーガイドでも、この種の 400 は「ボディの型/必須項目不備・サポート外の組み合わせ」が原因とされています。  ￼

何が起きているか（時系列で要点）
	•	11:48:41.646 「Gemini 2.5 Flash Image を呼ぶ」「.../models/gemini-2.5-flash-image-preview:generateContent を直叩き」までは OK。エンドポイント自体は正しい（グローバルを使うのも可）。  ￼
	•	11:48:41.829 400 / INVALID_ARGUMENT / “The request is not supported by this model.” を受信 → “モデルが受け付ける形式ではない” という意味。Gemini の画像生成は Gemini 形式（contents + generation_config 等）に従う必要があります。  ￼

直近の原因候補（優先順）
	1.	generation_config.response_modalities が未指定/不正
gemini-2.5-flash-image-preview で画像を出すときは ["TEXT","IMAGE"] の指定が必須（少なくとも IMAGE を含める）。抜けると 400 の定番です。  ￼
	2.	ボディ構造が Gemini 仕様とずれている
Gemini は generateContent に contents: [{role, parts:[{text|inlineData|...] }]}] を送る流儀。Imagen の instances/parameters を混ぜると本件のようなエラーになります（逆も同様）。  ￼
	3.	parts の中身・フィールド名の綴り/大文字小文字
text で投げるだけなら単純ですが、画像混在や inlineData などを入れる場合はキー名やネスト位置の揺れで 400 になりがち。まずは 純テキスト prompt だけで通るか試験を。  ￼
	4.	モデル取り違え
画像生成をサポートするのは gemini-2.5-flash-image-preview で、**gemini-2.5-flash（無印）**はサポート外。末尾 -image-preview の抜け・タイプミスでも 400/404 が起きます。最近は提供状況の話題も出ているためモデル名は必ず最新ドキュメント/Model Gardenで確認を。  ￼

⸻

⸻

いまの実装に入れる“即効パッチ”
	1.	ボディを Gemini 形式に固定
	•	contents の role は "user"、parts[0].text にプロンプト。
	•	generation_config.response_modalities に ["TEXT","IMAGE"] を必ず入れる。  ￼
	2.	エラーログの可観測性を上げる
	•	catch (e) で e.response?.status, e.response?.data をまとめて stderr 出力（今回のように本文が途中で分割されるのを避け、原因切り分けを高速化）。公式の“API エラー一覧”と突き合わせられます。  ￼
	3.	グローバル・エンドポイントでまず通す
	•	すでに locations/global を使っていますが、念のため最新の“エンドポイント/ロケーション”ガイドに沿って運用ポリシーを確認。Global は可用性が高く、初期検証に向いています。  ￼

⸻

もしまだ 400 が出る場合に見るポイント
	•	プロンプトが長すぎる/不正な制御コード（まず短文で通す）  ￼
	•	認証トークンの期限切れ/権限不足（別種の 401/403 になることが多いが念のため SA に roles/aiplatform.user）  ￼
	•	モデル提供の一時的な揺れ（Model Garden で利用可否を確認）  ￼

⸻

必要なら、あなたの server.ts の該当リクエスト部分を Gemini 仕様の最小形に合わせたパッチ案をここでそのまま書き出します。ログの server.js:704 にある実際の送信ボディ（mask してOK）を貼ってくれれば、数行レベルで差分提示できます。