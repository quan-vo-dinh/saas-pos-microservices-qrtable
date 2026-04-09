import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary.service';
import { CLOUDINARY_INJECTION_TOKEN } from '../cloudinary.constants';
import { CloudinaryFolder } from '../cloudinary.constants';
import { UploadImageOptions } from '../interfaces/cloudinary-options.interface';
import { Readable } from 'stream';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let mockCloudinary: {
    uploader: {
      upload_stream: jest.Mock;
      destroy: jest.Mock;
    };
    url: jest.Mock;
  };

  const mockUploadResult = {
    public_id: 'qrtable/tenant-abc/menu/test-image',
    secure_url: 'https://res.cloudinary.com/demo/image/upload/qrtable/tenant-abc/menu/test-image.jpg',
    width: 800,
    height: 600,
    format: 'jpg',
    bytes: 102400,
  };

  beforeEach(async () => {
    mockCloudinary = {
      uploader: {
        upload_stream: jest.fn(),
        destroy: jest.fn(),
      },
      url: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: CLOUDINARY_INJECTION_TOKEN,
          useValue: mockCloudinary,
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  describe('uploadImage', () => {
    const validOptions: UploadImageOptions = {
      tenantId: 'tenant-abc',
      folder: CloudinaryFolder.MENU,
      mimetype: 'image/jpeg',
    };

    it('should upload successfully and return CloudinaryUploadResponse', async () => {
      const fileBuffer = Buffer.alloc(1024, 'a');

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (_options: unknown, callback: (error: Error | null, result: typeof mockUploadResult) => void) => {
          callback(null, mockUploadResult);
          const writable = new Readable();
          writable.push(null);
          return writable;
        },
      );

      const result = await service.uploadImage(fileBuffer, validOptions);

      expect(result).toEqual({
        publicId: 'qrtable/tenant-abc/menu/test-image',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/qrtable/tenant-abc/menu/test-image.jpg',
        width: 800,
        height: 600,
        format: 'jpg',
        bytes: 102400,
      });
    });

    it('should throw BadRequestException when file exceeds 5MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

      await expect(service.uploadImage(largeBuffer, validOptions)).rejects.toThrow(BadRequestException);

      await expect(service.uploadImage(largeBuffer, validOptions)).rejects.toThrow('File size exceeds 5MB limit');
    });

    it('should throw BadRequestException for invalid MIME type', async () => {
      const fileBuffer = Buffer.alloc(1024, 'a');
      const invalidOptions: UploadImageOptions = {
        ...validOptions,
        mimetype: 'application/pdf',
      };

      await expect(service.uploadImage(fileBuffer, invalidOptions)).rejects.toThrow(BadRequestException);

      await expect(service.uploadImage(fileBuffer, invalidOptions)).rejects.toThrow(
        'Invalid file type. Allowed: jpeg, png, webp',
      );
    });

    it('should upload to the correct tenant folder path', async () => {
      const fileBuffer = Buffer.alloc(1024, 'a');

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (_options: unknown, callback: (error: Error | null, result: typeof mockUploadResult) => void) => {
          callback(null, mockUploadResult);
          const writable = new Readable();
          writable.push(null);
          return writable;
        },
      );

      await service.uploadImage(fileBuffer, validOptions);

      const uploadCallOptions = mockCloudinary.uploader.upload_stream.mock.calls[0][0];
      expect(uploadCallOptions.folder).toBe('qrtable/tenant-abc/menu');
    });

    it('should throw InternalServerErrorException when Cloudinary SDK fails', async () => {
      const fileBuffer = Buffer.alloc(1024, 'a');

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (_options: unknown, callback: (error: Error | null, result: null) => void) => {
          callback(new Error('Cloudinary SDK error'), null);
          const writable = new Readable();
          writable.push(null);
          return writable;
        },
      );

      await expect(service.uploadImage(fileBuffer, validOptions)).rejects.toThrow(InternalServerErrorException);

      await expect(service.uploadImage(fileBuffer, validOptions)).rejects.toThrow('Image upload failed');
    });
  });

  describe('deleteImage', () => {
    it('should delete successfully', async () => {
      mockCloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      await expect(service.deleteImage('qrtable/tenant-abc/menu/test-image')).resolves.toBeUndefined();

      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith('qrtable/tenant-abc/menu/test-image');
    });

    it('should not throw when image does not exist (idempotent)', async () => {
      mockCloudinary.uploader.destroy.mockResolvedValue({ result: 'not found' });

      await expect(service.deleteImage('qrtable/tenant-abc/menu/nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('getOptimizedUrl', () => {
    it('should return 4 responsive URL strings', () => {
      mockCloudinary.url.mockImplementation((publicId: string, options: Record<string, unknown>) => {
        const parts = [`https://res.cloudinary.com/demo/image/upload`];
        if (options['width']) parts.push(`w_${options['width']}`);
        if (options['crop']) parts.push(`c_${options['crop']}`);
        parts.push(`f_auto,q_auto`);
        parts.push(publicId);
        return parts.join('/');
      });

      const result = service.getOptimizedUrl('qrtable/tenant-abc/menu/test-image');

      expect(result).toHaveProperty('thumbnail');
      expect(result).toHaveProperty('medium');
      expect(result).toHaveProperty('large');
      expect(result).toHaveProperty('original');
      expect(typeof result.thumbnail).toBe('string');
      expect(typeof result.medium).toBe('string');
      expect(typeof result.large).toBe('string');
      expect(typeof result.original).toBe('string');
    });

    it('should generate URLs with correct transformation parameters', () => {
      mockCloudinary.url.mockImplementation((publicId: string, options: Record<string, unknown>) => {
        return JSON.stringify({ publicId, ...options });
      });

      service.getOptimizedUrl('qrtable/tenant-abc/menu/test-image');

      // Verify thumbnail: w_200, c_fill
      const thumbnailCall = mockCloudinary.url.mock.calls[0];
      expect(thumbnailCall[1]).toMatchObject({
        width: 200,
        crop: 'fill',
        fetch_format: 'auto',
        quality: 'auto',
      });

      // Verify large: w_800, c_limit
      const largeCall = mockCloudinary.url.mock.calls[2];
      expect(largeCall[1]).toMatchObject({
        width: 800,
        crop: 'limit',
        fetch_format: 'auto',
        quality: 'auto',
      });
    });
  });
});
