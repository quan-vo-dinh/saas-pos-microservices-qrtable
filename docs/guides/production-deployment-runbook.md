# QRTable Production Deployment Runbook

This runbook prepares the first QRTable deployment on the existing `quan-vps` DigitalOcean Droplet.
It is written for a single operator and the 2 vCPU / 4 GB RAM / 25 GB disk budget profile.

## Safety Boundary

This document does not authorize a deployment. The operator must approve the deployment window,
payment mode, immutable image tag, backup state, firewall, DNS, and production credentials.

Never:

- paste production secrets into chat, tickets, screenshots, shell history, or git;
- build QRTable images on the Droplet;
- expose application, database, Kafka, Keycloak management, or monitoring ports;
- use fake SePay credentials to satisfy production validation;
- restore production data as part of a normal application rollback.

## Official References

- [DigitalOcean recommended Droplet setup](https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/)
- [DigitalOcean Cloud Firewalls](https://docs.digitalocean.com/products/networking/firewalls/)
- [DigitalOcean Reserved IPs](https://docs.digitalocean.com/products/networking/reserved-ips/)
- [DigitalOcean backups](https://docs.digitalocean.com/products/backups/)
- [DigitalOcean snapshots](https://docs.digitalocean.com/products/snapshots/)
- [Porkbun DNS management](https://kb.porkbun.com/article/68-how-to-edit-dns-records)
- [Porkbun DNS API record semantics](https://porkbun.com/api/json/v3/documentation)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Caddy HTTPS quick start](https://caddyserver.com/docs/quick-starts/https)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

Context7 lookups on 2026-06-13 used `/websites/digitalocean`,
`/websites/porkbun_api_json_v3`, and `/websites/caddyserver`.

## 1. Capacity Decision

Start with the existing 4 GB Droplet. Do not resize preemptively.

Local Phase 7 evidence measured the idle infrastructure and monitoring containers at about 2.4 GiB:
Kafka used about 721 MiB and Keycloak about 538 MiB before the budget tuning. The production Compose
profile now caps Kafka at 1 GiB with a 512 MiB heap and Keycloak at 768 MiB with a 384 MiB heap.

Required safeguards:

- configure 2–4 GB swap before starting the full stack;
- keep at least 8 GiB free before pulling a release;
- keep Prometheus retention bounded at 2 GB and 15 days;
- keep Loki and Tempo retention at 7 days;
- configure Docker JSON log rotation;
- retain the current and previous good image tags only on the 25 GB host;
- never build images on the Droplet.

Temporarily resize to 8 GB only when representative runtime evidence shows one or more of:

- repeated kernel OOM kills or container OOM restarts;
- `MemAvailable` remains below 300 MiB for at least 15 minutes;
- swap usage exceeds 1 GiB with sustained paging and user-visible latency;
- Kafka or Keycloak repeatedly reaches its heap cap under expected demo traffic.

Record the evidence before resizing. Return to 4 GB after the exceptional window if the evidence no
longer reproduces.

## 2. Human Go/No-Go

Complete [the human checklist](production-deployment-checklist.md). Stop if any required item is
unknown.

Payment mode is a hard gate:

- `sepay-live` requires real, approved OAuth, webhook, QR account, and bank values.
- `cash-demo` requires an explicit tested production startup path that does not require SePay
  credentials. The current Payment Compose contract still requires SePay OAuth values, so cash-only
  deployment is blocked until that contract is changed and verified.

Do not insert fake provider values.

## 3. Backups and Stable Address

In the DigitalOcean control panel:

1. Enable Droplet backups.
2. Record the backup schedule and retention shown by DigitalOcean.
3. Create a manual snapshot before risky host-level changes when a clean recovery point is useful.
4. Assign a Reserved IP in `sgp1` to `quan-vps`, or explicitly approve the Droplet's final public
   IPv4 when a Reserved IP is not used.
5. Use the selected stable IPv4 for all DNS records.

Provider backup or snapshot recovery is coarse-grained. It does not replace PostgreSQL and MongoDB
logical backups before schema-changing releases.

For a later release with existing data, create logical dumps before bootstrap:

```bash
cd /opt/qrtable/current
umask 077
backup_at="$(date -u +%Y%m%dT%H%M%SZ)"

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml exec -T postgres \
  sh -lc 'pg_dumpall -U "$POSTGRES_USER"' \
  > "/opt/qrtable/backups/postgres-${backup_at}.sql"

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml exec -T mongodb \
  sh -lc 'mongodump --archive --gzip --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' \
  > "/opt/qrtable/backups/mongodb-${backup_at}.archive.gz"

sha256sum "/opt/qrtable/backups/postgres-${backup_at}.sql" \
  "/opt/qrtable/backups/mongodb-${backup_at}.archive.gz" \
  > "/opt/qrtable/backups/checksums-${backup_at}.sha256"
```

Verify both files are non-empty and keep a bounded retention policy. A representative restore into
disposable containers remains a Task 12 acceptance requirement.

## 4. Cloud Firewall

Attach one DigitalOcean Cloud Firewall to `quan-vps`.

Inbound rules:

| Protocol | Port | Source                                        |
| -------- | ---: | --------------------------------------------- |
| TCP      |   22 | Approved administrator IPv4/IPv6 CIDR only    |
| TCP      |   80 | All IPv4 and IPv6                             |
| TCP      |  443 | All IPv4 and IPv6                             |
| UDP      |  443 | All IPv4 and IPv6 only when HTTP/3 is enabled |

Do not add inbound rules for `3000`, `3201-3208`, `3300-3308`, `4318`, `5432`, `6379`, `8080`,
`9000`, `9090`, `9092`, or `27017`.

Keep outbound access sufficient for DNS, NTP, Ubuntu packages, the container registry, ACME, and
external providers. DigitalOcean Cloud Firewalls are stateful, so reply traffic for allowed
connections is permitted.

## 5. Porkbun DNS

Manage DNS under `vodinhquan.dev`. Porkbun's `Host` or `Name` field is relative to that domain.
Create these records with TTL `600` during initial deployment:

| Type | Host / Name       | Answer                             |
| ---- | ----------------- | ---------------------------------- |
| A    | `api.qrtable`     | Reserved IP or approved final IPv4 |
| A    | `app.qrtable`     | Same IPv4                          |
| A    | `qr.qrtable`      | Same IPv4                          |
| A    | `auth.qrtable`    | Same IPv4                          |
| A    | `grafana.qrtable` | Same IPv4                          |

Before saving, remove or resolve conflicting `A`, `AAAA`, `CNAME`, or forwarding records at the same
five names. Do not create a wildcard unless separately reviewed.

Verify from at least two public resolvers before starting Caddy:

```bash
for host in api app qr auth grafana; do
  dig +short A "${host}.qrtable.vodinhquan.dev" @1.1.1.1
  dig +short A "${host}.qrtable.vodinhquan.dev" @8.8.8.8
done
```

Every answer must equal the selected stable IPv4.

## 6. SSH and Deploy User

Use the DigitalOcean console or the initial root SSH key session only for provisioning.

```bash
adduser deploy
usermod -aG sudo deploy

install -d -m 0700 -o deploy -g deploy /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 0600 /home/deploy/.ssh/authorized_keys
```

Open a second terminal and verify `ssh deploy@<stable-ip>` before changing SSH policy.

Create `/etc/ssh/sshd_config.d/99-qrtable.conf`:

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
```

Then validate and reload:

```bash
sshd -t
systemctl reload ssh
```

Keep the verified `deploy` session open until a second fresh login succeeds. Membership in the
Docker group is root-equivalent; grant it only to the deploy user:

```bash
usermod -aG docker deploy
```

Log out and back in after changing group membership.

## 7. Docker and Host Preparation

Install Docker Engine, Buildx, and the Compose plugin using the current official Ubuntu instructions
linked above. Do not use an old copied repository setup block.

Verify as `deploy`:

```bash
docker version
docker compose version
docker buildx version
docker info
```

Configure swap once. Use 2 GB initially; use 4 GB when disk headroom permits:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 0600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-qrtable.conf
sudo sysctl --system
free -h
swapon --show
```

Do not repeat the `fstab` line when `/swapfile` already exists.

Configure bounded Docker logs in `/etc/docker/daemon.json` before starting QRTable:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Validate the JSON, restart Docker during the approved window, and re-run `docker info`.

## 8. Server Layout

Use this layout:

```text
/opt/qrtable/
  .env.production
  current/
    docker-compose.infra.yaml
    docker-compose.app.yaml
    docker-compose.monitoring.yaml
    docker-compose.proxy.yaml
    docker/
    tools/
  backups/
  releases/
    current
    previous
    history.log
```

The repository checkout lives at `/opt/qrtable/current`. Mutable state stays outside the checkout:

```bash
sudo install -d -m 0750 -o deploy -g deploy /opt/qrtable
git clone <repository-url> /opt/qrtable/current
cd /opt/qrtable/current
git checkout <reviewed-git-sha>
install -d -m 0750 /opt/qrtable/backups /opt/qrtable/releases
```

For later releases, fetch and checkout the exact reviewed commit. Do not run a build on the
Droplet.

## 9. Protected Environment

Create the file as `deploy`:

```bash
cd /opt/qrtable/current
umask 077
install -m 0600 docker/env/.env.production.example /opt/qrtable/.env.production
```

Generate values locally in the protected SSH session and paste only into `.env.production`:

```bash
openssl rand -hex 32
openssl rand -base64 32
docker run --rm apache/kafka:4.3.0 /opt/kafka/bin/kafka-storage.sh random-uuid
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

Use the 64-hex output for `PAYMENT_SECRETS_ENCRYPTION_KEY`. Single-quote the Caddy bcrypt value so
its dollar signs remain literal:

```dotenv
GRAFANA_BASIC_AUTH_HASH='$2a$...'
```

Set `IMAGE_TAG` to the immutable Git SHA whose `linux/amd64` images were built and pushed off the
Droplet. Confirm these equality constraints:

- `POSTGRES_PASSWORD` equals `TYPEORM_PASSWORD`;
- `MANAGEMENT_APP_CLIENT_SECRET` equals `AUTH_KEYCLOAK_SECRET`;
- all five public URLs use the production hostnames;
- `CORS_ORIGINS` contains only the Management App and Customer PWA origins;
- every placeholder is replaced;
- provider values are real or the deployment is stopped.

Verify without printing contents:

```bash
stat -c '%a %U:%G %n' /opt/qrtable/.env.production
```

Expected mode and owner: `600 deploy:deploy`.

## 10. Release Images

Build and push `linux/amd64` images on a trusted workstation or CI runner:

```bash
export IMAGE_TAG="$(git rev-parse HEAD)"
export PLATFORM=linux/amd64
export PUSH_IMAGES=true
bash tools/deploy/phase7-build-images.sh
```

On the Droplet, authenticate to the registry without placing the token in shell history. Then run:

```bash
cd /opt/qrtable/current
ENV_FILE=/opt/qrtable/.env.production tools/deploy/phase7-preflight.sh

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml \
  -f docker-compose.app.yaml \
  -f docker-compose.monitoring.yaml \
  -f docker-compose.proxy.yaml \
  pull
```

Record the selected tag in `releases/current` and the previous good tag in `releases/previous`.

## 11. Startup Order

Start infrastructure and wait for health:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml up -d --wait --wait-timeout 300
```

Start monitoring before applications so startup traces have a destination:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml up -d --wait --wait-timeout 180
```

Run the production bootstrap gate:

```bash
ENV_FILE=/opt/qrtable/.env.production tools/deploy/phase7-run-production-bootstrap.sh
```

This must complete migrations, migration state display, database ownership verification, Kafka
topic provisioning, and Keycloak bootstrap. It must not create demo users.

Start applications:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml up -d --wait --wait-timeout 300
```

Start Caddy only after all five DNS names resolve to the stable IPv4:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.proxy.yaml up -d --wait --wait-timeout 180
```

## 12. HTTPS and Health Verification

Inspect the runtime without printing secrets:

```bash
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.infra.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.monitoring.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.app.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.proxy.yaml ps
docker stats --no-stream
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.proxy.yaml logs --tail=100 caddy
```

From a machine outside the Droplet:

```bash
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
curl -fsSI https://app.qrtable.vodinhquan.dev/
curl -fsSI https://qr.qrtable.vodinhquan.dev/
curl -fsSI https://auth.qrtable.vodinhquan.dev/
curl -sSI https://grafana.qrtable.vodinhquan.dev/ | head -1
```

Grafana should return `401` without Caddy basic authentication. Verify authenticated access
manually without recording the password. Confirm each certificate hostname and expiry:

```bash
for host in api app qr auth grafana; do
  echo | openssl s_client \
    -connect "${host}.qrtable.vodinhquan.dev:443" \
    -servername "${host}.qrtable.vodinhquan.dev" 2>/dev/null |
    openssl x509 -noout -subject -issuer -dates
done
```

Caddy's `/data` and `/config` volumes must remain persistent. TCP 80 and 443 are required for normal
automatic HTTPS issuance. UDP 443 is optional and enables HTTP/3; HTTPS still works over TCP when it
is closed. Caddy `reverse_proxy` handles WebSocket upgrades automatically.

## 13. Rollback

Application rollback and data restore are separate.

Before an application rollback:

1. Record the failing tag and reason.
2. Confirm the previous image tag still exists.
3. Confirm the previous application is compatible with the current schema.
4. Set `IMAGE_TAG` to the previous tag in `.env.production`.
5. Pull the previous images.
6. Run the bootstrap compatibility gate.
7. Recreate the app layer and verify health.

```bash
cd /opt/qrtable/current

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml pull

ENV_FILE=/opt/qrtable/.env.production tools/deploy/phase7-run-production-bootstrap.sh

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml up -d --force-recreate --wait --wait-timeout 300
```

Do not automatically revert migrations or restore databases. A data restore requires a separately
approved incident procedure and a clearly identified backup timestamp.

If Caddy fails after a configuration-only change, restore the previous Caddyfile and run:

```bash
cd /opt/qrtable/current

docker run --rm \
  -v "$PWD/docker/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.10.2-alpine caddy validate --config /etc/caddy/Caddyfile
```

Then recreate only the proxy layer.

## 14. Troubleshooting

Memory pressure:

```bash
free -h
swapon --show
vmstat 1
docker stats --no-stream
sudo journalctl -k --since "30 minutes ago" | grep -Ei 'oom|out of memory|killed process'
```

Disk pressure:

```bash
df -h / /var/lib/docker /opt/qrtable
docker system df
du -sh /opt/qrtable/backups /opt/qrtable/current/docker/docker_data/* 2>/dev/null
```

Never run `docker system prune --volumes` on production. Remove only dangling build/cache artifacts
and image tags that are neither current nor the previous rollback target.

TLS failure:

- verify all public DNS answers;
- verify TCP 80/443 reachability and UDP 443 only when HTTP/3 is expected;
- inspect Caddy logs;
- verify system time;
- preserve the Caddy data volume to avoid unnecessary certificate reissuance.

Bootstrap failure:

- stop before starting or recreating application services;
- inspect the `production-bootstrap` logs;
- fix the specific migration, ownership, Kafka, or Keycloak error;
- rerun the idempotent bootstrap helper.

## 15. Stop Point

After preparation, wait for the explicit production deployment session. Do not SSH, change DNS or
firewall, enter production secrets, pull production images, or start containers from a documentation
preparation session.
