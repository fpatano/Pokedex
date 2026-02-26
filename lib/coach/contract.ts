import { z } from 'zod';

export const COACH_CORE_CONTRACT_VERSION = 'coach-core.v1' as const;

export const CoachFallbackReasonSchema = z.enum(['MISSING_CRITICAL_INPUT']);
export type CoachFallbackReason = z.infer<typeof CoachFallbackReasonSchema>;

export const CoachArchetypeSchema = z.enum(['AGGRO_TEMPO', 'MIDRANGE_TOOLBOX', 'CONTROL_ENGINE']);
export type CoachArchetype = z.infer<typeof CoachArchetypeSchema>;

export const CoachPlanHorizonSchema = z.literal('NEXT_7_DAYS');
export type CoachPlanHorizon = z.infer<typeof CoachPlanHorizonSchema>;

export const CoachIntakeSchema = z
  .object({
    objective: z.string().trim().min(1).max(180).optional(),
    favoriteTypes: z.array(z.string().trim().min(1).max(24)).max(4).optional(),
    pace: z.enum(['fast', 'balanced', 'control']).optional(),
    budget: z.enum(['low', 'mid', 'high']).optional(),
    experience: z.enum(['novice', 'intermediate', 'advanced']).optional(),
  })
  .strict();
export type CoachIntake = z.infer<typeof CoachIntakeSchema>;

export const CoachRequestSchema = z
  .object({
    contractVersion: z.literal(COACH_CORE_CONTRACT_VERSION),
    intake: CoachIntakeSchema,
  })
  .strict();
export type CoachRequest = z.infer<typeof CoachRequestSchema>;

const ConfidenceSchema = z.number().min(0).max(1);

export const CoachCanonicalIntakeSchema = z
  .object({
    objective: z.string(),
    objectiveKeywords: z.array(z.string()),
    favoriteTypes: z.array(z.string()),
    pace: z.enum(['fast', 'balanced', 'control']),
    budget: z.enum(['low', 'mid', 'high']),
    experience: z.enum(['novice', 'intermediate', 'advanced']),
    hasCriticalInput: z.boolean(),
  })
  .strict();
export type CoachCanonicalIntake = z.infer<typeof CoachCanonicalIntakeSchema>;

export const CoachPlanSchema = z
  .object({
    horizon: CoachPlanHorizonSchema,
    title: z.string().min(1),
    steps: z.array(z.string().min(1)).length(3),
    rationale: z.string().min(1),
  })
  .strict();
export type CoachPlan = z.infer<typeof CoachPlanSchema>;

export const CoachSuccessResponseSchema = z
  .object({
    contractVersion: z.literal(COACH_CORE_CONTRACT_VERSION),
    mode: z.literal('coach'),
    confidence: ConfidenceSchema,
    archetype: CoachArchetypeSchema,
    rationale: z.array(z.string().min(1)).min(1),
    canonicalIntake: CoachCanonicalIntakeSchema,
    plan: CoachPlanSchema,
    fallbackReason: z.null(),
  })
  .strict();
export type CoachSuccessResponse = z.infer<typeof CoachSuccessResponseSchema>;

export const CoachFallbackResponseSchema = z
  .object({
    contractVersion: z.literal(COACH_CORE_CONTRACT_VERSION),
    mode: z.literal('fallback'),
    confidence: ConfidenceSchema,
    archetype: z.null(),
    rationale: z.array(z.string().min(1)).min(1),
    canonicalIntake: CoachCanonicalIntakeSchema,
    plan: CoachPlanSchema,
    fallbackReason: CoachFallbackReasonSchema,
  })
  .strict();
export type CoachFallbackResponse = z.infer<typeof CoachFallbackResponseSchema>;

export const CoachResponseSchema = z.union([CoachSuccessResponseSchema, CoachFallbackResponseSchema]);
export type CoachResponse = z.infer<typeof CoachResponseSchema>;

export const CoachErrorResponseSchema = z
  .object({
    error: z.string(),
    contractVersion: z.literal(COACH_CORE_CONTRACT_VERSION),
    code: z.literal('INVALID_REQUEST'),
  })
  .strict();
export type CoachErrorResponse = z.infer<typeof CoachErrorResponseSchema>;
