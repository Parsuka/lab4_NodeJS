import { Schema, model, Document } from 'mongoose';

export interface IRecipe {
  title: string;
  description?: string;
  cookingTimeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: 'ukrainian' | 'italian' | 'asian' | 'american' | 'french' | 'other';
  servings?: number;
}

export interface IRecipeDocument extends IRecipe, Document {
  cookingTimeLabel: string;
  createdAt: Date;
  updatedAt: Date;
}
const recipeSchema = new Schema<IRecipeDocument>(
  {
    title: {
      type: String,
      required: [true, 'Назва є обов\'язковою'],
      trim: true,
      minlength: [1, 'Назва не може бути порожньою'],
      maxlength: [100, 'Назва не може перевищувати 100 символів'],
    },
    description: {
      type: String,
      maxlength: [500, 'Опис не може перевищувати 500 символів'],
    },
    cookingTimeMinutes: {
      type: Number,
      required: [true, 'Час приготування є обов\'язковим'],
      min: [1, 'Час приготування має бути не менше 1 хвилини'],
      max: [1440, 'Час приготування не може перевищувати 1440 хвилин'],
      // custom validator: має бути цілим числом
      validate: {
        validator: (v: number) => Number.isInteger(v),
        message: 'Час приготування має бути цілим числом',
      },
    },
    difficulty: {
      type: String,
      required: [true, 'Складність є обов\'язковою'],
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: 'Складність має бути: easy, medium або hard',
      },
    },
    cuisine: {
      type: String,
      enum: {
        values: ['ukrainian', 'italian', 'asian', 'american', 'french', 'other'],
        message: 'Невідома кухня',
      },
    },
    servings: {
      type: Number,
      min: [1, 'Кількість порцій має бути не менше 1'],
      max: [100, 'Кількість порцій не може перевищувати 100'],
      validate: {
        validator: (v: number) => Number.isInteger(v),
        message: 'Кількість порцій має бути цілим числом',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: людиночитабельна мітка часу приготування
recipeSchema.virtual('cookingTimeLabel').get(function () {
  const mins = this.cookingTimeMinutes;
  if (mins < 60) return `${mins} хв`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} год ${m} хв` : `${h} год`;
});

export const RecipeModel = model<IRecipeDocument>('Recipe', recipeSchema);
