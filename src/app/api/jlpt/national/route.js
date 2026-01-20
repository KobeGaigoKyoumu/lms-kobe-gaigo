import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * JLPT全国統計データを取得するAPI
 * 国際交流基金が公開する公式統計データをJSONから読み込んで返す
 */
export async function GET() {
    try {
        const dataPath = path.join(process.cwd(), 'data', 'jlpt_national_stats.json')

        if (!fs.existsSync(dataPath)) {
            return NextResponse.json(
                { error: '全国統計データが見つかりません' },
                { status: 404 }
            )
        }

        const rawData = fs.readFileSync(dataPath, 'utf-8')
        const data = JSON.parse(rawData)

        // レベル別の平均合格率を計算
        const levels = ['N1', 'N2', 'N3', 'N4', 'N5']
        const averageRates = {
            japan: {},
            overseas: {},
            total: {}
        }

        for (const level of levels) {
            for (const region of ['japan', 'overseas']) {
                const rates = data.sessions
                    .filter(s => s[region]?.[level]?.pass_rate)
                    .map(s => s[region][level].pass_rate)

                if (rates.length > 0) {
                    averageRates[region][level] = {
                        average: (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1),
                        min: Math.min(...rates).toFixed(1),
                        max: Math.max(...rates).toFixed(1),
                        count: rates.length
                    }
                }
            }
        }

        // 最新3年間のデータを抽出
        const recentYears = [...new Set(data.sessions.map(s => s.year))]
            .sort((a, b) => b - a)
            .slice(0, 3)

        const recentSessions = data.sessions.filter(s => recentYears.includes(s.year))

        return NextResponse.json({
            source: data.source,
            description: data.description,
            extracted_at: data.extracted_at,
            totalSessions: data.sessions.length,
            sessions: data.sessions,
            recentSessions,
            averageRates
        })

    } catch (error) {
        console.error('Error loading national stats:', error)
        return NextResponse.json(
            { error: '統計データの読み込みに失敗しました' },
            { status: 500 }
        )
    }
}
