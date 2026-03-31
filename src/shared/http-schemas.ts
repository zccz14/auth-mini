import { z } from 'zod'

export const emailStartSchema = z.object({
  email: z.email()
})

export const emailVerifySchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/)
})

export const refreshSchema = z.object({
  refresh_token: z.string().min(1)
})
