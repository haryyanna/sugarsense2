---
name: Look up verified nutrition for a food
description: Search, autocomplete, or barcode-scan the fatsecret catalog and retrieve full per-serving nutrition for a food, with correct market/language localization.
api: openapi/fatsecret-foods-api-openapi.yml
operations: [searchFoods, autocompleteFoods, findFoodByBarcode, getFood]
generated: '2026-08-12'
method: generated
source: openapi/fatsecret-foods-api-openapi.yml + conventions/fatsecret-conventions.yml + errors/fatsecret-error-codes.yml
---

# Look up verified nutrition for a food

Base URL: `https://platform.fatsecret.com/rest`

## Before the first call

1. Get an OAuth 2.0 token with the `client_credentials` grant from
   `https://oauth.fatsecret.com/connect/token`. Request the `basic` scope; add `barcode` if you will
   call `findFoodByBarcode`, and `localization` if you will pass `region`/`language`.
2. Send it as `Authorization: Bearer <access_token>`. Tokens last 24 hours by default — refresh
   before expiry, do not refresh per call.
3. **Add `format=json` to every request.** The API defaults to XML.

## Steps

1. If the user typed a partial term, call `autocompleteFoods` (`GET /foods/autocomplete/v2`) with
   `expression` and show the suggestions. Do not guess a completion yourself.
2. If the user supplied a GTIN-13 barcode, call `findFoodByBarcode`
   (`GET /food/barcode/find-by-id/v1`) with `barcode`. It returns a `food_id`, not nutrition.
3. Otherwise call `searchFoods` (`GET /foods/search/v5`) with `search_expression`. Paginate with
   `page_number` (zero-based) and `max_results` (default 20, **maximum 50**); read `total_results`
   from the envelope to decide whether to page.
4. Call `getFood` (`GET /food/v4`) with the chosen `food_id` for the full record. Nutrition lives
   per **serving** — pick the `serving_id` that matches the amount the user actually ate before
   reporting calories or macros. Never sum across servings.

## Localization

Pass `region` (ISO country code, defaults to `US`) to filter to a market. `language` is **ignored
unless `region` is also set**. Requires the `localization` scope.

## Premier-only enrichment

`include_food_images` and `include_food_attributes` (allergens, dietary preferences) only return data
on a Premier edition. On a Basic key they silently add nothing — do not tell the user a food has no
allergens when the flag simply was not honored.

## Errors

Errors arrive in the body, not the status: `{"error":{"code":N,"message":"..."}}`.

- `11` — application quota exhausted (Basic is 5,000 calls/day). Stop; there is no `Retry-After`.
- `14` — token missing a scope. Re-request the token with `barcode`/`nlp`/`image-recognition`/`localization`.
- `106` — invalid ID: the `food_id` does not exist. Do not retry.
- `107` — value out of range: usually `max_results` above 50.

## Persistence rule

fatsecret's storable-data policy allows you to persist **only `food_id` and `serving_id`**. Re-fetch
nutrition values rather than caching them indefinitely.
