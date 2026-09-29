// Mapa de coaching: helpers del servidor
import { roomCode } from '@/lib/draft';

// Inserta un mapa con un código único (reintenta si ya existe)
export async function insertBoard(admin, row) {
  for (let i = 0; i < 5; i++) {
    const { data, error } = await admin.from('boards').insert({ ...row, id: roomCode() }).select().single();
    if (!error) return { board: data };
    if (error.code !== '23505') return { error: error.message };
  }
  return { error: 'No se pudo crear el mapa, intenta de nuevo' };
}
