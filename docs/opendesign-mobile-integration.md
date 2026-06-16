---
tags:
  - domain:kb
  - status:active
  - format:manual
created: 2026-05-30
updated: 2026-05-30
tier: 2
title: "Інструкція з інтеграції ai-drakon з OpenDesign для покращення мобільного UI"
lang: uk
---

# Інтеграція ai-drakon з OpenDesign: Покращення мобільного UI

Ця інструкція описує процес інтеграції проекту **ai-drakon** з локальним середовищем **OpenDesign** (`http://192.168.3.184:7459`) з метою побудови сучасного, зручного та адаптованого під мобільні пристрої інтерфейсу (Mobile-First UI).

---

## Підключення проекту до OpenDesign

Оскільки OpenDesign працює за принципом **local-first**, він не має хмарного імпорту репозиторіїв. Натомість інтеграція з вашим проектом на TypeScript/React здійснюється через протокол **MCP (Model Context Protocol)**. Це дозволяє вашому кодувальному агенту (Cursor, VS Code або Claude Code) безпосередньо взаємодіяти з OpenDesign як з живим джерелом дизайну.

### Покрокове налаштування зв'язку:

1. **Запуск OpenDesign:**
   Переконайтеся, що локальний демон OpenDesign запущений за адресою:
   * **URL:** `http://192.168.3.184:7459`
   * **Токен авторизації:** `2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a`

2. **Отримання конфігурації MCP:**
   У додатку OpenDesign перейдіть у розділ **Settings → MCP server**.
   * Якщо ви працюєте в **Cursor**, натисніть на deeplink для автоматичного підключення в один клік.
   * Для **Claude Code** або інших інструментів скопіюйте згенерований JSON-сніпет. Він містить абсолютні шляхи до вашого Node.js та клієнтського файлу `cli.js`.

3. **Застосування конфігурації в проекті:**
   Для швидкого додавання в конфіг Claude Code запустіть команду:
   ```bash
   claude mcp add-json
   ```
   Або відредагуйте конфігураційний файл вручну (наприклад, `~/.claude.json`), додавши блок:
   ```json
   {
     "mcpServers": {
       "opendesign": {
         "command": "node",
         "args": ["/absolute/path/to/opendesign/cli.js", "mcp"],
         "env": {
           "OPENDESIGN_URL": "http://192.168.3.184:7459",
           "OPENDESIGN_TOKEN": "2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a"
         }
       }
     }
   }
   ```

4. **Перезапуск AI-агента:**
   Після збереження конфігурації перезапустіть термінал або редактор, щоб ініціалізувати нові MCP-інструменти: `search_files`, `get_file`, `get_artifact`.

---

## Налаштування для Mobile-First

Для того щоб OpenDesign генерував інтерфейси, які ідеально виглядають на екранах смартфонів, необхідно правильно вибрати вбудовані навички (skills) та налаштувати візуальні напрямки.

### 1. Вибір навичок (Skills) для мобільного дизайну:
У каталозі OpenDesign оберіть одну з наступних спеціалізованих навичок:
* **`mobile-app`**: Базовий фреймворк для створення мобільних екранів. Автоматично рендерить інтерфейс у точних до пікселя межах сучасних пристроїв (наприклад, iPhone 15 Pro з Dynamic Island), додаючи SVG статус-бари та системні індикатори.
* **`mobile-onboarding`**: Генерує триекранний потік реєстрації (Intro-слайдер, ціннісна пропозиція, екран авторизації з кнопками OAuth та індикаторами свайпів).
* **`gamified-app`**: Створює інтерфейси з гейміфікованими елементами (шкала досвіду, картки квестів, досягнення), що відмінно підходить для інтерактивних елементів редактора DRAKON.

### 2. Візуальні напрямки (Visual Directions):
Щоб уникнути типового безликого ШІ-дизайну ("AI slop"), скористайтеся формою **Discovery form** перед генерацією. Для мобільних інтерфейсів найкраще підходять два напрямки:
* **Modern minimal** (натхненний Vercel/Linear): Чисті темні та світлі теми, чітка ієрархія та мінімалістичні відступи. Ідеально для кодових сторінок (`CodePage.tsx`) та списку діаграм.
* **Soft warm** (натхненний Notion/Apple Health): М'які пастельні відтінки, приємний для очей контраст. Чудово підходить для редактора діаграм, знижуючи втому очей при тривалій роботі з телефону.

---

## Генерація UI компонентів

Генерація відбувається в інтерактивному режимі безпечного iframe (з підтримкою React 18). Для проекту **ai-drakon** нам потрібно згенерувати наступні мобільні компоненти:
1. **Mobile Navigation Dock** (Нижня панель навігації).
2. **Compact Viewport Wrapper** (Контейнер для маштабування полотна діаграми).
3. **Action Radial Sheet** (Кругове контекстне меню для додавання блоків).

### Промпт для генерації Bottom Navigation Dock:
> "Згенеруй React-компонент MobileNavigationDock у стилі Modern Minimal. Панель має розташовуватися знизу, мати ефект розмиття заднього фону (glassmorphism), містити 5 іконок: Огляд, Схеми, Код, Агенти та Налаштування. Активна вкладка повинна мати плавний мікроанімаційний індикатор у вигляді крапки або лінії."

---

## Експорт та інтеграція в React

Отримати згенерований код можна двома шляхами: швидкий експорт архіву (ZIP/HTML) або безпосередня вставка коду через MCP-інструменти прямо в редакторі.

### Приклад інтеграції CSS-токенів та React-компонента

Створіть файл стилів для мобільних компонентів або додайте змінні до `styles.css`:

```css
/* src/styles/mobile-tokens.css */
:root {
  --mobile-safe-top: env(safe-area-inset-top, 20px);
  --mobile-safe-bottom: env(safe-area-inset-bottom, 20px);
  
  /* Тема Modern Minimal від OpenDesign */
  --od-bg-primary: #09090b;
  --od-bg-secondary: #18181b;
  --od-accent: #3f3f46;
  --od-accent-foreground: #fafafa;
  --od-border: #27272a;
}
```

Нижче наведено приклад інтеграції згенерованої нижньої навігаційної панелі у мобільну версію головного макету:

```tsx
// src/components/mobile/MobileNavigationDock.tsx
import React from "react";
import { LayoutGrid, FileText, Code2, Cpu, Settings } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
}

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const MobileNavigationDock: React.FC<MobileNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const items: NavItem[] = [
    { id: "overview", label: "Огляд", icon: LayoutGrid, path: "/" },
    { id: "diagrams", label: "Схеми", icon: FileText, path: "/diagrams" },
    { id: "code", label: "Код", icon: Code2, path: "/code" },
    { id: "agents", label: "Агенти", icon: Cpu, path: "/agents" },
    { id: "settings", label: "Опції", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-lg border-t border-[var(--od-border)] pb-[var(--mobile-safe-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center justify-center w-12 h-12 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[var(--od-accent-foreground)]" : ""}`} />
              <span className="text-[10px] mt-1 font-medium select-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--od-accent-foreground)] transition-transform duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

---

## Покращення мобільного інтерфейсу Drakon-editor

Візуальне редагування блок-схем ДРАКОН на екрані телефону є складною задачею через обмежену площу та відсутність мишки. OpenDesign пропонує наступні рішення для адаптації **Drakon-editor** під тач-керування:

### 1. Жести панорамування та масштабування (Pinch-to-Zoom)
Замість класичних смуг прокрутки, оберніть Canvas у контейнер із підтримкою тач-жестів за допомогою бібліотеки `react-use-gesture` або стандартних `TouchEvent` подій:
* **Подвійне торкання (Double tap):** Автоматичне фокусування та масштабування на обраній гілці або блоці.
* **Зведення пальців (Pinch):** Динамічна зміна масштабу (scale) від `0.5x` до `2.0x`.

### 2. Радіальне контекстне меню (Radial Context Menu)
Замість довгих спливаючих списків, використовуйте кругове меню, яке з'являється при довгому натисканні (long-press) на порожню область або на стрілку зв'язку:
* Палець користувача зазвичай перекриває область під собою. Радіальне меню розгортає кнопки (Додати Блок, Додати Перевірку, Гілка, Видалити) навколо точки торкання на безпечній відстані.
* Це дозволяє додавати нові вузли одним швидким свайпом у напрямку потрібного інструменту.

### 3. Збільшені тач-зони для стрілок (Touch Targets)
Координати зв'язків у DRAKON є тонкими лініями. Для мобільних пристроїв необхідно штучно збільшити інтерактивну область (Invisible Hitbox) навколо стрілок до мінімум **24px**, щоб користувачам було легко натискати на них пальцем для вставки нових блоків:
```tsx
// Приклад невидимого хітбоксу стрілки
<g className="arrow-connection cursor-pointer">
  {/* Реальна тонка стрілка */}
  <line x1={50} y1={100} x2={50} y2={150} stroke="#3f3f46" strokeWidth={2} />
  {/* Невидимий широкий хітбокс для легкого тачу */}
  <line 
    x1={50} y1={100} x2={50} y2={150} 
    stroke="transparent" 
    strokeWidth={24} 
    onClick={() => handleInsertBlock(connectionId)} 
  />
</g>
```

### 4. Генерація схем через ШІ-чат (Prompt-Driven Diagrams)
Найкращий мобільний UX — це той, який не вимагає ручного перетягування блоків. 
* Додайте у мобільну версію редактора невелике плаваюче поле введення тексту (AI Prompt Bar).
* Користувач вводить текстовий опис процесу (наприклад: *\"Створи алгоритм перевірки авторизації користувача з перевіркою пароля та 2FA\"*).
* За допомогою інтегрованого через AGY Proxy ШІ-агента система автоматично генерує повну структуру діаграми ДРАКОН і рендерить її на екрані. Користувачеві залишається лише переглянути або внести точкові правки.

## Семантичні зв'язки
**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[INDEX]] — переглянути всі документи розділу