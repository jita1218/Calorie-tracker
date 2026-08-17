import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { validate } from '../utils/validate.js';

const router = Router();

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;
// At least 8 chars, with an uppercase letter, a lowercase letter, a number, and a special character.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const TOKEN_TTL = '365d';

const usernameField = z.string().regex(USERNAME_RE, '3-30 characters: letters, numbers, underscore, or dot');

const registerSchema = z.object({
  username: usernameField,
  password: z.string().regex(PASSWORD_RE, 'Password must have 8+ characters with an uppercase letter, a lowercase letter, a number, and a special character'),
});

// Login only checks that a password was sent — accounts created before this
// rule existed must still be able to sign in with their original password.
const loginSchema = z.object({
  username: usernameField,
  password: z.string().min(1, 'Password is required'),
});

function issueToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

router.post('/register', validate(registerSchema), (req, res) => {
  const { username, password } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'This username is already taken' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  res.status(201).json({ token: issueToken(user), user: { id: user.id, username: user.username } });
});

router.post('/login', validate(loginSchema), (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'No account found for this username' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  res.json({ token: issueToken(user), user: { id: user.id, username: user.username } });
});

export default router;
