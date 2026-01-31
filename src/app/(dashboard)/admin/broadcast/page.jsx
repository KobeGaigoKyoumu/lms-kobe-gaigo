import { getClassesList } from '@/app/actions/homework'
import BroadcastForm from './BroadcastForm'

export default async function BroadcastPage() {
    const classes = await getClassesList()

    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>Messenger一斉送信</h1>
            <BroadcastForm classes={classes} />
        </div>
    )
}
