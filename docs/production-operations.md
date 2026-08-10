# Production operations

Цель этого документа — минимальный набор действий, который поддерживает production-платформу без постоянного ручного контроля.

## Автоматические проверки

На VPS используются три systemd timer:

- `exam-platform-backup.timer` — ежедневный backup БД и файлов; по умолчанию хранится 14 дней.
- `exam-platform-restore-test.timer` — еженедельное тестовое восстановление последнего backup в отдельную БД.
- `exam-platform-maintenance.timer` — каждые 30 минут проверяет контейнеры `db`/`app`, `/api/health`, заполнение диска и свежесть backup.

## Установка systemd units

Из `/srv/exam-platform`:

```bash
sudo cp ops/systemd/exam-platform-*.service /etc/systemd/system/
sudo cp ops/systemd/exam-platform-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now exam-platform-backup.timer
sudo systemctl enable --now exam-platform-restore-test.timer
sudo systemctl enable --now exam-platform-maintenance.timer
```

Проверка расписания:

```bash
systemctl list-timers --all | grep exam-platform
```

## Ручная проверка

```bash
cd /srv/exam-platform
bash scripts/maintenance-check.sh
```

Для production с нестандартным env-файлом:

```bash
ENV_FILE=.env.production bash scripts/maintenance-check.sh
```

## Ручной backup и restore-test

```bash
cd /srv/exam-platform
ENV_FILE=.env.production bash scripts/backup-production-daily.sh
ENV_FILE=.env.production bash scripts/restore-test-production.sh
```

## Логи автоматизации

```bash
journalctl -u exam-platform-backup.service -n 100 --no-pager
journalctl -u exam-platform-restore-test.service -n 100 --no-pager
journalctl -u exam-platform-maintenance.service -n 100 --no-pager
```

Неуспешные systemd units:

```bash
systemctl --failed
```

## Контроль диска

`maintenance-check.sh` возвращает ошибку при заполнении файловой системы на 80% или выше. Порог можно временно изменить:

```bash
DISK_WARN_PERCENT=85 bash scripts/maintenance-check.sh
```

Никогда не выполнять автоматический `docker system prune -a` на production. Сначала смотреть:

```bash
docker system df
```

## Проверка здоровья приложения

Внешняя проверка:

```bash
curl -fsS https://platform.bugfree-exam.ru/api/health
```

Локально на VPS:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Healthcheck считается успешным только если доступна PostgreSQL и оба файловых хранилища доступны приложению на чтение и запись.

## Перед каждым релизом

1. Убедиться, что CI зелёный.
2. Проверить `git status` локально.
3. На VPS выполнить backup и restore-test.
4. Не перезаписывать `.env.production`, `storage/`, `backups/` при rsync.
5. Собрать новый app image.
6. Выполнить только `prisma migrate deploy` через migrator, если появились миграции.
7. Пересоздать только `app`.
8. Проверить `/api/health` и критические сценарии ученика/учителя.

## Запрещённые production-команды

Не использовать без отдельного плана восстановления:

```text
prisma migrate reset
docker compose down -v
rm -rf storage
rm -rf backups
```

## Если приложение недоступно

1. `docker compose --env-file .env.production -f compose.production.yml ps`
2. `curl -i http://127.0.0.1:3000/api/health`
3. `docker compose --env-file .env.production -f compose.production.yml logs --tail=200 app`
4. `df -h`
5. `systemctl status nginx --no-pager`
6. Проверить последний backup перед любыми изменениями БД.
