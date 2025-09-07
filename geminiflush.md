1) Gemini 2.5 Flash Image を使う（Global エンドポイント）

Python（Google GenAI SDK; Vertex AI経由）

# pip install google-genai pillow
from google import genai
from PIL import Image
from io import BytesIO

client = genai.Client(
    vertexai=True,
    project="YOUR_GCP_PROJECT_ID",
    location="global",   # ← 現状 Flash Image は global で呼び出し
)

prompt = "夜の東京の街並みに浮かぶネオンサイン風の猫のロゴを作って"
resp = client.models.generate_content(
    model="gemini-2.5-flash-image-preview",
    contents=[prompt],
)

# 返ってくる parts から画像を保存
for c in resp.candidates:
    for p in c.content.parts:
        if p.inline_data:
            img = Image.open(BytesIO(p.inline_data.data))
            img.save("output.png")


https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash?utm_source=chatgpt.com&hl=ja