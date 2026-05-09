import { ROUTES } from '@/constants/routes';
import PosPaymentPage from '../page';
import { redirect } from 'next/navigation';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

describe('PosPaymentPage', () => {
  it('redirects to the canonical POS bills settlement route', () => {
    expect(() => PosPaymentPage()).toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith(ROUTES.POS_BILLS);
  });
});
