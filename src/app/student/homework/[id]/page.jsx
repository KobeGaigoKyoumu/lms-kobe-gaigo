import { getAssignmentDetails } from '@/app/actions/homework'
import { notFound } from 'next/navigation'
import { Calendar, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { getAssignmentDetails } from '@/app/actions/homework'

export const dynamic = 'force-dynamic'

export default async function HomeworkPage({ params }) {
    const { id } = await params

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        let isMounted = true
        async function fetchAssignment() {
            try {
                // Use the ultra-safe server action that bypasses RLS using Admin Client
                const data = await getAssignmentDetails(id)
                
                if (!data || data.error) {
                    if (isMounted) setError('Not Found')
                    return
                }

                if (isMounted) {
                    setAssignment(data)
                }
            } catch (err) {
                console.error(err)
                if (isMounted) setError('エラーが発生しました')
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchAssignment()
        return () => { isMounted = false }
    }, [id])

    if (error === 'Not Found') {
        notFound()
    }

    // Fetch assignment and submission on server side (Secure & Fast)
    const assignment = await getAssignmentDetails(id)

    if (!assignment || assignment.error) {
        notFound()
    }

    return <HomeworkClient assignment={assignment} />
}
