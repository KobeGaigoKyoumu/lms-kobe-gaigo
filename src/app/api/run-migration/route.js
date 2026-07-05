import { Client } from 'pg'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.POSTGRES_URL_NON_POOLING || 
    process.env.SUPABASE_DB_URL

  if (!connectionString) {
    return NextResponse.json({ 
      success: false, 
      error: 'No database connection string found in environment variables.' 
    }, { status: 500 })
  }

  const sql = `
    -- 1. 既存のステータスチェック制約を削除
    ALTER TABLE public.interview_slots DROP CONSTRAINT IF EXISTS interview_slots_status_check;

    -- 2. 新しいステータスチェック制約（completedを含める）を追加
    ALTER TABLE public.interview_slots ADD CONSTRAINT interview_slots_status_check CHECK (status IN ('available', 'booked', 'blocked', 'pending', 'completed'));

    -- 3. 話し合った内容 (discussion_content) と 指示 (instructions) カラムを追加
    ALTER TABLE public.interview_slots ADD COLUMN IF NOT EXISTS discussion_content TEXT;
    ALTER TABLE public.interview_slots ADD COLUMN IF NOT EXISTS instructions TEXT;
  `

  const client = new Client({
    connectionString,
    // SupabaseなどのリモートDB接続時、SSLが必要な場合があるため設定
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    await client.query(sql)
    return NextResponse.json({ 
      success: true, 
      message: 'Migration SQL applied successfully to remote database!' 
    })
  } catch (e) {
    return NextResponse.json({ 
      success: false, 
      error: e.message 
    }, { status: 500 })
  } finally {
    await client.end()
  }
}
