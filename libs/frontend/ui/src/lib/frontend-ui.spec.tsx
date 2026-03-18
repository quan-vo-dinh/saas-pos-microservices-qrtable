import { render } from '@testing-library/react';

import FrontendUi from './frontend-ui';

describe('FrontendUi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<FrontendUi />);
    expect(baseElement).toBeTruthy();
  });
});
