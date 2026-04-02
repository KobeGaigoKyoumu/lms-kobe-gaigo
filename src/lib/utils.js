/**
 * Common utility functions for the LMS application.
 * Note: Avoid using 'use server' here if you need synchronous helpers.
 */

export const normalizeClassName = (name) => {
    if (!name) return ''
    return typeof name === 'string' 
        ? name.trim()
            .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
            .replace(/[－ー—―‐−–—]/g, '-')
            .replace(/\s+/g, '') // Remove internal spaces for robust matching
        : name
}
