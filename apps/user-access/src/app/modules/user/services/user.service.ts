import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserTcpRequest } from '@common/interfaces/tcp/user';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { createUserRequestMapping } from '../mapper';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { CreateKeyCloakUserTcpRequest } from '@common/interfaces/tcp/authorizer';
import { firstValueFrom, map } from 'rxjs';

type UpsertIdentityParams = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string | null;
  roleNames?: string[];
};

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(TCP_SERVICES.AUTHORIZER_SERVICE) private readonly authorizerClient: TcpClient,
  ) {}

  async create(params: CreateUserTcpRequest, processId: string) {
    const isExists = await this.userRepository.exists(params.email);

    if (isExists) {
      throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, HttpStatus.CONFLICT);
    }

    const userId = await this.createKeycloakUser(
      {
        email: params.email,
        password: params.password,
        firstName: params.firstName,
        lastName: params.lastName,
        tenantId: params.tenantId,
      },
      processId,
    );

    const input = createUserRequestMapping(params, userId);

    return this.userRepository.create(input);
  }

  createKeycloakUser(data: CreateKeyCloakUserTcpRequest, processId: string) {
    return firstValueFrom(
      this.authorizerClient
        .send<string>(TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_USER, {
          data,
          processId,
        })
        .pipe(map((data) => data.data)),
    );
  }

  getUserByUserId(userId: string) {
    return this.userRepository.getByUserId(userId);
  }

  upsertUserByIdentity(params: UpsertIdentityParams) {
    return this.userRepository.upsertByUserId(params);
  }
}
