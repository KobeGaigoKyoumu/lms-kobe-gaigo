'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const getSupabaseAdmin = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

const SHIFT_TIMES = {
    morning: {
        1: { start: '09:00', end: '09:45' },
        2: { start: '09:50', end: '10:35' },
        3: { start: '10:50', end: '11:35' },
        4: { start: '11:40', end: '12:25' }
    },
    afternoon: {
        1: { start: '13:10', end: '13:55' },
        2: { start: '14:00', end: '14:45' },
        3: { start: '15:00', end: '15:45' },
        4: { start: '15:50', end: '16:35' }
    }
}

export async function saveScheduleTemplateAction(courseId, templateName, templateId, newItems) {
    const supabase = getSupabaseAdmin()
    try {
        let currentTemplateId = templateId;
        if (templateId === 'new') {
            const { data, error } = await supabase
                .from('schedule_templates')
                .insert({ course_id: courseId, name: templateName })
                .select()
                .single()
            if (error) throw error
            currentTemplateId = data.id
        } else {
            const { error } = await supabase
                .from('schedule_templates')
                .update({ name: templateName })
                .eq('id', templateId)
            if (error) throw error
        }

        // Update items: delete all first
        await supabase.from('schedule_template_items').delete().eq('template_id', currentTemplateId)

        // Insert new ones
        const itemsToInsert = newItems.map(item => ({...item, template_id: currentTemplateId}))
        if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
                .from('schedule_template_items')
                .insert(itemsToInsert)
            if (itemsError) throw itemsError
        }

        revalidatePath(`/courses/${courseId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        throw new Error('Failed to save template')
    }
}

export async function deleteScheduleTemplateAction(courseId, templateId) {
    const supabase = getSupabaseAdmin()
    await supabase.from('schedule_templates').delete().eq('id', templateId)
    revalidatePath(`/courses/${courseId}`)
    return { success: true }
}

export async function copyScheduleTemplateAction(courseId, template) {
    const supabase = getSupabaseAdmin()
    try {
        const { data: newTemplate, error } = await supabase
            .from('schedule_templates')
            .insert({ course_id: courseId, name: `${template.name} - コピー` })
            .select()
            .single()
        if (error) throw error

        if (template.items && template.items.length > 0) {
            const copyItems = template.items.map(i => ({
                template_id: newTemplate.id,
                day_of_week: i.day_of_week,
                period: i.period,
                subject: i.subject
            }))
            await supabase.from('schedule_template_items').insert(copyItems)
        }
        revalidatePath(`/courses/${courseId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        throw new Error('Failed to copy template')
    }
}

export async function applyScheduleTemplateAction(courseId, classId, template, shift) {
    const supabase = getSupabaseAdmin()
    try {
        // Delete current schedules for this class
        await supabase.from('schedules').delete().eq('class_id', classId)

        // Insert new ones
        const shiftTimes = SHIFT_TIMES[shift]
        const newSchedules = template.items.map(item => ({
            course_id: courseId,
            class_id: classId,
            day_of_week: item.day_of_week,
            period: item.period,
            subject: item.subject,
            start_time: shiftTimes[item.period].start,
            end_time: shiftTimes[item.period].end,
            room: null
        }))

        if (newSchedules.length > 0) {
            const { error } = await supabase.from('schedules').insert(newSchedules)
            if (error) throw error
        }
        revalidatePath(`/courses/${courseId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        throw new Error('Failed to apply template')
    }
}

export async function deleteClassScheduleAction(courseId, scheduleId) {
    const supabase = getSupabaseAdmin()
    await supabase.from('schedules').delete().eq('id', scheduleId)
    revalidatePath(`/courses/${courseId}`)
    return { success: true }
}
