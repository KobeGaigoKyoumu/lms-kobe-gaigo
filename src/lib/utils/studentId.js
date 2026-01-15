/**
 * 学籍番号ユーティリティ
 * 学籍番号から学年・入学時期を計算
 * 
 * 学籍番号フォーマット: YYMMXXX
 * - YY: 入学年度（西暦下2桁）例: 24 = 2024年
 * - MM: 入学月（04=4月期、07=7月期、10=10月期など）
 * - XXX: 学生番号
 * 
 * ※クラス名は学生マスターのclass_nameフィールドから取得（学籍番号とは無関係）
 * 
 * 例:
 * - 2404001 → 2024年4月入学、1番
 * - 2510005 → 2025年10月入学、5番
 */

/**
 * 学籍番号から学年・入学情報を計算
 * @param {string} studentId 学籍番号（例: 2410001）
 * @param {Date} [baseDate] 基準日（デフォルト: 現在日時）
 * @returns {object} { grade, gradeName, enrollmentYear, enrollmentMonth, enrollmentPeriod, isGraduated }
 */
export function parseStudentId(studentId, baseDate = new Date()) {
    if (!studentId || studentId.length < 4) {
        return {
            grade: null,
            gradeName: null,
            enrollmentYear: null,
            enrollmentMonth: null,
            enrollmentPeriod: null,
            isGraduated: false
        }
    }

    const idStr = String(studentId)

    // 入学年度（先頭2桁）
    const enrollmentYearShort = parseInt(idStr.substring(0, 2), 10)
    const enrollmentYear = 2000 + enrollmentYearShort

    // 入学月（3-4桁目）
    const enrollmentMonth = parseInt(idStr.substring(2, 4), 10)
    const enrollmentPeriod = `${enrollmentMonth}月期`

    // 基準日の年度を計算（4月始まり）
    const currentYear = baseDate.getFullYear()
    const currentMonth = baseDate.getMonth() + 1
    let academicYear
    if (currentMonth >= 4) {
        academicYear = currentYear
    } else {
        academicYear = currentYear - 1
    }

    // 学年を計算（2年制）
    // 入学年度と現在年度の差 + 1
    let grade = academicYear - enrollmentYear + 1

    // 卒業判定（2年制なので3年目以降は卒業）
    const isGraduated = grade > 2

    // 卒業生の場合は grade を 0 に
    if (isGraduated) {
        grade = 0
    }

    // 学年名
    let gradeName
    if (isGraduated) {
        gradeName = '非在籍者'
    } else if (grade === 1) {
        gradeName = '1年生'
    } else if (grade === 2) {
        gradeName = '2年生'
    } else {
        gradeName = `${grade}年生`
    }

    return {
        grade,
        gradeName,
        enrollmentYear,
        enrollmentMonth,
        enrollmentPeriod,
        isGraduated
    }
}

/**
 * 入学月から期を取得
 * @param {number} month 入学月
 * @returns {string} 期名（例: "4月期"、"10月期"）
 */
export function getEnrollmentPeriod(month) {
    if (!month) return ''
    return `${month}月期`
}

/**
 * 学籍番号から入学年度を取得
 * @param {string} studentId 学籍番号
 * @returns {number|null} 入学年度（西暦4桁）
 */
export function getEnrollmentYear(studentId) {
    if (!studentId || String(studentId).length < 2) return null
    const yearShort = parseInt(String(studentId).substring(0, 2), 10)
    return 2000 + yearShort
}

/**
 * 学籍番号から入学月を取得
 * @param {string} studentId 学籍番号
 * @returns {number|null} 入学月
 */
export function getEnrollmentMonth(studentId) {
    if (!studentId || String(studentId).length < 4) return null
    return parseInt(String(studentId).substring(2, 4), 10)
}

/**
 * 学年の年度更新日時を取得（毎年4月1日）
 * @param {number} year 年
 * @returns {Date} 年度開始日
 */
export function getAcademicYearStart(year) {
    return new Date(year, 3, 1) // 4月1日
}
