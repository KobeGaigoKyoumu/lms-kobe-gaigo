'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'

// 都道府県コードと都道府県名の対応
const PREFECTURES = [
    { code: '', name: 'すべての都道府県' },
    { code: '01', name: '北海道' }, { code: '02', name: '青森県' }, { code: '03', name: '岩手県' },
    { code: '04', name: '宮城県' }, { code: '05', name: '秋田県' }, { code: '06', name: '山形県' },
    { code: '07', name: '福島県' }, { code: '08', name: '茨城県' }, { code: '09', name: '栃木県' },
    { code: '10', name: '群馬県' }, { code: '11', name: '埼玉県' }, { code: '12', name: '千葉県' },
    { code: '13', name: '東京都' }, { code: '14', name: '神奈川県' }, { code: '15', name: '新潟県' },
    { code: '16', name: '富山県' }, { code: '17', name: '石川県' }, { code: '18', name: '福井県' },
    { code: '19', name: '山梨県' }, { code: '20', name: '長野県' }, { code: '21', name: '岐阜県' },
    { code: '22', name: '静岡県' }, { code: '23', name: '愛知県' }, { code: '24', name: '三重県' },
    { code: '25', name: '滋賀県' }, { code: '26', name: '京都府' }, { code: '27', name: '大阪府' },
    { code: '28', name: '兵庫県' }, { code: '29', name: '奈良県' }, { code: '30', name: '和歌山県' },
    { code: '31', name: '鳥取県' }, { code: '32', name: '島根県' }, { code: '33', name: '岡山県' },
    { code: '34', name: '広島県' }, { code: '35', name: '山口県' }, { code: '36', name: '徳島県' },
    { code: '37', name: '香川県' }, { code: '38', name: '愛媛県' }, { code: '39', name: '高知県' },
    { code: '40', name: '福岡県' }, { code: '41', name: '佐賀県' }, { code: '42', name: '長崎県' },
    { code: '43', name: '熊本県' }, { code: '44', name: '大分県' }, { code: '45', name: '宮崎県' },
    { code: '46', name: '鹿児島県' }, { code: '47', name: '沖縄県' }
]

const SCHOOL_TYPES = [
    { value: '', label: 'すべて' },
    { value: 'university', label: '大学' },
    { value: 'junior_college', label: '短期大学' },
    { value: 'technical_college', label: '高等専門学校' },
    { value: 'vocational_school', label: '専門学校' },
    { value: 'graduate_school', label: '大学院' }
]

const ESTABLISHMENTS = [
    { value: '', label: 'すべて' },
    { value: 'national', label: '国立' },
    { value: 'public', label: '公立' },
    { value: 'private', label: '私立' }
]

function getSchoolTypeLabel(type) {
    const found = SCHOOL_TYPES.find(t => t.value === type)
    return found ? found.label : 'その他'
}

function getPrefectureName(code) {
    const found = PREFECTURES.find(p => p.code === code)
    return found ? found.name : ''
}

const ENROLLMENT_OPTIONS = [
    { value: '', label: 'すべて' },
    { value: 'true', label: '当校からの進学者あり' }
]

export default function SchoolSearchClient({ session }) {
    const [keyword, setKeyword] = useState('')
    const [selectedType, setSelectedType] = useState('')
    const [selectedPref, setSelectedPref] = useState('')
    const [selectedEstablishment, setSelectedEstablishment] = useState('')
    const [selectedEnrollment, setSelectedEnrollment] = useState('')
    const [schools, setSchools] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    // 検索条件が変更されたらページを1に戻す
    useEffect(() => {
        setPage(1)
    }, [keyword, selectedType, selectedPref, selectedEstablishment, selectedEnrollment])

    // デバウンス用のタイマーとフェッチロジック
    useEffect(() => {
        // 初期状態（条件がすべて空）の時は余分なリクエストを避ける
        if (!keyword.trim() && !selectedType && !selectedPref && !selectedEstablishment && !selectedEnrollment) {
            setSchools([])
            setTotalCount(0)
            setSearched(false)
            return
        }

        const delayDebounce = setTimeout(async () => {
            setLoading(true)
            setError(null)
            try {
                const query = new URLSearchParams()
                if (keyword.trim()) query.set('q', keyword.trim())
                if (selectedType) query.set('type', selectedType)
                if (selectedPref) query.set('pref', selectedPref)
                if (selectedEstablishment) query.set('establishment', selectedEstablishment)
                if (selectedEnrollment) query.set('hasEnrollment', selectedEnrollment)
                query.set('page', page.toString())

                const res = await fetch(`/api/schools/search?${query.toString()}`)
                if (!res.ok) {
                    throw new Error('データの取得に失敗しました。')
                }
                const data = await res.json()
                setSchools(data.schools || [])
                setTotalCount(data.totalCount || 0)
                setSearched(true)
            } catch (err) {
                console.error(err)
                setError('学校データの検索中にエラーが発生しました。時間を置いて再度お試しください。')
            } finally {
                setLoading(false)
            }
        }, 400) // 400ms デバウンス

        return () => clearTimeout(delayDebounce)
    }, [keyword, selectedType, selectedPref, selectedEstablishment, selectedEnrollment, page])

    const handleClear = () => {
        setKeyword('')
        setSelectedType('')
        setSelectedPref('')
        setSelectedEstablishment('')
        setSelectedEnrollment('')
        setSchools([])
        setTotalCount(0)
        setPage(1)
        setSearched(false)
        setError(null)
    }

    const renderMatchingDepartments = (departments) => {
        if (!departments) return null;
        
        // パターン1: 分野のみ
        if (departments.startsWith('【学習分野】')) {
            const field = departments.replace('【学習分野】', '');
            return (
                <div className={styles.departmentsArea}>
                    <div>
                        <span className={styles.deptLabel}>学習分野:</span>
                        <span className={styles.deptList}>{field}</span>
                    </div>
                </div>
            );
        }
        
        // パターン2: 学科・コースと分野の併記
        const mergeMatch = departments.match(/(.*)\s*【分野：(.*)】/);
        let displayDepts = departments;
        let inferredField = null;
        
        if (mergeMatch) {
            displayDepts = mergeMatch[1].trim();
            inferredField = mergeMatch[2].trim();
        }
        
        const list = displayDepts.split(', ');
        const q = keyword.trim().toLowerCase();
        
        const renderDeptsList = () => {
            if (!q) {
                return (
                    <span className={styles.deptList}>
                        {list.slice(0, 3).join(', ')}
                        {list.length > 3 ? ' ...' : ''}
                    </span>
                );
            }
            const matches = list.filter(d => d.toLowerCase().includes(q));
            const nonMatches = list.filter(d => !d.toLowerCase().includes(q));
            const combined = [...matches, ...nonMatches].slice(0, 3);
            return (
                <span className={styles.deptList}>
                    {combined.map((dept, idx) => {
                        const isMatch = dept.toLowerCase().includes(q);
                        return (
                            <span key={idx} className={isMatch ? styles.highlightDept : ''}>
                                {dept}
                                {idx < combined.length - 1 ? ', ' : ''}
                                {idx === combined.length - 1 && list.length > 3 ? ' ...' : ''}
                            </span>
                        );
                    })}
                </span>
            );
        };
        
        return (
            <div className={styles.departmentsArea}>
                {inferredField && (
                    <div style={{ marginBottom: '6px' }}>
                        <span className={styles.deptLabel}>学習分野:</span>
                        <span className={styles.deptList} style={{ color: '#1a73e8', fontWeight: '600' }}>
                            {inferredField}
                        </span>
                    </div>
                )}
                <div>
                    <span className={styles.deptLabel}>{q ? '学部・学科等:' : '設置学部・学科等:'}</span>
                    {renderDeptsList()}
                </div>
            </div>
        );
    };

    const limit = 20;
    const totalPages = Math.ceil(totalCount / limit);
    const fromIdx = (page - 1) * limit;
    const toIdx = Math.min(fromIdx + limit, totalCount);

    const renderPageNumbers = () => {
        const pages = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, page + 2);

        if (start > 1) {
            pages.push(
                <button key={1} className={`${styles.pageBtn} ${page === 1 ? styles.pageBtnActive : ''}`} onClick={() => setPage(1)}>
                    1
                </button>
            );
            if (start > 2) {
                pages.push(<span key="ellipsis-start" className={styles.pageEllipsis}>...</span>);
            }
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <button key={i} className={`${styles.pageBtn} ${page === i ? styles.pageBtnActive : ''}`} onClick={() => setPage(i)}>
                    {i}
                </button>
            );
        }

        if (end < totalPages) {
            if (end < totalPages - 1) {
                pages.push(<span key="ellipsis-end" className={styles.pageEllipsis}>...</span>);
            }
            pages.push(
                <button key={totalPages} className={`${styles.pageBtn} ${page === totalPages ? styles.pageBtnActive : ''}`} onClick={() => setPage(totalPages)}>
                    {totalPages}
                </button>
            );
        }

        return pages;
    };

    return (
        <div className={styles.container}>
            {/* ページヘッダー */}
            <div className={styles.header}>
                <div className={styles.headerTitleArea}>
                    <h1 className={styles.title}>学校検索</h1>
                    <p className={styles.subtitle}>日本全国の大学、短期大学、専門学校などのデータベースから進学先や設置学部・学科を検索できます。</p>
                </div>
            </div>

            {/* 検索パネル */}
            <div className={styles.searchPanel}>
                <div className={styles.searchGrid}>
                    {/* キーワード入力 */}
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="keyword">学校名・学部学科キーワード</label>
                        <div className={styles.inputWrapper}>
                            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                id="keyword"
                                type="text"
                                className={styles.input}
                                placeholder="学校名、学部、学科、よみがななどを入力..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                            {keyword && (
                                <button className={styles.clearBtn} onClick={handleClear} title="クリア">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 都道府県選択 */}
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="prefecture">都道府県</label>
                        <select
                            id="prefecture"
                            className={styles.select}
                            value={selectedPref}
                            onChange={(e) => setSelectedPref(e.target.value)}
                        >
                            {PREFECTURES.map((pref) => (
                                <option key={pref.code} value={pref.code}>
                                    {pref.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 学校種別フィルタータブ */}
                <div className={styles.filterGroup}>
                    <label className={styles.label}>学校種別</label>
                    <div className={styles.tabs}>
                        {SCHOOL_TYPES.map((type) => (
                            <button
                                key={type.value}
                                className={`${styles.tab} ${selectedType === type.value ? styles.tabActive : ''}`}
                                onClick={() => setSelectedType(type.value)}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 設置区分フィルタータブ */}
                <div className={styles.filterGroup}>
                    <label className={styles.label}>設置区分</label>
                    <div className={styles.tabs}>
                        {ESTABLISHMENTS.map((est) => (
                            <button
                                key={est.value}
                                className={`${styles.tab} ${selectedEstablishment === est.value ? styles.tabActive : ''}`}
                                onClick={() => setSelectedEstablishment(est.value)}
                            >
                                {est.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 進路実績フィルタータブ */}
                <div className={styles.filterGroup}>
                    <label className={styles.label}>進路実績</label>
                    <div className={styles.tabs}>
                        {ENROLLMENT_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                className={`${styles.tab} ${selectedEnrollment === opt.value ? styles.tabActive : ''}`}
                                onClick={() => setSelectedEnrollment(opt.value)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* リセットボタン */}
                {(keyword || selectedType || selectedPref || selectedEstablishment || selectedEnrollment) && (
                    <div className={styles.resetArea}>
                        <button className={styles.resetBtn} onClick={handleClear}>
                            条件をすべてクリア
                        </button>
                    </div>
                )}
            </div>

            {/* コンテンツエリア */}
            <div className={styles.resultArea}>
                {loading && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p className={styles.loadingText}>検索中...</p>
                    </div>
                )}

                {error && (
                    <div className={styles.errorContainer}>
                        <svg className={styles.errorIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && !searched && (
                    <div className={styles.emptyContainer}>
                        <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="11" cy="11" r="3" />
                            <line x1="20" y1="20" x2="14.65" y2="14.65" />
                        </svg>
                        <h3 className={styles.emptyTitle}>学校を検索しましょう</h3>
                        <p className={styles.emptyText}>上の検索ボックスに学校名や学部・学科名を入力するか、都道府県や学校種別を選択してください。</p>
                    </div>
                )}

                {!loading && !error && searched && schools.length === 0 && (
                    <div className={styles.emptyContainer}>
                        <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <h3 className={styles.emptyTitle}>該当する学校が見つかりませんでした</h3>
                        <p className={styles.emptyText}>キーワードのスペルやよみがな、絞り込み条件（都道府県、学校種別）を変更して再度お試しください。</p>
                    </div>
                )}

                {!loading && !error && searched && schools.length > 0 && (
                    <>
                        <div className={styles.resultHeader}>
                            <p className={styles.resultCount}>
                                検索結果: <strong>{totalCount}</strong> 件（{totalCount > 0 ? `${fromIdx + 1}〜${toIdx}` : '0'} 件を表示）
                            </p>
                        </div>
                        <div className={styles.grid}>
                            {schools.map((school) => (
                                <div key={school.code} className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.badgeGroup}>
                                            <span className={`${styles.badge} ${styles[`badge_${school.school_type}`]}`}>
                                                {getSchoolTypeLabel(school.school_type)}
                                            </span>
                                            {school.establishment_type && (
                                                <span className={`${styles.badge} ${styles[`badge_${school.establishment_type === '国立' ? 'national' : school.establishment_type === '公立' ? 'public' : 'private'}`]}`}>
                                                    {school.establishment_type}
                                                </span>
                                            )}
                                        </div>
                                        {school.prefecture && (
                                            <span className={styles.prefTag}>
                                                {getPrefectureName(school.prefecture)}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className={styles.schoolName}>{school.name}</h3>
                                    {renderMatchingDepartments(school.departments)}
                                    <div className={styles.websiteArea}>
                                        {school.website ? (
                                            <a 
                                                href={school.website} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className={`${styles.webLink} ${styles.webLinkOfficial}`}
                                            >
                                                <svg className={styles.linkIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                    <polyline points="15 3 21 3 21 9" />
                                                    <line x1="10" y1="14" x2="21" y2="3" />
                                                </svg>
                                                公式ホームページ
                                            </a>
                                        ) : (
                                            <a 
                                                href={`https://www.google.com/search?q=${encodeURIComponent(school.name + ' ホームページ')}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className={`${styles.webLink} ${styles.webLinkSearch}`}
                                            >
                                                <svg className={styles.linkIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                </svg>
                                                ホームページを検索
                                            </a>
                                        )}
                                    </div>
                                    <div className={styles.cardFooter}>
                                        <span className={styles.schoolCode}>
                                            コード: {school.code}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ページネーション */}
                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button 
                                    className={styles.pageBtn} 
                                    onClick={() => {
                                        setPage(prev => Math.max(1, prev - 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page === 1}
                                    title="前のページへ"
                                >
                                    &lt; 前へ
                                </button>
                                {renderPageNumbers()}
                                <button 
                                    className={styles.pageBtn} 
                                    onClick={() => {
                                        setPage(prev => Math.min(totalPages, prev + 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page === totalPages}
                                    title="次のページへ"
                                >
                                    次へ &gt;
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
