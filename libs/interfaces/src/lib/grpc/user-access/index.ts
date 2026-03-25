import { Observable } from 'rxjs';
import { Response } from '../common/response.interface';
import { User } from '@common/schemas/user.schema';
import { PopulatedUser } from '../../tcp/authorizer';

export interface UserById {
  userId: string;
  processId: string;
}

export interface UpsertIdentityRequest {
  processId: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleNames?: string[];
}

export interface UserAccessService {
  getByUserId(data: UserById): Observable<Response<PopulatedUser>>;
  upsertByIdentity(data: UpsertIdentityRequest): Observable<Response<PopulatedUser>>;
}

export type { User };
