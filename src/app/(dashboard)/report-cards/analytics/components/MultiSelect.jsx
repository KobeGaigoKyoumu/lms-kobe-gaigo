import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import styles from '../page.module.css'

export const AccordionChevron = ({ className, rotated }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
        style={{
            width: '1em',
            height: '1em',
            transition: 'transform 0.2s',
            transform: rotated ? 'rotate(180deg)' : 'none'
        }}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
)

export const MultiSelect = ({ label, options, selected, onChange, placeholder = "選択してください" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div
            ref={containerRef}
            className={styles.filterGroup}
            style={{ position: 'relative', minWidth: '200px' }}
            onMouseLeave={() => setIsOpen(false)}
        >
            <label className={styles.filterLabel}>{label}</label>
            <div
                className={styles.filterSelect}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    minHeight: '38px',
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    backgroundColor: 'white'
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                    {selected.length === 0 ? (
                        <span style={{ color: '#9ca3af' }}>{placeholder}</span>
                    ) : (
                        selected.map(item => (
                            <span key={item} style={{
                                background: '#eff6ff',
                                color: '#3b82f6',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                {item}
                                <X
                                    size={12}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(selected.filter(i => i !== item));
                                    }}
                                />
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown size={16} color="#6b7280" style={{ marginLeft: '8px' }} />
            </div>
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0 0 6px 6px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    width: '100%'
                }}>
                    {options.map(option => (
                        <div
                            key={option}
                            onClick={() => {
                                if (selected.includes(option)) {
                                    onChange(selected.filter(i => i !== option));
                                } else {
                                    onChange([...selected, option]);
                                }
                            }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: selected.includes(option) ? '#eff6ff' : 'white',
                                fontSize: '0.9rem',
                                borderBottom: '1px solid #f3f4f6'
                            }}
                        >
                            <span>{option}</span>
                            {selected.includes(option) && <Check size={14} color="#3b82f6" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
