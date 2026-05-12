import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RequestParams = createParamDecorator((param: string, ctx: ExecutionContext) => {
  const request = ctx.switchToRpc().getData();

  if (!param) {
    return request.data;
  }
  return request.data?.[param];
});

export const RequestProcessId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToRpc().getData();
  return request?.processId;
});
