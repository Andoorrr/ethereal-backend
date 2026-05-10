// backend/scripts/crearAdmin.js
// Uso: node scripts/crearAdmin.js

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

const nombre   = args.nombre   || 'Admin Ethereal';
const correo   = args.correo   || 'admin@ethereal.com';
const password = args.password || 'Admin123456';

if (!correo || !password) {
  console.error('❌ Debes proporcionar --correo y --password');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const existe = await User.findOne({ correo });
if (existe) {
  console.error(`❌ Ya existe un usuario con el correo: ${correo}`);
  await mongoose.disconnect();
  process.exit(1);
}

const admin = await User.create({ nombre, correo, password, rol: 'admin' });

console.log('✅ Administrador creado exitosamente:');
console.log(`   Nombre:  ${admin.nombre}`);
console.log(`   Correo:  ${admin.correo}`);
console.log(`   Rol:     ${admin.rol}`);
console.log('\n🔐 Guarda estas credenciales en un lugar seguro.');

await mongoose.disconnect();