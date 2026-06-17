const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runTest() {
    const className = '2-1';
    console.log(`Running test excel generation for class: ${className}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase config missing');
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 学生取得
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name')
        .eq('class_name', className)
        .eq('status', 'active')
        .order('student_id_text', { ascending: true });

    if (studentError) {
        console.error('Error fetching students:', studentError.message);
        return;
    }
    console.log(`Found ${students.length} students`);

    const studentIds = students.map(s => s.student_id_text);

    // 進路取得
    const { data: careerInfos, error: careerError } = await supabase
        .from('student_career_info')
        .select('*')
        .in('student_id', studentIds);

    if (careerError) {
        console.error('Error fetching career info:', careerError.message);
        return;
    }

    const careerMap = new Map(careerInfos?.map(info => [info.student_id, info]) || []);

    const templatePath = path.join(__dirname, '../全学生進路希望調査票2025.xlsx');
    const destPath = path.join(__dirname, 'test_generated_survey.xlsx');

    const wb = XLSX.readFile(templatePath);
    const ws1 = wb.Sheets['2025'];
    const ws2 = wb.Sheets['名簿2025'];

    const N = students.length;

    students.forEach((student, targetIdx) => {
        const startRow = targetIdx * 24;
        const info = careerMap.get(student.student_id_text);

        ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 2 })] = { t: 's', v: student.class_name || '' };
        ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 5 })] = { t: 's', v: student.full_name || '' };
        ws1[XLSX.utils.encode_cell({ r: startRow, c: 16 })] = { t: 'n', v: targetIdx + 1 };

        if (info) {
            let filledDate = '';
            if (info.filled_at) {
                filledDate = info.filled_at.replace(/-/g, '/');
            } else if (info.updated_at) {
                filledDate = info.updated_at.split('T')[0].replace(/-/g, '/');
            }
            ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 13 })] = { t: 's', v: filledDate };
            ws1[XLSX.utils.encode_cell({ r: startRow + 2, c: 2 })] = { t: 's', v: info.path_type || '' };

            ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 5 })] = { t: 's', v: info.first_choice_school || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 12 })] = { t: 's', v: info.first_choice_reason || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 5, c: 5 })] = { t: 's', v: info.first_choice_department || '' };

            ws1[XLSX.utils.encode_cell({ r: startRow + 6, c: 5 })] = { t: 's', v: info.second_choice_school || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 6, c: 12 })] = { t: 's', v: info.second_choice_reason || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 7, c: 5 })] = { t: 's', v: info.second_choice_department || '' };

            ws1[XLSX.utils.encode_cell({ r: startRow + 8, c: 5 })] = { t: 's', v: info.third_choice_school || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 8, c: 12 })] = { t: 's', v: info.third_choice_reason || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 9, c: 5 })] = { t: 's', v: info.third_choice_department || '' };

            ws1[XLSX.utils.encode_cell({ r: startRow + 11, c: 5 })] = { t: 's', v: info.preferred_field || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 12, c: 5 })] = { t: 's', v: info.preferred_region || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 13, c: 5 })] = { t: 's', v: info.can_move || '' };

            ws1[XLSX.utils.encode_cell({ r: startRow + 15, c: 5 })] = { t: 's', v: info.tuition_budget || '' };

            let parentSupportText = '';
            if (info.parent_support) {
                parentSupportText = info.parent_support;
                if (info.parent_support === '可' && info.parent_support_amount) {
                    parentSupportText += ` (経費支弁額: ${info.parent_support_amount})`;
                }
            }
            ws1[XLSX.utils.encode_cell({ r: startRow + 16, c: 5 })] = { t: 's', v: parentSupportText };

            ws1[XLSX.utils.encode_cell({ r: startRow + 18, c: 5 })] = { t: 's', v: info.post_grad_plans || '' };

            let otherText = '';
            if (info.passbook_updated || info.pay_slips_available) {
                otherText += `【確認事項】 通帳記帳: ${info.passbook_updated || '未回答'} / アルバイト給与明細: ${info.pay_slips_available || '未回答'}\n`;
                otherText += `--------------------------------------------------\n`;
            }
            otherText += info.teacher_questions || '';
            ws1[XLSX.utils.encode_cell({ r: startRow + 19, c: 5 })] = { t: 's', v: otherText };
        } else {
            ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 13 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 2, c: 2 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 12 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 5, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 6, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 6, c: 12 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 7, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 8, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 8, c: 12 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 9, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 11, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 12, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 13, c: 5 })] = { t: 's', v: '可　・　不可' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 15, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 16, c: 5 })] = { t: 's', v: '可　・　不可' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 18, c: 5 })] = { t: 's', v: '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 19, c: 5 })] = { t: 's', v: '' };
        }
    });

    Object.keys(ws1).forEach(addr => {
        if (!addr.startsWith('!')) {
            const cell = XLSX.utils.decode_cell(addr);
            if (cell.r >= N * 24) {
                delete ws1[addr];
            }
        }
    });

    if (ws1['!merges']) {
        ws1['!merges'] = ws1['!merges'].filter(m => m.s.r < N * 24);
    }

    ws1['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: N * 24 - 1, c: 19 }
    });

    students.forEach((student, targetIdx) => {
        ws2[XLSX.utils.encode_cell({ r: targetIdx, c: 0 })] = { t: 's', v: student.student_id_text || '' };
        ws2[XLSX.utils.encode_cell({ r: targetIdx, c: 1 })] = { t: 's', v: student.class_name || '' };
        ws2[XLSX.utils.encode_cell({ r: targetIdx, c: 2 })] = { t: 'n', v: targetIdx + 1 };
        ws2[XLSX.utils.encode_cell({ r: targetIdx, c: 3 })] = { t: 's', v: student.full_name || '' };
    });

    Object.keys(ws2).forEach(addr => {
        if (!addr.startsWith('!')) {
            const cell = XLSX.utils.decode_cell(addr);
            if (cell.r >= N) {
                delete ws2[addr];
            }
        }
    });

    ws2['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: N - 1, c: 3 }
    });

    XLSX.writeFile(wb, destPath);
    console.log(`Excel successfully generated at: ${destPath}`);
}

runTest();
