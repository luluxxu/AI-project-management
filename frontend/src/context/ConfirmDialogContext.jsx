import { createContext, useContext, useMemo, useState } from "react";

const ConfirmDialogContext = createContext(null);

const defaultState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  tone: "primary",
  resolve: null,
};

const toneClassName = {
  primary: "bg-blue-600 border-blue-600 text-white hover:bg-blue-700",
  danger: "bg-red-600 border-red-600 text-white hover:bg-red-700",
};

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(defaultState);

  const close = (result) => {
    dialog.resolve?.(result);
    setDialog(defaultState);
  };

  const confirm = (options) =>
    new Promise((resolve) => {
      setDialog({
        open: true,
        title: options.title || "Confirm action",
        message: options.message || "Are you sure you want to continue?",
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        tone: options.tone || "primary",
        resolve,
      });
    });

  const value = useMemo(() => ({ confirm }), []);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialog.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="grid gap-2">
              <h2 className="m-0 text-xl font-bold text-slate-900">{dialog.title}</h2>
              <p className="m-0 text-sm leading-6 text-slate-600">{dialog.message}</p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
                onClick={() => close(false)}
              >
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                className={`rounded-xl px-4 py-2 transition ${toneClassName[dialog.tone] || toneClassName.primary}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const value = useContext(ConfirmDialogContext);
  if (!value) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return value;
}
