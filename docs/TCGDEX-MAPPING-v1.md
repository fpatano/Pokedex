# TCGdex → NormalizedCard v1 Mapping

Canonical schema source: `lib/metadata/schema/normalizedCardV1.ts`

## Nullability policy (v1)

- Required fields are always present and non-null.
- Missing scalar optionals use `undefined` (never `null`).
- Missing collections normalize to empty arrays.

## Field mapping

| NormalizedCard v1 | TCGdex source | Mapping notes |
|---|---|---|
| `id` | `card.id` | Required identity field |
| `name` | `card.name` | Trimmed in normalizer |
| `image` | `card.image` | `resolveTcgdexImageUrl()` appends `/high.webp` when base path |
| `setName` | `card.set?.name` | Defaults to `Unknown Set` |
| `supertype` | `card.category` | Defaults to `Unknown` |
| `types` | `card.types` | Defaults to `[]` |
| `hp` | `card.hp` | Numeric HP coerced to string |
| `abilityText` | `card.abilities?.[0]?.effect` | First ability effect only in v1 |
| `attacks[].name` | `card.attacks[].name` | Fallback: `Attack` |
| `attacks[].damage` | `card.attacks[].damage` | Numeric damage coerced to string |
| `attacks[].text` | `card.attacks[].effect` | Optional |

## Validator taxonomy

- `MISSING_ID`
- `MISSING_NAME`
- `INVALID_ATTACK_NAME`
- `SCHEMA_VIOLATION`
