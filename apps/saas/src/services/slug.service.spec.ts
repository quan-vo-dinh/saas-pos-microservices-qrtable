import { SlugService } from './slug.service';

describe('SlugService', () => {
  let service: SlugService;

  beforeEach(() => {
    service = new SlugService();
  });

  it.each([
    ['Phở Hà Nội', 'pho-ha-noi'],
    ['Cà phê Sữa Đá', 'ca-phe-sua-da'],
    ['Nhà hàng 123', 'nha-hang-123'],
    ['  The   Coffee  ', 'the-coffee'],
  ])('normalizes Vietnamese input "%s"', (input, expected) => {
    expect(service.generate(input)).toBe(expected);
  });

  it('rejects reserved slugs', () => {
    expect(() => service.assertAllowed('admin')).toThrow('SAAS_SLUG_RESERVED');
  });

  it('adds suffix when collision resolver says slug exists', async () => {
    const slug = await service.generateUnique('Phở Hà Nội', async (candidate) =>
      ['pho-ha-noi', 'pho-ha-noi-2'].includes(candidate),
    );
    expect(slug).toBe('pho-ha-noi-3');
  });
});
