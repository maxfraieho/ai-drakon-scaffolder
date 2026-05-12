# Типові патерни Python → DRAKON IR

Згенеровані шаблони проміжного представлення (IR) оптимізовані для плоского JSON-словника drakonwidget.js, де зв'язки є неявними атрибутами one та two в межах вузлів.

### 1. Guard Clause Pattern (Ранній вихід)
Патерн інвертує семантику перевірки: успішний сценарій продовжує рух вниз по осі (one), а дострокове переривання (негативний сценарій) виштовхується праворуч (two).



```python
# Python
if not is_valid: return False
process()
```


```json
{
 "name": "GuardPattern",
 "items": {
   "start": { "type": "header", "content": "GuardPattern", "one": "check_valid" },
   "check_valid": { "type": "question", "content": "is_valid?", "one": "do_process", "two": "ret_false" },
   "do_process": { "type": "action", "content": "process()", "one": "end" },
   "ret_false": { "type": "action", "content": "return False", "one": "end" },
   "end": { "type": "end", "content": "End" }
 }
}

2. Exception Handling (Try/Except/Finally)
Ризикована операція залишається на шампурі. Після неї впорскується синтетичний вузол умови для пастки винятку. Блок finally діє як точка конвергенції.
```


```python
# Python
try: risky_op()
except ValueError as e: handle(e)
finally: cleanup()
```


```json
{
 "name": "ExceptionTrap",
 "items": {
   "start": { "type": "header", "content": "ExceptionTrap", "one": "risk_op" },
   "risk_op": { "type": "action", "content": "risky_op()", "one": "err_trap" },
   "err_trap": { "type": "question", "content": "ValueError caught?", "one": "handler", "two": "finally_blk" },
   "handler": { "type": "action", "content": "handle(e)", "one": "finally_blk" },
   "finally_blk": { "type": "action", "content": "cleanup()", "one": "end" },
   "end": { "type": "end", "content": "End" }
 }
}

(Примітка: У цій структурі перехоплений виняток (yes = error caught) зміщується вправо до обробника, дотримуючись Rightward Degradation 1).
3. Loop with Break
Використання макроікон циклу. Вузол break діє як абсолютний goto, який обходить loop_end і веде до пост-циклової логіки.
```


```python
# Python
for item in col:
   if cond(item): break
   proc(item)
resume()
```


```json
{
 "name": "LoopBreak",
 "items": {
   "start": { "type": "header", "content": "LoopBreak", "one": "loop_st" },
   "loop_st": { "type": "loop_start", "content": "for item in col", "one": "chk_cond" },
   "chk_cond": { "type": "question", "content": "cond(item)?", "one": "break_act", "two": "do_proc" },
   "break_act": { "type": "action", "content": "break", "one": "resume_act" },
   "do_proc": { "type": "action", "content": "proc(item)", "one": "loop_en" },
   "loop_en": { "type": "loop_end", "content": "End loop", "one": "loop_st" },
   "resume_act": { "type": "action", "content": "resume()", "one": "end" },
   "end": { "type": "end", "content": "End" }
 }
}

4. Strategy Pattern (If/Elif/Else Cascade)
Кожен наступний elif зміщується праворуч від попереднього. Усі результати сходяться в спільний термінал.
```


```python
# Python
if A: do_a()
elif B: do_b()
else: do_c()
```


```json
{
 "name": "Strategy",
 "items": {
   "start": { "type": "header", "content": "Strategy", "one": "q_a" },
   "q_a": { "type": "question", "content": "A?", "one": "act_a", "two": "q_b" },
   "act_a": { "type": "action", "content": "do_a()", "one": "end" },
   "q_b": { "type": "question", "content": "B?", "one": "act_b", "two": "act_c" },
   "act_b": { "type": "action", "content": "do_b()", "one": "end" },
   "act_c": { "type": "action", "content": "do_c()", "one": "end" },
   "end": { "type": "end", "content": "End" }
 }
}

5. Pipeline Pattern
Оптимізація "orphan trimming" зливає лінійні операції в єдиний блок action, усуваючи візуальний шум.
```


```python
# Python
x = fetch()
y = trans(x)
save(y)
```


```json
{
 "name": "Pipeline",
 "items": {
   "start": { "type": "header", "content": "Pipeline", "one": "pipe_act" },
   "pipeline_act": { "type": "action", "content": "x = fetch()\ny = trans(x)\nsave(y)", "one": "end" },
   "end": { "type": "end", "content": "End" }
 }
}

6. Recursive Function
Рекурсія реалізується через базовий Guard Clause та макроікону дії, що викликає саму функцію. Специфічних топологічних структур для рекурсії не вимагається.
```


```json
{
 "name": "factorial",
 "items": {
   "start": { "type": "header", "content": "factorial(n)", "one": "chk_base" },
   "chk_base": { "type": "question", "content": "n <= 1?", "one": "ret_base", "two": "rec_call" },
   "ret_base": { "type": "action", "content": "return 1", "one": "end" },
   "rec_call": { "type": "action", "content": "return n * factorial(n-1)", "one": "end" },
   "end": { "type": "end", "content": "End" }
 }
}
```
