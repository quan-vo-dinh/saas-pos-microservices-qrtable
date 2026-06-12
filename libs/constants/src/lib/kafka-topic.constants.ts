export const KafkaTopic = {
  OrderConfirmed: 'order.confirmed',
  OrderStatusChanged: 'order.status_changed',
  PaymentCompleted: 'payment.completed',
  KitchenSlaWarning: 'kitchen.sla_warning',
  TenantCreated: 'tenant.created',
} as const;

export type KafkaTopicName = (typeof KafkaTopic)[keyof typeof KafkaTopic];

export const KafkaTopicValues = Object.values(KafkaTopic) as KafkaTopicName[];
