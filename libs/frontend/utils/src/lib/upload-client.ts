export type UploadOptions = {
  url: string;
  file: File;
  headers?: Record<string, string>;
  onProgress?: (percent: number) => void;
};

export type UploadResult = {
  imageUrl: string;
};

export function uploadFile({ url, file, headers, onProgress }: UploadOptions): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as { data?: UploadResult } & UploadResult;
          const result = response.data ?? response;
          resolve(result);
        } catch {
          reject(new Error(`Upload response parse error: ${xhr.responseText}`));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', url);
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    xhr.send(formData);
  });
}
