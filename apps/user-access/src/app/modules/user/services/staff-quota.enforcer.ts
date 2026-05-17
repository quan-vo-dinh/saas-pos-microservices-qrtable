import { HttpStatus } from '@nestjs/common';
import { firstValueFrom, map, timeout } from 'rxjs';
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { BusinessException } from '@common/error-messages/business.exception';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { SubscriptionDashboardTcpResponse, TenantPlanLimitExceededDetails } from '@common/interfaces/tcp/saas';
import { UserRepository } from '../repositories/user.repository';

const MAX_STAFF_LIMIT_TYPE = 'max_staff' as const;
const UPGRADE_URL = '/dashboard/subscription' as const;
const SAAS_QUOTA_TIMEOUT_MS = 2500;

type StaffQuotaDependencies = {
  tenantId: string;
  userRepository: UserRepository;
  saasClient: TcpClient;
};

export async function enforceMaxStaffQuota({
  tenantId,
  userRepository,
  saasClient,
}: StaffQuotaDependencies): Promise<void> {
  let dashboard: SubscriptionDashboardTcpResponse;

  try {
    dashboard = await firstValueFrom(
      saasClient
        .send<
          SubscriptionDashboardTcpResponse,
          { tenantId: string }
        >(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT, new Request({ tenantId, data: { tenantId } }))
        .pipe(
          timeout({ first: SAAS_QUOTA_TIMEOUT_MS }),
          map((response) => {
            const responseWithErrorCode = response as typeof response & { errorCode?: string };
            if (
              response.error ||
              responseWithErrorCode.errorCode ||
              (response.statusCode && response.statusCode >= HttpStatus.BAD_REQUEST)
            ) {
              throw new Error('SaaS current subscription request failed');
            }

            return response.data;
          }),
        ),
    );
  } catch {
    throwMaxStaffExceeded(0, 0);
  }

  const limit = dashboard?.current?.maxStaff;
  if (dashboard?.current?.status !== SubscriptionStatus.ACTIVE || !Number.isSafeInteger(limit) || limit < -1) {
    throwMaxStaffExceeded(0, 0);
  }

  if (limit === -1) {
    return;
  }

  const current = await userRepository.countByTenantId({ tenantId, activeOnly: true });
  if (current >= limit) {
    throwMaxStaffExceeded(limit, current);
  }
}

function throwMaxStaffExceeded(limit: number, current: number): never {
  const details: TenantPlanLimitExceededDetails = {
    limitType: MAX_STAFF_LIMIT_TYPE,
    limit,
    current,
    upgradeUrl: UPGRADE_URL,
  };

  throw new BusinessException(
    ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
    HttpStatus.FORBIDDEN,
    undefined,
    undefined,
    details,
  );
}
