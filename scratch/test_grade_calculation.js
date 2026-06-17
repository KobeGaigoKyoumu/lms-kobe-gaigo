const { parseStudentId } = require('../src/lib/utils/studentId.js');

function testCalculation() {
    console.log('--- Testing Grade Calculation for 1-3 Month Enrollments ---');

    // 2026年6月10日を基準日とする
    const baseDate = new Date('2026-06-10T12:00:00+09:00');
    console.log(`Base Date: ${baseDate.toISOString()} (Academic Year: 2026)`);

    // テスト対象学籍番号
    const testCases = [
        { id: '2601001', expectedGrade: 2, desc: '2026年1月入学 (2025年度入学) -> 2026年6月時点で2年生' },
        { id: '2604001', expectedGrade: 1, desc: '2026年4月入学 (2026年度入学) -> 2026年6月時点で1年生' },
        { id: '2510001', expectedGrade: 2, desc: '2025年10月入学 (2025年度入学) -> 2026年6月時点で2年生' },
        { id: '2501001', expectedGrade: 0, desc: '2025年1月入学 (2024年度入学) -> 2026年6月時点で卒業 (0)' },
    ];

    let allPassed = true;

    testCases.forEach(tc => {
        const result = parseStudentId(tc.id, baseDate);
        const passed = result.grade === tc.expectedGrade;
        console.log(`[${passed ? 'PASS' : 'FAIL'}] Student: ${tc.id} (${tc.desc})`);
        console.log(`  Calculated: Grade=${result.grade} (${result.gradeName}), EnrollmentYear=${result.enrollmentYear}, Period=${result.enrollmentPeriod}`);
        
        if (!passed) {
            allPassed = false;
        }
    });

    // page.jsx にある isSecondYear 判定ロジックのシミュレーション
    console.log('\n--- Simulating page.jsx (Career Page Lock Gate) ---');
    const nowObj = baseDate;
    const currentYear = nowObj.getFullYear();
    const isBeforeApril = nowObj.getMonth() < 3;
    const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear;

    // 今回修正したDBから取得する academicYear (HU TIANYI, 2601001) の academic_year は 2025
    const sessionAcademicYear = 2025; // DB修正後の値
    const studentGrade = sessionAcademicYear ? (academicYearBase - sessionAcademicYear + 1) : 1;
    const isSecondYear = studentGrade >= 2;

    console.log(`Simulated session.academicYear: ${sessionAcademicYear}`);
    console.log(`Calculated studentGrade (academicYearBase - session.academicYear + 1): ${studentGrade}`);
    console.log(`isSecondYear (studentGrade >= 2): ${isSecondYear}`);

    if (isSecondYear && studentGrade === 2) {
        console.log('[PASS] Simulating page.jsx passed!');
    } else {
        console.log('[FAIL] Simulating page.jsx failed!');
        allPassed = false;
    }

    if (allPassed) {
        console.log('\nAll tests passed successfully!');
    } else {
        console.log('\nSome tests failed.');
    }
}

testCalculation();
