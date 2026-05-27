# shared-constants

Hằng số và **nhãn hiển thị domain** dùng chung FE (và tham chiếu BE khi cần).

- `saas-wire-types.ts` — SaaS wire enum unions for frontend; **must match** `libs/constants/src/lib/saas.constants.ts`.
- `vi-domain-labels.ts` — map enum wire (tiếng Anh) → chuỗi tiếng Việt; **không** chứa React/Badge.
- App-specific UI (Badge, màu) đặt trong từng app, ví dụ `management-app/src/features/saas/components/badges/`.

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build shared-constants` to build the library.

## Running unit tests

Run `nx test shared-constants` to execute the unit tests via [Jest](https://jestjs.io).
