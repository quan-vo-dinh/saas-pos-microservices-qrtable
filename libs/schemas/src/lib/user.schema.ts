import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema, createSchema } from './base.schema';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'user',
})
export class User extends BaseSchema {
  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  userId: string;

  @Prop({ type: String, default: null, index: true })
  tenantId?: string | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  disabledAt?: Date | null;

  @Prop({ type: String, default: null })
  disabledReason?: string | null;

  @Prop({ type: [ObjectId], ref: 'Role' })
  roles: ObjectId[];
}

export const UserModelName = User.name;

export const UserSchema = createSchema(User);

export type UserModel = Model<User>;

export const UserDestination = {
  name: UserModelName,
  schema: UserSchema,
};
