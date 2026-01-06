'use client'

import { useEffect, useRef } from 'react'
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js'
import { Radar } from 'react-chartjs-2'

// Chart.jsの登録
ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
)

export default function RadarChart({ labels, data, title, color = 'blue' }) {
    const colors = {
        blue: {
            bg: 'rgba(59, 130, 246, 0.2)',
            border: 'rgba(59, 130, 246, 0.8)',
            point: 'rgba(59, 130, 246, 1)'
        },
        green: {
            bg: 'rgba(16, 185, 129, 0.2)',
            border: 'rgba(16, 185, 129, 0.8)',
            point: 'rgba(16, 185, 129, 1)'
        }
    }

    const theme = colors[color] || colors.blue

    const chartData = {
        labels: labels,
        datasets: [
            {
                label: title || '成績',
                data: data,
                backgroundColor: theme.bg,
                borderColor: theme.border,
                borderWidth: 2,
                pointBackgroundColor: theme.point,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: theme.point,
                pointRadius: 4,
            }
        ]
    }

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 10,
                cornerRadius: 4,
            }
        },
        scales: {
            r: {
                angleLines: {
                    color: 'rgba(156, 163, 175, 0.3)'
                },
                grid: {
                    color: 'rgba(156, 163, 175, 0.3)'
                },
                pointLabels: {
                    color: '#6b7280',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                },
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: {
                    stepSize: 20,
                    color: '#9ca3af',
                    backdropColor: 'transparent',
                    font: {
                        size: 9
                    },
                    z: 1
                }
            }
        }
    }

    return (
        <Radar data={chartData} options={options} key={studentId} />
    )
}
