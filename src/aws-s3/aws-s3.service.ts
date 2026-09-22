import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class AwsS3Service {
    private bucketName;
    private s3;

    constructor() {
        this.bucketName = process.env.AWS_BUCKET_NAME
        this.s3 = new S3Client({
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            },
            region: process.env.AWS_REGION
        })
    }

    async uploadImage(filePath, file, contentType?: string) {
        if (!filePath || !file) {
            throw new BadRequestException("filePath and file are required fileds")
        }
        try {
            const config: any = {
                Body: file,
                Key: filePath,
                Bucket: this.bucketName,
                ContentType: contentType
            };

            const command = new PutObjectCommand(config);
            await this.s3.send(command);

            return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;
        } catch (error) {
            throw new BadRequestException('failed to upload image');
        }
    }

    async getFile(fileId) {
        if (!fileId) throw new BadRequestException("fileId is required")
        const config = {
            Key: fileId,
            Bucket: this.bucketName
        }
        const getCommand = new GetObjectCommand(config)
        const fileStream = await this.s3.send(getCommand)
        if (fileStream.Body instanceof Readable) {
            const chunks: Buffer[] = []
            for await (const chunk of fileStream.Body) {
                chunks.push(chunk)
            }
            const fileBuffer = Buffer.concat(chunks)
            const base64 = fileBuffer.toString("base64")
            const file = `data:${fileStream.ContentType};base64,${base64}`
            return file
        }
    }

    async getFileBuffer(fileId) {
        if (!fileId) throw new BadRequestException('FileId is required');

        const config = {
            Key: fileId,
            Bucket: this.bucketName,
        };

        const command = new GetObjectCommand(config);
        const res = await this.s3.send(command);

        const chunks: Buffer[] = [];
        for await (let chunk of res.Body) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return buffer;
    }

    async deleteFile(fileId) {
        if (!fileId) throw new BadRequestException('FileId is required');
        try {
            const config = {
                Key: fileId,
                Bucket: this.bucketName,
            };

            const command = new DeleteObjectCommand(config);
            await this.s3.send(command);
        } catch (error) {
            throw new BadRequestException('failed to delete image');
        }
    }
}
