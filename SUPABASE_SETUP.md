# Подключение админ-панели

1. Создайте проект на [Supabase](https://supabase.com/dashboard) (подойдёт бесплатный тариф).
2. В **SQL Editor** выполните содержимое `supabase/schema.sql`.
3. В **Authentication → Providers** оставьте включённым Email; в **Authentication → Users** создайте пользователя-редактора с email и паролем. Не включайте публичную регистрацию.
4. В **Project Settings → API** скопируйте Project URL и ключ `anon public` в `supabase-config.js`.
5. Откройте `https://arinaexe.github.io/zerna-coffee-demo/admin/`, войдите и сохраните первое изменение. Оно создаст запись с текущим содержимым сайта.

`anon public` можно хранить в репозитории. Никогда не добавляйте в сайт ключ `service_role`.
