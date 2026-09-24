import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, Min, ValidateNested } from 'class-validator';

class ResizeDto {
    @IsInt()
    @Min(1)
    width!: number;

    @IsInt()
    @Min(1)
    height!: number;
}

class CropDto {
    @IsInt()
    @Min(1)
    width!: number;

    @IsInt()
    @Min(1)
    height!: number;

    @IsInt()
    @Min(0)
    x!: number;

    @IsInt()
    @Min(0)
    y!: number;
}

class FiltersDto {
    @IsOptional()
    @IsBoolean()
    grayscale?: boolean;

    @IsOptional()
    @IsBoolean()
    sepia?: boolean;
}

class WatermarkDto {
    text!: string;

    @IsOptional()
    @IsIn(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
    position?: string;

    @IsOptional()
    @IsInt()
    @Min(10)
    fontSize?: number;
}

export class TransformImageDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => ResizeDto)
    @IsObject()
    resize?: ResizeDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => CropDto)
    @IsObject()
    crop?: CropDto;

    @IsOptional()
    @IsInt()
    rotate?: number;

    @IsOptional()
    @IsIn(['jpeg', 'png', 'webp'])
    format?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => FiltersDto)
    @IsObject()
    filters?: FiltersDto;

    @IsOptional()
    @IsBoolean()
    flip?: boolean;

    @IsOptional()
    @IsBoolean()
    mirror?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @IsIn([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    compress?: number;

    @IsOptional() 
    @ValidateNested() 
    @Type(() => WatermarkDto) 
    @IsObject() 
    watermark?: WatermarkDto;
}