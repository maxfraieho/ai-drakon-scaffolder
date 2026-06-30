## [ ] TASK-V2-03

**"DRAKON for Kids" — інтерактивний туторіал**

### Проблема
Потрібно створити 3-хвилинну гру-онбординг для ознайомлення з DRAKON.

### Файли для зміни
`src/routes/tutorial.tsx` (новий файл)
`src/components/tutorial/TutorialGame.tsx` (новий файл)
`src/components/workspace/WorkspaceShell.tsx` (додати лінк на туторіал)
**УВАГА:** Аналіз `WorkspaceShell` показав CRITICAL impact. Обережно модифікувати навігацію, щоб не зламати інші роути.

### Що зробити

1. **Туторіал (TutorialGame)**:
   Створити інтерактивний компонент (міні-гра) з 5 рівнями:
   - Рівень 1: "Це Початок" → розміщення вузла "Start"
   - Рівень 2: "Це Дія (Action)" → з'єднання двох дій
   - Рівень 3: "Це Розвилка (if/else)" → створення гілки
   - Рівень 4: "Це Цикл (for/while)" → створення петлі
   - Рівень 5: Скласти алгоритм "Заварити чай" → перегляд згенерованого коду
   
2. **Сторінка туторіалу**:
   Підключити `TutorialGame` до `src/routes/tutorial.tsx` через `createFileRoute('/tutorial')`.

3. **Навігація**:
   Додати кнопку "🕹️ Tutorial" у Sidebar (`WorkspaceShell.tsx`).

### Верифікація
```bash
npm run build && echo OK
```
Переконатися, що меню навігації не зламано.

### Деплой
Зміни комітяться та пушаться в GitHub.

### Коміт
```
feat(tutorial): add drakon for kids interactive tutorial (TASK-V2-03)
```

### Diary
```
SESSION:2026-06-30|TASK-V2-03:tutorial-game|commit:<hash>|feat:added-interactive-tutorial|★★★
```

### !!IMPORTANT!! Де запускати
1. ЛОКАЛЬНО на AGY (Termux на 192.168.3.234): `cd ~/workspace/ai-drakon-scaffolder && git pull`
2. Імплементуй файли.
3. Запусти `npm run build` для оновлення роутів.
4. git commit + push від AGY.
