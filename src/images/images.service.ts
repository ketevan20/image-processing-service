import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { InjectModel } from '@nestjs/mongoose';
import { Image } from './schema/image.schema';
import { isValidObjectId, Model } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { v4 as uuidv4 } from 'uuid';
import { TransformImageDto } from './dto/transform-image.dto';
import sharp from 'sharp';

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

  async listImages(ownerId: string, page = 1, limit = 12) {
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

  async transformImage(imageId: string, ownerId: string, dto: TransformImageDto) {
    if (!isValidObjectId(imageId)) throw new BadRequestException();

    const original = await this.imageModel.findOne({ _id: imageId });
    if (!original) throw new NotFoundException('image not found');
    if (original.owner.toString() !== ownerId) {
      throw new ForbiddenException('you do not have access to this image');
    }

    const originalBuffer = await this.awsS3Service.getFileBuffer(original.key);
    let pipeline = sharp(originalBuffer);

    if (dto.resize) {
      pipeline = pipeline.resize(dto.resize.width, dto.resize.height);
    }
    if (dto.crop) {
      pipeline = pipeline.extract({
        left: dto.crop.x,
        top: dto.crop.y,
        width: dto.crop.width,
        height: dto.crop.height,
      });
    }
    if (dto.rotate) {
      pipeline = pipeline.rotate(dto.rotate);
    }
    if (dto.filters?.grayscale) {
      pipeline = pipeline.grayscale();
    }
    if (dto.filters?.sepia) {
      pipeline = pipeline.tint({ r: 112, g: 66, b: 20 });
    }
    if (dto.flip) {
      pipeline = pipeline.flip();
    }
    if (dto.mirror) {
      pipeline = pipeline.flop();
    }
    if (dto.watermark) {
      const { text, position = 'bottom-right', fontSize = 24 } = dto.watermark;

      const metadata = await pipeline.metadata();
      const width = metadata.width ?? 500;
      const height = metadata.height ?? 500;

      const positions: Record<string, { x: number; y: number; anchor: string }> = {
        'top-left': { x: 10, y: fontSize + 10, anchor: 'start' },
        'top-right': { x: width - 10, y: fontSize + 10, anchor: 'end' },
        'bottom-left': { x: 10, y: height - 10, anchor: 'start' },
        'bottom-right': { x: width - 10, y: height - 10, anchor: 'end' },
        'center': { x: width / 2, y: height / 2, anchor: 'middle' },
      };
      const pos = positions[position];

      const svg = `
    <svg width="${width}" height="${height}">
      <text x="${pos.x}" y="${pos.y}" font-size="${fontSize}" fill="white"
            fill-opacity="0.6" text-anchor="${pos.anchor}"
            font-family="sans-serif" stroke="black" stroke-width="0.5">
        ${text}
      </text>
    </svg>`;

      pipeline = pipeline.composite([{ input: Buffer.from(svg), gravity: 'southeast' }]);
    }

    const format = dto.format ?? original.mimeType.split('/')[1];
    const formatOptions = dto.compress ? { quality: dto.compress } : {};
    pipeline = pipeline.toFormat(format as keyof sharp.FormatEnum, formatOptions);

    const transformedBuffer = await pipeline.toBuffer();

    const key = `transformed/${ownerId}/${uuidv4()}-${Date.now()}.${format}`;
    const url = await this.awsS3Service.uploadImage(key, transformedBuffer, `image/${format}`);

    const newImage = await this.imageModel.create({
      key,
      url,
      originalName: original.originalName,
      mimeType: `image/${format}`,
      size: transformedBuffer.length,
      owner: ownerId,
      parentImage: original._id,
      transformations: dto,
    });

    await this.userService.addImage(ownerId, newImage._id);

    return newImage;
  }

  async listOriginals(ownerId: string, page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const filter = { owner: ownerId, parentImage: null };

    const [images, total] = await Promise.all([
      this.imageModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.imageModel.countDocuments(filter),
    ]);

    return { data: images, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  }

  async listTransformed(ownerId: string, page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const filter = { owner: ownerId, parentImage: { $ne: null } };

    const [images, total] = await Promise.all([
      this.imageModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.imageModel.countDocuments(filter),
    ]);

    return { data: images, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  }
}
