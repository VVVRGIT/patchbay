import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { makeTask, unlockParents } from '../lib/gate';
import { navigate } from '../lib/router';
import { Icon } from './Icon';

export const HOLD_MS = 2000;

function openParents() {
  unlockParents();
  navigate({ name: 'parents' });
}

/** Zahnrad: 2 s gedrückt halten öffnet direkt, kurzes Tippen zeigt die Rechenaufgabe. */
export function ParentGateButton() {
  const { t } = useTranslation();
  const [holding, setHolding] = useState(false);
  const [askTask, setAskTask] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);

  const cancelHold = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <button
        type="button"
        className={holding ? 'gear holding' : 'gear'}
        aria-label={t('gate.open')}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          fired.current = false;
          setHolding(true);
          timer.current = window.setTimeout(() => {
            fired.current = true;
            setHolding(false);
            openParents();
          }, HOLD_MS);
        }}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (!fired.current) setAskTask(true);
        }}
      >
        <svg className="hold-ring" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="21" pathLength={100} />
        </svg>
        <Icon name="gear" size={28} />
      </button>
      {askTask && <MathGate onClose={() => setAskTask(false)} onSolved={openParents} />}
    </>
  );
}

function MathGate({ onClose, onSolved }: { onClose: () => void; onSolved: () => void }) {
  const { t } = useTranslation();
  const [task, setTask] = useState(() => makeTask());
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const submit = () => {
    if (Number(input) === task.answer) {
      onClose();
      onSolved();
    } else {
      setWrong(true);
      setInput('');
      setTask(makeTask());
    }
  };

  const press = (k: string) => {
    setWrong(false);
    setInput((v) => (v.length < 3 ? v + k : v));
  };

  return (
    <dialog ref={dialog} className="gate-dialog" aria-labelledby="gate-title" onCancel={onClose}>
      <h2 id="gate-title">{t('gate.title')}</h2>
      <p className="gate-hint">{t('gate.hint')}</p>
      <p className="gate-question" aria-live="polite">
        {t('gate.question', { a: task.a, b: task.b })}
      </p>
      <output className="gate-input" aria-label={t('gate.answer')}>
        {input || ' '}
      </output>
      {wrong && (
        <p className="gate-wrong" role="alert">
          {t('gate.wrong')}
        </p>
      )}
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} type="button" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" aria-label={t('gate.delete')} onClick={() => setInput((v) => v.slice(0, -1))}>
          ⌫
        </button>
        <button type="button" onClick={() => press('0')}>
          0
        </button>
        <button type="button" className="keypad-ok" onClick={submit} disabled={!input}>
          {t('gate.ok')}
        </button>
      </div>
      <button type="button" className="btn btn-ghost" onClick={onClose}>
        {t('gate.cancel')}
      </button>
    </dialog>
  );
}
