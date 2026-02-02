import { getJlptByStudentId, getJlptByStudentName } from '@/lib/jlpt'

export async function getStudentJlptHistory(studentId, name) {
    if (!studentId && !name) return []

    console.log(`getStudentJlptHistory called for ID: ${studentId}, Name: ${name}`);

    try {
        let history = []

        // Try by ID first
        if (studentId) {
            history = await getJlptByStudentId(studentId, null)
            console.log(`Found ${history.length} records by ID`);
        }

        // Fallback to Name if ID yielded no results
        if (history.length === 0 && name) {
            console.log(`Falling back to search by Name: ${name}`);
            history = await getJlptByStudentName(name, null);
            console.log(`Found ${history.length} records by Name`);
        }

        return history
    } catch (error) {
        console.error('Error fetching student JLPT history:', error)
        return []
    }
}
