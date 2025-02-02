import mongoose, {Mongoose} from 'mongoose'


const MONGODB_URI = process.env.MONGO_URI

interface MongooseConnection {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
}

let cached: MongooseConnection = (global as any).mongoose