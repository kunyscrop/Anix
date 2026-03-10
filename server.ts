import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("anix.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    country_code TEXT,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS anime (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    image_url TEXT,
    rating REAL,
    members_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    content TEXT,
    media_url TEXT,
    is_spoiler INTEGER DEFAULT 0,
    anime_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(anime_id) REFERENCES anime(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT,
    post_id TEXT,
    PRIMARY KEY(user_id, post_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT,
    following_id TEXT,
    PRIMARY KEY(follower_id, following_id),
    FOREIGN KEY(follower_id) REFERENCES users(id),
    FOREIGN KEY(following_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    avatar_url TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT,
    user_id TEXT,
    role TEXT DEFAULT 'member',
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY,
    title TEXT,
    host_id TEXT,
    is_live INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(host_id) REFERENCES users(id)
  );
`);

// Seed some initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (id, username, display_name, bio, avatar_url, is_verified, country_code) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "1", "anix_official", "AniX Official", "Welcome to the ultimate anime social network! 🎌", "https://picsum.photos/seed/anix/200", 1, "JP"
  );
  
  const animeData = [
    { id: "1", title: "Attack on Titan", description: "Humans fight for survival against giant titans.", image_url: "https://picsum.photos/seed/aot/400/600", rating: 9.1 },
    { id: "2", title: "Naruto", description: "A young ninja seeks recognition and dreams of becoming the Hokage.", image_url: "https://picsum.photos/seed/naruto/400/600", rating: 8.3 },
    { id: "3", title: "Demon Slayer", description: "A boy becomes a demon slayer to save his sister.", image_url: "https://picsum.photos/seed/ds/400/600", rating: 8.7 }
  ];
  
  const insertAnime = db.prepare("INSERT INTO anime (id, title, description, image_url, rating) VALUES (?, ?, ?, ?, ?)");
  animeData.forEach(a => insertAnime.run(a.id, a.title, a.description, a.image_url, a.rating));
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "kuny" && password === "kuny137") {
      let user = db.prepare("SELECT * FROM users WHERE username = ?").get("kuny") as any;
      if (!user) {
        const id = "kuny_id";
        db.prepare("INSERT INTO users (id, username, display_name, bio, avatar_url, country_code) VALUES (?, ?, ?, ?, ?, ?)").run(
          id, "kuny", "Kuny", "New AniX user!", "https://picsum.photos/seed/kuny/200", "FR"
        );
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      }
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Identifiants invalides" });
    }
  });

  app.get("/api/posts", (req, res) => {
    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar_url, u.is_verified, u.country_code,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `).all();
    res.json(posts);
  });

  app.post("/api/posts", (req, res) => {
    const { user_id, content, media_url, is_spoiler, anime_id } = req.body;
    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO posts (id, user_id, content, media_url, is_spoiler, anime_id) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, user_id, content, media_url, is_spoiler ? 1 : 0, anime_id
    );
    const newPost = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar_url, u.is_verified, u.country_code
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);
    io.emit("new_post", newPost);
    res.json(newPost);
  });

  app.get("/api/anime", (req, res) => {
    const anime = db.prepare("SELECT * FROM anime").all();
    res.json(anime);
  });

  app.get("/api/search", (req, res) => {
    const query = req.query.q;
    const results = db.prepare("SELECT * FROM anime WHERE title LIKE ?").all(`%${query}%`);
    res.json(results);
  });

  app.post("/api/posts/:id/like", (req, res) => {
    const { user_id } = req.body;
    const post_id = req.params.id;
    try {
      db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)").run(user_id, post_id);
      res.json({ success: true, action: 'liked' });
    } catch (e) {
      db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?").run(user_id, post_id);
      res.json({ success: true, action: 'unliked' });
    }
  });

  app.post("/api/users/:id/follow", (req, res) => {
    const follower_id = req.body.follower_id;
    const following_id = req.params.id;
    try {
      db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(follower_id, following_id);
      res.json({ success: true, action: 'followed' });
    } catch (e) {
      db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(follower_id, following_id);
      res.json({ success: true, action: 'unfollowed' });
    }
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    res.json(user);
  });

  app.put("/api/users/:id", (req, res) => {
    const { display_name, bio, avatar_url, banner_url } = req.body;
    db.prepare("UPDATE users SET display_name = ?, bio = ?, avatar_url = ?, banner_url = ? WHERE id = ?").run(
      display_name, bio, avatar_url, banner_url, req.params.id
    );
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    res.json(updatedUser);
  });

  // Messages
  app.get("/api/messages/:userId1/:userId2", (req, res) => {
    const { userId1, userId2 } = req.params;
    const messages = db.prepare(`
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(userId1, userId2, userId2, userId1);
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const { sender_id, receiver_id, content } = req.body;
    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)").run(
      id, sender_id, receiver_id, content
    );
    const newMessage = db.prepare(`
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(id);
    io.to(`user:${receiver_id}`).emit("new_message", newMessage);
    res.json(newMessage);
  });

  // Groups
  app.get("/api/groups", (req, res) => {
    const groups = db.prepare("SELECT * FROM groups").all();
    res.json(groups);
  });

  app.post("/api/groups", (req, res) => {
    const { name, description, avatar_url, created_by } = req.body;
    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO groups (id, name, description, avatar_url, created_by) VALUES (?, ?, ?, ?, ?)").run(
      id, name, description, avatar_url, created_by
    );
    db.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)").run(id, created_by, 'admin');
    const newGroup = db.prepare("SELECT * FROM groups WHERE id = ?").get(id);
    res.json(newGroup);
  });

  // Spaces
  app.get("/api/spaces", (req, res) => {
    const spaces = db.prepare(`
      SELECT s.*, u.display_name as host_name, u.avatar_url as host_avatar,
      (SELECT COUNT(*) FROM users) as participant_count
      FROM spaces s
      JOIN users u ON s.host_id = u.id
      WHERE s.is_live = 1
    `).all();
    res.json(spaces);
  });

  app.post("/api/spaces", (req, res) => {
    const { title, host_id } = req.body;
    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO spaces (id, title, host_id) VALUES (?, ?, ?)").run(id, title, host_id);
    const newSpace = db.prepare("SELECT * FROM spaces WHERE id = ?").get(id);
    res.json(newSpace);
  });

  // Socket.io for Real-time
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    socket.on("join_user", (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User joined personal room: ${userId}`);
    });

    socket.on("join_space", (spaceId) => {
      socket.join(`space:${spaceId}`);
      console.log(`User joined space: ${spaceId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`AniX server running on http://localhost:${PORT}`);
  });
}

startServer();
