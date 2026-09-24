import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class Image {
  @Prop({ required: true })
  key!: string;

  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  owner!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Image', default: null })
  parentImage!: Types.ObjectId | null; 

  @Prop({ type: Object, default: null })
  transformations!: Record<string, any> | null;
}

export const ImageSchema = SchemaFactory.createForClass(Image);