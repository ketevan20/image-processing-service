import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class Image {
  @Prop({ required: true })
  key!: string; 

  @Prop({ required: true })
  originalName!: string;

  @Prop({required: true})
  url!: string; 

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  owner!: Types.ObjectId;

  @Prop({ type: [{ key: String, transformations: Object, createdAt: Date }], default: [] })
  variants!: { key: string; transformations: Record<string, any>; createdAt: Date }[];
}

export const ImageSchema = SchemaFactory.createForClass(Image);