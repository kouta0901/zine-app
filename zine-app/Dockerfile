# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# パッケージマネージャはnpmを使用
COPY package*.json ./
RUN npm ci

# アプリ本体
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run が渡す $PORT を使って listen する
ENV PORT=3000

# 生成物と必要ファイルをコピー
COPY --from=builder /app ./

# Cloud Run は 0.0.0.0:$PORT で待受が必須
EXPOSE 3000
CMD ["npm","start"]