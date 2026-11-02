# Запуск celinebaby.kz на своём сервере

Сайт работает на одном облачном сервере hoster.kz. Там же лежат база PostgreSQL, фото товаров и резервные копии. Данные покупателей хранятся в Казахстане.

| Что | Где на сервере |
|---|---|
| Код сайта | `/srv/celinebaby` |
| Фото: старые `image/` и загруженные `uploads/` | `/srv/celinebaby-media` |
| Настройки и пароли | `/etc/celinebaby/env` |
| Резервные копии | `/var/backups/celinebaby` |
| Сервис сайта | `systemctl status celinebaby` |
| Логи | `journalctl -u celinebaby -f` |

## 1. Сервер

Тариф hoster.kz **Cloud 2-4-100**: 2 ядра, 4 ГБ, 100 ГБ NVMe. Система **Ubuntu 24.04**.

Зайти на сервер и запустить установку:

```bash
ssh root@IP_СЕРВЕРА
git clone https://github.com/KingDanesa/celinebaby.git /root/celinebaby-setup
bash /root/celinebaby-setup/deploy/setup-server.sh git@github.com:KingDanesa/celinebaby.git
```

Скрипт ставит Node.js 24, PostgreSQL, Nginx, сертификат HTTPS и брандмауэр. Он создаёт базу и пароли, выводит пароль админки и ключ для GitHub. Сайт сразу открывается на временном адресе вида `https://celinebaby.1-2-3-4.sslip.io`.

Если репозиторий приватный, первую команду `git clone` выполните с токеном или скопируйте папку `deploy` на сервер через `scp`.

Дальше:

1. Добавить показанный ключ в GitHub: репозиторий → Settings → Deploy keys, только чтение.
2. Выполнить:

```bash
sudo -u celine git clone git@github.com:KingDanesa/celinebaby.git /srv/celinebaby
celinebaby-deploy
```

## 2. Перенос данных

Делается на компьютере, где лежат архив старого сайта и `.env.local` с ключами демо-версии.

```bash
npm run export:supabase -- deploy/local/bundle
python scripts/collect-old-images.py ../well-known.zip deploy/local/bundle
tar -czf bundle.tgz -C deploy/local bundle
scp bundle.tgz root@IP_СЕРВЕРА:/tmp/
```

Первая команда забирает товары и загруженные фото из демо-версии. Вторая достаёт из архива старого сайта нужные фото, около 700 МБ. Недостающие она докачивает со старого сайта, пока он работает.

На сервере:

```bash
cd /tmp && tar -xzf bundle.tgz && chown -R celine:celine /tmp/bundle
sudo -u celine bash -c 'cd /srv/celinebaby && set -a && . /etc/celinebaby/env && set +a && node scripts/import-bundle.mjs /tmp/bundle --replace'
systemctl restart celinebaby
```

Перенос можно повторять сколько угодно раз. Последний раз его делают в день запуска, чтобы забрать свежие правки из демо-админки.

## 3. Проверка до запуска

На временном адресе:

- каталог, фото, поиск и фильтры;
- регистрация, вход, восстановление пароля;
- заказ с онлайн-оплатой тестовой картой Halyk `4405 6397 0401 5096`, срок `01/27`, CVC `321`;
- заказ через Kaspi;
- письма о заказе: магазину и покупателю;
- админка: товары, заказы, смена статуса.

## 4. Почта для писем о заказах

В `/etc/celinebaby/env` заполнить один вариант, потом `systemctl restart celinebaby`.

**Вариант А, Gmail магазина.** Самый быстрый. В аккаунте celinebabykazakhstan@gmail.com включить двухэтапную проверку и создать «пароль приложения».

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=celinebabykazakhstan@gmail.com
SMTP_PASS=пароль_приложения
EMAIL_FROM=Celine Baby <celinebabykazakhstan@gmail.com>
```

**Вариант Б, Resend с адреса orders@celinebaby.kz.** Выглядит солиднее. Нужен аккаунт resend.com и три DNS-записи домена, которые покажет Resend.

```
RESEND_API_KEY=re_...
EMAIL_FROM=Celine Baby <orders@celinebaby.kz>
```

Режим отправки виден в админке на странице «Обзор».

## 5. День запуска

1. Свежий перенос данных, раздел 2.
2. Боевые ключи Halyk в `/etc/celinebaby/env`: `HALYK_TEST=0`, `HALYK_CLIENT_ID`, `HALYK_CLIENT_SECRET`, `HALYK_TERMINAL`. Потом `systemctl restart celinebaby`.
3. В DNS домена поменять A-записи `celinebaby.kz` и `www.celinebaby.kz` на IP сервера.
4. Когда домен откроется с нового сервера, выполнить:

```bash
celinebaby-switch-domain
```

   Скрипт выпускает сертификат для celinebaby.kz и делает его основным адресом.
5. Один реальный платёж на небольшую сумму. Затем возврат в кабинете Halyk.
6. В Google Search Console и Яндекс Вебмастере отправить `https://celinebaby.kz/sitemap.xml`. Файлы подтверждения прав уже лежат в корне сайта.

Старые адреса товаров, категорий и страниц сами ведут на новые с кодом 301.

**Почта домена.** Сейчас MX-запись celinebaby.kz указывает на старый хостинг. Если кто-то получает письма на адреса @celinebaby.kz, MX нужно перенаправить отдельно до смены A-записи.

## 6. Обновления сайта

После изменений в коде:

```bash
celinebaby-deploy
```

Скрипт забирает код из GitHub, ставит зависимости, обновляет таблицы, собирает и перезапускает сайт. Сайт недоступен около 10 секунд.

## 7. Резервные копии

Каждую ночь в 04:00 сохраняется дамп базы, хранятся последние 14. Делается и копия папки с фото. Копии лежат на том же сервере, поэтому раз в неделю их стоит забирать к себе:

```bash
scp -r root@IP_СЕРВЕРА:/var/backups/celinebaby ./backups
```

Восстановить базу из дампа:

```bash
sudo -u celine bash -c 'set -a && . /etc/celinebaby/env && set +a && pg_restore --clean --no-owner -d "$DATABASE_URL" /var/backups/celinebaby/db/ФАЙЛ.dump'
```

## 8. Оплата: как это устроено

Логика перенесена из модуля старого сайта, hbepay 2.0.3:

- у каждой попытки оплаты свой номер счёта и секретная подпись;
- уведомление банка принимается, только если совпали подпись, сумма, валюта и терминал;
- статус всегда перепроверяется у банка;
- заблокированные деньги, статус AUTH, списываются отдельным запросом. Защита не даёт списать дважды;
- каждые 10 минут таймер перепроверяет незавершённые оплаты на случай, если уведомление банка потерялось.

Попытки оплаты и их статусы видны в админке в карточке заказа.
