#!/usr/bin/env bash
# Sair imediatamente caso algum comando falhe
set -e

echo "📦 Instalando pacotes do sistema via apt..."
# Render roda como root no momento do build, mas usa apt-get
apt-get update
apt-get install -y ffmpeg python3

echo "📥 Instalando dependências do Node..."
npm install

echo "🛠️ Baixando binário oficial do yt-dlp..."
mkdir -p bin
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
chmod +x bin/yt-dlp

echo "✅ Build concluído com sucesso!"
