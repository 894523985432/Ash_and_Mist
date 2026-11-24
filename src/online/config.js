// Онлайн-частина гри (Supabase). Ключ публічний: доступ до даних обмежують правила RLS у supabase/schema.sql.
// Секретний ключ (sb_secret_…) у гру не кладемо ніколи.
export const SUPABASE_URL = 'https://fncptriahprzcefceosz.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Gus3Pf8you1XEL37DtPFig_SLYsXHjx';

export const ONLINE = {
  encounterChance: 0.04,   // шанс за обшук натрапити на героя іншого гравця
  encounterFromDay: 5,
  bootTimeoutMs: 4000,     // скільки чекати сервер при запуску, далі — офлайн
  chatPage: 60,            // скільки повідомлень підтягувати
};
