import { logoutStudent, getStudentSession } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StudentLayout({ children }) {
    const session = await getStudentSession()

    if (!session) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/student/dashboard" className="font-bold text-xl text-blue-600">
                        神戸外語 LMS
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600 hidden sm:block">
                            <span className="font-medium text-gray-900">{session.name}</span> さん
                            <span className="ml-1 text-gray-500">({session.className})</span>
                        </div>
                        <form action={logoutStudent}>
                            <button className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors">
                                ログアウト
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    )
}
