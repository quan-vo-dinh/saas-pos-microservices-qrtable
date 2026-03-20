export class Request<T> {
  processId?: string;
  tenantId?: string;
  sessionId?: string;
  userId?: string;
  data?: T;

  constructor(data?: Partial<Request<T>>) {
    if (data) Object.assign(this, data);
  }
}

export type RequestType<T> = Request<T>;
