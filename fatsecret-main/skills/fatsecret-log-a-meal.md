---
name: Log a meal to a member's food diary
description: Resolve a food to a serving and write it into a fatsecret member's food diary, then read the day and month back — including the retry hazard, because this API has no idempotency key.
api: openapi/fatsecret-food-diary-api-openapi.yml
operations: [searchFoods, getFood, createFoodEntry, getFoodEntries, getFoodEntriesMonth]
generated: '2026-08-12'
method: generated
source: openapi/fatsecret-food-diary-api-openapi.yml + conventions/fatsecret-conventions.yml
---

# Log a meal to a member's food diary

Base URL: `https://platform.fatsecret.com/rest`

## Authorization — this is member data

Diary writes are **profile-scoped**. A client-credentials token is not enough: you need a 3-legged
**OAuth 1.0a** member authorization
(https://platform.fatsecret.com/docs/guides/authentication/oauth1/three-legged). The profile is
carried by the token, not by a `user_id` parameter — never pass a user id you inferred.

Add `format=json` to every request; the default is XML.

## Steps

1. Resolve the food. Call `searchFoods` (`GET /foods/search/v5`) with `search_expression`, then
   `getFood` (`GET /food/v4`) with the chosen `food_id`.
2. Pick the serving. Choose the `serving_id` whose description matches what the user ate, and compute
   the multiple (e.g. 1.5 servings). Do not invent a serving.
3. Confirm with the user before writing. Show food name, serving description, quantity, meal, and
   date. A diary write changes a person's health record.
4. Call `createFoodEntry` (`POST /food-entries/v2`) with `food_id`, `serving_id`, the amount, the
   meal, and the date.
5. Read it back with `getFoodEntries` (`GET /food-entries/v2`) for that date, and use
   `getFoodEntriesMonth` (`GET /food-entries/month/v2`) for a monthly rollup.

## Retry hazard — read this before you write

**There is no idempotency key on this API.** If `createFoodEntry` times out or the connection drops,
a blind retry can create a second entry and double the user's logged calories. On any ambiguous
failure:

1. Do **not** retry immediately.
2. Call `getFoodEntries` for that date and check whether the entry already landed.
3. Only re-post if it did not.

Error code `24` ("A timeout has occurred") is exactly this case.

## Errors

- `9` / `13` — invalid or expired access token. Re-authorize the member.
- `12` — "User is performing too many actions": a per-profile throttle, separate from the app quota.
  Back off for this user only.
- `101` — missing required parameter.
- `205` — "Date must be within 2 days from today" on some diary operations; surface this to the user
  rather than retrying with a different date.
- `207` — the source date had no entries to copy.
