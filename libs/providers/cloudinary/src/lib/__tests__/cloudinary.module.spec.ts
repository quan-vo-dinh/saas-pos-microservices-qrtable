import { Test } from '@nestjs/testing';
import { CloudinaryModule } from '../cloudinary.module';
import { CloudinaryService } from '../cloudinary.service';

describe('CloudinaryModule', () => {
  it('should provide CloudinaryService via forRoot()', async () => {
    const module = await Test.createTestingModule({
      imports: [
        CloudinaryModule.forRoot({
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        }),
      ],
    }).compile();

    const service = module.get<CloudinaryService>(CloudinaryService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CloudinaryService);
  });

  it('should provide CloudinaryService via forRootAsync()', async () => {
    const module = await Test.createTestingModule({
      imports: [
        CloudinaryModule.forRootAsync({
          useFactory: () => ({
            cloudName: 'test-cloud',
            apiKey: 'test-key',
            apiSecret: 'test-secret',
          }),
        }),
      ],
    }).compile();

    const service = module.get<CloudinaryService>(CloudinaryService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CloudinaryService);
  });
});
