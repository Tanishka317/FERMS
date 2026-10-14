import {
  loginWithCredentials,
  loginWithDemoRole,
  getCurrentUser,
  registerCitizen,
} from '../services/authService.js';

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, email, and password are required.' },
      });
    }

    const result = await registerCitizen({ name, email, password });
    res.status(201).json({
      success: true,
      message: 'Account registered successfully as Citizen.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required.' },
      });
    }

    const result = await loginWithCredentials(email, password);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function demoLogin(req, res, next) {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({
        success: false,
        error: { message: 'Demo role is required.' },
      });
    }

    const result = await loginWithDemoRole(role);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}
