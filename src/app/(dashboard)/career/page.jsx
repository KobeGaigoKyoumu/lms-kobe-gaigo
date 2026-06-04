import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { getCachedClasses } from '@/app/actions/classData'
import { getStudentsCareerList, getStudentsExamSchedulesList, getStudentsExamSurveysList } from '@/app/actions/career'
import CareerManagementClient from './CareerManagementClient'

export default async function CareerPage() {
    // 認証セッションチェック（サーバー側）
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    // クラス一覧の取得
    const classes = await getCachedClasses() || []
    
    // 役割判定
    const isAdmin = adminMember.role === 'admin'
    
    // ログイン中の教員が担任を務めるクラスの一覧を取得
    const myClasses = classes.filter(c => c.homeroom_teacher_name === adminMember.name)
    const hasHomeroom = myClasses.length > 0

    // 初期選択クラスの設定
    let initialClass = 'all'
    if (!isAdmin && hasHomeroom) {
        initialClass = myClasses[0].name
    }

    // 初期表示用の学生進路回答データをフェッチ
    const initialStudents = await getStudentsCareerList(initialClass)
    
    // 初期表示用の学生入試予定データをフェッチ
    const initialStudentsExamSchedules = await getStudentsExamSchedulesList(initialClass)

    // 初期表示用の学生入試アンケートデータをフェッチ
    const initialStudentsExamSurveys = await getStudentsExamSurveysList(initialClass)

    return (
        <CareerManagementClient
            adminMember={adminMember}
            classes={classes}
            myClasses={myClasses}
            hasHomeroom={hasHomeroom}
            isAdmin={isAdmin}
            initialClass={initialClass}
            initialStudents={initialStudents}
            initialStudentsExamSchedules={initialStudentsExamSchedules}
            initialStudentsExamSurveys={initialStudentsExamSurveys}
        />
    )
}
