import { Kafka, logLevel } from 'kafkajs';
import { KafkaTopicValues, type KafkaTopicName } from '@common/constants/kafka-topic.constants';

type ProvisionOptions = {
  brokers: string[];
  dryRun: boolean;
  partitions: number;
  replicationFactor: number;
  topics: KafkaTopicName[];
};

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function resolveOptions(argv: string[], env: NodeJS.ProcessEnv): ProvisionOptions {
  const brokers = (env.KAFKA_BROKERS || 'localhost:29092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    throw new Error('KAFKA_BROKERS must contain at least one broker');
  }

  return {
    brokers,
    dryRun: argv.includes('--dry-run'),
    partitions: parsePositiveInteger(env.KAFKA_TOPIC_PARTITIONS, 1, 'KAFKA_TOPIC_PARTITIONS'),
    replicationFactor: parsePositiveInteger(env.KAFKA_TOPIC_REPLICATION_FACTOR, 1, 'KAFKA_TOPIC_REPLICATION_FACTOR'),
    topics: KafkaTopicValues,
  };
}

function assertCanonicalTopics(topics: readonly string[]): void {
  const duplicates = topics.filter((topic, index) => topics.indexOf(topic) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate Kafka topics in canonical registry: ${duplicates.join(', ')}`);
  }

  const invalid = topics.filter((topic) => topic.trim().length === 0);
  if (invalid.length > 0) {
    throw new Error('Kafka topic registry contains an empty topic name');
  }
}

async function provisionTopics(options: ProvisionOptions): Promise<void> {
  assertCanonicalTopics(options.topics);

  if (options.dryRun) {
    console.log(`Kafka topic provisioning dry-run: ${options.topics.join(', ')}`);
    return;
  }

  const kafka = new Kafka({
    clientId: 'qrtable-topic-provisioner',
    brokers: options.brokers,
    logLevel: logLevel.WARN,
  });
  const admin = kafka.admin();

  await admin.connect();
  try {
    const existingTopics = new Set(await admin.listTopics());
    const missingTopics = options.topics.filter((topic) => !existingTopics.has(topic));

    if (missingTopics.length === 0) {
      console.log('Kafka topics already provisioned.');
      return;
    }

    await admin.createTopics({
      waitForLeaders: true,
      topics: missingTopics.map((topic) => ({
        topic,
        numPartitions: options.partitions,
        replicationFactor: options.replicationFactor,
      })),
    });

    console.log(`Kafka topics provisioned: ${missingTopics.join(', ')}`);
  } finally {
    await admin.disconnect();
  }
}

provisionTopics(resolveOptions(process.argv.slice(2), process.env)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Kafka topic provisioning failed: ${message}`);
  process.exitCode = 1;
});
