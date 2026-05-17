import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T> {
  @ApiProperty({ type: String })
  message = 'OK';

  @ApiProperty()
  data?: T;

  @ApiProperty()
  processID?: string;

  @ApiProperty({ type: Number })
  statusCode = HttpStatus.OK;

  @ApiProperty({ type: String })
  duration?: string;

  @ApiProperty({ type: String, required: false })
  errorCode?: string;

  @ApiProperty({ required: false })
  details?: unknown;

  constructor(data?: Partial<ResponseDto<T>>) {
    if (data) Object.assign(this, data);
  }
}
