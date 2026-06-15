# Skill Improvement Log

Record cases where a Skill repeatedly performs poorly, creates confusion, misses checks, or adds unnecessary complexity.

## Entries

| Date | Skill | Issue | Evidence | Suggested Improvement |
| --- | --- | --- | --- | --- |
| 2026-06-15 | prd-generator | Fixed 12-question interview is too heavy for simple, playful product ideas and includes AI-specific questions even when AI is not part of the product. | In the `quickDate` test, the user provided a very rich first answer, then found the remaining questions long; AI boundary/evidence/risk/acceptance questions were left blank. The generated session slug also became noisy because it was derived from a long mixed-language answer with repeated button text. | Redesign as a two-stage interview: language selection, one free-form idea dump, 4-6 adaptive clarification questions, optional AI section only when relevant, explicit "not applicable" support, and cleaner session naming. |
