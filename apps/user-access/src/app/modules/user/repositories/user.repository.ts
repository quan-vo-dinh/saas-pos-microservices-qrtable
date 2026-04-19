import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserModel, UserModelName } from '@common/schemas/user.schema';
import { Role, RoleModel, RoleModelName } from '@common/schemas/role.schema';
import { ROLE } from '@common/constants/enum/role.enum';
import { ObjectId } from 'mongodb';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(UserModelName) private readonly userModel: UserModel,
    @InjectModel(RoleModelName) private readonly roleModel: RoleModel,
  ) {}

  create(data: Partial<User>) {
    return this.userModel.create(data);
  }

  getById(id: string) {
    return this.userModel.findById(id).exec();
  }

  getByUserId(userId: string) {
    return this.userModel.findOne({ userId }).populate('roles').exec();
  }

  async upsertByUserId(params: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roleNames?: string[];
  }) {
    const roleIds = await this.resolveRoleIds(params.roleNames);

    const updatePayload: Partial<User> = {
      userId: params.userId,
      email: params.email,
      firstName: params.firstName || '',
      lastName: params.lastName || '',
      roles: roleIds,
    };

    await this.userModel
      .findOneAndUpdate(
        { userId: params.userId },
        {
          $set: updatePayload,
          $setOnInsert: {
            userId: params.userId,
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    return this.getByUserId(params.userId);
  }

  getByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async exists(email: string) {
    const result = await this.userModel.exists({ email }).exec();

    return !!result;
  }

  private async resolveRoleIds(roleNames?: string[]): Promise<ObjectId[]> {
    const normalizedRequestedRoles = Array.from(
      new Set((roleNames || []).map((role) => role?.trim()).filter((role): role is string => !!role)),
    );

    const candidateNames = normalizedRequestedRoles.length > 0 ? normalizedRequestedRoles : [ROLE.WAITER];

    const queryNames = Array.from(
      new Set(candidateNames.flatMap((roleName) => [roleName, roleName.toUpperCase(), roleName.toLowerCase()])),
    );

    let roles = await this.roleModel.find({ name: { $in: queryNames } }).exec();

    if (!roles.length) {
      roles = await this.roleModel.find({ name: { $in: [ROLE.WAITER] } }).exec();
    }

    return roles.map((role: Role) => role._id).filter((id): id is ObjectId => Boolean(id));
  }
}
