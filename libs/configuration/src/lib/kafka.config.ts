import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class KafkaConfiguration {
  @IsArray()
  BROKERS: string[];

  @IsString()
  @IsNotEmpty()
  CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  ORDER_CONFIRMED_TOPIC: string;

  @IsString()
  @IsNotEmpty()
  KITCHEN_SLA_WARNING_TOPIC: string;

  @IsString()
  @IsNotEmpty()
  KITCHEN_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  KITCHEN_CONSUMER_GROUP: string;

  @IsString()
  @IsNotEmpty()
  BFF_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  BFF_CONSUMER_GROUP: string;

  constructor(data?: Partial<KafkaConfiguration>) {
    const brokerValue = data?.BROKERS?.join(',') || process.env['KAFKA_BROKERS'] || 'localhost:29092';
    this.BROKERS = brokerValue
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);
    this.CLIENT_ID = data?.CLIENT_ID || process.env['KAFKA_CLIENT_ID'] || 'qrtable-order-service';
    this.ORDER_CONFIRMED_TOPIC =
      data?.ORDER_CONFIRMED_TOPIC || process.env['KAFKA_ORDER_CONFIRMED_TOPIC'] || 'order.confirmed';
    this.KITCHEN_SLA_WARNING_TOPIC =
      data?.KITCHEN_SLA_WARNING_TOPIC || process.env['KAFKA_KITCHEN_SLA_WARNING_TOPIC'] || 'kitchen.sla_warning';
    this.KITCHEN_CLIENT_ID =
      data?.KITCHEN_CLIENT_ID || process.env['KAFKA_KITCHEN_CLIENT_ID'] || 'qrtable-kitchen-service';
    this.KITCHEN_CONSUMER_GROUP =
      data?.KITCHEN_CONSUMER_GROUP || process.env['KAFKA_KITCHEN_CONSUMER_GROUP'] || 'kitchen-service-group';
    this.BFF_CLIENT_ID = data?.BFF_CLIENT_ID || process.env['KAFKA_BFF_CLIENT_ID'] || 'qrtable-bff-bridge';
    this.BFF_CONSUMER_GROUP = data?.BFF_CONSUMER_GROUP || process.env['KAFKA_BFF_CONSUMER_GROUP'] || 'bff-kafka-bridge';
  }
}
