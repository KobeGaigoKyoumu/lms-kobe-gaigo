// Merge Career Stats with JLPT Data
useEffect(() => {
    if (!careerStatsData || !enhancedJlptStats?.studentStats) return

    const enhancedCareerStats = JSON.parse(JSON.stringify(careerStatsData))
    const studentJlptMap = new Map()

    enhancedJlptStats.studentStats.forEach(s => {
        const key = s.name.replace(/\s+/g, '').toLowerCase()
        studentJlptMap.set(key, s)
        studentJlptMap.set(s.name, s)
    })

    enhancedCareerStats.topDestinations.forEach(dest => {
        if (!dest.students) return

        const destJlptStats = {}

        dest.students.forEach(student => {
            const nameKey = (student.name || '').replace(/\s+/g, '').toLowerCase()
            const jlptInfo = studentJlptMap.get(nameKey)

            if (jlptInfo && jlptInfo.levels) {
                Object.entries(jlptInfo.levels).forEach(([level, data]) => {
                    if (!destJlptStats[level]) {
                        destJlptStats[level] = {
                            passed: { count: 0, avg: 0, max: 0, min: 999, scores: [] },
                            failed: { count: 0, avg: 0, max: 0, min: 999, scores: [] },
                            overall: { avg: 0, max: 0, min: 999, scores: [] }
                        }
                    }

                    const score = parseInt(data.score) || 0
                    if (data.status === '合格') {
                        destJlptStats[level].passed.scores.push(score)
                    } else if (data.status === '不合格') {
                        destJlptStats[level].failed.scores.push(score)
                    }
                })
            }
        })

        // Calculate aggregated stats
        Object.keys(destJlptStats).forEach(lvl => {
            const s = destJlptStats[lvl]
            const pScores = s.passed.scores
            const fScores = s.failed.scores
            const allScores = [...pScores, ...fScores]

            s.passed.count = pScores.length
            s.passed.avg = pScores.length > 0 ? pScores.reduce((a, b) => a + b, 0) / pScores.length : 0
            s.passed.max = pScores.length > 0 ? Math.max(...pScores) : '-'
            s.passed.min = pScores.length > 0 ? Math.min(...pScores) : '-'

            s.failed.count = fScores.length
            s.failed.avg = fScores.length > 0 ? fScores.reduce((a, b) => a + b, 0) / fScores.length : 0
            s.failed.max = fScores.length > 0 ? Math.max(...fScores) : '-'
            s.failed.min = fScores.length > 0 ? Math.min(...fScores) : '-'

            s.overall.avg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : 0
            s.overall.max = allScores.length > 0 ? Math.max(...allScores) : '-'
            s.overall.min = allScores.length > 0 ? Math.min(...allScores) : '-'

            s.passRate = allScores.length > 0 ? ((s.passed.count / allScores.length) * 100).toFixed(1) : 0
        })

        if (Object.keys(destJlptStats).length > 0) {
            dest.jlptStats = destJlptStats
        }
    })

    setCareerStats(enhancedCareerStats)

}, [enhancedJlptStats])
