import { Schema, model } from 'mongoose';


const Account = new Schema({
    username: { type: String, required: true, unique: true, minLength: 8 },
    password: { type: String, required: true, minLength: 8 },
    // _id: { type: String, required: false, unique: true }
})

export default model("account", Account);