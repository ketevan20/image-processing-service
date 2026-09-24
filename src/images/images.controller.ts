import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Req, Query } from '@nestjs/common';
import { ImagesService } from './images.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/decorators/user.decorator';
import { ListImagesDto } from './dto/list-images.dto';
import { TransformImageDto } from './dto/transform-image.dto';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from 'src/auth/guards/user-throttler.guard';

@UseGuards(AuthGuard)
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(@UploadedFile() file: Express.Multer.File, @User() userId) {
    return this.imagesService.uploadImage(file, userId);
  }

  @Get()
  async list(@Query() query: ListImagesDto, @User() userId,) {
    return this.imagesService.listImages(userId, query.page, query.limit);
  }

  @Get('originals')
  async listOriginals(@Query() query: ListImagesDto, @User() userId) {
    return this.imagesService.listOriginals(userId, query.page, query.limit);
  }

  @Get('transformed')
  async listTransformed(@Query() query: ListImagesDto, @User() userId) {
    return this.imagesService.listTransformed(userId, query.page, query.limit);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @User() userId) {
    return this.imagesService.getImage(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @User() userId) {
    return this.imagesService.deleteImage(id, userId);
  }

  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 transforms per minute per user
  @Post(':id/transform')
  async transform(@Param('id') id: string, @User() userId, @Body() dto: TransformImageDto) {
    return this.imagesService.transformImage(id, userId, dto);
  }
}
