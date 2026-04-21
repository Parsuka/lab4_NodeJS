import { Router, Request, Response, NextFunction } from 'express';
import {
  createRecipeSchema,
  updateRecipeSchema,
} from '../schemas/recipe.schema';
import {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getQuickRecipes,
  RecipeFilters,
  PaginationParams,
} from '../storage/recipe';
import { validate } from '../middleware/validate';

const router = Router();

// GET /recipes/quick — швидкі рецепти (до 30 хв)
router.get('/quick', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const recipes = await getQuickRecipes(30);
    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

// GET /recipes — всі рецепти з фільтрацією, сортуванням, пагінацією
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: RecipeFilters = {};
    const pagination: PaginationParams = {};

    if (req.query.difficulty) filters.difficulty = String(req.query.difficulty);
    if (req.query.cuisine) filters.cuisine = String(req.query.cuisine);
    if (req.query.maxCookingTime) {
      const val = Number(req.query.maxCookingTime);
      if (!isNaN(val)) filters.maxCookingTime = val;
    }
    if (req.query.search) filters.search = String(req.query.search);
    if (req.query.page) pagination.page = Number(req.query.page);
    if (req.query.limit) pagination.limit = Number(req.query.limit);
    if (req.query.sort) pagination.sort = String(req.query.sort);

    const result = await getAllRecipes(filters, pagination);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /recipes/:id
router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (!recipe) {
      res.status(404).json({ error: 'Рецепт не знайдено' });
      return;
    }
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

// POST /recipes
router.post(
  '/',
  validate(createRecipeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipe = await createRecipe(req.body);
      res.status(201).json(recipe);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /recipes/:id
router.patch(
  '/:id',
  validate(updateRecipeSchema),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const recipe = await updateRecipe(req.params.id, req.body);
      if (!recipe) {
        res.status(404).json({ error: 'Рецепт не знайдено' });
        return;
      }
      res.json(recipe);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /recipes/:id
router.delete('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const deleted = await deleteRecipe(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Рецепт не знайдено' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
