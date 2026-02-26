import { z } from 'zod';

export const DECISION_CARD_VERSION = 'v1' as const;

export const DecisionStateSchema = z.enum(['TOURNAMENT_READY', 'PLAYABLE_NOW', 'NOT_READY_YET']);
export type DecisionState = z.infer<typeof DecisionStateSchema>;

export const DecisionInputSchema = z
  .object({
    hasDecklist: z.boolean().default(false),
    hasSideboardPlan: z.boolean().default(false),
    gamesPlayed: z.number().int().min(0).default(0),
    winRate: z.number().min(0).max(1).default(0),
    consistencyScore: z.number().min(0).max(1).default(0),
    rulesKnowledgeScore: z.number().min(0).max(1).default(0),
    unresolvedBlockingIssues: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();
export type DecisionInput = z.infer<typeof DecisionInputSchema>;

const CollectionCardSchema = z
  .object({
    card_name: z.string().trim().min(1),
    count: z.number().int().min(1).default(1),
  })
  .strict();

const CollectionIntakePartialSchema = z
  .object({
    cards: z.array(CollectionCardSchema).max(500).default([]),
  })
  .strict();

export const DecisionCardRequestSchema = z
  .object({
    input: DecisionInputSchema.default({}),
    collectionIntakePartial: CollectionIntakePartialSchema.optional(),
  })
  .strict();
export type DecisionCardRequest = z.infer<typeof DecisionCardRequestSchema>;

const ReasonSchema = z
  .object({
    reason_code: z.string().min(1),
    reason: z.string().min(1),
    evidence_ref: z.string().min(1),
    rank: z.number().int().min(1),
  })
  .strict();

export const ExplainabilitySchema = z
  .object({
    reason_codes: z.array(z.string().min(1)).min(3),
    human_reasons: z.array(z.string().min(1)).min(3),
    evidence_refs: z.array(z.string().min(1)).min(3),
    confidence_basis: z.string().min(1),
    blocked_by: z.array(z.string().min(1)),
    recommended_next_actions: z.array(z.string().min(1)),
    decision_trace_id: z.string().min(1),
  })
  .strict();

const DeckSkeletonEntrySchema = z
  .object({
    card_name: z.string().min(1),
    required_count: z.number().int().min(1),
    owned_count: z.number().int().min(0),
    missing_count: z.number().int().min(0),
    reason_code: z.string().min(1),
    reason: z.string().min(1),
    evidence_ref: z.string().min(1),
  })
  .strict();

const DeckSkeletonMissingEntrySchema = DeckSkeletonEntrySchema.extend({
  action_text: z.string().min(1),
}).strict();

const DeckSkeletonSchema = z
  .object({
    ownedCore: z.array(DeckSkeletonEntrySchema),
    missingCore: z.array(DeckSkeletonMissingEntrySchema),
    optionalUpgrades: z.array(DeckSkeletonEntrySchema),
  })
  .strict();

export const DecisionCardResponseSchema = z
  .object({
    decision_card_version: z.literal(DECISION_CARD_VERSION),
    state: DecisionStateSchema,
    confidence: z.number().min(0).max(1),
    top_reasons: z.array(ReasonSchema).min(3),
    blocking_issues: z.array(z.string().min(1)),
    next_actions: z.array(z.string().min(1)),
    explainability: ExplainabilitySchema,
    deckSkeleton: DeckSkeletonSchema.optional(),
  })
  .strict();
export type DecisionCardResponse = z.infer<typeof DecisionCardResponseSchema>;

export const DecisionCardErrorSchema = z
  .object({
    error: z.string(),
    decision_card_version: z.literal(DECISION_CARD_VERSION),
    code: z.literal('INVALID_REQUEST'),
  })
  .strict();
