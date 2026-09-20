import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    username!: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 20)
    password!: string;
}
