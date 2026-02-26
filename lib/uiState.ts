export type BuilderGoal = 'highest damage' | 'ability lock' | 'budget';

export type GuidedBuilderState = {
  pokemonType: string;
  goal: BuilderGoal;
  minDamage: number;
};

export type SearchUiState = {
  appliedRecommendationIds: string[];
};

export function createDefaultGuidedBuilderState(): GuidedBuilderState {
  return {
    pokemonType: 'fire',
    goal: 'highest damage',
    minDamage: 120,
  };
}

export function buildGuidedQuery(state: GuidedBuilderState): string {
  const base = `${state.pokemonType} pokemon ${state.goal}`.trim();
  if (state.goal === 'highest damage') {
    return `${base} ${state.minDamage}`.trim();
  }
  return base;
}

export function applyRecommendationMutation(state: SearchUiState, recommendationId: string): SearchUiState {
  if (state.appliedRecommendationIds.includes(recommendationId)) {
    return state;
  }

  return {
    ...state,
    appliedRecommendationIds: [...state.appliedRecommendationIds, recommendationId],
  };
}
