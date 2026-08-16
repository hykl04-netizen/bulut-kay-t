'use client';

import { useState } from 'react';
import { Calculator, X } from 'lucide-react';

export function CalculatorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('');

  // Ekrana rakam/işaret ekleme
  const handleInput = (val: string) => {
    setDisplay((prev) => prev + val);
  };

  // Sonucu hesaplama
  const calculate = () => {
    try {
      // Güvenlik: Sadece rakam ve matematiksel işaretlere izin ver
      if (!/^[\d\.\+\-\*\/\(\)\ ]+$/.test(display)) {
        setDisplay('Hata');
        return;
      }
      // Hesaplamayı yap (Güvenli eval alternatifi)
      const result = new Function('return ' + display)();
      
      // Çok uzun küsuratları yuvarla (örn: 10.3333333)
      const formattedResult = Number.isInteger(result) 
        ? result 
        : Number(result.toFixed(4));
        
      setDisplay(String(formattedResult));
    } catch {
      setDisplay('Hata');
    }
  };

  const clear = () => setDisplay('');

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Kapalıyken Görünen Yuvarlak Buton */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-secondary dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
          title="Hesap Makinesi"
        >
          <Calculator className="h-6 w-6" />
        </button>
      )}

      {/* Açıkken Görünen Hesap Makinesi Paneli */}
      {isOpen && (
        <div className="w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl dark:border-border dark:bg-primary">
          <div className="flex items-center justify-between bg-secondary px-4 py-3 dark:bg-secondary">
            <span className="text-sm font-semibold text-foreground dark:text-muted-foreground">
              Hesap Makinesi
            </span>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-muted-foreground transition hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="mb-4 flex min-h-[4rem] w-full items-center justify-end overflow-x-auto rounded-lg bg-muted px-3 py-4 text-right font-mono text-2xl tracking-wider text-foreground dark:bg-primary dark:text-slate-100">
              {display || '0'}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '/'].map((btn) => (
                <button key={btn} onClick={() => handleInput(btn)} className="flex h-10 items-center justify-center rounded-lg bg-secondary font-medium text-foreground transition hover:bg-slate-200 dark:bg-secondary dark:text-muted-foreground dark:hover:bg-slate-700">{btn}</button>
              ))}
              {['4', '5', '6', '*'].map((btn) => (
                <button key={btn} onClick={() => handleInput(btn)} className="flex h-10 items-center justify-center rounded-lg bg-secondary font-medium text-foreground transition hover:bg-slate-200 dark:bg-secondary dark:text-muted-foreground dark:hover:bg-slate-700">{btn}</button>
              ))}
              {['1', '2', '3', '-'].map((btn) => (
                <button key={btn} onClick={() => handleInput(btn)} className="flex h-10 items-center justify-center rounded-lg bg-secondary font-medium text-foreground transition hover:bg-slate-200 dark:bg-secondary dark:text-muted-foreground dark:hover:bg-slate-700">{btn}</button>
              ))}
              {['C', '0', '=', '+'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    if (btn === 'C') clear();
                    else if (btn === '=') calculate();
                    else handleInput(btn);
                  }}
                  className={`flex h-10 items-center justify-center rounded-lg font-medium transition ${
                    btn === 'C' 
                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400' 
                      : btn === '=' 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-secondary text-foreground hover:bg-slate-200 dark:bg-secondary dark:text-muted-foreground dark:hover:bg-slate-700'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}