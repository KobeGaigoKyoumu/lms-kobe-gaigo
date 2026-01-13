/**
 * 成績証明書 PDF テンプレートエディタ
 * オリジナルPDFをテンプレートとして使用し、データ部分を上書きして出力
 * 
 * 使用方法:
 * 1. テンプレートPDFを public/templates/成績証明書_テンプレート.pdf に配置
 * 2. generateTranscriptPDF(studentData, issueDate) を呼び出し
 * 3. 返却されたバイナリをファイルに保存またはダウンロード
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// テンプレートPDFのパス
const getTemplatePath = () => {
    return path.join(process.cwd(), 'public', 'templates', '成績証明書_テンプレート.pdf');
};

/**
 * 座標レイアウト定義 (v3 - 調整済み)
 * PDF座標系: 左下が原点(0,0)、A4サイズ = 595 x 842 ポイント
 */
export const LAYOUT = {
    // 白塗りつぶし領域（元のデータを消すため）
    whiteouts: [
        // 学籍番号値
        { x: 148, y: 698, width: 180, height: 24 },
        // クラス値
        { x: 418, y: 698, width: 160, height: 24 },
        // 国籍値
        { x: 148, y: 673, width: 180, height: 24 },
        // 氏名値
        { x: 418, y: 673, width: 160, height: 24 },
        // 生年月日値
        { x: 148, y: 648, width: 180, height: 24 },
        // 性別値
        { x: 418, y: 648, width: 160, height: 24 },
        // 入学年月日値
        { x: 148, y: 623, width: 360, height: 24 },
        // 卒業年月日値
        { x: 148, y: 598, width: 180, height: 24 },
        // 発行元情報
        { x: 395, y: 56, width: 180, height: 46 },
    ],

    // テキスト配置座標
    text: {
        studentId: { x: 155, y: 704 },
        className: { x: 425, y: 704 },
        nationality: { x: 155, y: 679 },
        name: { x: 425, y: 679 },
        birthDate: { x: 155, y: 654 },
        gender: { x: 425, y: 654 },
        enrollmentDate: { x: 155, y: 629 },
        graduationDate: { x: 155, y: 604 },
        schoolName: { x: 405, y: 82 },
        issueDate: { x: 405, y: 64 },
    },

    // 成績テーブル行Y座標
    gradeRows: {
        '文字語彙': 508,
        '文法': 483,
        '読解': 458,
        '聴解': 433,
        '作文': 408,
        '会話': 383,
        '総合': 358,
    },

    // 評価列X座標（中心）
    gradeColumns: {
        'A': 184,
        'B': 269,
        'C': 354,
        'D': 439,
        'F': 524,
    },

    // フォントサイズ
    fontSize: 10,
};

/**
 * 成績証明書PDFを生成
 * @param {Buffer|Uint8Array} templateBytes - テンプレートPDFのバイナリ
 * @param {Object} data - 学生データ
 * @param {string} data.studentId - 学籍番号
 * @param {string} data.className - クラス名
 * @param {string} data.nationality - 国籍
 * @param {string} data.name - 氏名
 * @param {string} data.birthDate - 生年月日 (例: 2002 / 04 / 11)
 * @param {string} data.gender - 性別
 * @param {string} data.enrollmentDate - 入学年月日
 * @param {string} data.graduationDate - 卒業年月日
 * @param {Object} data.grades - 科目別評価 { '文字語彙': 'A', '文法': 'B', ... }
 * @param {string} issueDate - 発行日 (例: 2026年01月13日)
 * @param {string} schoolName - 学校名 (デフォルト: 神戸外語教育学院)
 * @returns {Promise<Uint8Array>} 生成されたPDFバイナリ
 */
export async function generateFromTemplate(templateBytes, data, issueDate, schoolName = null) {
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    // 標準フォント（英数字用）
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const white = rgb(1, 1, 1);
    const black = rgb(0, 0, 0);

    // 白い矩形で既存データを塗りつぶし
    for (const rect of LAYOUT.whiteouts) {
        page.drawRectangle({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            color: white,
        });
    }

    // テキスト描画ヘルパー
    const drawText = (text, pos, size = LAYOUT.fontSize) => {
        if (!text) return;
        page.drawText(String(text), {
            x: pos.x,
            y: pos.y,
            size: size,
            font: font,
            color: black,
        });
    };

    // 個人情報を描画
    drawText(data.studentId, LAYOUT.text.studentId);
    drawText(data.className, LAYOUT.text.className);
    drawText(data.nationality, LAYOUT.text.nationality);
    drawText(data.name, LAYOUT.text.name);
    drawText(data.birthDate, LAYOUT.text.birthDate);
    drawText(data.gender, LAYOUT.text.gender);
    drawText(data.enrollmentDate, LAYOUT.text.enrollmentDate);
    drawText(data.graduationDate, LAYOUT.text.graduationDate);

    // 発行元情報
    if (schoolName) {
        drawText(schoolName, LAYOUT.text.schoolName);
    }
    drawText(issueDate, LAYOUT.text.issueDate);

    // 成績に丸を描画
    if (data.grades) {
        for (const [subject, grade] of Object.entries(data.grades)) {
            const rowY = LAYOUT.gradeRows[subject];
            const colX = LAYOUT.gradeColumns[grade];

            if (rowY !== undefined && colX !== undefined) {
                page.drawEllipse({
                    x: colX,
                    y: rowY,
                    xScale: 13,
                    yScale: 9,
                    borderColor: black,
                    borderWidth: 1.2,
                });
            }
        }
    }

    return await pdfDoc.save();
}

/**
 * Node.js用: ファイルからテンプレートを読み込んでPDFを生成
 */
export async function generateTranscriptPDF(data, issueDate, schoolName = null, templatePath = null) {
    const tplPath = templatePath || getTemplatePath();
    const templateBytes = fs.readFileSync(tplPath);
    return generateFromTemplate(templateBytes, data, issueDate, schoolName);
}

/**
 * Node.js用: PDFをファイルに保存
 */
export async function saveTranscriptPDF(data, issueDate, outputPath, schoolName = null, templatePath = null) {
    const pdfBytes = await generateTranscriptPDF(data, issueDate, schoolName, templatePath);
    fs.writeFileSync(outputPath, pdfBytes);
    return outputPath;
}

/**
 * ブラウザ用: fetch APIでテンプレートを取得してPDFを生成
 */
export async function generateTranscriptPDFBrowser(data, issueDate, schoolName = null, templateUrl = '/templates/成績証明書_テンプレート.pdf') {
    const response = await fetch(templateUrl);
    const templateBytes = await response.arrayBuffer();
    return generateFromTemplate(new Uint8Array(templateBytes), data, issueDate, schoolName);
}

/**
 * サンプルデータでテスト生成
 */
export async function generateSampleTranscript(outputPath) {
    const sampleData = {
        studentId: '2404005',
        className: '2-11',
        nationality: 'China',
        name: 'LIN WEIJIAN',
        birthDate: '2002 / 04 / 11',
        gender: 'Male',
        enrollmentDate: '2024 / 04 / 01',
        graduationDate: '2026 / 03 / 31',
        grades: {
            '文字語彙': 'A',
            '文法': 'B',
            '読解': 'C',
            '聴解': 'B',
            '作文': 'A',
            '会話': 'B',
            '総合': 'B',
        },
    };

    return saveTranscriptPDF(sampleData, '2026/01/13', outputPath, 'Kobe Gaigo Academy');
}

export default {
    generateFromTemplate,
    generateTranscriptPDF,
    saveTranscriptPDF,
    generateTranscriptPDFBrowser,
    generateSampleTranscript,
    LAYOUT,
};
