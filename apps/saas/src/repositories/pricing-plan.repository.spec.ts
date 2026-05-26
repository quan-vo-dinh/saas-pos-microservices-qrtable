import { PricingPlanRepository } from './pricing-plan.repository';

describe('PricingPlanRepository', () => {
  const repo = {
    create: jest.fn((input) => input),
    save: jest.fn((input) => Promise.resolve(input)),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('normalizes plan code and rounds VND on create', async () => {
    const repository = new PricingPlanRepository(repo as never);

    await repository.createPlan({
      code: ' basic ',
      priceVnd: 21501,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BASIC',
        priceVnd: 22000,
        isActive: true,
        features: [],
      }),
    );
  });

  it('keeps plan code immutable and rounds VND on update', async () => {
    repo.findOne.mockResolvedValue({ id: 'plan-1', code: 'BASIC', priceVnd: 23000 });
    const repository = new PricingPlanRepository(repo as never);

    await repository.updatePlan('plan-1', {
      code: 'PREMIUM',
      priceVnd: 22100,
    });

    expect(repo.update).toHaveBeenCalledWith(
      { id: 'plan-1' },
      expect.not.objectContaining({ code: expect.any(String) }),
    );
    expect(repo.update).toHaveBeenCalledWith({ id: 'plan-1' }, expect.objectContaining({ priceVnd: 23000 }));
  });
});
