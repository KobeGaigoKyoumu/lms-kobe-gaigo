'use server'

import { getJlptByStudentId } from '@/lib/jlpt'

export async function getStudentJlptHistory(studentId) {
    if (!studentId) return []

    try {
        const history = await getJlptByStudentId(studentId, null) // No enrollment date filter for now
        return history
    } catch (error) {
        console.error('Error fetching student JLPT history:', error)
        return []
    }
}
