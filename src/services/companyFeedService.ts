/**
 * Company Feed Service — บริการ API สำหรับประกาศบริษัท / Social Feed / ปฏิทิน
 */

import api from './api'

// ─── Types ───────────────────────────────────────────
export interface Post {
    id: string
    author_id: string
    category: 'announcement' | 'news' | 'discussion'
    title: string | null
    content: string
    is_pinned: boolean | number
    created_at: string
    updated_at: string
    author_name: string
    author_role: string
    comment_count: number
    reaction_count: number
    user_reacted: number  // 0 or 1
}

export interface Comment {
    id: string
    post_id: string
    author_id: string
    content: string
    created_at: string
    author_name: string
    author_role: string
}

export interface CompanyEvent {
    id: string
    title: string
    description: string | null
    event_date: string
    event_end_date: string | null
    start_time: string | null
    end_time: string | null
    is_all_day: boolean | number
    location: string | null
    event_type: 'meeting' | 'holiday' | 'deadline' | 'other'
    color: string
    created_by: string
    created_by_name: string
}

interface PaginationResponse {
    page: number
    limit: number
    total: number
    totalPages: number
}

// ─── Service ─────────────────────────────────────────
export const companyFeedService = {
    // ── Posts ──
    getPosts: async (params?: { category?: string; page?: number; limit?: number }) => {
        const res = await api.get<{
            success: boolean
            data: { posts: Post[]; pagination: PaginationResponse }
        }>('/company-feed/posts', { params })
        return res.data.data
    },

    createPost: async (data: { category?: string; title?: string; content: string }) => {
        const res = await api.post<{
            success: boolean
            data: { post: Post }
        }>('/company-feed/posts', data)
        return res.data.data.post
    },

    updatePost: async (id: string, data: { category?: string; title?: string; content?: string }) => {
        const res = await api.put(`/company-feed/posts/${id}`, data)
        return res.data
    },

    deletePost: async (id: string) => {
        const res = await api.delete(`/company-feed/posts/${id}`)
        return res.data
    },

    pinPost: async (id: string, is_pinned: boolean) => {
        const res = await api.patch(`/company-feed/posts/${id}/pin`, { is_pinned })
        return res.data
    },

    // ── Comments ──
    getComments: async (postId: string) => {
        const res = await api.get<{
            success: boolean
            data: { comments: Comment[] }
        }>(`/company-feed/posts/${postId}/comments`)
        return res.data.data.comments
    },

    createComment: async (postId: string, content: string) => {
        const res = await api.post<{
            success: boolean
            data: { comment: Comment }
        }>(`/company-feed/posts/${postId}/comments`, { content })
        return res.data.data.comment
    },

    deleteComment: async (postId: string, commentId: string) => {
        const res = await api.delete(`/company-feed/posts/${postId}/comments/${commentId}`)
        return res.data
    },

    // ── Reactions ──
    toggleReaction: async (postId: string) => {
        const res = await api.post<{
            success: boolean
            data: { reacted: boolean }
        }>(`/company-feed/posts/${postId}/reactions`)
        return res.data.data
    },

    // ── Events ──
    getEvents: async (params?: { year?: number; month?: number }) => {
        const res = await api.get<{
            success: boolean
            data: { events: CompanyEvent[] }
        }>('/company-feed/events', { params })
        return res.data.data.events
    },

    createEvent: async (data: {
        title: string
        description?: string
        event_date: string
        event_end_date?: string
        start_time?: string
        end_time?: string
        is_all_day?: boolean
        location?: string
        event_type?: string
        color?: string
    }) => {
        const res = await api.post<{
            success: boolean
            data: { event: CompanyEvent }
        }>('/company-feed/events', data)
        return res.data.data.event
    },

    updateEvent: async (id: string, data: Partial<CompanyEvent>) => {
        const res = await api.put(`/company-feed/events/${id}`, data)
        return res.data
    },

    deleteEvent: async (id: string) => {
        const res = await api.delete(`/company-feed/events/${id}`)
        return res.data
    },
}
