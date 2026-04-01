export const dynamic = 'force-dynamic'
import { getClassesList } from '@/app/actions/homework'
import BroadcastForm from './BroadcastForm'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { redirect } from 'next/navigation'

export default async function BroadcastPage() {
    const adminMember = await getAdminMemberSession()

    if (!adminMember || adminMember.role !== 'admin') {
        redirect('/')
    }

    const classes = await getClassesList()

    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>Telegram一斉送信</h1>
            <BroadcastForm classes={classes} />
        </div>
    )
}
