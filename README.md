# 神戸外語 LMS

学校向け学習管理システム（LMS）

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router)
- **バックエンド**: Supabase
- **認証**: Google OAuth
- **デプロイ**: Vercel

## セットアップ

```bash
npm install
npm run dev
```

## 環境変数

`.env.local` に以下を設定:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 機能

- 🔐 Google OAuth認証
- 📚 コース管理
- 📝 課題提出・採点
- 📅 カレンダー
- 📊 成績管理
- 👥 ユーザー管理（管理者向け）
