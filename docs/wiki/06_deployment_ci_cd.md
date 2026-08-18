# 06_deployment_ci_cd.md

Опис процесів розгортання, безперервної інтеграції та доставки (CI/CD) для проєкту AI-DRAKON Scaffolder.

## 1. Cloudflare Pages збірка

Хостинг фронтенду та SSR-маршрутизації (TanStack Start + TanStack Router) здійснюється на Cloudflare Pages. Проект будується з директорії `.lovable/`:

```bash
npm --prefix .lovable run build
```

---

## 2. Правило дзеркальної синхронізації (`.lovable/src/`)

Будь-яка зміна у `src/` або `package.json` синхронізується з `.lovable/src/` перед комітом:

```bash
rsync -av --delete src/ .lovable/src/
diff -r -q src/ .lovable/src/
```

---

## 3. Вимоги до оперативної пам'яті Node

Під час локальної збірки чи на обмежених VPS середовищах:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

## 4. Правила розгортання Appwrite та Cloudflare Worker

* **Cloudflare Worker**: Шлюз `drakon-antigravity-worker` проксіює API запити.
* **Appwrite Cloud**: Автентифікація користувачів (Auth) та безсерверні функції (Functions).
* **Git Push Workflow**: поточний checkout працює на `main`. Cloudflare Pages build hook/deploy належить зовнішній Cloudflare-конфігурації; у репозиторії немає workflow, що деплоїть Pages. Push у `feature/astryx-ui` більше не є правилом.
