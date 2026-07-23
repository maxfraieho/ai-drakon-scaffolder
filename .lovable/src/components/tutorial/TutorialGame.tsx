import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, ArrowRight, ArrowLeft, CheckCircle2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const LEVELS = [
  {
    id: 1,
    title: "Це Початок",
    description: "Кожен алгоритм DRAKON завжди має єдину точку входу — шампур починається зверху.",
    task: "Натисніть кнопку створення початкового вузла.",
  },
  {
    id: 2,
    title: "Це Дія (Action)",
    description: "Дія (прямокутник) означає команду. Наприклад: 'Нагріти воду'. У DRAKON дії йдуть строго зверху вниз.",
    task: "Додайте дію 'Нагріти воду'.",
  },
  {
    id: 3,
    title: "Це Розвилка (if/else)",
    description: "Питання розгалужує потік. 'Вода закипіла?' Якщо ТАК — йдемо далі вниз. Якщо НІ — йдемо праворуч.",
    task: "Додайте питання 'Вода закипіла?'",
  },
  {
    id: 4,
    title: "Це Цикл (while/for)",
    description: "У DRAKON немає стрілок 'назад'. Щоб зробити цикл, лінія повертається вгору, не перетинаючи інші лінії.",
    task: "З'єднайте НІ від питання 'Вода закипіла?' з дією 'Почекати 1 хвилину' і поверніться вгору.",
  },
  {
    id: 5,
    title: "Заварити чай",
    description: "Додайте фінальну дію 'Залити окріп у чашку' та вузол END.",
    task: "Завершіть алгоритм.",
  }
];

export function TutorialGame() {
  const [level, setLevel] = useState(1);
  const [completed, setCompleted] = useState(false);

  const currentLevel = LEVELS[level - 1];

  const handleNext = () => {
    if (level < LEVELS.length) {
      setLevel(level + 1);
    } else {
      setCompleted(true);
    }
  };

  const handlePrev = () => {
    if (level > 1) {
      setLevel(level - 1);
    }
  };

  if (completed) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
        <Award className="h-32 w-32 text-yellow-400 mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
        <h1 className="text-4xl font-bold text-slate-100 mb-4">Вітаємо!</h1>
        <p className="text-lg text-slate-400 mb-8 max-w-md">
          Ви пройшли базовий курс DRAKON. Тепер ви знаєте основні правила: шампур, зверху вниз, питання та цикли!
        </p>
        <Link to="/diagrams">
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
            Почати створювати схеми
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      {/* Sidebar Info */}
      <div className="w-full md:w-1/3 border-r border-slate-800 bg-slate-900/50 p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
              Рівень {level} з {LEVELS.length}
            </span>
            <div className="flex gap-1">
              {LEVELS.map((l) => (
                <div 
                  key={l.id} 
                  className={`h-2 w-8 rounded-full transition-colors ${l.id === level ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : l.id < level ? "bg-emerald-500" : "bg-slate-800"}`}
                />
              ))}
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">{currentLevel.title}</h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            {currentLevel.description}
          </p>

          <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-6 shadow-inner">
            <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-2">Завдання</h3>
            <p className="text-white font-medium text-lg">{currentLevel.task}</p>
            
            <Button 
              onClick={handleNext}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Я виконав(ла) це
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <Button 
            variant="ghost" 
            onClick={handlePrev} 
            disabled={level === 1}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          
          <Link to="/workspace" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Пропустити туторіал
          </Link>
        </div>
      </div>

      {/* Main Canvas Area (Mocked for tutorial) */}
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Playful Interactive Area */}
        <div className="relative z-10 w-full max-w-lg p-12 flex flex-col items-center">
          {level >= 1 && (
            <div className="bg-slate-800 border-2 border-slate-600 text-white font-bold py-3 px-8 rounded-full mb-8 shadow-xl shadow-black/50 animate-in slide-in-from-top-4">
              Початок
            </div>
          )}
          
          {level >= 2 && (
            <>
              <div className="w-1 h-12 bg-slate-600 mb-8" />
              <div className="bg-indigo-600 border-2 border-indigo-400 text-white font-medium py-4 px-8 rounded shadow-lg animate-in slide-in-from-top-4">
                Нагріти воду
              </div>
            </>
          )}

          {level >= 3 && (
            <>
              <div className="w-1 h-12 bg-slate-600 mb-8" />
              <div className="relative animate-in slide-in-from-top-4">
                <div className="bg-amber-600 border-2 border-amber-400 text-white font-medium py-4 px-12 rotate-[-5deg] shadow-lg transform-gpu skew-x-12">
                  Вода закипіла?
                </div>
                {level >= 4 && (
                  <div className="absolute right-[-140px] top-4 text-xs font-bold text-amber-500 animate-pulse">
                    НІ → Почекати
                  </div>
                )}
              </div>
            </>
          )}

          {level >= 5 && (
            <>
              <div className="w-1 h-12 bg-slate-600 mb-8" />
              <div className="bg-indigo-600 border-2 border-indigo-400 text-white font-medium py-4 px-8 rounded shadow-lg animate-in slide-in-from-top-4">
                Залити окріп у чашку
              </div>
              <div className="w-1 h-12 bg-slate-600 mt-8 mb-8" />
              <div className="bg-slate-800 border-2 border-slate-600 text-white font-bold py-3 px-8 rounded-full shadow-xl animate-in slide-in-from-top-4">
                Кінець
              </div>
            </>
          )}
          
          {level < 5 && (
            <div className="mt-12 opacity-50 flex items-center justify-center">
              <div className="animate-bounce p-4 rounded-full bg-slate-800/50">
                <Play className="h-8 w-8 text-slate-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
