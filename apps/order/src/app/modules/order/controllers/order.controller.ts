import { Controller } from '@nestjs/common';

/** TCP message handlers arrive in Batch 4+ (submit, confirm, cart, …). */
@Controller()
export class OrderController {}
