import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'
import SchoolSearchClient from './SchoolSearchClient'

export const dynamic = 'force-dynamic'

export default async function SchoolSearchPage() {
    const session = await getStudentSessionLight()

    if (!session) {
        redirect('/login')
    }

    return <SchoolSearchClient session={session} />
}
