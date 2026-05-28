---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-12
updated: 2026-05-28
tier: 3
title: "Архітектурний редизайн та стратегія реалізації для AI-DRAKON"
lang: uk
---

# **Архітектурний редизайн та стратегія реалізації для спільної інженерної платформи AI-DRAKON**

## **1\. Системний аналіз та архітектурні основи**

Платформа AI-DRAKON являє собою високоспеціалізований синтез детермінованого проектування алгоритмів та недетермінованого штучного інтелекту. Шляхом інтеграції DRAKON — візуальної мови програмування, спочатку розробленої для радянської космічної програми для забезпечення однозначних алгоритмічних структур з одним входом/одним виходом, із сучасними великими мовними моделями (LLM), платформа долає глибокий когнітивний розрив між людським архітектурним задумом та кодом, згенерованим машиною. Фундаментальне положення платформи полягає в тому, що розробники-люди та моделі ШІ можуть ефективніше співпрацювати за допомогою спільної, строго регульованої візуальної спільної мови (lingua franca), ніж лише за допомогою неструктурованої природної мови або сирого коду.  
Однак вичерпний аналіз поточної архітектури системи виявляє критичні розбіжності, які серйозно перешкоджають задуманому двонаправленому робочому процесу з людиною в циклі (human-in-the-loop). Найбільш нагальним системним збоєм є ізоляція стану програми між основними функціональними представленнями. Об'єкт `activeProject`, який інкапсулює важливі метадані, такі як власник репозиторію, гілка та локальний шлях, ініціалізується в `ProjectContext`, але не поширюється вниз по дереву компонентів до рівня маршрутизації. Як наслідок, компоненти представлення, такі як браузер GitHub, переглядач документації та редактор DRAKON, працюють із застарілими, жорстко закодованими або асинхронними даними локального сховища (localStorage), замість того, щоб безперешкодно реагувати на єдине джерело правди.  
Крім того, відсутність прямого, контекстно-залежного інтерфейсу для основної моделі LLM (Claude) змушує розробників покладатися виключно на спеціалізованих, одноцільових агентів, що працюють на локальних кінцевих точках мережі. Хоча ці агенти (`docs-agent`, `architect-agent`, `drakon-agent`) забезпечують важливу автоматизацію конвеєра, складні мультиагентні системи вимагають централізованого, керованого людиною командного інтерфейсу для запобігання когнітивному перевантаженню та відхиленню виконання. Розробнику-людині потрібна можливість спілкуватися безпосередньо з узагальненою моделлю міркування, динамічно прикріплювати контекст (файли, діаграми, код) та вибірково відправляти відкориговані результати спеціалізованим агентам конвеєра.

### **1.1 Діагностична та відновлювальна матриця структурних компонентів**

Систематична оцінка існуючої ієрархії компонентів вимагає різного ступеня необхідного рефакторингу, починаючи від поверхневих коригувань макета і закінчуючи повною заміною архітектури.

| Компонент/Маршрут | Поточний робочий стан | Необхідна архітектурна модифікація | Пропонована стратегія відновлення |
| :---- | :---- | :---- | :---- |
| WorkspaceShell | Статична обгортка макета, що керує 220px бічною панеллю. | Низька | Впровадити контекстно-залежні навігаційні параметри для динамічного відображення стану активного проєкту. |
| /sync | Надлишкова сторінка статусу синхронізації, що надає мінімальну цінність для користувача. | Повна заміна | Повністю застаріла. Замінити на `DevCyclePage`, що виступає як основний командний центр машини станів. |
| /github | Статичний браузер репозиторію, який не оновлюється при перемиканні проєктів. | Висока | Підключити безпосередньо до `activeProject.github` через хуки TanStack Router; реалізувати динамічне отримання репозиторію. |
| /diagrams | Ізольований редактор DRAKON, в якому відсутні розмовні можливості ШІ. | Висока | Впровадити контекстно-залежну розділену панель `ClaudeChat`; синхронізувати полотно `drakonwidget.js` із згенерованими ШІ мутаціями JSON. |
| ProjectContext | Надає метадані `activeProject`, але не має зв'язку нижче по ланцюжку. | Помірна | Розширити корисне навантаження контексту; переконатися, що TanStack Router поширює зміни контексту на активні стани файлів та діаграм. |
| /docs | Жорстко закодований переглядач markdown та нотаток. | Помірна | Реалізувати динамічну фільтрацію шляхів на основі `activeProject.path`. |
| Редактор коду | Відсутній в межах платформи. | Нова реалізація | Інтегрувати `monaco-editor` через ліниве завантаження (lazy-loading) React для збереження продуктивності на архітектурах ARM. |

## **2\. Універсальна прив'язка проектів та типізована синхронізація станів**

Неможливість окремих представлень реагувати на `activeProject` виникає через неправильну інтеграцію між React Context API та рівнем маршрутизації. Платформа використовує TanStack Router, сучасну бібліотеку маршрутизації, яка надає пріоритет повній підтримці TypeScript, прозорості та передовим можливостям керування даними. На відміну від застарілих рішень маршрутизації, TanStack Router перевіряє маршрути, параметри та навігацію на рівні компілятора TypeScript, генеруючи повністю типізовані маршрути під час збирання, щоб усунути помилки навігації під час виконання.  
Для досягнення універсальної прив'язки проєктів мінімальне та найнадійніше архітектурне втручання передбачає використання `ProjectContext` безпосередньо в компонентах, що рендеряться функцією TanStack `createFileRoute`. Архітектура повинна гарантувати, що щоразу, коли стан `activeProject` змінюється всередині провайдера, всі змонтовані компоненти маршруту повторно рендеряться для відображення оновленого слага, шляху або метаданих `github`.

### **2.1 Впровадження контексту в TanStack Router**

Хоча TanStack Router підтримує впровадження зовнішніх залежностей безпосередньо у свій внутрішній механізм контексту через `createRootRouteWithContext`, модернізація цього в існуючому додатку без запуску масового рефакторингу дерева маршрутів є складною. Оптимальним підходом у межах зазначених обмежень є локальне використання контексту.  
Наприклад, маршрут GitHub (`/github`) повинен динамічно деструктурувати `owner`, `repo` та `branch` з `activeProject.github`. Якщо контекст проєкту оновлюється з "Sharon Global" на "Code Proxy", масив залежностей `useEffect` всередині компонента маршруту повинен запустити нову асинхронну операцію отримання даних з GitHub API, використовуючи щойно активовані параметри для реконструкції матриці дерева файлів.

| Парадигма маршрутизації | Характеристика реалізації | Вплив на синхронізацію станів |
| :---- | :---- | :---- |
| **Прив'язка контексту на рівні компонента** | Використання `useProject` всередині компонента маршруту. | **Високий**: React негайно перерендерить конкретне представлення після мутації контексту. Безпроблемна реалізація. |
| **Впровадження залежностей на рівні маршрутизатора** | Передача контексту через `createRouter({ context: { project } })`. | **Помірний**: Вимагає серйозного рефакторингу `__root.tsx` та всіх функцій завантаження. Високо типізований, але складний варіант. |
| **Гідратація параметрів URL** | Кодування `?project=slug` у кожному URL. | **Низький**: Захаращує URL-адресу, вимагає ручного розбору стану та ламається, якщо користувач вручну змінює рядок запиту. |

Стратегія прив'язки контексту на рівні компонента є остаточним рішенням для виправлення проблем із розрізненими станами, гарантуючи, що весь робочий простір діє як єдине ціле.

## **3\. Архітектура машини станів циклу розробки**

Маршрут `/sync` має бути повністю перепрофільований у Командний центр — `DevCyclePanel`. Цей інтерфейс діє як зв'язок для співпраці між людиною та ШІ, керуючи складною детермінованою машиною станів, яка керує двома окремими робочими процесами: Сценарієм A (Рефакторинг існуючого коду) та Сценарієм B (Розробка нової функціональності).  
Для забезпечення передбачуваної поведінки у всьому додатку робочий стан не може покладатися на спеціальні локальні змінні. Він вимагає формалізованого детермінованого скінченного автомата (DFA), керованого централізованим контекстом React (`DevCycleContext`). Відокремлення `DevCycleContext` від загального `ProjectContext` є свідомим архітектурним рішенням; воно гарантує, що перемикання активних проєктів неявно скидає стан циклу розробки без пошкодження базових метаданих репозиторію.

### **3.1 Специфікація машини станів**

Машина станів відстежує активний сценарій, послідовне проходження кроків, статус кожного кроку в реальному часі та статус фонового опитування локальних агентів конвеєра (`docs-agent`, `architect-agent`, `drakon-agent`).  

**Сценарій A: Конвеєр refactoring застарілого коду**  
Цей конвеєр переводить користувача від розуміння вихідного коду до абстрактного відображення логіки і, нарешті, до генерації модернізованого коду.

1. **Вибір цільового коду:** Система очікує, поки користувач вибере файл у маршруті `/github`.  
2. **Аналіз за допомогою Claude:** Стан переходить у представлення `/chat`, де людина та загальна модель міркування встановлюють когнітивне узгодження щодо призначення коду.  
3. **Генерація DRAKON IR:** Викликається `architect-agent` через локальну кінцеву точку (`192.168.3.184:8766`). Стан переходить в `IN_PROGRESS`, поки агент здійснює зворотне проектування абстрактного синтаксичного дерева (AST) у проміжне представлення (IR).  
4. **Уточнення діаграми:** Користувач переглядає візуальну логіку в `/diagrams`.  
5. **Генерація нового коду та огляд:** Фіналізований IR відправляється для генерації строго структурованого скелета коду.

**Сценарій B: Конвеєр розробки з нуля (Green-Field)**  
Цей конвеєр змінює архітектурний потік на протилежний, починаючи з абстрактного наміру і завершуючись конкретним синтаксисом.

1. **Концептуалізація алгоритму:** Пряме розмовне моделювання з Claude для визначення алгоритмічних параметрів.  
2. **Чернетка DRAKON IR:** `drakon-agent` розбирає розмовний транскрипт природною мовою та виводить топологічно валідну схему JSON DRAKON.  
3. **Уточнення діаграми:** Візуальна верифікація детермінованого потоку.  
4. **Генерація коду та коміт:** Пряма трансляція за допомогою `architect-agent` в синтаксис цільової мови.

## **4\. Автентифікація в CodeProxy та механіка асинхронного потокового передавання**

Платформа інтегрує дві прямі проксі-точки (`https://claude.exodus.pp.ua` та `https://claude2.exodus.pp.ua`), які направляють запити безпосередньо до API, сумісного з Anthropic. Ці кінцеві точки вимагають автентифікації Bearer токеном з використанням зумовлених ключів слотів. Реалізація надійного зв'язку на фронтенді вимагає вирішення питань автентифікації, мережевих резервних варіантів та асинхронного потокового передавання Server-Sent Events (SSE).

### **4.1 Автентифікація та керування ключами**

Ключі слотів ніколи не повинні жорстко кодуватися всередині збірки додатка Vite, оскільки це становить серйозну вразливість безпеки. Архітектура вимагає, щоб ключі безпечно надавалися користувачем через маршрут `/settings` і записувалися в стійке локальне сховище браузера `localStorage`. Під час ініціалізації HTTP-клієнта заголовок `Authorization: Bearer <slot-key>` динамічно впроваджується в корисне навантаження вихідного запиту.  
Крім того, фронтенд повинен реалізувати стійкий механізм резервного копіювання з нульовим тертям. Враховуючи, що основна проксі-точка знаходиться на RPi 3b, а друга — на OrangePi PC2, очікуються мережеві затримки, термічне дроселювання або обмеження швидкості (HTTP 429). Якщо перша кінцева точка повертає помилковий код статусу або не відповідає протягом визначеного порогу таймауту, клієнт запиту повинен автоматично змінити базовий URL на другу кінцеву точку та виконати негайну повторну спробу без виведення інформації про збій мережі в інтерфейс користувача.

### **4.2 Обробка потоку через ReadableStream**

Сучасні великі мовні моделі генерують текст послідовно. Очікування буферизації повної відповіді перед рендерингом вносить неприйнятну затримку, порушуючи розмовний процес. Веб-стандартом для обробки послідовної доставки даних є інтерфейс `ReadableStream`.  
При використанні рідного Fetch API тіло відповіді надає конкретний екземпляр `ReadableStream`. Додаток React повинен отримати блокування читача (`getReader()`) та рекурсивно витягувати байтові чанки по мірі їх надходження через мережу. Ці байтові чанки, закодовані в UTF-8, повинні бути оброблені через `TextDecoder` та розібрані як дискретні об'єкти JSON, що відповідають специфікації чанків OpenAI (ідентифікація дельти тексту через `chunk.type === 'content_block_delta'`). Оскільки мережеві пакети можуть надходити фрагментованими, процесор потоку повинен підтримувати буфер накопичення, розбиваючи рядки точно по символах нового рядка (`\n`), щоб гарантувати, що лише повні, валідні об'єкти JSON передаються до `JSON.parse()`.

## **5\. Збирання контексту та збереження топології DRAKON**

Контекстно-залежний інтерфейс чату повинен динамічно збирати корисне навантаження, що містить поточний вміст файлів, JSON-схеми DRAKON IR або активні буфери коду. Оскільки LLM мають обмежені вікна контексту, великі артефакти вимагають агресивної попередньої обробки перед передачею по мережі.

### **5.1 Усікання великих файлів**

Коли користувач вибирає файл із дерева GitHub, розмір якого перевищує 15 000 токенів, надсилання сирих рядків файлу погіршує здатність моделі до міркування та створює ризик вичерпання контексту. Платформа повинна реалізувати евристику сумаризації абстрактного синтаксичного дерева (AST). Для надмірно великих кодових баз легкі фронтенд-парсери повинні витягувати оголошення класів, сигнатури функцій та визначення інтерфейсів, активно видаляючи внутрішні тіла функцій, якщо вони не виділені явно курсором користувача.

### **5.2 Нюанси проміжного представлення DRAKON (IR)**

Методологія DRAKON вимагає строгих топологічних правил: кожна діаграма повинна мати рівно один вхід (start) і один або кілька виходів (end); вузли прийняття рішень (question) повинні розгалужуватися строго на гілки ТАК/НІ; а візуальні шляхи виконання повинні проходити вниз без перетину ліній.  
Проміжне представлення (IR) DRAKON, що використовується платформою, кодує цю топологію в JSON:

```json
{
  "1": {"type": "start", "content": "processPayment", "one": "2"},
  "3": {"type": "question", "content": "user exists?", "one": "4", "two": "5"}
}
```

При впровадженні цього IR в контекст чату Claude візуальні метадані (наприклад, конкретні координати XY полотна, змінні відступів, оголошення шрифтів CSS), що використовуються `drakonwidget.js`, повинні бути агресивно видалені. Моделі LLM потрібні лише логічні реляційні покажчики (`one`, `two`) та семантичний вміст вузлів. Шляхом очищення від візуального шуму використання токенів мінімізується, дозволяючи LLM зосередитися виключно на алгоритмічному детермінізмі діаграми. Коли Claude пропонує модифікацію (наприклад, "Додати гілку помилки після вузла 3"), `drakon-agent` транслює цей намір назад у JSON, перераховуючи необхідні геометричні координати перед викликом API `drakon.setDiagram()` для повторного рендерингу полотна в реальному часі.

## **6\. Комплексна інфраструктура технічної реалізації**

У наступних розділах наведено точний, готовий до продакшену код TypeScript, необхідний для реалізації архітектурного редизайну. Реалізації строго відповідають технічним обмеженням: React 18, Vite, типізована безпека TanStack Router, централізоване керування станом Context API та естетична система `shadcn/ui`, що використовує термінальні змінні CSS (`--bg-base`, `--accent-amber`).

### **6.1 Керування станом: DevCycleContext.tsx**

Цей файл створює детерміновану машину станів. Він керує послідовним проходженням робочих процесів, надаючи функції для переходу по кроках та зміни активних індикаторів UI.

```typescript
// src/contexts/DevCycleContext.tsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type WorkflowScenario = 'IDLE' | 'REFACTORING' | 'NEW_FEATURE';
export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';
export type ViewRoute = '/github' | '/diagrams' | '/code' | '/chat' | '/docs';

export interface DevStep {
  id: string;
  label: string;
  status: StepStatus;
  associatedView: ViewRoute;
  actionText?: string;
}

interface DevCycleState {
  scenario: WorkflowScenario;
  steps: DevStep[];
  currentStepId: string | null;
  isPipelineActive: boolean;
}

interface DevCycleContextValue extends DevCycleState {
  startScenario: (scenario: WorkflowScenario) => void;
  advanceStep: (stepId: string) => void;
  setStepStatus: (stepId: string, status: StepStatus) => void;
  resetCycle: () => void;
}

const DevCycleContext = createContext<DevCycleContextValue | undefined>(undefined);

// Визначення детермінованих шляхів
const REFACTORING_STEPS: DevStep[] = [
  { id: 'select_file', label: 'Вибрати цільовий файл коду', status: 'PENDING', associatedView: '/github', actionText: 'Оглянути файли' },
  { id: 'chat_analysis', label: 'Аналіз логіки з Claude', status: 'PENDING', associatedView: '/chat', actionText: 'Відкрити чат' },
  { id: 'generate_ir', label: 'Генерація моделі DRAKON IR', status: 'PENDING', associatedView: '/diagrams', actionText: 'Запустити аналізатор' },
  { id: 'refine_flow', label: 'Візуальна корекція алгоритму', status: 'PENDING', associatedView: '/diagrams', actionText: 'Редагувати схему' },
  { id: 'generate_code', label: 'Генерація нового коду та огляд', status: 'PENDING', associatedView: '/code', actionText: 'Згенерувати код' }
];

const NEW_FEATURE_STEPS: DevStep[] = [
  { id: 'concept_chat', label: 'Проектування логіки з Claude', status: 'PENDING', associatedView: '/chat', actionText: 'Обговорити задум' },
  { id: 'draft_ir', label: 'Створення схеми DRAKON IR', status: 'PENDING', associatedView: '/diagrams', actionText: 'Створити чернетку' },
  { id: 'refine_flow', label: 'Візуальна верифікація потоку', status: 'PENDING', associatedView: '/diagrams', actionText: 'Перевірити логіку' },
  { id: 'generate_code', label: 'Генерація коду та коміт', status: 'PENDING', associatedView: '/code', actionText: 'Згенерувати код' }
];

export const DevCycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scenario, setScenario] = useState<WorkflowScenario>('IDLE');
  const [steps, setSteps] = useState<DevStep[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [isPipelineActive, setIsPipelineActive] = useState<boolean>(false);

  /**
   * Ініціалізує конкретний робочий процес, скидаючи попередні стани конвеєра.
   */
  const startScenario = useCallback((newScenario: WorkflowScenario) => {
    setScenario(newScenario);
    setIsPipelineActive(true);
    if (newScenario === 'REFACTORING') {
      setSteps(REFACTORING_STEPS.map((s, i) => i === 0 ? { ...s, status: 'IN_PROGRESS' } : s));
      setCurrentStepId(REFACTORING_STEPS[0].id);
    } else if (newScenario === 'NEW_FEATURE') {
      setSteps(NEW_FEATURE_STEPS.map((s, i) => i === 0 ? { ...s, status: 'IN_PROGRESS' } : s));
      setCurrentStepId(NEW_FEATURE_STEPS[0].id);
    } else {
      setSteps([]);
      setCurrentStepId(null);
      setIsPipelineActive(false);
    }
  }, []);

  /**
   * Змінює явний статус цільового кроку.
   */
  const setStepStatus = useCallback((stepId: string, status: StepStatus) => {
    setSteps(prev => prev.map(s => (s.id === stepId ? { ...s, status } : s)));
  }, []);

  /**
   * Переводить автомат DFA до наступного логічного вузла в послідовності.
   */
  const advanceStep = useCallback((stepId: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === stepId);
      if (idx === -1 || idx === prev.length - 1) return prev;
        
      const nextSteps = [...prev];
      nextSteps[idx].status = 'COMPLETED';
      nextSteps[idx + 1].status = 'IN_PROGRESS';
      setCurrentStepId(nextSteps[idx + 1].id);
      return nextSteps;
    });
  }, []);

  const resetCycle = useCallback(() => {
    setScenario('IDLE');
    setSteps([]);
    setCurrentStepId(null);
    setIsPipelineActive(false);
  }, []);

  const value = useMemo(() => ({
    scenario, steps, currentStepId, isPipelineActive, startScenario, advanceStep, setStepStatus, resetCycle
  }), [scenario, steps, currentStepId, isPipelineActive, startScenario, advanceStep, setStepStatus, resetCycle]);

  return <DevCycleContext.Provider value={value}>{children}</DevCycleContext.Provider>;
};

export const useDevCycle = () => {
  const context = useContext(DevCycleContext);
  if (!context) throw new Error('useDevCycle must be used within a valid DevCycleProvider boundary.');
  return context;
};
```

### **6.2 Інтерфейс командного центру: DevCyclePage.tsx**

Цей компонент повністю замінює застарілий маршрут `/sync`. Він використовує угоду TanStack Router щодо файлового керування маршрутами (`createFileRoute`). Він запитує `ProjectContext` для відображення динамічних параметрів репозиторію, створюючи щільну термінальну панель, яка відстежує проходження скінченного автомата.

```typescript
// src/routes/devcycle.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';  
import { useDevCycle } from '../contexts/DevCycleContext';  
import { useProject } from '../contexts/ProjectContext';  
import { CheckCircle2, Circle, ArrowRight, Activity, Terminal } from 'lucide-react';  
import { Button } from '@/components/ui/button';  
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Реєстрація мапінгу маршрутів через синтаксис TanStack
export const Route = createFileRoute('/devcycle')({  
  component: DevCyclePage,  
});

function DevCyclePage() {  
  const { scenario, steps, currentStepId, isPipelineActive, startScenario } = useDevCycle();  
  const { activeProject } = useProject();  
  const navigate = useNavigate();

  if (!activeProject) {  
    return (  
      <div className="flex h-full items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)] font-mono text-sm">  
        Помилка: не виявлено параметрів активного робочого простору.  
      </div>  
    );  
  }

  const handleActionClick = (route: string) => {  
    navigate({ to: route });  
  };

  return (  
    <div className="flex h-full flex-col p-6 bg-[var(--bg-base)] font-mono text-[var(--text-primary)]">  
      <div className="mb-6 flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">  
        <div>  
          <h1 className="text-2xl font-bold tracking-tight text-[var(--accent-amber)] uppercase">  
            Командний центр : {activeProject.name}  
          </h1>  
          <p className="text-[var(--text-secondary)] mt-1 text-xs">  
            ЦІЛЬОВИЙ ШЛЯХ: {activeProject.path} | РЕПОЗИТОРІЙ: {activeProject.github?.repo || 'N/A'}  
          </p>  
        </div>  
        <div className="flex items-center space-x-2 text-[var(--text-muted)] text-sm px-3 py-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded">  
          <Activity className={`h-4 w-4 ${isPipelineActive ? 'text-[var(--accent-amber)] animate-pulse' : ''}`} />  
          <span>КОНВЕЄР: {isPipelineActive ? 'АКТИВНИЙ' : 'ЧЕРГУВАННЯ'}</span>  
        </div>  
      </div>

      {scenario === 'IDLE' ? (  
        <div className="grid grid-cols-2 gap-6 mt-8">  
          <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent-amber)] transition-colors cursor-pointer group" onClick={() => startScenario('REFACTORING')}>  
            <CardHeader>  
              <CardTitle className="text-lg flex items-center gap-2 text-[var(--text-primary)] group-hover:text-[var(--accent-amber)] transition-colors">  
                <Terminal className="h-5 w-5" />  
                Сценарій A: Структурний рефакторинг  
              </CardTitle>  
            </CardHeader>  
            <CardContent className="text-[var(--text-secondary)] text-sm leading-relaxed">  
              Запустити конвеєр зворотного проектування. Витягти детерміновані моделі логіки DRAKON з існуючих монолітних архітектур та регенерувати оптимізований вихідний код.  
            </CardContent>  
          </Card>

          <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent-amber)] transition-colors cursor-pointer group" onClick={() => startScenario('NEW_FEATURE')}>  
            <CardHeader>  
              <CardTitle className="text-lg flex items-center gap-2 text-[var(--text-primary)] group-hover:text-[var(--accent-amber)] transition-colors">  
                <Terminal className="h-5 w-5" />  
                Сценарій B: Синтез алгоритмів  
              </CardTitle>  
            </CardHeader>  
            <CardContent className="text-[var(--text-secondary)] text-sm leading-relaxed">  
              Запустити конвеєр розробки з нуля. Спільно проектувати нові детерміновані алгоритми через контекст чату, транслювати їх у візуальні схеми та генерувати строгий топологічний код.  
            </CardContent>  
          </Card>  
        </div>  
      ) : (  
        <div className="mt-4 space-y-4">  
          {steps.map((step, index) => {  
            const isActive = step.id === currentStepId;  
            const isCompleted = step.status === 'COMPLETED';

            return (  
              <div key={step.id} className={`flex items-center justify-between p-4 rounded border transition-all ${isActive ? 'border-[var(--accent-amber)] bg-[var(--bg-elevated)] shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] opacity-70'}`}>  
                <div className="flex items-center space-x-4">  
                  {isCompleted ? (  
                    <CheckCircle2 className="h-5 w-5 text-green-500" />  
                  ) : isActive ? (  
                    <Activity className="h-5 w-5 text-[var(--accent-amber)] animate-pulse" />  
                  ) : (  
                    <Circle className="h-5 w-5 text-[var(--text-muted)]" />  
                  )}  
                  <span className={`font-semibold tracking-wide text-sm ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>  
                    ФАЗА 0{index + 1} : {step.label}  
                  </span>  
                </div>  
                {isActive && step.actionText && (  
                  <Button   
                    variant="outline"   
                    size="sm"  
                    className="border-[var(--accent-amber)] text-[var(--accent-amber)] hover:bg-[var(--accent-amber)] hover:text-black transition-colors font-bold text-xs"  
                    onClick={() => handleActionClick(step.associatedView)}  
                  >  
                    {step.actionText} <ArrowRight className="ml-2 h-3 w-3" />  
                  </Button>  
                )}  
              </div>  
            );  
          })}  
        </div>  
      )}  
    </div>  
  );  
}
```

### **6.3 Асинхронні хуки API: useCodeProxy.ts**

Цей складний хук керує мережевим інтерфейсом із прямими кінцевими точками Claude. Він використовує нативні браузерні примітиви для обробки необроблених байтових потоків, декодуючи події Server-Sent Events у форматі Anthropic. Реалізація містить інтегрований алгоритм ротації, що забезпечує високу доступність шляхом автоматичного перемикання між апаратними проксі.

```typescript
// src/hooks/useCodeProxy.ts
import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {  
  role: 'user' | 'assistant' | 'system';  
  content: string;  
}

export const useCodeProxy = () => {  
  const [messages, setMessages] = useState<ChatMessage[]>([]);  
  const [isStreaming, setIsStreaming] = useState(false);  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Масив ротації кінцевих точок для обходу апаратних лімітів на RPi/OrangePi  
  const endpoints = [  
    'https://claude.exodus.pp.ua/v1/chat/completions',  
    'https://claude2.exodus.pp.ua/v1/chat/completions'  
  ];

  const sendMessage = useCallback(async (content: string, contextPayload?: string, slotKey?: string) => {  
    if (!slotKey) {  
      console.error("Помилка: Ключ авторизації слота відсутній у локальному контексті.");  
      return;  
    }

    const fullContent = contextPayload ? `\n${contextPayload}\n\n\n${content}` : content;  
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: fullContent }];  
    setMessages(newMessages);  
    setIsStreaming(true);

    // Механізм зупинки потоку через втручання користувача  
    abortControllerRef.current = new AbortController();

    // Ініціалізувати порожній буфер відповіді асистента в інтерфейсі  
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    let success = false;

    // Виконати стратегію послідовного перемикання при відмові (failover)  
    for (const endpoint of endpoints) {  
      if (success) break;

      try {  
        const response = await fetch(endpoint, {  
          method: 'POST',  
          headers: {  
            'Content-Type': 'application/json',  
            'Authorization': `Bearer ${slotKey}`,  
          },  
          body: JSON.stringify({  
            model: 'claude-sonnet-4-6',  
            messages: newMessages,  
            stream: true, // Змушує Anthropic API працювати в режимі SSE  
          }),  
          signal: abortControllerRef.current.signal,  
        });

        // 429 Too Many Requests викликає негайну ротацію на резервний проксі  
        if (!response.ok) {  
          if (response.status === 429 || response.status === 401) continue;   
          throw new Error(`Помилка HTTP Matrix: ${response.status}`);  
        }

        if (!response.body) throw new Error('Корисні дані ReadableStream не підтримуються об\'єктом відповіді.');

        success = true;  
        const reader = response.body.getReader(); // Отримати блокування на байтовому потоці  
        const decoder = new TextDecoder('utf-8');  
        let buffer = '';

        while (true) {  
          const { done, value } = await reader.read();  
          if (done) break;

          buffer += decoder.decode(value, { stream: true });  
          const lines = buffer.split('\n');  
          // Зберегти неповні кінцеві рядки в буфері для наступного чанку  
          buffer = lines.pop() || '';

          for (const line of lines) {  
            if (line.startsWith('data: ') && line !== 'data:') {  
              try {  
                const data = JSON.parse(line.slice(6));  
                // Витягти дельти текстових чанків за специфічною структурою API  
                const textChunk = data.choices?.delta?.content || '';  
                if (textChunk) {  
                  setMessages((prev) => {  
                    const updated = [...prev];  
                    const lastIdx = updated.length - 1;  
                    // Послідовно додавати декодовані байти до стану UI  
                    updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + textChunk };  
                    return updated;  
                  });  
                }  
              } catch (e) {  
                console.warn("Пошкоджений чанк JSON відкинуто.", e);  
              }  
            }  
          }  
        }  
      } catch (error: any) {  
        if (error.name === 'AbortError') {  
          console.log('Потік скасовано користувачем.');  
          break;  
        }  
        console.error(`Помилка з'єднання з кінцевою точкою ${endpoint}:`, error);  
      }  
    }

    setIsStreaming(false);  
  }, [messages, endpoints]);

  const stopStream = useCallback(() => {  
    if (abortControllerRef.current) {  
      abortControllerRef.current.abort();  
      setIsStreaming(false);  
    }  
  }, []);

  return { messages, sendMessage, isStreaming, stopStream, setMessages };  
};
```

### **6.4 Контекстно-залежний інтерфейс чату: ClaudeChat.tsx**

Цей візуальний рівень підключає базові потокові хуки до інтерфейсу з розділеними панелями. Він дозволяє розробникам-людям обговорювати конкретні вузли в діаграмі DRAKON, динамічно додаючи корисні навантаження архітектури через перемикач інтерфейсу.

```typescript
// src/components/ClaudeChat.tsx
import React, { useState } from 'react';  
import { useCodeProxy } from '@/hooks/useCodeProxy';  
import { Button } from '@/components/ui/button';  
import { Input } from '@/components/ui/input';  
import { Send, StopCircle, Paperclip, SendToBack } from 'lucide-react';

export const ClaudeChat: React.FC<{  
  activeFileContent?: string;  
  activeDiagramJson?: string;  
  onSendToAgent?: (type: 'architect' | 'drakon', payload: string) => void;  
}> = ({ activeFileContent, activeDiagramJson, onSendToAgent }) => {  
  const { messages, sendMessage, isStreaming, stopStream } = useCodeProxy();  
  const [inputStr, setInputStr] = useState('');  
  const [includeContext, setIncludeContext] = useState<'none' | 'file' | 'diagram'>('none');

  // Отримання параметрів авторизації зі стійкого сховища  
  const slotKey = localStorage.getItem('claude_slot_key') || '';

  const handleSend = () => {  
    if (!inputStr.trim() || isStreaming) return;

    let contextPayload = '';  
    // Динамічна збірка корисного навантаження на основі вибору користувача  
    if (includeContext === 'file' && activeFileContent) {  
      contextPayload = `SOURCE CODE CONTEXT:\n\`\`\`\n${activeFileContent}\n\`\`\``;  
    } else if (includeContext === 'diagram' && activeDiagramJson) {  
      contextPayload = `DRAKON TOPOLOGY CONTEXT:\n\`\`\`json\n${activeDiagramJson}\n\`\`\``;  
    }

    sendMessage(inputStr, contextPayload, slotKey);  
    setInputStr('');  
  };

  return (  
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] w-[400px]">  
      <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] flex items-center justify-between">  
        <h3 className="font-mono text-[var(--accent-amber)] font-semibold text-xs tracking-widest uppercase">Прямий проксі LLM</h3>  
        <div className="text-xs text-[var(--text-muted)] flex gap-2">  
          <button   
            onClick={() => setIncludeContext(includeContext === 'file' ? 'none' : 'file')}  
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${includeContext === 'file' ? 'bg-[var(--accent-dim)] text-[var(--accent-amber)] border border-[var(--accent-amber)]' : 'hover:bg-[var(--bg-elevated)] border border-transparent'}`}  
            disabled={!activeFileContent}  
          >  
            <Paperclip size={12}/> ФАЙЛ  
          </button>  
          <button   
            onClick={() => setIncludeContext(includeContext === 'diagram' ? 'none' : 'diagram')}  
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${includeContext === 'diagram' ? 'bg-[var(--accent-dim)] text-[var(--accent-amber)] border border-[var(--accent-amber)]' : 'hover:bg-[var(--bg-elevated)] border border-transparent'}`}  
            disabled={!activeDiagramJson}  
          >  
            <Paperclip size={12}/> DRAKON  
          </button>  
        </div>  
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm custom-scrollbar">  
        {messages.map((msg, idx) => (  
          <div key={idx} className={`p-3 rounded ${msg.role === 'user' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] ml-8 border-l-2 border-[var(--accent-amber)]' : 'bg-[var(--bg-base)] text-[var(--text-secondary)] mr-8 border border-[var(--border-subtle)]'}`}>  
            <span className="font-bold text-[10px] tracking-widest uppercase opacity-50 block mb-2">{msg.role}</span>  
            <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>  
              
            {/* Контекстні кнопки маршрутизації, що пов'язують загальну LLM із локальними агентами */}  
            {msg.role === 'assistant' && !isStreaming && idx === messages.length - 1 && onSendToAgent && (  
              <div className="mt-4 flex gap-2 border-t border-[var(--border-subtle)] pt-3">  
                <Button size="sm" variant="ghost" className="h-6 text-xs text-[var(--text-muted)] hover:text-[var(--accent-amber)] bg-[var(--bg-surface)]" onClick={() => onSendToAgent('architect', msg.content)}>  
                  <SendToBack size={12} className="mr-1"/> Відправити в Architect  
                </Button>  
                <Button size="sm" variant="ghost" className="h-6 text-xs text-[var(--text-muted)] hover:text-[var(--accent-amber)] bg-[var(--bg-surface)]" onClick={() => onSendToAgent('drakon', msg.content)}>  
                  <SendToBack size={12} className="mr-1"/> Відправити в DRAKON  
                </Button>  
              </div>  
            )}  
          </div>  
        ))}  
      </div>

      <div className="p-3 bg-[var(--bg-base)] border-t border-[var(--border-subtle)] flex gap-2">  
        <Input   
          value={inputStr}  
          onChange={(e) => setInputStr(e.target.value)}  
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}  
          placeholder="Ініціювати спільне обговорення логіки..."  
          className="bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs focus-visible:ring-[var(--accent-amber)]"  
          disabled={isStreaming}  
        />  
        {isStreaming ? (  
          <Button variant="destructive" size="icon" onClick={stopStream} className="rounded">  
            <StopCircle size={16} />  
          </Button>  
        ) : (  
          <Button variant="default" size="icon" onClick={handleSend} className="bg-[var(--accent-amber)] text-black hover:bg-amber-600 rounded transition-colors">  
            <Send size={16} />  
          </Button>  
        )}  
      </div>  
    </div>  
  );  
};
```

### **6.5 Динамічна прив'язка проектів через TanStack Router: github.tsx**

Ця реалізація вирішує проблему ізоляції стану шляхом коректної прив'язки параметрів маршрутизації TanStack до зовнішнього контексту. Вона виконує стандартні REST-запити до GitHub API з використанням деструктуризації `activeProject`.

```typescript
// src/routes/github.tsx
import { createFileRoute } from '@tanstack/react-router';  
import { useProject } from '@/contexts/ProjectContext';  
import { useEffect, useState } from 'react';  
import { FolderGit2, FileCode2, AlertTriangle } from 'lucide-react';

export const Route = createFileRoute('/github')({  
  component: GithubBrowser,  
});

function GithubBrowser() {  
  const { activeProject } = useProject();  
  const [repoStructure, setRepoStructure] = useState<any[]>([]);  
  const [isLoading, setIsLoading] = useState(false);

  // Динамічна прив'язка контексту: Автоматично повторно отримує структуру при зміні проєкту  
  useEffect(() => {  
    if (!activeProject?.github) return;

    const fetchRepo = async () => {  
      setIsLoading(true);  
      try {  
        const { owner, repo, branch } = activeProject.github!;  
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);  
        if (!res.ok) throw new Error("Помилка синхронізації з GitHub API.");  
        const data = await res.json();  
        setRepoStructure(data.tree || []);  
      } catch (error) {  
        console.error("Не вдалося отримати структуру репозиторію", error);  
      } finally {  
        setIsLoading(false);  
      }  
    };

    fetchRepo();  
  }, [activeProject]);

  if (!activeProject) {  
    return (  
      <div className="flex items-center justify-center h-full font-mono text-[var(--text-muted)] bg-[var(--bg-base)] text-sm">  
        Помилка: не вибрано активного проєкту.  
      </div>  
    );  
  }

  if (!activeProject.github) {  
    return (  
      <div className="flex items-center gap-2 p-6 font-mono text-red-500 bg-[var(--bg-base)] h-full text-sm">  
        <AlertTriangle size={16} />  
        Помилка конфігурації робочого простору: Проєкт '{activeProject.name}' не має зв'язаного репозиторію GitHub.  
      </div>  
    );  
  }

  return (  
    <div className="flex flex-col h-full bg-[var(--bg-base)]">  
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 bg-[var(--bg-surface)]">  
        <FolderGit2 className="text-[var(--accent-amber)]" />  
        <h2 className="text-sm font-mono font-bold text-[var(--text-primary)] uppercase tracking-wide">  
          {activeProject.github.owner} / <span className="text-[var(--accent-amber)]">{activeProject.github.repo}</span>  
          <span className="text-[var(--text-muted)] ml-3 text-xs opacity-70">ГІЛКА: {activeProject.github.branch}</span>  
        </h2>  
      </div>  
        
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">  
        {isLoading ? (  
          <div className="text-[var(--accent-amber)] font-mono text-xs animate-pulse tracking-widest">  
            СИНХРОНІЗАЦІЯ СТРУКТУРИ РЕПОЗИТОРІЮ...  
          </div>  
        ) : (  
          <ul className="space-y-1 font-mono text-xs">  
            {/* Обмеження продуктивності для запобігання зависанню DOM у великих репозиторіях */}  
            {repoStructure.slice(0, 150).map((node) => (  
              <li key={node.sha} className="flex items-center gap-2 py-2 px-3 hover:bg-[var(--bg-surface)] cursor-pointer text-[var(--text-secondary)] rounded transition-colors border border-transparent hover:border-[var(--border-subtle)] group">  
                <FileCode2 size={14} className="text-[var(--accent-dim)] group-hover:text-[var(--accent-amber)] transition-colors" />  
                <span className="truncate">{node.path}</span>  
              </li>  
            ))}  
          </ul>  
        )}  
      </div>  
    </div>  
  );  
}
```

### **6.6 Керування продуктивністю: ліниве завантаження редактора коду**

Інтеграція повнофункціонального інтерфейсу редактора коду в межах платформи створює серйозні проблеми з продуктивністю, особливо з огляду на використання легкої апаратної архітектури на базі ARM. Зокрема, рендеринг важких елементів DOM, таких як Monaco Editor, синхронно блокуватиме основний потік JavaScript, сповільнюючи швидкість реагування всього інтерфейсу.  
Щоб пом'якшити це, редактор коду не повинен включатися в основний бандл JavaScript. Замість цього архітектура вимагає динамічного імпорту за допомогою примітивів кодового розбиття (code-splitting) React (`React.lazy` та `Suspense`).  
Шляхом ортання представлення коду в межі `Suspense`, завантаження Monaco Editor повністю ігнорується мережевою чергою браузера, поки машина станів активно не направить користувача до фаз "Генерація нового коду" або "Огляд та коміт" (Сценарій A, Кроки 5 та 6). Це асинхронне завантаження гарантує миттєве виконання базової оболонки робочого простору та маршрутизації TanStack.

## **7\. Директиви генеративної реалізації (Промпти для платформи Lovable)**

Щоб фізично впровадити описані вище архітектурні специфікації у візуальну генеративну платформу (Lovable), системі потрібні точні, локалізовані промпти. Оскільки такі платформи підтримують безстанова контексти виконання (не мають пам'яті про попередні розмовні репліки), кожна інструкція повинна бути структурно абсолютною, визначаючи точні обмеження простору імен CSS та повністю інкапсулюючи цільовий код компонентів.  
Згідно з вимогами операційних обмежень, ці виконувані директиви побудовані українською мовою.

### **Директива 1: Основна машина станів та інтеграція термінальної панелі**

**Завдання:** Створити машину станів для відстеження циклу розробки (Dev Cycle) та повністю замінити інтерфейс сторінки синхронізації (`/sync`) на новий Command Center у військово-термінальному стилі.  

**Інструкції до виконання:**

1. **Створення контексту:** Створи новий файл `src/contexts/DevCycleContext.tsx`. Реалізуй у ньому `React.createContext`, який керує станами сценаріїв: 'IDLE', 'REFACTORING', 'NEW_FEATURE'. Визнач масиви кроків (`REFACTORING_STEPS` та `NEW_FEATURE_STEPS`), де кожен крок має статус ('PENDING', 'IN_PROGRESS', 'COMPLETED'). Експортуй хук `useDevCycle`, який надає доступ до функцій `startScenario` та `advanceStep`.  
   *Використай точний TypeScript код з розділу 6.1 цього документа для реалізації файлу.*  
2. **Заміна маршруту TanStack:** Видали файл `src/routes/sync.tsx` та створи замість нього `src/routes/devcycle.tsx`.  
3. **Верстка Command Center:** У файлі `devcycle.tsx` використай хуки `useDevCycle` та `useProject` (для отримання метаданих проєкту, таких як шлях та репозиторій). Інтерфейс повинен мати жорсткий термінальний вигляд. Використовуй CSS-змінні: `--bg-base` для фону, `--bg-surface` для карток, `--accent-amber` для виділення тексту та кнопок. Використай іконки `lucide-react`: `Terminal`, `Activity`, `CheckCircle2`.  
   *Використай точний код з розділу 6.2 для реалізації компонента.*  
4. **Обгортка застосунку:** Переконайся, що `DevCycleProvider` обгортає `RouterProvider` у головному файлі монтування застосунку (`src/main.tsx` або еквівалентному).

### **Директива 2: Прямий інтерфейс потокового передавання AI через CodeProxy**

**Завдання:** Інтегрувати систему потокового спілкування (Streaming API) з прямими ендпоінтами Claude, оминаючи стандартний пайплайн агентів.  

**Інструкції до виконання:**

1. **Створення мережевого хука:** Створи файл `src/hooks/useCodeProxy.ts`. Цей хук повинен здійснювати HTTP POST запит до масиву ендпоінтів (`https://claude.exodus.pp.ua/v1/chat/completions` та резервного `claude2...`). Реалізуй логіку обробки `ReadableStream` за допомогою `response.body.getReader()` та `TextDecoder`. Розбирай кожен чанк даних як SSE (Server-Sent Events), перевіряючи наявність тексту за шляхом `choices.delta.content` у JSON об'єкті. Реалізуй механізм скасування запиту (`AbortController`).  
   *Точний код хука візьми з розділу 6.3.*  
2. **Створення інтерфейсу чату:** Створи компонент `src/components/ClaudeChat.tsx`. Ширина бокової панелі має бути фіксованою (400px). Додай UI-елемент "Context Picker" (кнопки зі скріпкою `Paperclip`), який дозволяє користувачу приєднати до повідомлення або `activeFileContent` (рядковий код файлу), або `activeDiagramJson` (структуру DRAKON).  
3. **Кнопки маршрутизації:** Під кожним завершеним повідомленням від асистента додай дві маленькі ghost-кнопки: "Dispatch to Architect" та "Dispatch to DRAKON", які викликають callback функцію `onSendToAgent`.  
   *Код компонента для імплементації знаходиться у розділі 6.4.*

### **Директива 3: Прив'язка контексту TanStack у компоненті GitHub**

**Завдання:** Виправити ізоляцію стану компонента браузера репозиторіїв, щоб він миттєво реагував на зміни глобального вибраного проєкту (`activeProject`).  

**Інструкції до виконання:**

1. **Рефакторинг маршруту:** Відкрий існуючий файл `src/routes/github.tsx`, який відповідає за рендеринг за допомогою `createFileRoute`.  
2. **Прив'язка контексту:** Видали всі жорстко закодовані значення репозиторію та запити до `localStorage`. Замість цього імпортуй `useProject` з `src/contexts/ProjectContext`.  
3. **Синхронізація:** Створи `useEffect`, який залежить від `activeProject`. Якщо `activeProject.github` існує, деструктуризуй параметри `owner`, `repo` та `branch` і виконай HTTP запит до `https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1`.  
4. **Обробка станів та UI:** Додай стан `isLoading` для відображення анімації під час завантаження. Для рендерингу дерева файлів використай іконку `FileCode2` з кольором `--accent-dim`. Якщо проєкт не вибрано, відобрази попередження текстом шрифту `font-mono`.  
   *Код компонента для імплементації знаходиться у розділі 6.5.*

## **8\. Стратегічне резюме**

Архітектурна еволюція платформи AI-DRAKON — перехід від сукупності окремих кінцевих точок до цілісного, контекстно-залежного командного центру — усуває основне вузьке місце взаємодії людини та машини в складних детермінованих системах. Шляхом явного децентралізування логіки зв'язку LLM через реалізацію потокового передавання `useCodeProxy`, платформа успішно обходить обмеження ізольованих агентів конвеєра, створюючи Claude як стійкого, обізнаного зі станом партнера з проектування.  
Інтеграція формалізованої машини станів (`DevCycleContext`) накладає необхідну математичну структуру на відкриті процеси архітектурного рефакторингу та створення алгоритмів. Крім того, динамічна маршрутизація на основі файлів TanStack Router та локальна прив'язка контексту надають математично обґрунтований механізм для миттєвої, передбачуваної синхронізації представлень, безпосередньо вирішуючи раніше виявлені аномалії стану.  
Зрештою, це всебічне технічне переналаштування глибоко відповідає імперативам єдиного виходу оригінальної аерокосмічної методології DRAKON, одночасно використовуючи силу імовірнісної генерації тексту сучасних мультиагентних конвеєрів LLM. Це гарантує, що платформа функціонує не просто як графічний редактор, а як першокласний високоточний когнітивний протез для прискореної ШІ структурної програмної інженерії.

#### **Джерела**

1. stepan-mitkin/drakonwidget: A JavaScript widget for viewing and editing drakon flowcharts - GitHub, доступ отримано травня 20, 2026, [https://github.com/stepan-mitkin/drakonwidget](https://github.com/stepan-mitkin/drakonwidget)  
2. maxfraieho - GitHub, доступ отримано травня 20, 2026, [https://github.com/maxfraieho](https://github.com/maxfraieho)  
3. Claude MCP Multi-Agent Integration |... - LobeHub, доступ отримано травня 20, 2026, [https://lobehub.com/mcp/maxfraieho-claude-mcp-multi-agent](https://lobehub.com/mcp/maxfraieho-claude-mcp-multi-agent)  
4. What is a TanStack Router? All you need to know | UniqueDevs, доступ отримано травня 20, 2026, [https://uniquedevs.com/en/blog/tanstack-router-getting-started-with-a-modern-router-for-react/](https://uniquedevs.com/en/blog/tanstack-router-getting-started-with-a-modern-router-for-react/)  
5. @monaco-editor/react vs react-lazyload | LibHunt, доступ отримано травня 20, 2026, [https://react.libhunt.com/compare-monaco-react-vs-react-lazyload](https://react.libhunt.com/compare-monaco-react-vs-react-lazyload)  
6. TanStack Start and Router: What You Need to Know - Certificates.dev, доступ отримано травня 20, 2026, [https://certificates.dev/blog/tanstack-start-and-router-what-you-need-to-know](https://certificates.dev/blog/tanstack-start-and-router-what-you-need-to-know)  
7. TanStack Router Setup in Our React SaaS Template - 2026 - DEV Community, доступ отримано травня 20, 2026, [https://dev.to/kiran_ravi_092a2cfcf60389/tanstack-router-setup-in-our-react-saas-template-2026-4b67](https://dev.to/kiran_ravi_092a2cfcf60389/tanstack-router-setup-in-our-react-saas-template-2026-4b67)  
8. Building Modern and Scalable Applications with TanStack Router in React - Telerik.com, доступ отримано травня 20, 2026, [https://www.telerik.com/blogs/building-modern-scalable-applications-tanstack-router-react](https://www.telerik.com/blogs/building-modern-scalable-applications-tanstack-router-react)  
9. A Beginner's Guide to React.js Project with Typescript Using TanStack Router (Step-by-Step) | by Tasmeer Naeem | Medium, доступ отримано травня 20, 2026, [https://medium.com/@tasmeernaeem/a-beginners-guide-to-react-project-using-tanstack-router-step-by-step-9ff5efc0c9cf](https://medium.com/@tasmeernaeem/a-beginners-guide-to-react-project-using-tanstack-router-step-by-step-9ff5efc0c9cf)  
10. ReadableStream - Web APIs | MDN, доступ отримано травня 20, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)  
11. Streaming AI Responses in Next.js: Claude, OpenAI, and the Vercel AI SDK, доступ отримано травня 20, 2026, [https://dev.to/whoffagents/streaming-ai-responses-in-nextjs-claude-openai-and-the-vercel-ai-sdk-1gm3](https://dev.to/whoffagents/streaming-ai-responses-in-nextjs-claude-openai-and-the-vercel-ai-sdk-1gm3)  
12. TypeScript | Stainless, доступ отримано травня 20, 2026, [https://www.stainless.com/docs/sdks/typescript/](https://www.stainless.com/docs/sdks/typescript/)

---

## Семантичні зв'язки

**Цей документ є частиною:** [[plans/_INDEX]]
**Цей документ пов'язаний з:**
- [[plans/2026-05-12-multi-agent-drakon-system]] — архітектурний план мультиагентної системи