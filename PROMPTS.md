# Готовые промпты для разработки

Вставлять агенту одну задачу этапа вместе с общим стартовым промптом. Не запускать все этапы одним сообщением. Статусы и критерии берутся из [ROADMAP.md](ROADMAP.md); задания ниже не отменяют [AGENTS.md](AGENTS.md).

## Общий стартовый промпт

> Прочитай AGENTS.md, README.md, docs/GAME_DESIGN.md и ROADMAP.md. Проверь Git-корень и состояние файлов. Найди первый незавершённый этап с выполненными зависимостями. Прочитай docs/ART_DIRECTION.md и документацию этапа. Выполни один этап, сохраняя архитектуру и художественные правила. Для кода проверь typecheck, подходящие тесты и build; поведение проверь в браузере. Для графики сохрани скриншоты и короткую запись движения. Обнови статус, проверки, доказательства и проблемы в roadmap. Сообщи, что изменилось, что проверено и что остаётся нерешённым. Не публикуй и не коммить без отдельной задачи.

## Этап 0 — документационная основа

> Прочитай AGENTS.md и все документы, связанные из README.md. Подготовь или согласуй описание игры, roadmap, правила стиля/анимаций, архитектуру, инструкцию ассетов и промпты этапов. Проверь отдельный Git-корень игры и наличие Pixelmon в Ubuntu WSL без генерации. Проверь внутренние ссылки, кодировку и согласованность объёма v1. Отдели будущие npm-команды от доступных сейчас. Результат — документы, позволяющие следующему агенту начать этап 1; игровой код и изображения в эту задачу не входят.

## Этап 1 — графическое производство

> Прочитай AGENTS.md, README.md, ROADMAP.md, docs/GAME_DESIGN.md, docs/ART_DIRECTION.md, docs/ARCHITECTURE.md и docs/ASSET_PIPELINE.md. Проверь Pixelmon/GPU малым рендером. Инициализируй TypeScript + Vite + Phaser 3 с фиксированными версиями, lockfile и согласованными npm-командами. Создай браузерную тестовую сцену: фонарщик с idle/walk/hit/death во всех восьми направлениях, анимированный корневой ползун и три материала земли с двумя переходными наборами по 47 масок. Используй Pixelmon для базы, подготовь согласованные кадры и атласы отдельно. Добавь проверку манифеста ассетов и provenance. Покажи все направления, реакции, смерть и таблицу переходов через debug-управление сцены. Проверь диагональ, остановку, сохранение направления/фазы, отсутствие дрожания и швов. Сохрани записи и скриншоты. При неподходящей графике исправь её до расширения контента. DONE требует всех критериев этапа 1.

## Этап 2 — игровой прототип

> Прочитай AGENTS.md, ROADMAP.md, docs/GAME_DESIGN.md и docs/ARCHITECTURE.md; используй принятые правила ART_DIRECTION и ассеты этапа 1. Реализуй трёхминутный забег: движение, камера, автоматический фонарь, ползуны, контактный урон, опыт, выбор одного из трёх разных улучшений, пауза, смерть, результаты и перезапуск. Параметры вынеси в конфигурацию; прототипное завершение по таймеру отдели от победы v1. Проверь полный цикл, правила урона/XP, повышение нескольких уровней, паузу и отсутствие утечек состояния после рестарта. Пройди полный забег в браузере и обнови roadmap с доказательствами.

## Этап 3 — процедурная карта

> Прочитай AGENTS.md, ROADMAP.md, docs/ARCHITECTURE.md, docs/ART_DIRECTION.md и docs/ASSET_PIPELINE.md. Реализуй карту участками по мировым координатам и seed: grass → dirt → cobble, слой земли между травой и камнем, переходы по нормализованным 8-соседним маскам, минимум три варианта основных тайлов, декорации и препятствия. Добавь колыхание растений, воду и мерцание фонарей. Сохрани свободный старт и связные проходы. Проверь отрицательные координаты, совпадение границ участков, выгрузку/возврат и отсутствие препятствий поверх игрока. Приложи тесты детерминизма, скриншоты сложных стыков и запись обхода карты. Не подменяй переходы размытием квадратных текстур.

## Этап 4 — контент

> Прочитай AGENTS.md, ROADMAP.md и все четыре документа в docs. Добавь шесть типов обычных врагов, четыре оружия и шесть пассивных предметов из GAME_DESIGN с типизированными параметрами уровней, иконками и анимациями. Врагов различай поведением и силуэтом, специальные атаки показывай через предупреждения. Реализуй получение/улучшение оружия, пределы уровней и три предложения без дубликатов, включая fallback-бонусы. Проверь ближнюю, дальнюю и мобильную сборки; эффекты предметов должны изменять реальный бой. Сохраняй provenance новой графики. Приложи тесты правил улучшений и записи атак/сборок; обнови roadmap.

## Этап 5 — полный забег

> Прочитай AGENTS.md, ROADMAP.md, docs/GAME_DESIGN.md и docs/ARCHITECTURE.md. Реализуй 600-секундный забег с последовательным введением врагов и боссом Сердце оранжереи на 540-й секунде. Создай и проверь его анимации по ART_DIRECTION и ASSET_PIPELINE. Победа наступает только при живом герое, истёкшем таймере и побеждённом боссе; после таймера прекрати новые обычные спавны, но продолжи бой с оставшимися. Одновременная смерть героя и босса — поражение. Проверь раннее/позднее убийство босса, границы времени, паузу, однократность событий и рестарт. Пройди настоящий полный забег, сохрани результаты и обнови roadmap.

## Этап 6 — полировка

> Прочитай AGENTS.md, README.md, ROADMAP.md и документацию игры, графики и архитектуры. Добавь звук, настройки громкости/тряски, удобное меню и клавиатурное управление. Проверь активацию звука пользовательским действием, localStorage и потерю фокуса. Оптимизируй сцену с 300 активными врагами: цель 60 FPS при 1280×720 на машине пользователя. Сохрани условия и 60-секундные замеры после прогрева, включая p95 времени кадра. Выполни typecheck, тесты, build и browser smoke через preview в Chrome и Edge. Проверь ассеты, консоль и несколько рестартов. Результат — проверенная статическая сборка и доказательства; публикация в эту задачу не входит.

## Дополнение 7 — свет и туман

> Запрос пользователя после завершения v1: добавить настоящие шейдеры динамического света от светящихся объектов и туман. Сохранить пиксельные силуэты и читаемость атак, независимость симуляции, остановку эффектов на паузе; предусмотреть отключение эффектов и Canvas fallback. Проверить preview Chrome/Edge, движение/настройки/рестарты, 300 врагов при 1280×720; сохранить скриншоты, запись и замеры в docs/evidence/stage-7.

## Промпты Pixelmon

Все команды выполняются в Bash из корня игры в WSL, как описано в ASSET_PIPELINE. Сначала создать каталог вывода. Текст ниже — базовые рендеры, а не готовые анимационные атласы. Указывать `--output-to` для сохранения в нужный draft-каталог и сохранять параметры в metadata.

### Герой — базовый вид на юг

```text
single full-body lantern keeper, worn teal coat, brass lantern held in right hand, warm amber flame, small leather satchel, readable silhouette, top-down three-quarter game view, facing south, crisp pixel art, restrained detail, dark outline, centered isolated character
```

Параметры: `--size 64 --palette ENDESGA-32 --transparent --seed 1101 --no-open`.

Для направлений заменить только `facing south` на north/northeast/east/southeast/south/southwest/west/northwest. Seed — начальная точка, а не гарантия одинакового персонажа. Проверить анатомически правую руку, одежду и масштаб каждого вида. При расхождении доработать кадры от принятой базы, не принимать несвязанных персонажей.

### Корневой ползун

```text
single crawling creature made of twisted roots and cracked candle wax, pale wax face, small violet eyes, low wide silhouette, top-down three-quarter game view, facing south, crisp pixel art, dark outline, centered isolated creature
```

Параметры: `--size 64 --palette ENDESGA-32 --transparent --seed 1201 --no-open`.

### Земля — три материала

**Трава:**

```text
seamless top-down ground texture, dark teal moss with sparse short grass, abandoned nocturnal garden, subdued contrast, flat even lighting, crisp pixel art, no objects, no perspective, no cast shadows
```

**Влажная земля:**

```text
seamless top-down ground texture, damp dark soil with tiny scattered pebbles, abandoned nocturnal garden, subdued contrast, flat even lighting, crisp pixel art, no objects, no perspective, no cast shadows
```

**Брусчатка:**

```text
seamless top-down ground texture, small worn wet cobblestones with dark seams and sparse moss, abandoned nocturnal city, subdued contrast, flat even lighting, crisp pixel art, no objects, no perspective, no cast shadows
```

Параметры: `--size 32 --palette ENDESGA-32 --tile --no-open`; seeds 2101/2201/2301 соответственно. Вариации — отдельные seeds с записью metadata; совместимость краёв исправляется и проверяется вручную. Переходные наборы собираются отдельно по маскам ART_DIRECTION.

### Шаблон нового противника

```text
single [creature description], [distinct silhouette], [material and accent], top-down three-quarter game view, facing [direction], crisp pixel art, restrained detail, dark outline, centered isolated creature, same scale as the approved root crawler
```

Параметры: `--size 64 --palette ENDESGA-32 --transparent --seed <recorded-seed> --no-open`. Описание брать из GAME_DESIGN, поля заменить перед запуском. Фраза о масштабе не гарантирует результат — проверять относительно принятого спрайта.

### Шаблон иконки предмета

```text
single [item description], brass and wax details, warm amber accent, readable inventory icon, crisp pixel art, dark outline, centered isolated object, no lettering
```

Параметры: `--size 32 --palette ENDESGA-32 --transparent --seed <recorded-seed> --no-open`.

### Босс

```text
single massive greenhouse heart creature, tangled dark roots surrounding a cracked pale wax core, broken brass greenhouse ribs, small violet glow, broad imposing readable silhouette, top-down three-quarter game view, facing south, crisp pixel art, restrained detail, dark outline, centered isolated creature
```

Параметры: `--size 128 --palette ENDESGA-32 --transparent --seed 1301 --no-open`.

### Декорация

```text
single ruined brass street lantern entwined with dark teal roots, small amber flame, abandoned nocturnal city, top-down three-quarter game view, crisp pixel art, restrained detail, dark outline, centered isolated object
```

Параметры: `--size 64 --palette ENDESGA-32 --transparent --seed 2401 --no-open`. Земля под декорацией не включается в изображение; тип obstacle/decorative задаётся данными.

Не добавлять отрицательный промпт, steering или control вслепую. Проверить установленный CLI и наличие моделей; после изменения параметров сохранить фактическую команду. Для анимации использовать отдельную подготовку кадров с приёмкой из ART_DIRECTION.
