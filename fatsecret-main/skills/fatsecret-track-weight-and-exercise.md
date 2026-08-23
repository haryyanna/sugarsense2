---
name: Track a member's weight and exercise
description: Read and update a fatsecret member's weight history and exercise diary, respecting the API's backdating rules and its per-profile throttle.
api: openapi/fatsecret-weight-tracking-api-openapi.yml
operations: [getWeights, updateWeight, listExercises, getExerciseEntries, commitExerciseEntries]
generated: '2026-08-12'
method: generated
source: openapi/fatsecret-weight-tracking-api-openapi.yml + openapi/fatsecret-exercise-diary-api-openapi.yml + errors/fatsecret-error-codes.yml
---

# Track a member's weight and exercise

Base URL: `https://platform.fatsecret.com/rest`

Both surfaces are **profile-scoped**: they need a 3-legged OAuth 1.0a member authorization, not a
client-credentials token. Add `format=json` to every request.

## Weight

1. Read current history with `getWeights` (`GET /weights/v2`).
2. Write with `updateWeight` (`POST /weights/v2`).

**Backdating is restricted.** Error `206` — "Cannot update weight for an earlier date" — means the
API refuses to rewrite history behind the latest entry. Do not retry; tell the user the earlier date
cannot be amended.

## Exercise

1. List the exercise vocabulary with `listExercises` (`GET /exercises/v2`) and match the user's
   activity to a real `exercise_id`. Never invent one — error `201` ("Activity not found") is the
   result.
2. Read the day with `getExerciseEntries` (`GET /exercise-entries/v2`).
3. Write the day with `commitExerciseEntries` (`POST /exercise-entries/v2`).

The exercise diary models a **whole day**, not independent rows: a day's minutes are shifted between
activities and must reconcile. Watch for:

- `202` — "Shift To and Shift From must be different"
- `203` — "Too many minutes" (the day cannot exceed its budget)
- `204` — the chosen date has no activity to default from
- `209` — that activity cannot be modified

## Retries

There is no idempotency key. `commitExerciseEntries` is day-scoped so a repeat is usually
convergent, but `updateWeight` is not — on a timeout (`24`), re-read with `getWeights` before
re-posting.

Error `12` ("User is performing too many actions") is a per-profile throttle. Back off for that
member; other members are unaffected.
