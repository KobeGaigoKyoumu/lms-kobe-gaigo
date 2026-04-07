import { getStudentSession } from '@/app/actions/studentAuth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * ログイン中の学生セッション情報を取得するAPI
 * お知らせ詳細ページや課題提出ページなどでクライアントサイドから呼び出されます。
 */
export async function GET() {
  try {
    const session = await getStudentSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'セッションが見つかりません。再ログインしてください。' },
        { status: 401 }
      )
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('API Error (student-session):', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}
