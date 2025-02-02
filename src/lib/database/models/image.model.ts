import { Schema, model, models, Document } from "mongoose";




export interface IImage extends Document {

  title: string;
  transformationType: string;
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  config?: object;
  transformationUrl?: URL;
  aspectRatio?: string;
  color?: string;
  prompt?: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
  }
  createdat?: Date;
  updatedat?: Date;
}

const ImageSchema = new Schema<IImage>({
  title: { type: String, required: true },
  transformationType: { type: String, required: true },
  publicId: { type: String, required: true },
  secureUrl: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  config: { type: Object },
  transformationUrl: { type: URL },
  aspectRatio: { type: String },
  color: { type: String },
  prompt: { type: String },
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  createdat: { type: Date, default: Date.now },
  updatedat: { type: Date, default: Date.now },
});

const Image = models?.Image || model<IImage>("Image", ImageSchema);

export default Image;
