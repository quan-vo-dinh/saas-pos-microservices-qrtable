import { KafkaTopic, KafkaTopicValues } from './kafka-topic.constants';

describe('KafkaTopic constants', () => {
  it('keeps the approved durable topic registry canonical', () => {
    expect(KafkaTopicValues.sort()).toEqual(
      [
        KafkaTopic.KitchenSlaWarning,
        KafkaTopic.OrderConfirmed,
        KafkaTopic.OrderStatusChanged,
        KafkaTopic.PaymentCompleted,
        KafkaTopic.TenantCreated,
      ].sort(),
    );
  });

  it('does not define duplicate topic names', () => {
    expect(new Set(KafkaTopicValues).size).toBe(KafkaTopicValues.length);
  });
});
