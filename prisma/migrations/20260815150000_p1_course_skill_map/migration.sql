-- P1: editable teacher-authored skill map attached to the annual course.

CREATE TABLE "CourseSkillLevel" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseSkillLevel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseSkillNode" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "egeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 120,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseSkillNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseSkillDependency" (
    "nodeId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    CONSTRAINT "CourseSkillDependency_pkey" PRIMARY KEY ("nodeId", "prerequisiteId")
);

CREATE UNIQUE INDEX "CourseSkillLevel_courseId_order_key" ON "CourseSkillLevel"("courseId", "order");
CREATE INDEX "CourseSkillLevel_courseId_order_idx" ON "CourseSkillLevel"("courseId", "order");
CREATE UNIQUE INDEX "CourseSkillNode_courseId_egeNumber_key" ON "CourseSkillNode"("courseId", "egeNumber");
CREATE UNIQUE INDEX "CourseSkillNode_levelId_order_key" ON "CourseSkillNode"("levelId", "order");
CREATE INDEX "CourseSkillNode_courseId_levelId_idx" ON "CourseSkillNode"("courseId", "levelId");
CREATE INDEX "CourseSkillDependency_prerequisiteId_idx" ON "CourseSkillDependency"("prerequisiteId");

ALTER TABLE "CourseSkillLevel" ADD CONSTRAINT "CourseSkillLevel_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AnnualCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSkillNode" ADD CONSTRAINT "CourseSkillNode_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AnnualCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSkillNode" ADD CONSTRAINT "CourseSkillNode_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "CourseSkillLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSkillDependency" ADD CONSTRAINT "CourseSkillDependency_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CourseSkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSkillDependency" ADD CONSTRAINT "CourseSkillDependency_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "CourseSkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing courses receive the former built-in map as an editable starting point.
INSERT INTO "CourseSkillLevel" ("id", "courseId", "order", "title", "description", "createdAt", "updatedAt")
SELECT
    'c' || md5(course."id" || ':level:' || level."key"),
    course."id",
    level."order",
    level."title",
    level."description",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "AnnualCourse" course
CROSS JOIN (VALUES
    ('FOUNDATION', 1, 'База', 'Базовые задания и темы, на которых строится дальнейшая подготовка.'),
    ('CORE', 2, 'Основной блок', 'Основная часть программы ЕГЭ и ключевые рабочие навыки.'),
    ('ADVANCED', 3, 'Продвинутый блок', 'Темы повышенной сложности и составные алгоритмы.'),
    ('EXAM', 4, 'Экзаменационная вершина', 'Самые сложные задачи и итоговая сборка навыков.')
) AS level("key", "order", "title", "description");

INSERT INTO "CourseSkillNode" ("id", "courseId", "levelId", "order", "egeNumber", "title", "description", "estimatedMinutes", "createdAt", "updatedAt")
SELECT
    'c' || md5(course."id" || ':node:' || skill."egeNumber"::text),
    course."id",
    'c' || md5(course."id" || ':level:' || skill."levelKey"),
    skill."order",
    skill."egeNumber",
    skill."title",
    NULL,
    skill."estimatedMinutes",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "AnnualCourse" course
CROSS JOIN (VALUES
    ('FOUNDATION', 1, 1, 'Информационные модели и схемы', 100),
    ('FOUNDATION', 2, 2, 'Таблицы истинности', 150),
    ('FOUNDATION', 3, 4, 'Кодирование и условие Фано', 120),
    ('FOUNDATION', 4, 5, 'Исполнители и анализ алгоритмов', 180),
    ('FOUNDATION', 5, 7, 'Кодирование изображений и звука', 150),
    ('FOUNDATION', 6, 11, 'Объём текстовой информации', 120),
    ('CORE', 1, 3, 'Поиск в таблицах и базах данных', 150),
    ('CORE', 2, 6, 'Циклы и вычислительный эксперимент', 180),
    ('CORE', 3, 8, 'Комбинаторика и перебор слов', 180),
    ('CORE', 4, 9, 'Обработка таблиц в электронных таблицах', 180),
    ('CORE', 5, 10, 'Информационный поиск в текстах', 90),
    ('CORE', 6, 12, 'Редактор и преобразование строк', 150),
    ('CORE', 7, 13, 'IP-адреса и маски сети', 180),
    ('CORE', 8, 14, 'Системы счисления', 210),
    ('CORE', 9, 15, 'Алгебра логики', 240),
    ('CORE', 10, 16, 'Рекурсия и вычисление функций', 210),
    ('CORE', 11, 17, 'Обработка числовых файлов', 210),
    ('ADVANCED', 1, 18, 'Оптимизация в электронных таблицах', 210),
    ('ADVANCED', 2, 19, 'Теория игр: один вопрос', 180),
    ('ADVANCED', 3, 20, 'Теория игр: две позиции', 150),
    ('ADVANCED', 4, 21, 'Теория игр: диапазон позиций', 150),
    ('ADVANCED', 5, 22, 'Многопроцессные системы', 150),
    ('ADVANCED', 6, 23, 'Количество программ исполнителя', 180),
    ('ADVANCED', 7, 24, 'Обработка символьных файлов', 240),
    ('ADVANCED', 8, 25, 'Делители, маски и перебор', 240),
    ('ADVANCED', 9, 26, 'Обработка и сортировка данных', 300),
    ('EXAM', 1, 27, 'Программирование и оптимизация', 480)
) AS skill("levelKey", "order", "egeNumber", "title", "estimatedMinutes");

INSERT INTO "CourseSkillDependency" ("nodeId", "prerequisiteId")
SELECT
    'c' || md5(course."id" || ':node:' || edge."nodeNumber"::text),
    'c' || md5(course."id" || ':node:' || edge."prerequisiteNumber"::text)
FROM "AnnualCourse" course
CROSS JOIN (VALUES
    (7, 1), (11, 1), (11, 7), (3, 1), (6, 5), (8, 5), (8, 6),
    (9, 3), (12, 5), (13, 1), (14, 5), (15, 2), (16, 5), (16, 6),
    (17, 5), (17, 6), (18, 9), (19, 15), (19, 16), (20, 19),
    (21, 19), (21, 20), (22, 5), (23, 5), (23, 16), (24, 6),
    (24, 17), (25, 6), (25, 14), (26, 17), (27, 17), (27, 24), (27, 26)
) AS edge("nodeNumber", "prerequisiteNumber");
