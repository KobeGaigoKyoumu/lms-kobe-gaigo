'use client'

import { useState, useRef, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './ImagePreviewModal.module.css'

export default function ImagePreviewModal({ 
    imageUrl, 
    imageName, 
    onClose,
    images = [],
    initialIndex = 0
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [zoom, setZoom] = useState(1)
    const [rotate, setRotate] = useState(0)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    const imageRef = useRef(null)
    const touchStartX = useRef(0)
    const touchEndX = useRef(0)

    const hasMultipleImages = images && images.length > 1
    const currentImage = hasMultipleImages ? images[currentIndex] : { url: imageUrl, name: imageName }

    const handleNext = () => {
        if (hasMultipleImages) {
            setCurrentIndex(prev => (prev + 1) % images.length)
            handleReset()
        }
    }

    const handlePrev = () => {
        if (hasMultipleImages) {
            setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
            handleReset()
        }
    }

    // Escキー、左右キーで移動
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
            if (hasMultipleImages) {
                if (e.key === 'ArrowRight' || e.key === 'Right') {
                    e.preventDefault()
                    handleNext()
                }
                if (e.key === 'ArrowLeft' || e.key === 'Left') {
                    e.preventDefault()
                    handlePrev()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose, hasMultipleImages, currentIndex, images.length])

    // マウスドラッグでの移動
    const handleMouseDown = (e) => {
        e.preventDefault()
        setIsDragging(true)
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }

    const handleMouseMove = (e) => {
        if (!isDragging) return
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    // タッチデバイスのドラッグ移動 & スワイプ検知
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setIsDragging(true)
            const touch = e.touches[0]
            setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
            touchStartX.current = touch.clientX
            touchEndX.current = touch.clientX
        }
    }

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return
        const touch = e.touches[0]
        setPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        })
        touchEndX.current = touch.clientX
    }

    const handleTouchEnd = () => {
        setIsDragging(false)
        if (zoom === 1 && hasMultipleImages) {
            const diffX = touchStartX.current - touchEndX.current
            const threshold = 50 // px
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    handleNext()
                } else {
                    handlePrev()
                }
            }
        }
    }

    // マウスホイールでのズーム
    const handleWheel = (e) => {
        e.preventDefault()
        const zoomStep = 0.1
        let newZoom = zoom + (e.deltaY < 0 ? zoomStep : -zoomStep)
        newZoom = Math.max(0.5, Math.min(newZoom, 5)) // 0.5x ~ 5.0x
        setZoom(newZoom)
    }

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 5))
    }

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.5))
    }

    const handleRotateCcw = () => {
        setRotate(prev => prev - 90)
    }

    const handleRotateCw = () => {
        setRotate(prev => prev + 90)
    }

    const handleReset = () => {
        setZoom(1)
        setRotate(0)
        setPosition({ x: 0, y: 0 })
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">
                <X size={24} />
            </button>

            {hasMultipleImages && (
                <>
                    <div className={styles.imageCounter}>
                        {currentIndex + 1} / {images.length}
                    </div>
                    <button 
                        className={`${styles.navButton} ${styles.prevButton}`} 
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        aria-label="前の画像"
                    >
                        <ChevronLeft size={28} />
                    </button>
                    <button 
                        className={`${styles.navButton} ${styles.nextButton}`} 
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        aria-label="次の画像"
                    >
                        <ChevronRight size={28} />
                    </button>
                </>
            )}

            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div 
                    className={styles.imageContainer}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onWheel={handleWheel}
                >
                    <img
                        ref={imageRef}
                        src={currentImage?.url}
                        alt={currentImage?.name}
                        className={styles.modalImage}
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotate}deg)`,
                            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}
                        draggable={false}
                    />
                </div>

                <div className={styles.toolbar}>
                    <button 
                        className={styles.toolbarButton} 
                        onClick={handleZoomOut} 
                        disabled={zoom <= 0.5}
                        title="縮小"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <span className={styles.zoomIndicator}>
                        {Math.round(zoom * 100)}%
                    </span>
                    <button 
                        className={styles.toolbarButton} 
                        onClick={handleZoomIn} 
                        disabled={zoom >= 5}
                        title="拡大"
                    >
                        <ZoomIn size={20} />
                    </button>

                    <div className={styles.divider}></div>

                    <button 
                        className={styles.toolbarButton} 
                        onClick={handleRotateCcw}
                        title="左に90度回転"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button 
                        className={styles.toolbarButton} 
                        onClick={handleRotateCw}
                        title="右に90度回転"
                    >
                        <RotateCw size={20} />
                    </button>

                    <div className={styles.divider}></div>

                    <button 
                        className={styles.toolbarButton} 
                        onClick={handleReset}
                        title="リセット"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}
