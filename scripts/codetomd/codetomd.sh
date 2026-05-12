#!/bin/bash

# Назва віртуального середовища
VENV_NAME="venv"

# Перевіряємо, чи вже існує віртуальне середовище
if [ ! -d "$VENV_NAME" ]; then
    echo "Створюємо віртуальне середовище..."
    python3 -m venv $VENV_NAME
else
    echo "Віртуальне середовище вже існує. Пропускаємо створення."
fi

# Активуємо віртуальне середовище
echo "Активуємо віртуальне середовище..."
source $VENV_NAME/bin/activate

# Запускаємо наш скрипт codetomd.py
echo "Запускаємо codetomd.py..."
python codetomd.py

# Деактивуємо віртуальне середовище
echo "Завершуємо роботу..."
deactivate