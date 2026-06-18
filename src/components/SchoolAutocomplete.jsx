'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import styles from './SchoolAutocomplete.module.css';

export default function SchoolAutocomplete({
    value = '',
    onChange,
    placeholder = '学校名を入力してください...',
    required = false,
    className = '',
    ...props
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const containerRef = useRef(null);
    const debounceTimerRef = useRef(null);

    // propsから受け取る value の変化を同期する
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // リスト外クリックでプルダウンを閉じる
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                // 入力値が空の状態でフォーカスアウトしたら、選択をクリアする
                if (!inputValue.trim()) {
                    onChange('');
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [inputValue, onChange]);

    // 検索APIを叩く処理（デバウンス適用）
    const triggerSearch = (query) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!query.trim()) {
            setSuggestions([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        debounceTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/schools/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data.schools || []);
                } else {
                    setSuggestions([]);
                }
            } catch (err) {
                console.error('Failed to search schools:', err);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        }, 300); // 300ms デバウンス
    };

    // 入力値変更ハンドラ
    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        setIsOpen(true);
        triggerSearch(val);
        onChange(val);
    };

    // 選択ハンドラ
    const handleSelect = (schoolName) => {
        setInputValue(schoolName);
        onChange(schoolName);
        setIsOpen(false);
    };

    // クリアハンドラ
    const handleClear = () => {
        setInputValue('');
        onChange('');
        setSuggestions([]);
        setIsOpen(false);
    };

    // 学校タイプごとのバッジ定義
    const getTypeBadge = (type) => {
        switch (type) {
            case 'university':
                return <span className={`${styles.badge} ${styles.badgeUniversity}`}>大学</span>;
            case 'junior_college':
                return <span className={`${styles.badge} ${styles.badgeJuniorCollege}`}>短大</span>;
            case 'vocational_school':
                return <span className={`${styles.badge} ${styles.badgeVocationalSchool}`}>専門</span>;
            case 'graduate_school':
                return <span className={`${styles.badge} ${styles.badgeGraduateSchool}`}>大学院</span>;
            default:
                return null;
        }
    };

    return (
        <div className={`${styles.autocompleteContainer} ${className}`} ref={containerRef}>
            <div className={styles.inputWrapper}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setIsOpen(true);
                        if (inputValue) triggerSearch(inputValue);
                    }}
                    placeholder={placeholder}
                    required={required}
                    className={styles.inputField}
                    {...props}
                />
                {isLoading ? (
                    <span className={styles.iconWrapper}>
                        <Loader2 className={styles.spinner} size={16} />
                    </span>
                ) : inputValue ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className={styles.clearButton}
                        title="選択解除"
                    >
                        <X size={16} />
                    </button>
                ) : (
                    <span className={styles.iconWrapper}>
                        <Search size={16} />
                    </span>
                )}
            </div>

            {isOpen && (inputValue.trim() !== '') && (
                <div className={styles.dropdown}>
                    {isLoading && suggestions.length === 0 && (
                        <div className={styles.loadingState}>検索中...</div>
                    )}
                    {!isLoading && suggestions.length === 0 && (
                        <div className={styles.noResults}>該当する学校が見つかりません。</div>
                    )}
                    {suggestions.map((item, idx) => (
                        <div
                            key={`${item.name}-${idx}`}
                            className={styles.dropdownItem}
                            onClick={() => handleSelect(item.name)}
                        >
                            <span className={styles.schoolName}>{item.name}</span>
                            {getTypeBadge(item.school_type)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
