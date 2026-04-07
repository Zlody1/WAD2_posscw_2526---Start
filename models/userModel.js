
// models/userModel.js
import { usersDb } from './_db.js';

export const UserModel = {
  async create(user) {
    return usersDb.insert(user);
  },
  async findByEmail(email) {
    return usersDb.findOne({ email });
  },
  async findById(id) {
    return usersDb.findOne({ _id: id });
  },
  async authenticate(email, password) {
    const user = await usersDb.findOne({ email });
    if (!user) return null;
    // Simple password check (in production, use bcrypt)
    if (user.password === password) {
      return user;
    }
    return null;
  }
};
``
