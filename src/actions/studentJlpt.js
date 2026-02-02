export async function getStudentJlptHistory(studentId) {
    if (!studentId) return []

    console.log('getStudentJlptHistory called for:', studentId);

    try {
        const history = await getJlptByStudentId(studentId, null) // No enrollment date filter for now
        console.log(`Found ${history.length} records for ${studentId}`);
        if (history.length === 0) {
            console.log('Checking first few records logic in lib...');
        }
        return history
    } catch (error) {
        console.error('Error fetching student JLPT history:', error)
        return []
    }
}
