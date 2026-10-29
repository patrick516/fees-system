type ToastType = "success" | "error" | "info";
type Listener = (toast: { type: ToastType; message: string } | null) => void;

let listener: Listener | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

export const subscribeToToast = (fn: Listener) => {
  listener = fn;
  return () => {
    listener = null;
  };
};

const show = (type: ToastType, message: string) => {
  if (!listener) return;
  listener({ type, message });
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (listener) listener(null);
  }, 4000);
};

export const toast = {
  success: (msg: string) => show("success", msg),
  error: (msg: string) => show("error", msg),
  info: (msg: string) => show("info", msg),
};
