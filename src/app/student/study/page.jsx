'use client'

import { useState, useEffect, useRef } from 'react'
import {
  BookOpen,
  Award,
  FileText,
  Search,
  Shuffle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  BookMarked,
  Star,
  Trash2,
  BarChart2,
  AlertCircle
} from 'lucide-react'
import {
  getVocabData,
  getManualQuestions,
  getMiniExamSets,
  typeLabels
} from './vocabData'
import styles from './study.module.css'

export default function StudentStudyPage() {
  const [activeTab, setActiveTab] = useState('study')
  const [appModule, setAppModule] = useState('hub') // 'hub' | 'master'

  // Load all vocab/quiz data
  const vocabList = useRef(getVocabData())
  const manualQuestions = useRef(getManualQuestions())
  const miniExamSets = useRef(getMiniExamSets())

  // --- Study Mode State ---
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [textFilter, setTextFilter] = useState('')
  const [studyOrder, setStudyOrder] = useState([...vocabList.current])
  const [currentPage, setCurrentPage] = useState(1)

  // --- Study History / Progress States ---
  const [learnedVocab, setLearnedVocab] = useState(new Set())
  const [quizCorrect, setQuizCorrect] = useState(new Set())
  const [quizIncorrect, setQuizIncorrect] = useState(new Set())
  const [examHistory, setExamHistory] = useState([])
  const [reviewMode, setReviewMode] = useState(false)
  const [learnedCategoryFilter, setLearnedCategoryFilter] = useState('all')
  const [incorrectPage, setIncorrectPage] = useState(1)

  // Load progress from LocalStorage on mount
  useEffect(() => {
    try {
      const learned = localStorage.getItem('n5_learned_vocab')
      if (learned) setLearnedVocab(new Set(JSON.parse(learned)))
      
      const correct = localStorage.getItem('n5_quiz_correct_ids')
      if (correct) setQuizCorrect(new Set(JSON.parse(correct)))
      
      const incorrect = localStorage.getItem('n5_quiz_incorrect_ids')
      if (incorrect) setQuizIncorrect(new Set(JSON.parse(incorrect)))
      
      const history = localStorage.getItem('n5_exam_history')
      if (history) setExamHistory(JSON.parse(history))
    } catch (e) {
      console.error('Error loading study progress:', e)
    }
  }, [])

  // Toggle Learned Vocab Handler
  const toggleLearnedVocab = (term) => {
    setLearnedVocab((prev) => {
      const next = new Set(prev)
      if (next.has(term)) {
        next.delete(term)
      } else {
        next.add(term)
      }
      localStorage.setItem('n5_learned_vocab', JSON.stringify([...next]))
      return next
    })
  }

  // Clear Exam History Handler
  const clearExamHistory = () => {
    if (confirm('Are you sure you want to clear your exam history?')) {
      setExamHistory([])
      localStorage.removeItem('n5_exam_history')
    }
  }

  // Remove Incorrect Quiz ID
  const removeIncorrectId = (id) => {
    setQuizIncorrect((prev) => {
      const next = new Set(prev)
      next.delete(id)
      localStorage.setItem('n5_quiz_incorrect_ids', JSON.stringify([...next]))
      
      // Adjust incorrectPage if total pages decreases
      const INCORRECT_PER_PAGE = 5
      const totalPages = Math.ceil(next.size / INCORRECT_PER_PAGE)
      setIncorrectPage((curr) => {
        if (totalPages === 0) return 1
        return curr > totalPages ? totalPages : curr
      })
      
      return next
    })
  }

  // --- Quiz Mode State ---
  const [questionCount, setQuestionCount] = useState('10')
  const [quizState, setQuizState] = useState('setup') // 'setup' | 'active' | 'result'
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizAnswered, setQuizAnswered] = useState(false)
  const [quizSelected, setQuizSelected] = useState(null)
  const [quizReview, setQuizReview] = useState([])

  // --- Exam Mode State ---
  const [examSelect, setExamSelect] = useState('0')
  const [examState, setExamState] = useState('setup') // 'setup' | 'active' | 'result'
  const [examQuestions, setExamQuestions] = useState([])
  const [examAnswers, setExamAnswers] = useState([])
  const [examIndex, setExamIndex] = useState(0)
  const [examSecondsLeft, setExamSecondsLeft] = useState(10 * 60)
  const [examTimeUp, setExamTimeUp] = useState(false)
  const [examScore, setExamScore] = useState(0)
  const [examReview, setExamReview] = useState([])

  const timerRef = useRef(null)

  // Get distinct categories
  const categories = [...new Set(vocabList.current.map((item) => item.category))].sort()

  // Shuffle items utility
  const shuffle = (items) => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  // --- Study Actions ---
  const handleShuffleStudy = () => {
    setStudyOrder(shuffle(studyOrder))
  }

  // Filtered vocabulary list
  const filteredVocab = studyOrder.filter((item) => {
    const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter
    const haystack = `${item.term} ${item.reading} ${item.meaning} ${item.category}`.toLowerCase()
    return categoryMatch && haystack.includes(textFilter.trim().toLowerCase())
  })

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, textFilter, studyOrder])

  const CARDS_PER_PAGE = 20
  const totalPages = Math.ceil(filteredVocab.length / CARDS_PER_PAGE)
  const currentCards = filteredVocab.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  )

  // --- Quiz Actions ---
  const handleStartQuiz = () => {
    const bank = shuffle(manualQuestions.current)
    const count = questionCount === 'all' ? bank.length : Math.min(Number(questionCount), bank.length)
    const selected = bank.slice(0, count)

    setQuizQuestions(selected)
    setQuizIndex(0)
    setQuizScore(0)
    setQuizAnswered(false)
    setQuizSelected(null)
    setQuizReview([])
    setReviewMode(false)
    setQuizState('active')
  }

  const handleChooseAnswer = (choice) => {
    if (quizAnswered) return
    setQuizAnswered(true)
    setQuizSelected(choice)

    const current = quizQuestions[quizIndex]
    const isCorrect = choice === current.answer
    if (isCorrect) {
      setQuizScore((prev) => prev + 1)
    }

    setQuizReview((prev) => [
      ...prev,
      { ...current, choice, correct: isCorrect }
    ])
  }

  const handleNextQuestion = () => {
    if (quizIndex + 1 >= quizQuestions.length) {
      // Save quiz results to LocalStorage
      setQuizCorrect((prevCorrect) => {
        const nextCorrect = new Set(prevCorrect)
        setQuizIncorrect((prevIncorrect) => {
          const nextIncorrect = new Set(prevIncorrect)
          
          quizReview.forEach((item) => {
            if (item.correct) {
              nextCorrect.add(item.id)
              nextIncorrect.delete(item.id) // Corrected item is resolved
            } else {
              nextIncorrect.add(item.id)
              nextCorrect.delete(item.id)
            }
          });
          
          localStorage.setItem('n5_quiz_correct_ids', JSON.stringify([...nextCorrect]))
          localStorage.setItem('n5_quiz_incorrect_ids', JSON.stringify([...nextIncorrect]))
          return nextIncorrect
        })
        return nextCorrect
      })
      
      setQuizState('result')
    } else {
      setQuizIndex((prev) => prev + 1)
      setQuizAnswered(false)
      setQuizSelected(null)
    }
  }

  // --- Exam Actions ---
  const handleStartExam = () => {
    const selectedSet = miniExamSets.current[Number(examSelect)]
    const questions = []

    for (const part of selectedSet.parts) {
      part.ids.forEach((id, idx) => {
        const question = manualQuestions.current[id - 1]
        questions.push({
          ...question,
          partLabel: part.label,
          partNumber: idx + 1
        })
      })
    }

    setExamQuestions(questions)
    setExamAnswers(new Array(questions.length).fill(null))
    setExamIndex(0)
    setExamScore(0)
    setExamSecondsLeft(10 * 60)
    setExamTimeUp(false)
    setExamReview([])
    setExamState('active')
  }

  // Timer side-effect
  useEffect(() => {
    if (examState === 'active' && examSecondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setExamSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            finishExam(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [examState])

  const chooseExamAnswer = (choice) => {
    const updated = [...examAnswers]
    updated[examIndex] = choice
    setExamAnswers(updated)
  }

  const handleNextExamQuestion = () => {
    if (examIndex + 1 >= examQuestions.length) {
      finishExam(false)
    } else {
      setExamIndex((prev) => prev + 1)
    }
  }

  const finishExam = (timeUp = false) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setExamTimeUp(timeUp)

    let score = 0
    const review = examQuestions.map((q, idx) => {
      const choice = examAnswers[idx] || 'No Answer'
      const isCorrect = choice === q.answer
      if (isCorrect) score += 1
      return { ...q, choice, correct: isCorrect }
    })

    setExamScore(score)
    setExamReview(review)
    setExamState('result')

    // Append to exam history
    const examTitle = miniExamSets.current[Number(examSelect)].title
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      examTitle,
      score,
      total: examQuestions.length,
      percent: Math.round((score / examQuestions.length) * 100)
    }
    setExamHistory((prev) => {
      const next = [newEntry, ...prev]
      localStorage.setItem('n5_exam_history', JSON.stringify(next))
      return next
    })
  }

  // Time formatting (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  // Clean timer on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab !== 'exam') {
      if (timerRef.current) clearInterval(timerRef.current)
      setExamState('setup')
    }
  }

  // Start Review Quiz of Incorrect Questions
  const handleStartReviewQuiz = () => {
    const incorrectList = manualQuestions.current.filter((q) => quizIncorrect.has(q.id))
    if (incorrectList.length === 0) return

    const bank = shuffle(incorrectList)
    setQuizQuestions(bank)
    setQuizIndex(0)
    setQuizScore(0)
    setQuizAnswered(false)
    setQuizSelected(null)
    setQuizReview([])
    setReviewMode(true)
    setActiveTab('quiz')
    setQuizState('active')
  }

  return (
    <div className={styles.container}>
      {/* App Module Selector Tab */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.75rem', gap: '0.25rem', border: '1px solid #cbd5e1' }}>
          <button
            onClick={() => setAppModule('hub')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              background: appModule === 'hub' ? '#3b82f6' : 'transparent',
              color: appModule === 'hub' ? '#ffffff' : '#64748b'
            }}
          >
            📚 N5 Study Hub
          </button>
          <button
            onClick={() => setAppModule('master')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              background: appModule === 'master' ? '#3b82f6' : 'transparent',
              color: appModule === 'master' ? '#ffffff' : '#64748b'
            }}
          >
            🌸 Japanese Master
          </button>
        </div>
      </div>

      {appModule === 'master' ? (
        <div style={{ width: '100%', height: 'calc(100vh - 120px)', border: 'none', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', background: '#ffffff' }}>
          <iframe
            src="/code_artifact.html"
            title="Japanese Master - For English Speakers"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      ) : (
        <>
          {/* Header Area */}
          <header className={styles.header}>
            <div className={styles.titleArea}>
              <h1>N5 Kanji & Vocabulary Study Hub</h1>
              <p className={styles.lead}>JLPT N5 vocabulary flashcards, practice quizzes, and 10-minute mock exams.</p>
            </div>
            <nav className={styles.tabs} aria-label="Learning Mode">
          <button
            className={`${styles.tab} ${activeTab === 'study' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('study')}
          >
            <BookOpen size={18} />
            Flashcards
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'quiz' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('quiz')}
          >
            <Award size={18} />
            Practice Quiz
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'exam' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('exam')}
          >
            <FileText size={18} />
            Mock Exam
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'progress' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('progress')}
          >
            <BarChart2 size={18} />
            Progress & Stats
          </button>
        </nav>
      </header>

      {/* 1. Flashcards Mode */}
      {activeTab === 'study' && (
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div className={styles.controls}>
              <div className={styles.control}>
                <label htmlFor="categorySelect">Category</label>
                <select
                  id="categorySelect"
                  className={styles.select}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.control}>
                <label htmlFor="vocabSearch">Search</label>
                <input
                  id="vocabSearch"
                  type="search"
                  placeholder="e.g. 学校 / school / がっこう"
                  className={styles.search}
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.toolbarRight}>
              <span className={styles.countText}>
                {filteredVocab.length} of {vocabList.current.length} cards shown
              </span>
              <button
                className={styles.btnSecondary}
                onClick={handleShuffleStudy}
                title="Shuffle flashcards"
              >
                <Shuffle size={16} />
                Shuffle
              </button>
            </div>
          </div>

          <div className={styles.studyGrid}>
            {currentCards.length > 0 ? (
              currentCards.map((item, index) => (
                <article key={`${item.term}-${index}`} className={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <span className={styles.categoryTag}>{item.category}</span>
                    <button
                      onClick={() => toggleLearnedVocab(item.term)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: learnedVocab.has(item.term) ? '#f59e0b' : '#cbd5e1',
                        transition: 'color 0.2s'
                      }}
                      title={learnedVocab.has(item.term) ? "Mark as unlearned" : "Mark as learned"}
                    >
                      <Star size={20} fill={learnedVocab.has(item.term) ? '#f59e0b' : 'none'} />
                    </button>
                  </div>
                  <div className={styles.wordline} style={{ marginTop: '0.25rem' }}>
                    <div className={styles.word}>{item.term}</div>
                  </div>
                  <div className={styles.kana}>{item.reading}</div>
                  <p className={styles.meaning}>{item.meaning}</p>
                  <div className={styles.example}>
                    <span className={styles.exampleJa}>{item.example}</span>
                    <span className={styles.exampleEn}>{item.exampleEn}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.emptyState}>No matching vocabulary found.</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.btnSecondary}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className={styles.btnSecondary}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}

      {/* 2. Practice Quiz Mode */}
      {activeTab === 'quiz' && (
        <section className={styles.panel}>
          <div className={styles.quizWrap}>
            {/* Sidebar Setup */}
            <aside className={styles.quizSidebar}>
              <div className={styles.sidebarSetting}>
                <label htmlFor="qCountSelect">Number of Questions</label>
                <select
                  id="qCountSelect"
                  className={styles.select}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  disabled={quizState === 'active'}
                >
                  <option value="10">10 Questions</option>
                  <option value="20">20 Questions</option>
                  <option value="30">30 Questions</option>
                  <option value="50">50 Questions</option>
                  <option value="100">100 Questions</option>
                  <option value="200">200 Questions</option>
                  <option value="all">All ({manualQuestions.current.length} Questions)</option>
                </select>
              </div>

              {quizState !== 'active' ? (
                <button className={styles.btnPrimary} onClick={handleStartQuiz}>
                  Start Quiz
                </button>
              ) : (
                <button
                  className={styles.btnSecondary}
                  onClick={() => setQuizState('setup')}
                >
                  Back to Setup
                </button>
              )}

              <div className={styles.typeList}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                  Question Categories:
                </span>
                <div className={styles.typeItem}>
                  <BookMarked size={14} /> 1. Kanji Reading
                </div>
                <div className={styles.typeItem}>
                  <BookMarked size={14} /> 2. Orthography
                </div>
                <div className={styles.typeItem}>
                  <BookMarked size={14} /> 3. Context Vocabulary
                </div>
                <div className={styles.typeItem}>
                  <BookMarked size={14} /> 4. Paraphrase & Meaning
                </div>
                <div className={styles.typeItem}>
                  <BookMarked size={14} /> 5. Usage Context
                </div>
              </div>
              {reviewMode && (
                <div style={{ 
                  background: '#fef2f2', 
                  border: '1px solid #fee2e2', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem', 
                  color: '#991b1b', 
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  Reviewing incorrect questions only.
                </div>
              )}
              <p className={styles.examNote} style={{ marginTop: 'auto' }}>
                Instant feedback and English explanations are shown right after you answer each question.
              </p>
            </aside>

            {/* Quiz Main Area */}
            <main className={styles.quizMain}>
              {quizState === 'setup' && (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                  <Award size={48} style={{ color: '#3b82f6', marginBottom: '1rem' }} />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                    Choose the number of questions and click "Start Quiz".
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Incorrect answers can be reviewed and studied at the end of the session.
                  </p>
                </div>
              )}

              {quizState === 'active' && quizQuestions.length > 0 && (
                <>
                  <div className={styles.metaHeader}>
                    <span>
                      Question {quizIndex + 1} of {quizQuestions.length}
                    </span>
                    <span className={styles.scoreText}>Score: {quizScore}</span>
                  </div>
                  <div className={styles.progressbar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${((quizIndex) / quizQuestions.length) * 100}%` }}
                    />
                  </div>

                  <div className={styles.questionCard}>
                    <span className={styles.qtype}>
                      {typeLabels[quizQuestions[quizIndex].type] || 'Practice'}
                    </span>
                    <p className={styles.questionText}>{quizQuestions[quizIndex].prompt}</p>
                  </div>

                  <div className={styles.optionsGrid}>
                    {quizQuestions[quizIndex].options.map((option, idx) => {
                      const currentQ = quizQuestions[quizIndex]
                      let optClass = styles.optionButton
                      if (quizAnswered) {
                        if (option === currentQ.answer) {
                          optClass += ` ${styles.optionCorrect}`
                        } else if (option === quizSelected) {
                          optClass += ` ${styles.optionIncorrect}`
                        }
                      } else if (option === quizSelected) {
                        optClass += ` ${styles.optionSelected}`
                      }

                      return (
                        <button
                          key={idx}
                          className={optClass}
                          disabled={quizAnswered}
                          onClick={() => handleChooseAnswer(option)}
                        >
                          <span>{idx + 1}. {option}</span>
                          {quizAnswered && option === currentQ.answer && (
                            <CheckCircle2 size={16} />
                          )}
                          {quizAnswered && option === quizSelected && option !== currentQ.answer && (
                            <XCircle size={16} />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {quizAnswered && (
                    <>
                      <div
                        className={`${styles.feedbackBox} ${quizSelected === quizQuestions[quizIndex].answer
                            ? styles.feedbackGood
                            : styles.feedbackBad
                          }`}
                      >
                        <h4 style={{ fontWeight: 800, margin: '0 0 0.25rem' }}>
                          {quizSelected === quizQuestions[quizIndex].answer
                            ? 'Correct! (正解)'
                            : 'Check again... (不正解)'}
                        </h4>
                        <p style={{ margin: 0 }}>
                          Answer: <strong>{quizQuestions[quizIndex].answer}</strong>
                          <br />
                          {quizQuestions[quizIndex].explain}
                        </p>
                      </div>

                      <button
                        className={styles.btnPrimary}
                        style={{ marginLeft: 'auto' }}
                        onClick={handleNextQuestion}
                      >
                        {quizIndex + 1 === quizQuestions.length ? 'See Results' : 'Next'}
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </>
              )}

              {quizState === 'result' && (
                <div className={styles.resultContainer}>
                  <div
                    className={styles.resultScoreRing}
                    style={{ '--percent': (quizScore / quizQuestions.length) * 100 }}
                  >
                    <div className={styles.resultScoreInner}>
                      <span className={styles.scoreVal}>{quizScore}</span>
                      <span className={styles.scoreMax}>/ {quizQuestions.length} Questions</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                      Well Done! Accuracy: {Math.round((quizScore / quizQuestions.length) * 100)}%
                    </h2>
                    <button className={styles.btnPrimary} onClick={handleStartQuiz}>
                      <RotateCcw size={16} />
                      Try Another Quiz
                    </button>
                  </div>

                  <div className={styles.reviewSection}>
                    <h3>Detailed Quiz Review</h3>
                    {quizReview.map((item, idx) => (
                      <div key={idx} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <span className={styles.reviewType}>{typeLabels[item.type]}</span>
                          <span
                            className={`${styles.reviewStatusBadge} ${item.correct ? styles.statusCorrect : styles.statusIncorrect
                              }`}
                          >
                            {item.correct ? 'Correct' : 'Needs Review'}
                          </span>
                        </div>
                        <p className={styles.reviewPrompt}>{idx + 1}. {item.prompt}</p>
                        <div className={styles.reviewAnswers}>
                          <div>
                            Your Answer:{' '}
                            <span className={item.correct ? styles.userAnsCorrect : styles.userAns}>
                              {item.choice}
                            </span>
                          </div>
                          <div>
                            Correct Answer: <span className={styles.correctAns}>{item.answer}</span>
                          </div>
                        </div>
                        <div className={styles.reviewExplain}>{item.explain}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </section>
      )}

      {/* 3. Mock Exam Mode */}
      {activeTab === 'exam' && (
        <section className={styles.panel}>
          <div className={styles.quizWrap}>
            {/* Sidebar Setup */}
            <aside className={styles.quizSidebar}>
              <div className={styles.sidebarSetting}>
                <label htmlFor="examSelect">Select Mock Exam Set</label>
                <select
                  id="examSelect"
                  className={styles.select}
                  value={examSelect}
                  onChange={(e) => setExamSelect(e.target.value)}
                  disabled={examState === 'active'}
                >
                  {miniExamSets.current.map((set, idx) => (
                    <option key={idx} value={idx}>
                      {set.title}
                    </option>
                  ))}
                </select>
              </div>

              {examState !== 'active' ? (
                <button className={styles.btnPrimary} onClick={handleStartExam}>
                  Start Mock Exam
                </button>
              ) : (
                <button
                  className={styles.btnSecondary}
                  onClick={() => {
                    if (confirm('Do you want to cancel the exam? All progress in this session will be lost.')) {
                      setExamState('setup')
                    }
                  }}
                >
                  Cancel Exam
                </button>
              )}

              {/* Timer Display */}
              {examState === 'active' && (
                <div
                  className={`${styles.timerBox} ${examSecondsLeft < 60 ? styles.timerWarning : ''
                    }`}
                >
                  <Clock size={20} />
                  <span>{formatTime(examSecondsLeft)}</span>
                </div>
              )}

              <div className={styles.typeList}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                  Exam Format (25 Questions):
                </span>
                <div className={styles.typeItem}>1. Kanji Reading (5 Qs)</div>
                <div className={styles.typeItem}>2. Orthography (5 Qs)</div>
                <div className={styles.typeItem}>3. Context Vocabulary (5 Qs)</div>
                <div className={styles.typeItem}>4. Paraphrase & Meaning (5 Qs)</div>
                <div className={styles.typeItem}>5. Usage Context (5 Qs)</div>
              </div>
              <p className={styles.examNote}>
                Allowed Time: <strong>10 Minutes</strong>
                <br />
                Note: This simulation mimics the real exam. Answers will not be revealed until the final results screen.
              </p>
            </aside>

            {/* Exam Main Area */}
            <main className={styles.quizMain}>
              {examState === 'setup' && (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                  <FileText size={48} style={{ color: '#3b82f6', marginBottom: '1rem' }} />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                    Select a Mock Exam set and click "Start Mock Exam" to begin.
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    A 25-question, 10-minute mock exam will begin.
                  </p>
                </div>
              )}

              {examState === 'active' && examQuestions.length > 0 && (
                <>
                  <div className={styles.metaHeader}>
                    <span>
                      {miniExamSets.current[Number(examSelect)].title}: Question {examIndex + 1} of {examQuestions.length}
                    </span>
                    <span className={styles.scoreText}>
                      Answered: {examAnswers.filter((a) => a !== null).length} / {examQuestions.length}
                    </span>
                  </div>
                  <div className={styles.progressbar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${((examIndex) / examQuestions.length) * 100}%` }}
                    />
                  </div>

                  <div className={styles.questionCard}>
                    <span className={styles.qtype}>{examQuestions[examIndex].partLabel}</span>
                    <p className={styles.questionText}>
                      Question {examQuestions[examIndex].partNumber}. {examQuestions[examIndex].prompt}
                    </p>
                  </div>

                  <div className={styles.optionsGrid}>
                    {examQuestions[examIndex].options.map((option, idx) => {
                      const selectedChoice = examAnswers[examIndex]
                      const optClass = `${styles.optionButton} ${selectedChoice === option ? styles.optionSelected : ''
                        }`

                      return (
                        <button
                          key={idx}
                          className={optClass}
                          onClick={() => chooseExamAnswer(option)}
                        >
                          <span>{idx + 1}. {option}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <button
                      className={styles.btnSecondary}
                      disabled={examIndex === 0}
                      onClick={() => setExamIndex((prev) => prev - 1)}
                    >
                      Back
                    </button>

                    <button
                      className={styles.btnPrimary}
                      disabled={examAnswers[examIndex] === null}
                      onClick={handleNextExamQuestion}
                    >
                      {examIndex + 1 === examQuestions.length ? 'Finish Exam' : 'Next'}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}

              {examState === 'result' && (
                <div className={styles.resultContainer}>
                  <div
                    className={styles.resultScoreRing}
                    style={{ '--percent': (examScore / examQuestions.length) * 100 }}
                  >
                    <div className={styles.resultScoreInner}>
                      <span className={styles.scoreVal}>{examScore}</span>
                      <span className={styles.scoreMax}>/ {examQuestions.length} Questions</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                      {examTimeUp ? "Time's Up!" : "Mock Exam Completed!"}{' '}
                      Accuracy: {Math.round((examScore / examQuestions.length) * 100)}%
                    </h2>
                    <button className={styles.btnPrimary} onClick={handleStartExam}>
                      <RotateCcw size={16} />
                      Retry This Exam
                    </button>
                  </div>

                  <div className={styles.reviewSection}>
                    <h3>Exam Explanation & Answers</h3>
                    {examReview.map((item, idx) => (
                      <div key={idx} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <span className={styles.reviewType}>{item.partLabel}</span>
                          <span
                            className={`${styles.reviewStatusBadge} ${item.correct ? styles.statusCorrect : styles.statusIncorrect
                              }`}
                          >
                            {item.correct ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <p className={styles.reviewPrompt}>
                          Question {item.partNumber}. {item.prompt}
                        </p>
                        <div className={styles.reviewAnswers}>
                          <div>
                            Your Answer:{' '}
                            <span className={item.correct ? styles.userAnsCorrect : styles.userAns}>
                              {item.choice}
                            </span>
                          </div>
                          <div>
                            Correct Answer: <span className={styles.correctAns}>{item.answer}</span>
                          </div>
                        </div>
                        <div className={styles.reviewExplain}>{item.explain}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </section>
      )}

      {/* 4. Progress & Stats Mode */}
      {activeTab === 'progress' && (
        <section className={styles.panel} style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {/* Summary Dashboard Header */}
          <div className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Learned Vocab</span>
              <div className={styles.statValue}>
                {learnedVocab.size} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>/ {vocabList.current.length} cards ({Math.round((learnedVocab.size / vocabList.current.length) * 100) || 0}%)</span>
              </div>
              <div className={styles.progressbar} style={{ marginTop: '0.5rem' }}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${(learnedVocab.size / vocabList.current.length) * 100}%` }}
                />
              </div>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statLabel}>Quiz Results</span>
              <div className={styles.statValue} style={{ display: 'flex', gap: '1.5rem', alignItems: 'baseline' }}>
                <span style={{ color: '#16a34a' }} title="Correct Questions count">{quizCorrect.size}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}> Correct</span></span>
                <span style={{ color: '#dc2626' }} title="Incorrect Questions count">{quizIncorrect.size}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}> Wrong</span></span>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Practice quiz records are updated on quiz completion.
              </p>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statLabel}>Mock Exams</span>
              <div className={styles.statValue}>
                {examHistory.length > 0 ? (
                  `${Math.round(examHistory.reduce((acc, curr) => acc + curr.percent, 0) / examHistory.length)}%`
                ) : (
                  '--'
                )}
                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}> Avg Score ({examHistory.length} taken)</span>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Includes time limit-adjusted scores.
              </p>
            </article>
          </div>

          <div className={styles.progressSection}>
            {/* Row 1: Learned Vocabulary */}
            <div className={styles.sectionBlock}>
              <div className={styles.headerWithFilter}>
                <h3>
                  <BookOpen size={20} style={{ color: '#3b82f6' }} />
                  Learned Vocabulary List ({learnedVocab.size})
                </h3>
                {learnedVocab.size > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label htmlFor="learnedCategorySelect" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Filter:</label>
                    <select
                      id="learnedCategorySelect"
                      className={styles.select}
                      style={{ padding: '0.375rem 0.75rem', minWidth: '130px', fontSize: '0.85rem' }}
                      value={learnedCategoryFilter}
                      onChange={(e) => setLearnedCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {learnedVocab.size > 0 ? (
                (() => {
                  const filtered = [...learnedVocab].sort().filter((term) => {
                    if (learnedCategoryFilter === 'all') return true
                    const vocabItem = vocabList.current.find((v) => v.term === term)
                    return vocabItem && vocabItem.category === learnedCategoryFilter
                  })
                  
                  return filtered.length > 0 ? (
                    <div className={styles.scrollContainer}>
                      <div className={styles.flexWrap}>
                        {filtered.map((term) => {
                          const vocabItem = vocabList.current.find((v) => v.term === term)
                          const reading = vocabItem ? ` (${vocabItem.reading})` : ''
                          return (
                            <button 
                              key={term} 
                              className={styles.badgeBtn}
                              onClick={() => toggleLearnedVocab(term)}
                              title="Click to remove from learned list"
                            >
                              <span>{term}{reading}</span>
                              <XCircle size={14} className={styles.badgeBtnIcon} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                      No vocabulary found in this category.
                    </div>
                  )
                })()
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  No flashcards marked as learned yet. Toggle the star icon on vocabulary cards to mark them.
                </div>
              )}
            </div>

            {/* Row 2: Wrong Questions (Practice Review) */}
            <div className={styles.sectionBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>
                  <AlertCircle size={20} style={{ color: '#dc2626' }} />
                  Incorrectly Answered Questions ({quizIncorrect.size})
                </h3>
                {quizIncorrect.size > 0 && (
                  <button 
                    className={styles.btnPrimary} 
                    onClick={handleStartReviewQuiz}
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)' }}
                  >
                    <RotateCcw size={16} />
                    Retake Incorrect Questions
                  </button>
                )}
              </div>
              {quizIncorrect.size > 0 ? (
                (() => {
                  const INCORRECT_PER_PAGE = 5
                  const incorrectList = [...quizIncorrect]
                  const totalIncorrectPages = Math.ceil(incorrectList.length / INCORRECT_PER_PAGE)
                  const paginatedIncorrect = incorrectList.slice(
                    (incorrectPage - 1) * INCORRECT_PER_PAGE,
                    incorrectPage * INCORRECT_PER_PAGE
                  )

                  return (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {paginatedIncorrect.map((id) => {
                          const q = manualQuestions.current.find((item) => item.id === id)
                          if (!q) return null
                          return (
                            <div key={id} className={styles.reviewCard} style={{ background: '#f8fafc' }}>
                              <div className={styles.reviewHeader}>
                                <span className={styles.reviewType}>{typeLabels[q.type]}</span>
                                <button 
                                  onClick={() => removeIncorrectId(id)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#94a3b8', 
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                  }}
                                  title="Remove from incorrect list"
                                >
                                  Mark Solved
                                </button>
                              </div>
                              <p className={styles.reviewPrompt}>{q.prompt}</p>
                              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                                Correct Answer: <strong style={{ color: '#16a34a' }}>{q.answer}</strong>
                              </div>
                              <div className={styles.reviewExplain}>{q.explain}</div>
                            </div>
                          )
                        })}
                      </div>

                      {totalIncorrectPages > 1 && (
                        <div className={styles.pagination} style={{ borderTop: 'none', padding: '1rem 0 0 0', marginTop: '1rem' }}>
                          <button
                            className={styles.btnSecondary}
                            disabled={incorrectPage === 1}
                            onClick={() => setIncorrectPage((prev) => Math.max(prev - 1, 1))}
                          >
                            Previous
                          </button>
                          <span className={styles.pageInfo}>
                            Page {incorrectPage} of {totalIncorrectPages}
                          </span>
                          <button
                            className={styles.btnSecondary}
                            disabled={incorrectPage === totalIncorrectPages}
                            onClick={() => setIncorrectPage((prev) => Math.min(prev + 1, totalIncorrectPages))}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )
                })()
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  Great job! You have no incorrect questions to review.
                </div>
              )}
            </div>

            {/* Row 3: Mock Exam Score History */}
            <div className={styles.sectionBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>
                  <FileText size={20} style={{ color: '#10b981' }} />
                  Mock Exam History
                </h3>
                {examHistory.length > 0 && (
                  <button 
                    className={styles.btnSecondary} 
                    onClick={clearExamHistory}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  >
                    <Trash2 size={14} />
                    Clear History
                  </button>
                )}
              </div>
              {examHistory.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Exam Set</th>
                        <th>Score</th>
                        <th>Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.date}</td>
                          <td>{entry.examTitle}</td>
                          <td>{entry.score} / {entry.total}</td>
                          <td style={{ fontWeight: 700, color: entry.percent >= 80 ? '#16a34a' : '#ef4444' }}>{entry.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  No mock exams taken yet. Navigate to the "Mock Exam" tab to try one.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
        </>
      )}
    </div>
  )
}
