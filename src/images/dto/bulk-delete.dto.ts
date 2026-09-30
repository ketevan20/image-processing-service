import { IsArray, IsMongoId, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50) 
  @IsMongoId({ each: true })
  imageIds!: string[];
}