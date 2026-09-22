import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { InjectModel } from '@nestjs/mongoose';
import { Image } from './schema/image.schema';
import { isValidObjectId, Model } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImagesService {
  constructor(@InjectModel(Image.name) private imageModel: Model<Image>, private readonly awsS3Service: AwsS3Service, private readonly userService: UsersService) { }

  async uploadImage(file: Express.Multer.File, ownerId: string) {
    if (!file) throw new BadRequestException('file is required');

    const ext = file.mimetype.split('/')[1];
    const key = `originals/${ownerId}/${uuidv4()}-${Date.now()}.${ext}`;


    const url = await this.awsS3Service.uploadImage(key, file.buffer, file.mimetype);

    const newImage = await this.imageModel.create({
      key,
      url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      owner: ownerId,
    });

    await this.userService.addImage(ownerId, newImage._id);
    return newImage;
  }

  async getImage(imageId: string, ownerId: string) {
    if (!isValidObjectId(ownerId) || !isValidObjectId(imageId)) {
      throw new BadRequestException();
    }
    const image = await this.imageModel
      .findOne({
        _id: imageId
      })
      .lean();

    if (!image) throw new NotFoundException('image not found');

    if (image.owner.toString() !== ownerId) {
      throw new ForbiddenException('you do not have access to this image');
    }

    return image;
  }

  async listImages(ownerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [images, total] = await Promise.all([
      this.imageModel
        .find({ owner: ownerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.imageModel.countDocuments({ owner: ownerId }),
    ]);

    return {
      data: images,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteImage(imageId: string, ownerId: string) {
    if (!isValidObjectId(ownerId) || !isValidObjectId(imageId)) {
      throw new BadRequestException();
    }

    const image = await this.imageModel.findOne({ _id: imageId });
    if (!image) throw new NotFoundException('image not found');

    if (image.owner.toString() !== ownerId) {
      throw new ForbiddenException('you do not have access to this image');
    }

    await this.awsS3Service.deleteFile(image.key);
    await this.imageModel.findByIdAndDelete(imageId);
    await this.userService.removeImage(ownerId, imageId);

    return { message: 'image deleted successfully' };
  }
}
