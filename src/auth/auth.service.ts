import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";
import { SignInDto } from "./DTO/sign-in.dto";
import { SignUpDto } from "./DTO/sign-up.dto";
import { UsersService } from "src/users/users.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt"

@Injectable()
export class AuthService {
    constructor(private userService: UsersService, private jwtService: JwtService) { }

    async singUp(body: SignUpDto) {
        const existingUser = await this.userService.findUserByUsername(body.username)
        if (existingUser) throw new BadRequestException("user already exists")

        const hashedPass = await bcrypt.hash(body.password, 10)
        const newUser = await this.userService.create({ ...body, password: hashedPass })

        const payload = {
            userId: newUser._id
        }
        const accessToken = await this.jwtService.sign(payload, {expiresIn:"1hr"}) 

        return {
            message: "User created succesfully",
            user: newUser,
            accessToken: accessToken
        };
    }

    async signIn(body: SignInDto) {
        const existingUser = await this.userService.findUserByUsername(body.username)
        if (!existingUser) throw new BadRequestException("User does not exists")

        const isEqualPass = await bcrypt.compare(body.password, existingUser.password)
        if (!isEqualPass) throw new BadGatewayException("Invalid password")

        const payload = {
            userId: existingUser._id
        }

        const accessToken = await this.jwtService.sign(payload, {expiresIn:"1hr"}) 

        return accessToken;
    }
}