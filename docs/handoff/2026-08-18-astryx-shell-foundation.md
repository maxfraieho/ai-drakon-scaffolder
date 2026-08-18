# Astryx shell foundation handoff

T-230–T-234 завершено у foundation phase.

- Feature flag: `astryx_shell`.
- Увімкнення: `localStorage.setItem("astryx_shell", "true")`, потім reload; або build env `VITE_ASTRYX_SHELL=true`.
- Вимкнення: `localStorage.removeItem("astryx_shell")`, потім reload; env flag має бути не `true`.
- Flag off лишає legacy shell.
- T-234 operator go не отримано: legacy shell і flag навмисно збережені.
