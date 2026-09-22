import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { isValidObjectId, Model } from 'mongoose';
import * as bcrypt from "bcrypt"

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userModel.findOne({ email: createUserDto.username })
    if (existingUser) throw new BadRequestException("User already exists")
    const newUser = this.userModel.create(createUserDto)
    return newUser;
  }

  findAll() {
    return this.userModel.find();
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException("Invalid mongo Id")
    const user = await this.userModel.findById(id)
    if (!user) throw new BadRequestException("User not found")
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (!isValidObjectId(id)) throw new BadRequestException("Invalid mongo Id")
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10)
    }
    const findUserAndUpdate = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true })
    if (!findUserAndUpdate) throw new BadRequestException("User not found")
    return findUserAndUpdate;
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException("Invalid mongo Id")
    const user = await this.userModel.findByIdAndDelete(id)
    if (!user) throw new BadRequestException("User not found")
    return user;
  }

  async findUserByUsername(username: string) {
    const user = this.userModel.findOne({ username: username }).select("+password")
    return user;
  }

  async addImage(userId, imageId) {
    const updatedUser = await this.userModel.findByIdAndUpdate(userId, { $push: { images: imageId } }, { new: true });
    return updatedUser;
  }

  async removeImage(userId, imageId) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { images: imageId } },
      { new: true },
    );
    return updatedUser;
  }
}
