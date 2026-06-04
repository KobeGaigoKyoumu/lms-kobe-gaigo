import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'
import { getStudentCareerInfo, getStudentExamSchedules, getStudentExamSurveys } from '@/app/actions/career'
import CareerCounselingClient from './CareerCounselingClient'

export default async function StudentCareerPage() {
    const session = await getStudentSessionLight()

    if (!session) {
        redirect('/login')
    }

    // Determine current grade based on academicYear (April start)
    const nowObj = new Date()
    const currentYear = nowObj.getFullYear()
    const isBeforeApril = nowObj.getMonth() < 3
    const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
    
    // Safety fallback if academicYear is missing
    const studentGrade = session.academicYear ? (academicYearBase - session.academicYear + 1) : 1
    const isSecondYear = studentGrade >= 2

    // Fetch existing career responses
    const initialData = await getStudentCareerInfo()
    
    // Fetch existing exam schedules
    const initialExamSchedules = await getStudentExamSchedules(session.studentId)

    // Fetch existing exam surveys
    const initialExamSurveys = await getStudentExamSurveys(session.studentId)

    return (
        <CareerCounselingClient 
            initialData={initialData}
            initialExamSchedules={initialExamSchedules}
            initialExamSurveys={initialExamSurveys}
            isSecondYear={isSecondYear}
            session={session}
        />
    )
}
