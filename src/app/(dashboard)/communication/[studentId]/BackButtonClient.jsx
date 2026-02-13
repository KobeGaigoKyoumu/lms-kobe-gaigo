'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButtonClient({ className }) {
    const router = useRouter()

    return (
        <button onClick={() => router.back()} className={className}>
            <ArrowLeft size={20} />
            戻る
        </button>
    )
}
