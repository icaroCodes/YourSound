# YourSound 🎵

YourSound é uma plataforma fullstack completa de streaming de música e vídeo, projetada para oferecer uma experiência cinematográfica e fluida. O projeto utiliza **React 19**, **Node.js**, **Express** e **Supabase** para criar um ecossistema de alta fidelidade para amantes de música.

> [!IMPORTANT]
> **AVISO EDUCACIONAL E LEGAL**
> Este projeto foi desenvolvido exclusivamente para fins de estudo e portfólio acadêmico. 
> 1. **Uso Responsável**: O usuário é inteiramente responsável pelo conteúdo enviado ou importado.
> 2. **Direitos Autorais**: Recomendamos o uso exclusivo de músicas e vídeos **sem copyright** (Creative Commons).
> 3. **Propósito**: Não encorajamos a pirataria. O uso de extração de mídia é meramente demonstrativo.

> [!WARNING]
> **Sobre o Streaming de Vídeos (TikTok/YouTube)**: 
> A reprodução de vídeos de fundo e a criação de músicas usando link funciona de forma estável principalmente em **localhost**. Em ambientes de produção (como Vercel/Railway), o TikTok e o YouTube possuem restrições geográficas e de IP que podem bloquear o streaming, resultando em erros de carregamento no player.

---

## 🔥 Funcionalidades Completas

### 🎵 Player & Experiência
- **Player Híbrido**: Alternância fluida entre áudio MP3 e vídeos de fundo.
- **Letras em Tempo Real**: Sincronização automática via LRCLIB (formato LRC) com efeito de destaque.
- **Legendas Manuais**: Suporte para letras criadas manualmente pelo usuário caso não existam na API.
- **Sincronização de Vídeo**: O vídeo de fundo segue o tempo exato do áudio com correção de "drift" automática.
- **Controle de Fila**: Sistema de Próxima/Anterior, Modo Repetição (Apenas uma, Todas, Desligado) e Shuffle.

### 📥 Importação & Upload
- **Importação via Link**: Adicione músicas do YouTube ou TikTok apenas colando a URL. O sistema extrai o áudio no servidor com alta performance.
- **Upload Local**: Envio direto de arquivos MP3/WAV e imagens de capa personalizadas.
- **Processamento no Backend**: Conversão automática para MP3 128kbps via FFmpeg para economia de banda e compatibilidade.

### 📂 Organização & Social
- **Playlists Personalizadas**: Crie, edite capas, renomeie e organize suas pastas de música.
- **Sistema de Likes**: Favorite suas faixas para acesso rápido na seção "Músicas Curtidas".
- **Privacidade**: Escolha entre tornar suas músicas públicas (requer aprovação) ou privadas.
- **Busca Global**: Pesquise instantaneamente por títulos ou artistas em toda a biblioteca autorizada.

### 🛡️ Administração & Segurança
- **Painel do Administrador**: Aprovação de músicas públicas, edição de metadados e remoção de conteúdo.
- **Auth de Alta Resiliência**: Sistema de autenticação via Supabase com detecção automática de tokens expirados e auto-logout seguro.
- **Perfil do Usuário**: Personalização de nome de exibição e avatar integrado ao Supabase Storage.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19, Zustand, Tailwind CSS, Lucide Icons, Dnd-kit e Framer Motion
- **Backend**: Node.js, Express, Socket.io (Real-time), yt-dlp, FFmpeg.
- **Banco de Dados & Cloud**: Supabase (PostgreSQL, Auth, Storage).

---


**Desenvolvido por IcaroCodes**
