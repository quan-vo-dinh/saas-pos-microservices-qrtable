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
    tenantId?: string | null;
    roleNames?: string[];
  }) {
    const roleIds = await this.resolveRoleIds(params.roleNames);

    const updatePayload: Partial<User> = {
      userId: params.userId,
      email: params.email,
      firstName: params.firstName || '',
      lastName: params.lastName || '',
      tenantId: params.tenantId ?? null,
      isActive: true,
      roles: roleIds,
    };

    await this.userModel
      .findOneAndUpdate(
        { userId: params.userId },
        {
          $set: updatePayload,
        },
        { upsert: true, new: true },
      )
      .exec();

    return this.getByUserId(params.userId);
  }

  upsertTenantUserByUserId(params: {
    userId: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    roleNames: string[];
  }) {
    return this.upsertByUserId(params);
  }

  async disableUsersByTenantId(params: {
    tenantId: string;
    disabledAt: Date;
    reason: string;
  }): Promise<{ modifiedCount: number }> {
    const result = await this.userModel
      .updateMany(
        { tenantId: params.tenantId },
        { $set: { isActive: false, disabledAt: params.disabledAt, disabledReason: params.reason } },
      )
      .exec();
    return { modifiedCount: result.modifiedCount ?? 0 };
  }

  countByTenantId(params: { tenantId: string; activeOnly: boolean }): Promise<number> {
    const query: Record<string, unknown> = { tenantId: params.tenantId };
    if (params.activeOnly) {
      query.isActive = true;
    }
    return this.userModel.countDocuments(query).exec();
  }

  countActiveByTenant(tenantId: string): Promise<number> {
    return this.userModel.countDocuments({ tenantId, isActive: true }).exec();
  }

  async disableByUserId(userId: string): Promise<void> {
    await this.userModel.updateOne({ userId }, { $set: { isActive: false, disabledAt: new Date() } }).exec();
  }

  getByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async findOwnerByTenantId(tenantId: string): Promise<User | null> {
    const ownerRole = await this.roleModel.findOne({ name: ROLE.OWNER }).exec();
    if (!ownerRole?._id) {
      return null;
    }

    return this.userModel.findOne({ tenantId, isActive: true, roles: ownerRole._id }).populate('roles').exec();
  }

  async exists(email: string) {
    const result = await this.userModel.exists({ email }).exec();

    return !!result;
  }

  findRoleByName(roleName: ROLE): Promise<Role | null> {
    return this.roleModel.findOne({ name: roleName }).exec();
  }

  findTenantStaffByUserId(params: { tenantId: string; userId: string }): Promise<User | null> {
    return this.userModel.findOne({ tenantId: params.tenantId, userId: params.userId }).populate('roles').exec();
  }

  async createStaffProfile(data: Partial<User>): Promise<User> {
    const created = await this.userModel.create(data);
    return this.getByUserId(created.userId) as Promise<User>;
  }

  async listTenantStaff(params: {
    tenantId: string;
    manageableRoleIds: ObjectId[];
    roleId?: ObjectId;
    status?: 'ACTIVE' | 'DISABLED';
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ items: User[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: params.tenantId,
      roles: params.roleId ?? { $in: params.manageableRoleIds },
    };

    if (params.status === 'ACTIVE') {
      query.isActive = true;
    }
    if (params.status === 'DISABLED') {
      query.isActive = false;
    }
    if (params.search?.trim()) {
      const escaped = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { email: new RegExp(escaped, 'i') },
        { firstName: new RegExp(escaped, 'i') },
        { lastName: new RegExp(escaped, 'i') },
      ];
    }

    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.userModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(params.limit).populate('roles').exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async setTenantStaffRole(params: { tenantId: string; userId: string; roleId: ObjectId }): Promise<User | null> {
    await this.userModel
      .findOneAndUpdate(
        { tenantId: params.tenantId, userId: params.userId },
        { $set: { roles: [params.roleId] } },
        { new: true },
      )
      .exec();
    return this.findTenantStaffByUserId({ tenantId: params.tenantId, userId: params.userId });
  }

  async setTenantStaffActiveStatus(params: {
    tenantId: string;
    userId: string;
    isActive: boolean;
    disabledAt: Date | null;
    reason: string;
  }): Promise<User | null> {
    await this.userModel
      .findOneAndUpdate(
        { tenantId: params.tenantId, userId: params.userId },
        {
          $set: {
            isActive: params.isActive,
            disabledAt: params.disabledAt,
            disabledReason: params.reason,
          },
        },
        { new: true },
      )
      .exec();
    return this.findTenantStaffByUserId({ tenantId: params.tenantId, userId: params.userId });
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
