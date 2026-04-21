import { RecipeModel } from '../models/recipe.model';
import { CreateRecipeInput, UpdateRecipeInput } from '../schemas/recipe.schema';

export interface RecipeFilters {
  difficulty?: string;
  cuisine?: string;
  maxCookingTime?: number;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getAllRecipes(
  filters: RecipeFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResult<any>> {
  const query: Record<string, any> = {};

  if (filters.difficulty) query.difficulty = filters.difficulty;
  if (filters.cuisine) query.cuisine = filters.cuisine;
  if (filters.maxCookingTime !== undefined) {
    query.cookingTimeMinutes = { $lte: filters.maxCookingTime };
  }
  if (filters.search) {
    query.title = { $regex: filters.search, $options: 'i' };
  }

  const page = Math.max(1, pagination.page ?? 1);
  const limit = Math.min(100, Math.max(1, pagination.limit ?? 10));
  const skip = (page - 1) * limit;

  // Парсимо sort: "title" = asc, "-title" = desc
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  if (pagination.sort) {
    const field = pagination.sort.startsWith('-')
      ? pagination.sort.slice(1)
      : pagination.sort;
    const dir: 1 | -1 = pagination.sort.startsWith('-') ? -1 : 1;
    sortObj = { [field]: dir };
  }

  const [data, total] = await Promise.all([
    RecipeModel.find(query).sort(sortObj).skip(skip).limit(limit),
    RecipeModel.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRecipeById(id: string) {
  return RecipeModel.findById(id);
}

export async function createRecipe(data: CreateRecipeInput) {
  return RecipeModel.create(data);
}

export async function updateRecipe(id: string, data: UpdateRecipeInput) {
  return RecipeModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
}

export async function deleteRecipe(id: string) {
  return RecipeModel.findByIdAndDelete(id);
}

export async function getQuickRecipes(maxMinutes = 30) {
  return RecipeModel.find({ cookingTimeMinutes: { $lte: maxMinutes } }).sort({
    cookingTimeMinutes: 1,
  });
}
