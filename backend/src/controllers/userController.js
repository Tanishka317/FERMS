import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
} from '../services/userService.js';

export async function listUsers(req, res, next) {
  try {
    const { role, status, search } = req.query;
    const users = await getUsers({ role, status, search });
    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await getUserById(req.params.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function createNewUser(req, res, next) {
  try {
    const { name, email, role, phone, status, station, assignedUnit, password } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, email, and role are required fields.' },
      });
    }

    const newUser = await createUser({
      name,
      email,
      role,
      phone,
      status,
      station,
      assignedUnit,
      password,
    });

    res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateExistingUser(req, res, next) {
  try {
    const updated = await updateUser(req.params.id, req.body);
    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deactivateExistingUser(req, res, next) {
  try {
    const updated = await deactivateUser(req.params.id);
    res.json({
      success: true,
      data: updated,
      message: `User ${req.params.id} deactivated successfully.`,
    });
  } catch (err) {
    next(err);
  }
}
