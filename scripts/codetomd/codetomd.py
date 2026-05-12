import os

def main():
    print("=== Збирання коду з проєкту в один Markdown-файл ===\n")
    
    # Шлях до вашого проєкту
    root_dir = input("Введіть шлях до вашого проєкту (якщо пусто, використовуємо поточну директорію .): ") or "."
    
    # Вихідний файл
    output_file = input("Вкажіть ім'я вихідного файлу (за замовчуванням project_code.md): ") or "project_code.md"
    
    # Каталоги, які завжди ігноруємо
    default_ignore_dirs = ['.git', 'node_modules', 'venv', 'dist', '__pycache__']
    print("\nЗа замовчуванням ігноруємо такі каталоги:")
    print("  " + ", ".join(default_ignore_dirs))
    
    # Користувач може додати свої каталоги для ігнорування
    additional_ignore = input("\nЗа бажанням, введіть додаткові каталоги для ігнорування (через кому чи пробіл) або залиште порожнім: ")
    if additional_ignore.strip():
        default_ignore_dirs.extend([d.strip() for d in additional_ignore.replace(',', ' ').split()])
    
    # Перетворюємо список ігнорованих каталогів у множину для швидкого пошуку
    IGNORE_DIRS = set(default_ignore_dirs)

    # Явно ігноруємо файли, які не хочемо включати
    SKIP_FILES = {"codetomd.sh", "codetomd.py", "package-lock.json"}
    
    # Визначаємо, які розширення файлів включати
    ALLOWED_EXTENSIONS = {'.py', '.js', '.ts', '.vue', '.html', '.css', '.json', '.md'}

    # Відкриваємо вихідний файл
    with open(output_file, 'w', encoding='utf-8') as out:
        # Рекурсивний обхід каталогу root_dir
        for current_path, dirs, files in os.walk(root_dir):
            
            # 1) Прибираємо папки з IGNORE_DIRS
            # 2) Ігноруємо приховані директорії, що починаються з "."
            dirs[:] = [
                d for d in dirs
                if d not in IGNORE_DIRS and not d.startswith('.')
            ]
            
            # Обробляємо файли
            for file_name in files:
                # Пропускаємо файли, які явно ігноруємо
                if file_name in SKIP_FILES:
                    continue

                # Витягаємо розширення
                _, extension = os.path.splitext(file_name)
                
                # Якщо файл має дозволене розширення або це конкретно .env
                if extension.lower() in ALLOWED_EXTENSIONS or file_name == '.env':
                    full_path = os.path.join(current_path, file_name)
                    relative_path = os.path.relpath(full_path, root_dir)

                    # Виводимо заголовок з шляхом до файлу
                    out.write(f"## {relative_path}\n\n")

                    # Для code-block'а в Markdown
                    # Якщо розширення порожнє (наприклад, у .env), робимо 'txt'
                    code_ext = extension[1:] if extension else 'txt'
                    
                    out.write(f"```{code_ext}\n")
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            out.write(f.read())
                    except UnicodeDecodeError:
                        # Якщо текст у файлі в іншому кодуванні або файл бінарний
                        out.write(f"[Неможливо прочитати файл {relative_path} у форматі UTF-8]")
                    
                    out.write("\n```\n\n")

    print(f"\nУсе зібрано у файл: {output_file}")
    print("Скрипт завершив роботу успішно!")

if __name__ == "__main__":
    main()