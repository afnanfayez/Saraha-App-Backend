import mongoose from 'mongoose'
import { genderEnum } from '../../common/enums/gender.enum.js'
import { roleEnum } from '../../common/enums/role.enum.js'

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50
    },
    email: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    phone: {
      type: String
    },
    gender: {
      type: Number,
      enum: Object.values(genderEnum),
      default: genderEnum.male
    },
    role: {
      type: Number,
      enum: Object.values(roleEnum),
      default: roleEnum.user
    }
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

userSchema.virtual('username')
  .set(function (value) {
    const [firstName, lastName] = value.split(' ')
    this.set({ firstName, lastName })
  })
  .get(function () {
    return this.firstName + ' ' + this.lastName
  })

export const userModel = mongoose.model('User', userSchema)
