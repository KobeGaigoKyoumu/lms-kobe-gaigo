const fs = require('fs');
const path = require('path');

// 1. Student View Fix
const studentFile = path.join(__dirname, '../src/app/student/career/CareerCounselingClient.jsx');
let studentContent = fs.readFileSync(studentFile, 'utf8');

const originalLineEnding = studentContent.includes('\r\n') ? '\r\n' : '\n';
studentContent = studentContent.replace(/\r\n/g, '\n');

const studentTarget = `                                    {surveyStep < 5 ? (
                                        <button 
                                            key="survey-next-btn"
                                            type="button" 
                                            onClick={() => setSurveyStep(prev => prev + 1)}
                                            className={styles.nextBtn}
                                        >
                                            次へ
                                        </button>
                                    ) : (
                                        <button 
                                            key="survey-submit-btn"
                                            type="button" 
                                            onClick={handleSaveSurvey}
                                            className={styles.submitBtn}
                                            disabled={savingSurvey}
                                        >
                                            <Save size={16} />
                                            {savingSurvey ? '保存中...' : '登録する'}
                                        </button>
                                    )}`;

const studentReplacement = `                                    <button 
                                        key="survey-submit-next-btn"
                                        type="button" 
                                        onClick={surveyStep < 5 ? () => setSurveyStep(prev => prev + 1) : handleSaveSurvey}
                                        className={surveyStep < 5 ? styles.nextBtn : styles.submitBtn}
                                        disabled={savingSurvey}
                                    >
                                        {surveyStep < 5 ? (
                                            '次へ'
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                {savingSurvey ? '保存中...' : '登録する'}
                                            </>
                                        )}
                                    </button>`;

if (studentContent.includes(studentTarget)) {
    studentContent = studentContent.replace(studentTarget, studentReplacement);
    if (originalLineEnding === '\r\n') {
        // Simple replace all \n to \r\n (being careful not to double \r)
        studentContent = studentContent.replace(/\r/g, '').replace(/\n/g, '\r\n');
    }
    fs.writeFileSync(studentFile, studentContent, 'utf8');
    console.log('Successfully fixed CareerCounselingClient.jsx!');
} else {
    console.error('Target not found in CareerCounselingClient.jsx');
}

// 2. Teacher View Fix
const teacherFile = path.join(__dirname, '../src/app/(dashboard)/career/CareerManagementClient.jsx');
let teacherContent = fs.readFileSync(teacherFile, 'utf8');

const originalLineEndingTeacher = teacherContent.includes('\r\n') ? '\r\n' : '\n';
teacherContent = teacherContent.replace(/\r\n/g, '\n');

const teacherTarget = `                                        {surveyStep < 5 ? (
                                            <button 
                                                key="survey-next-btn"
                                                type="button" 
                                                onClick={() => setSurveyStep(prev => prev + 1)}
                                                className={styles.nextBtn}
                                            >
                                                次へ
                                            </button>
                                        ) : (
                                            <button 
                                                key="survey-submit-btn"
                                                type="submit" 
                                                className={styles.submitBtn}
                                                disabled={savingSurvey}
                                            >
                                                <Save size={16} />
                                                {savingSurvey ? '保存中...' : '変更を保存する'}
                                            </button>
                                        )}`;

const teacherReplacement = `                                        <button 
                                            key="survey-submit-next-btn"
                                            type={surveyStep < 5 ? 'button' : 'submit'}
                                            onClick={surveyStep < 5 ? () => setSurveyStep(prev => prev + 1) : undefined}
                                            className={surveyStep < 5 ? styles.nextBtn : styles.submitBtn}
                                            disabled={savingSurvey}
                                        >
                                            {surveyStep < 5 ? (
                                                '次へ'
                                            ) : (
                                                <>
                                                    <Save size={16} />
                                                    {savingSurvey ? '保存中...' : '変更を保存する'}
                                                </>
                                            )}
                                        </button>`;

if (teacherContent.includes(teacherTarget)) {
    teacherContent = teacherContent.replace(teacherTarget, teacherReplacement);
    if (originalLineEndingTeacher === '\r\n') {
        teacherContent = teacherContent.replace(/\r/g, '').replace(/\n/g, '\r\n');
    }
    fs.writeFileSync(teacherFile, teacherContent, 'utf8');
    console.log('Successfully fixed CareerManagementClient.jsx!');
} else {
    console.error('Target not found in CareerManagementClient.jsx');
}
