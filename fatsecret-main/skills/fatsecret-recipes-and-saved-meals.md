---
name: Find recipes and build saved meals
description: Search the fatsecret recipe database, browse the reference vocabularies, and assemble reusable saved meals and favorites for a member.
api: openapi/fatsecret-recipes-api-openapi.yml
operations: [searchRecipes, getRecipe, listRecipeTypes, listFoodBrands, listFoodCategories, listFoodSubCategories, getFavoriteFoods, addFavoriteFood, deleteFavoriteFood, listSavedMeals, createSavedMeal]
generated: '2026-08-12'
method: generated
source: openapi/fatsecret-recipes-api-openapi.yml + openapi/fatsecret-reference-api-openapi.yml + openapi/fatsecret-profile-foods-api-openapi.yml + openapi/fatsecret-profile-meals-api-openapi.yml
---

# Find recipes and build saved meals

Base URL: `https://platform.fatsecret.com/rest`. Add `format=json` to every request.

Recipes and reference data are **catalog** surfaces — an OAuth 2.0 client-credentials token with the
`basic` scope is enough. Favorites and saved meals are **profile** surfaces and require a 3-legged
OAuth 1.0a member authorization.

## Recipes

1. `searchRecipes` (`GET /recipes/search/v3`) with `search_expression`. Paginate with `page_number`
   and `max_results` the same way as food search.
2. `getRecipe` (`GET /recipe/v2`) with the chosen `recipe_id` for ingredients, directions and
   per-serving nutrition.
3. `listRecipeTypes` (`GET /recipe-types/v2`) gives the valid recipe-type vocabulary. Filter with a
   value from this list, never with a free-text guess.

## Reference vocabularies

- `listFoodBrands` (`GET /food-brands/v2`)
- `listFoodCategories` (`GET /food-categories/v2`)
- `listFoodSubCategories` (`GET /food-sub-categories/v2`)

Resolve user language ("Greek yogurt", "Kellogg's") against these lists before searching — it is
cheaper and more accurate than repeated free-text search, and these lists are not paginated.

## Favorites

- `getFavoriteFoods` (`GET /food/favorites/v2`)
- `addFavoriteFood` (`POST /food/favorite/add/v2`) with `food_id`
- `deleteFavoriteFood` (`POST /food/favorite/delete/v2`) with `food_id`

Add and delete are **not idempotent** and there is no idempotency key. Read the favorites list first
and skip the write if the food is already there.

## Saved meals

- `listSavedMeals` (`GET /saved-meals/v2`)
- `createSavedMeal` (`POST /saved-meals/v2`)

Before creating, list the existing saved meals and match by name. Repeating `createSavedMeal` after a
timeout (error `24`) will create a duplicate meal, not update the first one.

## Localization

Recipes are market-specific. Pass `region` (and optionally `language`, which is ignored without
`region`) to get country-appropriate results; this needs the `localization` scope. Error `208`
("Invalid region") means the code is not one of the supported regions listed at
https://platform.fatsecret.com/docs/guides/localization.
