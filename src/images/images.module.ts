import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Image, ImageSchema } from './schema/image.schema';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    AwsS3Module,
    UsersModule,
    MongooseModule.forFeature([{ name: Image.name, schema: ImageSchema }])
  ],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule { }
