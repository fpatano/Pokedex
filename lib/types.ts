export type NormalizedCard = {
  id: string;
  name: string;
  image: string;
  setName: string;
  supertype: string;
  types: string[];
  hp?: string;
  abilityText?: string;
  attacks: Array<{
    name: string;
    damage?: string;
    text?: string;
  }>;
};

export type SearchResponse = {
  query: string;
  results: NormalizedCard[];
  coolPicks: NormalizedCard[];
};
