export interface User {
  username: string;
  socketId: string;
}

class TestDB {
  users: Record<string, string> = {};
  reflection: Record<string, string> = {};

  constructor() {}
  addUser(user: User) {
    this.users[user.username] = user.socketId;
    this.reflection[user.socketId] = user.username;
  }
  removeUserBySocketId(socketId: string) {
    const username = this.reflection[socketId];
    if (!username) return;
    delete this.reflection[socketId];
    const foundSocketId = this.users[username];
    if (!foundSocketId) return;
    delete this.users[username];
  }
  getSocketId(username: string) {
    return this.users[username];
  }
  getAllUsers() {
    return Object.keys(this.users);
  }
}

export default TestDB;
