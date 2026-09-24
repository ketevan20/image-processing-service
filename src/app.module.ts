import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { AwsS3Module } from './aws-s3/aws-s3.module';
import { ImagesModule } from './images/images.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UserThrottlerGuard } from './auth/guards/user-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    UsersModule,
    AuthModule,
    AwsS3Module,
    ImagesModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: UserThrottlerGuard }
  ],
})
export class AppModule { }
