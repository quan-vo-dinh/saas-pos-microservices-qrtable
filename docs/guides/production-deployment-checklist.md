# QRTable Production Human Checklist

Complete this checklist before the deployment session. Keep all secrets redacted.

## Required Decisions

- [ ] **Droplet size:** keep `quan-vps` at 2 vCPU / 4 GB RAM / 25 GB disk for the first deployment.
- [ ] **Capacity fallback:** approve temporary 8 GB only after the runtime evidence thresholds in
      the runbook are met.
- [ ] **Backups:** DigitalOcean backups are enabled and the schedule is recorded.
- [ ] **Snapshot:** a manual snapshot decision and timing are recorded.
- [ ] **Stable IPv4:** Reserved IP is assigned in `sgp1`, or the final Droplet IPv4 is explicitly
      approved.
- [ ] **Firewall:** TCP 22 is restricted to the administrator CIDR; TCP 80/443 are public; UDP 443
      is public only when HTTP/3 is desired; no internal service ports are open.
- [ ] **SSH:** key login works for non-root user `deploy` in a fresh session.
- [ ] **SSH hardening:** password login and root login are disabled only after `deploy` login is
      proven.
- [ ] **DNS:** four Porkbun A records resolve to the stable IPv4 from public resolvers.
- [ ] **Payment mode:** choose exactly one:
      `sepay-live` with real approved provider values, or `cash-demo` after a tested cash-only
      production startup contract exists.
- [ ] **Deployment window:** date, start time, operator, observer, and rollback decision owner are
      agreed.
- [ ] **Release:** immutable Git SHA and previous good image tag are recorded.
- [ ] **Secrets:** the operator will enter them directly into `/opt/qrtable/.env.production`; none
      will be sent through chat or committed.

## DNS Records

All answers must be the same approved stable IPv4.

- [ ] `api.qrtable.vodinhquan.dev`
- [ ] `app.qrtable.vodinhquan.dev`
- [ ] `qr.qrtable.vodinhquan.dev`
- [ ] `auth.qrtable.vodinhquan.dev`

## Redacted Session 2 Handoff

Use this template without credentials, private keys, tokens, bank details, or secret hashes:

```text
Task 11 deployment approval

Droplet: quan-vps
Region: sgp1
Size: 2 vCPU / 4 GB RAM / 25 GB disk
Backups: enabled, schedule=<redacted schedule>
Snapshot: <created timestamp | explicitly skipped>
Stable IPv4 source: <Reserved IP | Droplet public IPv4>
Stable IPv4: <x.x.x.x or redacted suffix>
Admin CIDR: <redacted CIDR>
Firewall: 22/tcp restricted; 80/tcp public; 443/tcp public; 443/udp=<enabled|disabled>
SSH deploy login: <verified timestamp>
DNS: four A records resolved from <resolver names> at <timestamp>
Payment mode: <sepay-live | cash-demo>
Provider credentials present: <yes|not-applicable>; values not shared
Image repository: <registry path>
Image tag: <immutable Git SHA>
Previous good tag: <tag | none-first-deploy>
Deployment window: <ISO-8601 start/end>
Operator: <name>
Rollback owner: <name>
Open blockers: <none | redacted summary>

Authorization: proceed with the runbook through production startup and external HTTPS verification.
```
