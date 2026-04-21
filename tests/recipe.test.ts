import request from 'supertest';
import app from '../src/app';
import { RecipeModel } from '../src/models/recipe.model';
import { setupTestDB, teardownTestDB, clearDB } from './setup';

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearDB(); });

// ─── Helpers ────────────────────────────────────────────────────────────────

const validRecipe = {
  title: 'Borsch',
  description: 'Classic Ukrainian dish',
  cookingTimeMinutes: 90,
  difficulty: 'medium',
  cuisine: 'ukrainian',
  servings: 6,
};

async function createTestRecipe(overrides = {}) {
  const res = await request(app)
    .post('/api/recipes')
    .send({ ...validRecipe, ...overrides });
  return res.body;
}

// ─── Model unit tests ────────────────────────────────────────────────────────

describe('Recipe Model', () => {
  it('зберігає документ з коректними полями', async () => {
    const doc = await RecipeModel.create(validRecipe);
    expect(doc.title).toBe('Borsch');
    expect(doc.difficulty).toBe('medium');
    expect(doc._id).toBeDefined();
  });

  it('автоматично виставляє createdAt та updatedAt', async () => {
    const doc = await RecipeModel.create(validRecipe);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  it('virtual cookingTimeLabel повертає хвилини якщо < 60', async () => {
    const doc = await RecipeModel.create({ ...validRecipe, cookingTimeMinutes: 25 });
    expect(doc.cookingTimeLabel).toBe('25 хв');
  });

  it('virtual cookingTimeLabel повертає години та хвилини', async () => {
    const doc = await RecipeModel.create({ ...validRecipe, cookingTimeMinutes: 90 });
    expect(doc.cookingTimeLabel).toBe('1 год 30 хв');
  });

  it('virtual cookingTimeLabel повертає цілі години', async () => {
    const doc = await RecipeModel.create({ ...validRecipe, cookingTimeMinutes: 120 });
    expect(doc.cookingTimeLabel).toBe('2 год');
  });

  it('не зберігає документ без title', async () => {
    const { title, ...noTitle } = validRecipe;
    await expect(RecipeModel.create(noTitle)).rejects.toThrow();
  });

  it('не зберігає документ з невалідним difficulty', async () => {
    await expect(
      RecipeModel.create({ ...validRecipe, difficulty: 'impossible' })
    ).rejects.toThrow();
  });

  it('не зберігає документ з дробовим cookingTimeMinutes', async () => {
    await expect(
      RecipeModel.create({ ...validRecipe, cookingTimeMinutes: 30.5 })
    ).rejects.toThrow();
  });
});

// ─── POST /api/recipes ───────────────────────────────────────────────────────

describe('POST /api/recipes', () => {
  it('створює рецепт і повертає 201', async () => {
    const res = await request(app).post('/api/recipes').send(validRecipe).expect(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toBe('Borsch');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('cookingTimeLabel');
  });

  it('повертає 400 якщо title відсутній', async () => {
    const { title, ...noTitle } = validRecipe;
    const res = await request(app).post('/api/recipes').send(noTitle).expect(400);
    expect(res.body).toHaveProperty('details');
  });

  it('повертає 400 якщо title порожній', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ...validRecipe, title: '' })
      .expect(400);
    expect(res.body.details[0].field).toBe('title');
  });

  it('повертає 400 якщо difficulty невалідний', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ...validRecipe, difficulty: 'impossible' })
      .expect(400);
    expect(res.body).toHaveProperty('details');
  });

  it('повертає 400 якщо cookingTimeMinutes = 0', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ...validRecipe, cookingTimeMinutes: 0 })
      .expect(400);
    expect(res.body).toHaveProperty('details');
  });

  it('створює рецепт без опціональних полів', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ title: 'Eggs', cookingTimeMinutes: 5, difficulty: 'easy' })
      .expect(201);
    expect(res.body.cuisine).toBeUndefined();
  });
});

// ─── GET /api/recipes ────────────────────────────────────────────────────────

describe('GET /api/recipes', () => {
  it('повертає об\'єкт з data та pagination', async () => {
    const res = await request(app).get('/api/recipes').expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.data).toEqual([]);
  });

  it('повертає всі рецепти', async () => {
    await createTestRecipe({ title: 'Borsch' });
    await createTestRecipe({ title: 'Varenyky' });
    const res = await request(app).get('/api/recipes').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('фільтрує за difficulty', async () => {
    await createTestRecipe({ difficulty: 'easy' });
    await createTestRecipe({ difficulty: 'hard' });
    const res = await request(app).get('/api/recipes?difficulty=easy').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].difficulty).toBe('easy');
  });

  it('фільтрує за cuisine', async () => {
    await createTestRecipe({ cuisine: 'italian' });
    await createTestRecipe({ cuisine: 'ukrainian' });
    const res = await request(app).get('/api/recipes?cuisine=italian').expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('фільтрує за maxCookingTime', async () => {
    await createTestRecipe({ title: 'Quick', cookingTimeMinutes: 10 });
    await createTestRecipe({ title: 'Slow', cookingTimeMinutes: 120 });
    const res = await request(app).get('/api/recipes?maxCookingTime=30').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Quick');
  });

  it('фільтрує за search (регістронезалежно)', async () => {
    await createTestRecipe({ title: 'Mushroom soup' });
    await createTestRecipe({ title: 'Borsch' });
    const res = await request(app).get('/api/recipes?search=mushroom').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Mushroom soup');
  });

  it('комбінує кілька фільтрів', async () => {
    await createTestRecipe({ difficulty: 'easy', cookingTimeMinutes: 10 });
    await createTestRecipe({ difficulty: 'easy', cookingTimeMinutes: 60 });
    await createTestRecipe({ difficulty: 'hard', cookingTimeMinutes: 10 });
    const res = await request(app)
      .get('/api/recipes?difficulty=easy&maxCookingTime=30')
      .expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('підтримує пагінацію', async () => {
    for (let i = 0; i < 5; i++) {
      await createTestRecipe({ title: `Recipe ${i}` });
    }
    const res = await request(app).get('/api/recipes?page=1&limit=2').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  it('підтримує сортування за назвою', async () => {
    await createTestRecipe({ title: 'Zucchini' });
    await createTestRecipe({ title: 'Apple pie' });
    const res = await request(app).get('/api/recipes?sort=title').expect(200);
    expect(res.body.data[0].title).toBe('Apple pie');
  });

  it('підтримує сортування у зворотньому напрямку', async () => {
    await createTestRecipe({ title: 'Zucchini' });
    await createTestRecipe({ title: 'Apple pie' });
    const res = await request(app).get('/api/recipes?sort=-title').expect(200);
    expect(res.body.data[0].title).toBe('Zucchini');
  });
});

// ─── GET /api/recipes/:id ────────────────────────────────────────────────────

describe('GET /api/recipes/:id', () => {
  it('повертає рецепт за id', async () => {
    const created = await createTestRecipe();
    const res = await request(app).get(`/api/recipes/${created._id}`).expect(200);
    expect(res.body._id).toBe(created._id);
  });

  it('повертає 404 для неіснуючого валідного ObjectId', async () => {
    const res = await request(app)
      .get('/api/recipes/000000000000000000000000')
      .expect(404);
    expect(res.body).toHaveProperty('error');
  });

  it('повертає 400 для невалідного формату ID', async () => {
    const res = await request(app).get('/api/recipes/not-valid-id').expect(400);
    expect(res.body.error).toMatch(/невалідний формат/i);
  });
});

// ─── PATCH /api/recipes/:id ──────────────────────────────────────────────────

describe('PATCH /api/recipes/:id', () => {
  it('оновлює рецепт', async () => {
    const created = await createTestRecipe();
    const res = await request(app)
      .patch(`/api/recipes/${created._id}`)
      .send({ title: 'Updated Borsch', difficulty: 'hard' })
      .expect(200);
    expect(res.body.title).toBe('Updated Borsch');
    expect(res.body.difficulty).toBe('hard');
  });

  it('повертає 404 для неіснуючого рецепту', async () => {
    await request(app)
      .patch('/api/recipes/000000000000000000000000')
      .send({ title: 'Test' })
      .expect(404);
  });

  it('повертає 400 якщо дані невалідні', async () => {
    const created = await createTestRecipe();
    await request(app)
      .patch(`/api/recipes/${created._id}`)
      .send({ cookingTimeMinutes: -5 })
      .expect(400);
  });

  it('повертає 400 для невалідного ID', async () => {
    await request(app)
      .patch('/api/recipes/bad-id')
      .send({ title: 'Test' })
      .expect(400);
  });
});

// ─── DELETE /api/recipes/:id ─────────────────────────────────────────────────

describe('DELETE /api/recipes/:id', () => {
  it('видаляє рецепт і повертає 204', async () => {
    const created = await createTestRecipe();
    await request(app).delete(`/api/recipes/${created._id}`).expect(204);
    await request(app).get(`/api/recipes/${created._id}`).expect(404);
  });

  it('повертає 404 для неіснуючого рецепту', async () => {
    await request(app)
      .delete('/api/recipes/000000000000000000000000')
      .expect(404);
  });

  it('повертає 400 для невалідного ID', async () => {
    await request(app).delete('/api/recipes/bad-id').expect(400);
  });
});

// ─── GET /api/recipes/quick ──────────────────────────────────────────────────

describe('GET /api/recipes/quick', () => {
  it('повертає лише рецепти до 30 хвилин', async () => {
    await createTestRecipe({ title: 'Eggs', cookingTimeMinutes: 5 });
    await createTestRecipe({ title: 'Pasta', cookingTimeMinutes: 20 });
    await createTestRecipe({ title: 'Borsch', cookingTimeMinutes: 90 });
    const res = await request(app).get('/api/recipes/quick').expect(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach((r: { cookingTimeMinutes: number }) => {
      expect(r.cookingTimeMinutes).toBeLessThanOrEqual(30);
    });
  });

  it('повертає порожній масив якщо немає швидких рецептів', async () => {
    await createTestRecipe({ cookingTimeMinutes: 120 });
    const res = await request(app).get('/api/recipes/quick').expect(200);
    expect(res.body).toEqual([]);
  });
});
