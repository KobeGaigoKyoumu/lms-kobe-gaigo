// Test the download-survey API logic directly (without HTTP)
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function testDownloadLogic() {
    const className = '1-1'; // テスト用クラス名

    console.log('=== Download API Logic Test ===');

    // 1. Supabase接続
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('Supabase URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.log('Service Key:', supabaseServiceKey ? 'SET' : 'MISSING');

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('ERROR: Supabase config missing');
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. クラスの active 学生一覧を取得
    console.log('\n--- Fetching students for class:', className, '---');
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name')
        .eq('class_name', className)
        .eq('status', 'active')
        .order('student_id_text', { ascending: true });

    if (studentError) {
        console.error('Fetch students error:', studentError);
        return;
    }

    console.log('Students found:', students?.length || 0);
    if (!students || students.length === 0) {
        console.log('No active students found. Trying other classes...');
        const { data: allClasses } = await supabase
            .from('students')
            .select('class_name')
            .eq('status', 'active');
        const uniqueClasses = [...new Set(allClasses?.map(s => s.class_name))];
        console.log('Available classes:', uniqueClasses);
        return;
    }
    console.log('First 3 students:', students.slice(0, 3).map(s => `${s.student_id_text}: ${s.full_name}`));

    const studentIds = students.map(s => s.student_id_text);

    // 3. 対象学生の進路希望情報を取得
    console.log('\n--- Fetching career info ---');
    const { data: careerInfos, error: careerError } = await supabase
        .from('student_career_info')
        .select('*')
        .in('student_id', studentIds);

    if (careerError) {
        console.error('Fetch career info error:', careerError);
        return;
    }
    console.log('Career info found:', careerInfos?.length || 0);

    // 4. テンプレートExcelファイルを読み込み
    console.log('\n--- Loading Excel template ---');
    const templatePath = path.join(process.cwd(), 'public', 'templates', '全学生進路希望調査票2025.xlsx');
    console.log('Template path:', templatePath);
    console.log('Template exists:', fs.existsSync(templatePath));

    if (!fs.existsSync(templatePath)) {
        console.error('ERROR: Template file not found!');
        return;
    }

    try {
        const wb = XLSX.readFile(templatePath);
        console.log('Sheets:', wb.SheetNames);

        const ws1 = wb.Sheets['2025'];
        const ws2 = wb.Sheets['名簿2025'];
        console.log('ws1 (2025) exists:', !!ws1);
        console.log('ws2 (名簿2025) exists:', !!ws2);

        if (!ws1 || !ws2) {
            console.error('ERROR: Missing sheets!');
            return;
        }

        const N = students.length;
        const careerMap = new Map(careerInfos?.map(info => [info.student_id, info]) || []);

        // データ書き込みテスト (最初の学生のみ)
        const student = students[0];
        const info = careerMap.get(student.student_id_text);
        console.log('\n--- Test data write for:', student.full_name, '---');
        console.log('Career info found:', !!info);
        if (info) {
            console.log('  path_type:', info.path_type);
            console.log('  first_choice_school:', info.first_choice_school);
        }

        // 全学生分のデータ書き込み
        students.forEach((student, targetIdx) => {
            const startRow = targetIdx * 24;
            const info = careerMap.get(student.student_id_text);

            ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 2 })] = { t: 's', v: student.class_name || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 5 })] = { t: 's', v: student.full_name || '' };
            ws1[XLSX.utils.encode_cell({ r: startRow, c: 16 })] = { t: 'n', v: targetIdx + 1 };

            if (info) {
                let filledDate = '';
                if (info.filled_at) filledDate = info.filled_at.replace(/-/g, '/');
                else if (info.updated_at) filledDate = info.updated_at.split('T')[0].replace(/-/g, '/');
                ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 13 })] = { t: 's', v: filledDate };
                ws1[XLSX.utils.encode_cell({ r: startRow + 2, c: 2 })] = { t: 's', v: info.path_type || '' };
                ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 5 })] = { t: 's', v: info.first_choice_school || '' };
                ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 12 })] = { t: 's', v: info.first_choice_reason || '' };
                ws1[XLSX.utils.encode_cell({ r: startRow + 5, c: 5 })] = { t: 's', v: info.first_choice_department || '' };
            }
        });

        // 不要セルの消去
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

        // 名簿シート
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

        // Excel書き出し
        console.log('\n--- Writing Excel buffer ---');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        console.log('Buffer size:', buffer.length, 'bytes');
        console.log('Buffer type:', typeof buffer, buffer instanceof Buffer ? 'Buffer' : buffer instanceof Uint8Array ? 'Uint8Array' : 'other');

        // テスト用にファイルに保存
        const outputPath = path.join(process.cwd(), 'scratch', 'test_output.xlsx');
        fs.writeFileSync(outputPath, buffer);
        console.log('\nSaved test output to:', outputPath);
        console.log('\n=== SUCCESS! All operations completed. ===');
    } catch (e) {
        console.error('ERROR during Excel operations:', e.message);
        console.error(e.stack);
    }
}

testDownloadLogic().catch(console.error);
